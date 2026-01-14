# -*- coding: utf-8 -*-
import json
import os
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import mysql.connector
from mysql.connector import Error
import requests
from flask import Flask, Response, redirect, render_template_string, request, url_for


APP_TITLE = "每日客户房源推荐（简化版）"
SETTINGS_FILE = "customers.json"


def _parse_date(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    # 支持 YYYY-MM-DD
    return datetime.strptime(s.strip(), "%Y-%m-%d").date()


def load_settings() -> Dict[str, Any]:
    if not os.path.exists(SETTINGS_FILE):
        raise FileNotFoundError(f"找不到配置文件：{SETTINGS_FILE}")
    with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_settings(settings: Dict[str, Any]) -> None:
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings, f, ensure_ascii=False, indent=2)


def get_db_config(settings: Dict[str, Any]) -> Dict[str, Any]:
    # 允许用环境变量覆盖，方便部署
    db = dict(settings.get("db", {}))
    db["host"] = os.getenv("DB_HOST", db.get("host"))
    db["port"] = int(os.getenv("DB_PORT", db.get("port", 3306)))
    db["database"] = os.getenv("DB_NAME", db.get("database"))
    db["user"] = os.getenv("DB_USER", db.get("user"))
    db["password"] = os.getenv("DB_PASSWORD", db.get("password"))
    db["connection_timeout"] = int(os.getenv("DB_TIMEOUT", db.get("connection_timeout", 10)))
    return db


def get_qwen_config(settings: Dict[str, Any]) -> Dict[str, Any]:
    q = dict(settings.get("qwen", {}))
    q["api_key"] = os.getenv("QWEN_API_KEY", q.get("api_key"))
    q["api_url"] = os.getenv("QWEN_API_URL", q.get("api_url"))
    q["model"] = os.getenv("QWEN_MODEL", q.get("model", "qwen-max"))
    return q


def validate_customer(c: Dict[str, Any]) -> Tuple[bool, str]:
    required = ["id", "name", "min_price", "max_price", "regions", "room_types"]
    for k in required:
        if k not in c:
            return False, f"缺少字段：{k}"
    if not isinstance(c["regions"], list) or not c["regions"]:
        return False, "regions 必须是非空数组"
    if not isinstance(c["room_types"], list) or not c["room_types"]:
        return False, "room_types 必须是非空数组"
    return True, ""


def find_customer(settings: Dict[str, Any], customer_id: str) -> Optional[Dict[str, Any]]:
    for c in settings.get("customers", []):
        if c.get("id") == customer_id:
            return c
    return None


def build_client_query(
    customer: Dict[str, Any],
    today_only: bool,
    lookback_days: int,
    min_available_date: Optional[date],
    max_available_date: Optional[date],
    limit: int,
) -> Tuple[str, Tuple[Any, ...]]:
    """
    这是唯一的“核心函数”：按客户条件 + 时间模式（今日/历史）生成 SQL 并查询。
    """
    where = ["1=1"]
    params: List[Any] = []

    # 时间模式：published_at（新增时间）
    if today_only:
        where.append("p.published_at >= CURDATE()")
    else:
        if lookback_days > 0:
            where.append("p.published_at >= DATE_SUB(CURDATE(), INTERVAL %s DAY)")
            params.append(int(lookback_days))

    # 价格
    where.append("p.price BETWEEN %s AND %s")
    params.extend([int(customer.get("min_price", 0)), int(customer.get("max_price", 999999))])

    # 区域（模糊匹配，支持空格/连字符变体，大小写不敏感）
    regions: List[str] = customer.get("regions") or []
    if regions:
        region_clauses = []
        for region in regions:
            # 生成变体：原始、空格变连字符、连字符变空格
            variants = [region.lower().strip()]
            # 如果包含空格，添加连字符版本
            if " " in region:
                variants.append(region.lower().replace(" ", "-"))
            # 如果包含连字符，添加空格版本
            if "-" in region:
                variants.append(region.lower().replace("-", " "))
            # 去重
            variants = list(set(variants))
            # 为每个变体生成 LIKE 条件（大小写不敏感）
            for v in variants:
                region_clauses.append("LOWER(r.name) LIKE LOWER(%s)")
                params.append(f"%{v}%")
        where.append("(" + " OR ".join(region_clauses) + ")")

    # 房型（室/卫组合）
    room_types = customer.get("room_types") or []
    rt_clauses = []
    for rt in room_types:
        rt_clauses.append("(p.bedroom_count = %s AND p.bathroom_count = %s)")
        params.extend([int(rt.get("bedrooms", 0)), int(rt.get("bathrooms", 0))])
    where.append("(" + " OR ".join(rt_clauses) + ")")

    # 入住日期（available_date）
    if min_available_date:
        where.append("p.available_date >= %s")
        params.append(min_available_date)
    if max_available_date:
        where.append("p.available_date <= %s")
        params.append(max_available_date)

    sql = f"""
SELECT
  p.id,
  p.url,
  p.address,
  r.name AS region_name,
  p.bedroom_count,
  p.bathroom_count,
  p.parking_count,
  p.price,
  p.available_date,
  p.published_at,
  p.average_score,
  p.description_cn
FROM properties p
JOIN regions r ON p.region_id = r.id
WHERE {' AND '.join(where)}
ORDER BY p.average_score DESC
LIMIT %s;
""".strip()
    params.append(int(limit))
    return sql, tuple(params)


def query_properties(
    settings: Dict[str, Any],
    customer: Dict[str, Any],
    *,
    today_only: bool,
    lookback_days: int,
    min_available_date: Optional[date],
    max_available_date: Optional[date],
    limit: int,
) -> List[Dict[str, Any]]:
    db_config = get_db_config(settings)
    sql, params = build_client_query(
        customer=customer,
        today_only=today_only,
        lookback_days=lookback_days,
        min_available_date=min_available_date,
        max_available_date=max_available_date,
        limit=limit,
    )
    try:
        with mysql.connector.connect(**db_config) as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(sql, params)
                return cursor.fetchall()
    except Error as e:
        raise RuntimeError(f"数据库查询失败：{e}")


def call_qwen(settings: Dict[str, Any], prompt: str) -> str:
    q = get_qwen_config(settings)
    if not q.get("api_key") or not q.get("api_url"):
        return "（未配置 Qwen，跳过文案生成）"
    headers = {"Authorization": f"Bearer {q['api_key']}", "Content-Type": "application/json"}
    data = {
        "model": q.get("model", "qwen-max"),
        "input": {"messages": [{"role": "user", "content": prompt}]},
        "parameters": {"temperature": 0.7, "max_tokens": 120},
    }
    try:
        resp = requests.post(q["api_url"], headers=headers, json=data, timeout=60)
        resp.raise_for_status()
        result = resp.json()
        if "output" in result and "text" in result["output"]:
            return str(result["output"]["text"]).strip()
        return "AI文案生成失败"
    except Exception as e:
        return f"AI文案生成失败: {e}"


def make_summary(settings: Dict[str, Any], prop: Dict[str, Any]) -> str:
    full_address = f"{prop.get('address', '')}, {prop.get('region_name', '')}"
    prompt = f"""
请为以下澳洲房源信息，生成一行精炼的“关键信息”，用于营销。
要求：
1. 必须以房源评分开头，格式为“18.4分”。
2. 语言简练，吸引人，60字以内。
3. 只返回一句话，不要换行，不要标签。

房源数据：
- 评分: {float(prop.get('average_score', 0) or 0):.1f}/20.0
- 地址: {full_address}
- 房型: {int(prop.get('bedroom_count', 0) or 0)}室{int(prop.get('bathroom_count', 0) or 0)}卫
- 价格: ${int(prop.get('price', 0) or 0)}/周
- 描述: {prop.get('description_cn', '暂无描述')}
""".strip()
    return call_qwen(settings, prompt)


def format_date_any(v: Any) -> str:
    if v is None:
        return ""
    if hasattr(v, "strftime"):
        return v.strftime("%Y-%m-%d")
    return str(v)


def build_txt_report(
    customer: Dict[str, Any],
    props: List[Dict[str, Any]],
    *,
    today_only: bool,
    lookback_days: int,
    min_available_date: Optional[date],
    max_available_date: Optional[date],
    include_ai: bool,
    settings: Dict[str, Any],
) -> str:
    lines: List[str] = []
    lines.append("客户推荐报告")
    lines.append(f"客户：{customer.get('name')} (ID: {customer.get('id')})")
    mode = "今日新增" if today_only else (f"历史 {lookback_days} 天" if lookback_days > 0 else "历史全量")
    lines.append(f"模式：{mode}")
    lines.append(f"价格：{customer.get('min_price')}-{customer.get('max_price')} pw")
    lines.append(f"区域：{', '.join(customer.get('regions') or [])}")
    room_type_descs = [
        f"{rt.get('bedrooms')}b{rt.get('bathrooms')}b"
        for rt in (customer.get("room_types") or [])
    ]
    lines.append("房型：" + ", ".join(room_type_descs))
    lines.append(f"入住日期：{min_available_date or ''} ~ {max_available_date or ''}")
    lines.append(f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("=" * 50)

    if not props:
        lines.append("暂无符合条件的房源。")
        return "\n".join(lines)

    for i, p in enumerate(props, 1):
        lines.append(f"\n[{i}] {p.get('address','')}, {p.get('region_name','')}")
        if p.get("url"):
            lines.append(f"网址：{p.get('url')}")
        lines.append(
            f"基础信息：{int(p.get('bedroom_count',0) or 0)}b"
            f"{int(p.get('bathroom_count',0) or 0)}b"
            f"{int(p.get('parking_count',0) or 0)}c"
            f"，${int(p.get('price',0) or 0)}pw"
            f"，Available:{format_date_any(p.get('available_date'))}"
            f"，Published:{format_date_any(p.get('published_at'))}"
            f"，Score:{float(p.get('average_score',0) or 0):.1f}/20"
        )
        if include_ai:
            lines.append("关键信息：" + make_summary(settings, p))
    return "\n".join(lines)


INDEX_HTML = """
<!doctype html>
<html lang="zh">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{title}}</title>
    <style>
      body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial; background:#0b1220; color:#e8eefc; margin:0; }
      .wrap{ max-width:1100px; margin:24px auto; padding:0 16px; }
      .card{ background:#111a2e; border:1px solid #1f2a44; border-radius:14px; padding:16px; margin-bottom:14px; }
      .row{ display:flex; gap:12px; flex-wrap:wrap; }
      label{ display:block; font-size:12px; color:#a9b7d6; margin-bottom:6px; }
      input, select, textarea{ background:#0b1220; border:1px solid #263451; color:#e8eefc; padding:10px; border-radius:10px; }
      input, select{ min-width:220px; }
      textarea{ width:100%; min-height:220px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      .btn{ background:#3b82f6; border:none; color:white; padding:10px 14px; border-radius:10px; cursor:pointer; }
      .btn.secondary{ background:#22304d; }
      .hint{ color:#a9b7d6; font-size:12px; line-height:1.6; }
      table{ width:100%; border-collapse:collapse; }
      th, td{ border-bottom:1px solid #22304d; padding:10px; text-align:left; font-size:13px; vertical-align:top; }
      th{ color:#a9b7d6; font-weight:600; }
      .err{ color:#ffb4b4; white-space:pre-wrap; }
      .ok{ color:#a7f3d0; }
      .tag{ display:inline-block; padding:2px 8px; border-radius:999px; background:#22304d; color:#cfe3ff; font-size:12px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="row" style="justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:18px; font-weight:700;">{{title}}</div>
            <div class="hint">一个后端文件 + 一个配置文件。你可以按客户直接查：今日新增 / 历史 / 改入住日期范围 / 导出 txt。</div>
          </div>
          <div class="tag">settings: {{settings_file}}</div>
        </div>
      </div>

      {% if message %}
      <div class="card">
        <div class="{{ 'err' if error else 'ok' }}">{{message}}</div>
      </div>
      {% endif %}

      <div class="card">
        <form method="get" action="{{url_for('search')}}">
          <div class="row">
            <div>
              <label>选择客户</label>
              <select name="customer_id">
                {% for c in customers %}
                  <option value="{{c['id']}}" {% if selected_customer_id==c['id'] %}selected{% endif %}>
                    {{c['name']}} ({{c['id']}})
                  </option>
                {% endfor %}
              </select>
            </div>
            <div>
              <label>模式</label>
              <select name="mode">
                <option value="today" {% if mode=='today' %}selected{% endif %}>今日新增</option>
                <option value="history" {% if mode=='history' %}selected{% endif %}>历史</option>
              </select>
            </div>
            <div>
              <label>历史天数（0=全量）</label>
              <input name="lookback_days" value="{{lookback_days}}" />
            </div>
            <div>
              <label>限制条数</label>
              <input name="limit" value="{{limit}}" />
            </div>
          </div>

          <div class="row" style="margin-top:10px;">
            <div>
              <label>最早入住日期（YYYY-MM-DD）</label>
              <input name="min_available_date" value="{{min_available_date}}" />
            </div>
            <div>
              <label>最晚入住日期（YYYY-MM-DD，可空）</label>
              <input name="max_available_date" value="{{max_available_date}}" />
            </div>
            <div style="display:flex; align-items:flex-end; gap:10px;">
              <label style="margin:0 0 10px 0;">生成AI文案</label>
              <input type="checkbox" name="include_ai" value="1" {% if include_ai %}checked{% endif %} />
            </div>
          </div>

          <div class="row" style="margin-top:14px;">
            <button class="btn" type="submit">查询并展示</button>
            <button class="btn secondary" type="submit" name="download" value="1">导出TXT</button>
            <a class="btn secondary" href="{{url_for('edit_settings')}}">编辑 customers.json</a>
          </div>
        </form>
      </div>

      {% if results is not none %}
      <div class="card">
        <div style="font-weight:700; margin-bottom:8px;">本次查询条件</div>
        <div class="hint" style="white-space:pre-wrap;">{{conditions_text}}</div>
        <div style="margin-top:10px;">
          <div style="font-weight:700; margin-bottom:8px;">结果页面URL（可复制）</div>
          <div class="hint" style="word-break:break-all;">{{result_url}}</div>
        </div>
      </div>
      <div class="card">
        <div class="row" style="justify-content:space-between; align-items:center;">
          <div style="font-weight:700;">查询结果：{{results|length}} 条</div>
          <div class="hint">排序：按 average_score 从高到低</div>
        </div>
        <div style="margin-top:10px; overflow:auto;">
          <table>
            <thead>
              <tr>
                <th>链接</th>
                <th>地址</th>
                <th>区域</th>
                <th>房型</th>
                <th>价格</th>
                <th>Available</th>
                <th>Published</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {% for p in results %}
              <tr>
                <td>
                  {% if p.get('url') %}
                    <a href="{{p.get('url')}}" target="_blank" rel="noopener noreferrer" style="color:#93c5fd;">打开</a>
                  {% else %}
                    -
                  {% endif %}
                </td>
                <td>{{p.get('address','')}}</td>
                <td>{{p.get('region_name','')}}</td>
                <td>{{p.get('bedroom_count','')}}b{{p.get('bathroom_count','')}}b {{p.get('parking_count','')}}c</td>
                <td>${{p.get('price','')}}</td>
                <td>{{p.get('available_date','')}}</td>
                <td>{{p.get('published_at','')}}</td>
                <td>{{p.get('average_score','')}}</td>
              </tr>
              {% endfor %}
            </tbody>
          </table>
        </div>
      </div>
      {% endif %}
    </div>
  </body>
</html>
""".strip()


SETTINGS_HTML = """
<!doctype html>
<html lang="zh">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>编辑配置 - {{title}}</title>
    <style>
      body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial; background:#0b1220; color:#e8eefc; margin:0; }
      .wrap{ max-width:1100px; margin:24px auto; padding:0 16px; }
      .card{ background:#111a2e; border:1px solid #1f2a44; border-radius:14px; padding:16px; margin-bottom:14px; }
      textarea{ width:100%; min-height:520px; background:#0b1220; border:1px solid #263451; color:#e8eefc; padding:10px; border-radius:10px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      .btn{ background:#3b82f6; border:none; color:white; padding:10px 14px; border-radius:10px; cursor:pointer; }
      .btn.secondary{ background:#22304d; text-decoration:none; display:inline-block; }
      .hint{ color:#a9b7d6; font-size:12px; line-height:1.6; }
      .err{ color:#ffb4b4; white-space:pre-wrap; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div style="font-size:18px; font-weight:700;">编辑 {{settings_file}}</div>
        <div class="hint">这里直接编辑 JSON。保存后回到首页就会按新配置查询。</div>
      </div>

      {% if message %}
      <div class="card">
        <div class="{{ 'err' if error else 'hint' }}">{{message}}</div>
      </div>
      {% endif %}

      <div class="card">
        <form method="post">
          <textarea name="json_text">{{json_text}}</textarea>
          <div style="margin-top:12px; display:flex; gap:10px;">
            <button class="btn" type="submit">保存配置</button>
            <a class="btn secondary" href="{{url_for('index')}}">返回首页</a>
          </div>
        </form>
      </div>
    </div>
  </body>
</html>
""".strip()


app = Flask(__name__)

def _region_patterns(regions: List[str]) -> List[str]:
    patterns: List[str] = []
    for region in regions:
        variants = [region.lower().strip()]
        if " " in region:
            variants.append(region.lower().replace(" ", "-"))
        if "-" in region:
            variants.append(region.lower().replace("-", " "))
        for v in set(variants):
            patterns.append(f"%{v}%")
    return sorted(set(patterns))


@app.get("/")
def index():
    settings = load_settings()
    customers = settings.get("customers", [])
    selected_customer_id = customers[0]["id"] if customers else ""
    return render_template_string(
        INDEX_HTML,
        title=APP_TITLE,
        settings_file=SETTINGS_FILE,
        customers=customers,
        selected_customer_id=selected_customer_id,
        mode="today",
        lookback_days="30",
        limit=str(customers[0].get("default_limit", 5) if customers else 5),
        min_available_date=(customers[0].get("min_available_date", "") if customers else ""),
        max_available_date=(customers[0].get("max_available_date") or "" if customers else ""),
        include_ai=False,
        results=None,
        conditions_text="",
        result_url="",
        message="",
        error=False,
    )

@app.route("/search", methods=["GET", "POST"])
def search():
    settings = load_settings()
    customers = settings.get("customers", [])

    # 兼容 GET/POST
    customer_id = (request.values.get("customer_id") or "").strip()
    if not customer_id:
        return redirect(url_for("index"))
    customer = find_customer(settings, customer_id)
    if not customer:
        return render_template_string(
            INDEX_HTML,
            title=APP_TITLE,
            settings_file=SETTINGS_FILE,
            customers=customers,
            selected_customer_id=customer_id,
            mode=request.values.get("mode", "today"),
            lookback_days=request.values.get("lookback_days", "30"),
            limit=request.values.get("limit", "5"),
            min_available_date=request.values.get("min_available_date", ""),
            max_available_date=request.values.get("max_available_date", ""),
            include_ai=bool(request.values.get("include_ai")),
            results=[],
            conditions_text="",
            result_url=request.url,
            message="找不到该客户配置，请先去编辑 customers.json。",
            error=True,
        )

    ok, msg = validate_customer(customer)
    if not ok:
        return render_template_string(
            INDEX_HTML,
            title=APP_TITLE,
            settings_file=SETTINGS_FILE,
            customers=customers,
            selected_customer_id=customer_id,
            mode=request.values.get("mode", "today"),
            lookback_days=request.values.get("lookback_days", "30"),
            limit=request.values.get("limit", "5"),
            min_available_date=request.values.get("min_available_date", ""),
            max_available_date=request.values.get("max_available_date", ""),
            include_ai=bool(request.values.get("include_ai")),
            results=[],
            conditions_text="",
            result_url=request.url,
            message=f"客户配置不合法：{msg}",
            error=True,
        )

    mode = request.values.get("mode", "today")
    today_only = mode == "today"
    lookback_days = int((request.values.get("lookback_days") or "0").strip() or 0)
    limit = int((request.values.get("limit") or str(customer.get("default_limit", 5))).strip() or 5)
    include_ai = bool(request.values.get("include_ai"))

    # 入住日期：优先使用前端输入，其次用客户默认配置
    min_av = _parse_date(request.values.get("min_available_date")) or _parse_date(customer.get("min_available_date"))
    max_av = _parse_date(request.values.get("max_available_date")) or _parse_date(customer.get("max_available_date"))

    try:
        props = query_properties(
            settings,
            customer,
            today_only=today_only,
            lookback_days=lookback_days,
            min_available_date=min_av,
            max_available_date=max_av,
            limit=limit,
        )
    except Exception as e:
        return render_template_string(
            INDEX_HTML,
            title=APP_TITLE,
            settings_file=SETTINGS_FILE,
            customers=customers,
            selected_customer_id=customer_id,
            mode=mode,
            lookback_days=str(lookback_days),
            limit=str(limit),
            min_available_date=(min_av.isoformat() if min_av else ""),
            max_available_date=(max_av.isoformat() if max_av else ""),
            include_ai=include_ai,
            results=[],
            conditions_text="",
            result_url=request.url,
            message=str(e),
            error=True,
        )

    # 下载
    if request.values.get("download") == "1":
        txt = build_txt_report(
            customer,
            props,
            today_only=today_only,
            lookback_days=lookback_days,
            min_available_date=min_av,
            max_available_date=max_av,
            include_ai=include_ai,
            settings=settings,
        )
        filename = f"客户推荐_{customer.get('name')}_{datetime.now().strftime('%Y%m%d')}.txt"
        return Response(
            txt,
            mimetype="text/plain; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"},
        )

    # 页面展示：把 date/datetime 转成字符串，避免 Jinja 显示怪
    cleaned: List[Dict[str, Any]] = []
    for p in props:
        p2 = dict(p)
        p2["available_date"] = format_date_any(p2.get("available_date"))
        p2["published_at"] = format_date_any(p2.get("published_at"))
        cleaned.append(p2)

    # 展示“实际查询条件”
    region_patterns = _region_patterns(customer.get("regions") or [])
    room_type_descs = [
        f"{rt.get('bedrooms')}b{rt.get('bathrooms')}b"
        for rt in (customer.get("room_types") or [])
    ]
    conditions_text = "\n".join(
        [
            f"客户：{customer.get('name')} ({customer.get('id')})",
            f"模式：{'今日新增' if today_only else '历史'}",
            f"历史天数：{lookback_days}（0=全量）" if not today_only else "历史天数：-",
            f"价格：{customer.get('min_price')}-{customer.get('max_price')} pw",
            f"区域（配置）：{', '.join(customer.get('regions') or [])}",
            f"区域（实际匹配LIKE）：{', '.join(region_patterns)}",
            f"房型：{', '.join(room_type_descs)}",
            f"入住日期：{min_av.isoformat() if min_av else ''} ~ {max_av.isoformat() if max_av else ''}",
            f"限制条数：{limit}",
            f"生成AI文案：{'是' if include_ai else '否'}",
        ]
    )

    return render_template_string(
        INDEX_HTML,
        title=APP_TITLE,
        settings_file=SETTINGS_FILE,
        customers=customers,
        selected_customer_id=customer_id,
        mode=mode,
        lookback_days=str(lookback_days),
        limit=str(limit),
        min_available_date=(min_av.isoformat() if min_av else ""),
        max_available_date=(max_av.isoformat() if max_av else ""),
        include_ai=include_ai,
        results=cleaned,
        conditions_text=conditions_text,
        result_url=request.url,
        message="",
        error=False,
    )


@app.get("/settings")
def edit_settings():
    settings = load_settings()
    json_text = json.dumps(settings, ensure_ascii=False, indent=2)
    return render_template_string(
        SETTINGS_HTML,
        title=APP_TITLE,
        settings_file=SETTINGS_FILE,
        json_text=json_text,
        message="",
        error=False,
    )


@app.post("/settings")
def save_settings_route():
    raw = request.form.get("json_text", "")
    try:
        settings = json.loads(raw)
        # 基础校验：customers
        for c in settings.get("customers", []):
            ok, msg = validate_customer(c)
            if not ok:
                raise ValueError(f"customers 配置不合法（{c.get('id','?')}）：{msg}")
        save_settings(settings)
        return redirect(url_for("index"))
    except Exception as e:
        return render_template_string(
            SETTINGS_HTML,
            title=APP_TITLE,
            settings_file=SETTINGS_FILE,
            json_text=raw,
            message=str(e),
            error=True,
        )


def main():
    print("[INFO] 启动 Web 服务：打开浏览器访问 http://127.0.0.1:5000/")
    # 0.0.0.0 方便局域网访问（如果你不需要可改回 127.0.0.1）
    app.run(host="127.0.0.1", port=5000, debug=False)


if __name__ == "__main__":
    main()


# -*- coding: utf-8 -*-
import os
import sys
import json
import requests
import mysql.connector
from mysql.connector import Error
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple


# ================= 配置与常量 =================

APP_TITLE = "每日客户房源推荐"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEDUP_FILE = os.path.join(BASE_DIR, "sent_records.json")


# ================= 1. 基础工具函数 (复用 app.py) =================

def _parse_date(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    try:
        return datetime.strptime(s.strip(), "%Y-%m-%d").date()
    except ValueError:
        return None


def load_settings(settings_file: str) -> Dict[str, Any]:
    if not os.path.exists(settings_file):
        raise FileNotFoundError(f"找不到配置文件：{settings_file}")
    with open(settings_file, "r", encoding="utf-8") as f:
        return json.load(f)
    

def get_db_config(settings: Dict[str, Any]) -> Dict[str, Any]:
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



# ================= 2. 数据库查询逻辑 (复用 app.py) =================

def build_client_query(
    customer: Dict[str, Any],
    today_only: bool = False,  
    lookback_days: int = 0,
    min_available_date: Optional[date] = None,
    max_available_date: Optional[date] = None,
    limit: int = 10
) -> Tuple[str, Tuple[Any, ...]]:
    
    select_fields = [
        "p.id", "p.url", "p.address", "r.name AS region_name",
        "p.bedroom_count", "p.bathroom_count", "p.price", 
        "p.average_score", "p.description_cn"
    ]
    extra_select = []
    
    from_clause = ["FROM properties p"]
    join_clause = ["JOIN regions r ON p.region_id = r.id"]
    where_clause = ["1=1"]
    params: List[Any] = []
    group_by_clause = "" 

    target_schools = customer.get("targetSchools") or []
    max_commute = customer.get("maxCommuteTime")

    if target_schools:
        join_clause.append("JOIN property_school ps ON p.id = ps.property_id")
        join_clause.append("JOIN schools s ON ps.school_id = s.id")
        extra_select.append("MIN(ps.commute_time) as commute_time")
        
        school_clauses = []
        for school in target_schools:
            school_clauses.append("LOWER(s.name) LIKE LOWER(%s)")
            params.append(f"%{school}%")
        where_clause.append("(" + " OR ".join(school_clauses) + ")")

        if max_commute:
            where_clause.append("ps.commute_time <= %s")
            params.append(int(max_commute))
        group_by_clause = "GROUP BY p.id"
    else:
        extra_select.append("NULL as commute_time")

    if today_only:
        where_clause.append("p.published_at >= CURDATE()")
    else:
        if lookback_days > 0:
            where_clause.append("p.published_at >= DATE_SUB(CURDATE(), INTERVAL %s DAY)")
            params.append(int(lookback_days))

    where_clause.append("p.price BETWEEN %s AND %s")
    params.extend([int(customer.get("minPrice", 0)), int(customer.get("maxPrice", 999999))])

    regions = customer.get("regions") or []
    if regions:
        region_clauses = []
        for region in regions:
            variants = [region.lower().strip()]
            if " " in region: variants.append(region.lower().replace(" ", "-"))
            if "-" in region: variants.append(region.lower().replace("-", " "))
            for v in set(variants):
                region_clauses.append("LOWER(r.name) LIKE LOWER(%s)")
                params.append(f"%{v}%")
        where_clause.append("(" + " OR ".join(region_clauses) + ")")

    room_types = customer.get("roomTypes") or []
    if room_types:
        rt_clauses = []
        for rt in room_types:
            rt_clauses.append("(p.bedroom_count = %s AND p.bathroom_count = %s)")
            params.extend([int(rt.get("bedrooms", 0)), int(rt.get("bathrooms", 0))])
        where_clause.append("(" + " OR ".join(rt_clauses) + ")")

    if min_available_date:
        where_clause.append("p.available_date >= %s")
        params.append(min_available_date)
    
    if max_available_date:
        where_clause.append("p.available_date <= %s")
        params.append(max_available_date)

    if customer.get("minScore"):
        where_clause.append("p.average_score >= %s")
        params.append(float(customer.get("minScore")))

    final_select = ", ".join(select_fields + extra_select)
    sql = f"""
        SELECT {final_select}
        { ' '.join(from_clause) }
        { ' '.join(join_clause) }
        WHERE {' AND '.join(where_clause)}
        {group_by_clause}
        ORDER BY p.published_at DESC
        LIMIT %s
    """
    params.append(limit)
    return sql, tuple(params)


def fetch_properties(settings, customer):
    db_config = get_db_config(settings)
    
    limit = customer.get("defaultLimit", 10)
    min_av = _parse_date(customer.get("minAvailableDate"))
    max_av = _parse_date(customer.get("maxAvailableDate"))
    
    sql, params = build_client_query(
        customer=customer,
        today_only=False,
        lookback_days=30,
        min_available_date=min_av,
        max_available_date=max_av,
        limit=limit
    )
    # ========================

    try:
        with mysql.connector.connect(**db_config) as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(sql, params)
                return cursor.fetchall()
    except Error as e:
        print(f"[ERROR] 数据库查询失败: {e}")
        return []


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
    

def validate_customer(c: Dict[str, Any]) -> Tuple[bool, str]:
    required = ["id", "name", "min_price", "max_price", "regions", "room_types", "webhook_url", "minRating"]
    for k in required:
        if k not in c:
            return False, f"缺少字段：{k}"
    if not isinstance(c["regions"], list) or not c["regions"]:
        return False, "regions 必须是非空数组"
    if not isinstance(c["roomTypes"], list) or not c["room_types"]:
        return False, "room_types 必须是非空数组"
    url = c.get("webhookUrl", "")
    if not isinstance(url, str) or not url.startswith("http"):
        return False, "webhook_url 格式错误，必须以 http 开头"
    return True, ""


def find_customer(settings: Dict[str, Any], customer_id: str) -> Optional[Dict[str, Any]]:
    for c in settings.get("customers", []):
        if c.get("id") == customer_id:
            return c
    return None



# ================= 3. AI 文案生成 (复用 app.py) =================

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


def load_sent_records():
    if not os.path.exists(DEDUP_FILE): return []
    try:
        with open(DEDUP_FILE, "r") as f: return json.load(f)
    except: return []


def save_sent_records(records):
    with open(DEDUP_FILE, "w") as f:
        json.dump(records[-1000:], f)



# ================= 4. 微信推送 =================

def send_wechat_webhook(webhook_url, customer_name, props, settings):
    if not props: return
    
    print(f"   -> 准备推送 {len(props)} 条房源...")
    
    lines = [f"## 🏠 {customer_name}：今日推荐 ({len(props)}套)"]
    for i, p in enumerate(props):
        ai_text = make_summary(settings, p)
        
        commute_info = ""
        if p.get('commute_time'):
            commute_info = f"🚶{p['commute_time']} mins\n"
            
        lines.append(
            f"**[{i + 1}. {p['address']}]({p['url']})**\n" 
            f"💰 <font color='warning'>${int(p['price'])}/wk</font> | "
            f"📍 {p['region_name']} | "
            f"🏠 {p['bedroom_count']}b{p['bathroom_count']}b | "
            f"⭐ {p['average_score']} | {commute_info}"
            f"> {ai_text}\n\n"
        )

    payload = {
        "msgtype": "markdown",
        "markdown": {"content": "\n\n".join(lines)}
    }
    try:
        requests.post(webhook_url, json=payload, timeout=10)
        print("   -> 推送成功！")
    except Exception as e:
        print(f"   -> 推送失败: {e}")



# ================= 5. Main 函数 ======================

def main():
    print("="*50)
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 任务启动")

    if len(sys.argv) != 2:
        print("Usage: python bot.py <settings_file_path>", file=sys.stderr)
        sys.exit(1)

    settings_file = sys.argv[1]
    
    # 加载配置
    try:
        settings = load_settings(settings_file)
    except Exception as e:
        print(f"[FATAL] 配置文件加载失败: {e}")
        return

    # 加载去重记录
    sent_ids = load_sent_records()
    sent_ids_set = set(str(x) for x in sent_ids)
    new_sent_ids = list(sent_ids)

    # 遍历客户列表
    customers = settings.get("customers", [])
    if not customers:
        print("[WARN] customers.json 中没有客户配置")
        return

    for customer in customers:
        name = customer.get("name", "Unknown")
        webhook = customer.get("webhookUrl")
        
        print(f"\n正在处理客户: {name} ...")
        
        # 检查 Webhook
        if not webhook:
            print("   -> ⚠️ 跳过：未配置 webhook_url")
            continue

        # 查房源
        props = fetch_properties(settings, customer)
        if not props:
            print("   -> 未查到符合条件的房源")
            continue
            
        # 去重
        fresh_props = []
        for p in props:
            p_id_str = str(p['id'])
            if p_id_str not in sent_ids_set:
                fresh_props.append(p)
        
        print(f"   -> 查到 {len(props)} 条，去重后剩余 {len(fresh_props)} 条新房源")

        # 推送与记录
        if fresh_props:
            send_wechat_webhook(webhook, name, fresh_props, settings)
            for p in fresh_props:
                p_id_str = str(p['id'])
                if p_id_str not in sent_ids_set:
                    new_sent_ids.append(p_id_str)
                    sent_ids_set.add(p_id_str)
        else:
            print("   -> 没有新数据，无需推送")

    # 4. 保存去重记录
    save_sent_records(new_sent_ids)
    print(f"\n任务完成。当前已记录 {len(new_sent_ids)} 条历史推送。")
    print("="*50)



if __name__ == "__main__":
    main()
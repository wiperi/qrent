# -*- coding: utf-8 -*-
import os
import sys
import json
import time
import requests
import mysql.connector
from mysql.connector import Error
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple, Union

# ================= 0. 基础配置与常量 =================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_json_file(filepath: str) -> Union[Dict, List, None]:
    if not os.path.exists(filepath):
        return None
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[ERROR] 读取文件 {filepath} 失败: {e}")
        return None

def save_json_file(filepath: str, data: Any):
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[ERROR] 写入文件 {filepath} 失败: {e}")

# ================= 1. 数据库服务 =================

def get_db_connection(db_config: Dict[str, Any]):
    max_retries = 3
    timeout = db_config.get("connection_timeout", 10)
    connect_args = {
        "host": db_config.get("host"),
        "port": db_config.get("port", 3306),
        "user": db_config.get("user"),
        "password": db_config.get("password"),
        "database": db_config.get("database"),
        "connect_timeout": timeout
    }

    for attempt in range(max_retries):
        try:
            conn = mysql.connector.connect(**connect_args)
            return conn
        except Error as e:
            if attempt < max_retries - 1:
                print(f"[WARN] 数据库连接失败 (尝试 {attempt+1}/{max_retries}): {e}")
                time.sleep(2)
            else:
                print(f"[ERROR] 数据库连接最终失败: {e}")
                raise e

def build_query_sql(
    preferences: Dict[str, Any], 
    global_sort_by: str = "published_at",
    limit: int = 10
) -> Tuple[str, List[Any]]:
    select_fields = [
        "p.id", "p.url", "p.address", "r.name AS region_name",
        "p.bedroom_count", "p.bathroom_count", "p.price", 
        "p.average_score", "p.published_at", "p.description_cn",
        "p.thumbnail_url", "p.available_date"
    ]
    extra_select = []
    
    from_clause = ["FROM properties p"]
    join_clause = ["JOIN regions r ON p.region_id = r.id"]
    where_clause = ["1=1"]
    params: List[Any] = []
    group_by_clause = ""

    target_schools = preferences.get("target_schools") or []
    max_commute = preferences.get("max_commute_time")

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

    min_price = int(preferences.get("min_price", 0))
    max_price = int(preferences.get("max_price", 999999))
    where_clause.append("p.price BETWEEN %s AND %s")
    params.extend([min_price, max_price])

    regions = preferences.get("regions") or []
    if regions:
        region_clauses = []
        for region in regions:
            clean_region = region.lower().strip()
            variants = {clean_region, clean_region.replace(" ", "-"), clean_region.replace("-", " ")}
            for v in variants:
                region_clauses.append("LOWER(r.name) LIKE LOWER(%s)")
                params.append(f"%{v}%")
        where_clause.append("(" + " OR ".join(region_clauses) + ")")

    room_types = preferences.get("room_types")
    if room_types:
        if isinstance(room_types, dict):
            room_types = [room_types]
        
        if isinstance(room_types, list) and len(room_types) > 0:
            rt_clauses = []
            for rt in room_types:
                bed = rt.get("bedrooms")
                bath = rt.get("bathrooms")
                if bed is not None and bath is not None:
                    rt_clauses.append("(p.bedroom_count = %s AND p.bathroom_count = %s)")
                    params.extend([int(bed), int(bath)])
            if rt_clauses:
                where_clause.append("(" + " OR ".join(rt_clauses) + ")")

    min_date_str = preferences.get("min_available_date")
    if min_date_str:
        where_clause.append("p.available_date >= %s")
        params.append(min_date_str)
        
    max_date_str = preferences.get("max_available_date")
    if max_date_str:
        where_clause.append("p.available_date <= %s")
        params.append(max_date_str)

    min_score = preferences.get("min_rating")
    if min_score:
        where_clause.append("p.average_score >= %s")
        params.append(float(min_score))

    order_clause = "ORDER BY p.published_at DESC"
    if global_sort_by == "price":
        order_clause = "ORDER BY p.price ASC"
    elif global_sort_by == "rating":
        order_clause = "ORDER BY p.average_score DESC"

    final_select = ", ".join(select_fields + extra_select)
    sql = f"""
        SELECT {final_select}
        { ' '.join(from_clause) }
        { ' '.join(join_clause) }
        WHERE {' AND '.join(where_clause)}
        {group_by_clause}
        {order_clause}
        LIMIT %s
    """
    params.append(limit)
    return sql, tuple(params)

def fetch_properties(db_config: Dict, preferences: Dict, global_settings: Dict) -> List[Dict]:
    sort_by = global_settings.get("sort_by", "published_at")
    limit = preferences.get("default_limit", global_settings.get("max_items", 10))
    
    sql, params = build_query_sql(preferences, sort_by, limit)
    
    try:
        conn = get_db_connection(db_config)
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(sql, params)
            results = cursor.fetchall()
        conn.close()
        return results
    except Exception as e:
        print(f"[ERROR] 查询执行失败: {e}")
        return []

# ================= 2. AI 服务 =================

def generate_summary(qwen_config: Dict, prop: Dict) -> str:
    api_key = qwen_config.get("api_key")
    if not api_key:
        return ""

    prompt = (
        f"请生成一句简短的租房营销文案（40字内），以评分开头（例如'18.5分'）。"
        f"数据：评分{prop.get('average_score')}/20，"
        f"地址{prop.get('address')}，"
        f"价格${int(prop.get('price'))}，"
        f"户型{prop.get('bedroom_count')}室{prop.get('bathroom_count')}卫。"
        f"特点：{prop.get('description_cn')[:50]}..."
    )

    headers = {
        "Authorization": f"Bearer {api_key}", 
        "Content-Type": "application/json"
    }
    data = {
        "model": qwen_config.get("model", "qwen-max"),
        "input": {"messages": [{"role": "user", "content": prompt}]},
        "parameters": {"temperature": 0.7, "max_tokens": 100},
    }
    
    try:
        resp = requests.post(qwen_config.get("api_url"), headers=headers, json=data, timeout=5)
        if resp.status_code == 200:
            res_json = resp.json()
            if "output" in res_json and "text" in res_json["output"]:
                return res_json["output"]["text"].strip()
    except Exception as e:
        print(f"[WARN] AI 生成失败: {e}")
    
    return ""

# ================= 3. 消息推送 =================

def send_webhook(webhook_url: str, task_name: str, props: List[Dict], qwen_config: Dict):
    """
    发送企业微信 Webhook (图文消息 + 封面总结卡片)
    """
    if not props: return
 
    chunk_size = 7
    total_count = len(props)
    today_str = datetime.now().strftime('%m-%d')
    
    for i in range(0, total_count, chunk_size):
        chunk_props = props[i:i + chunk_size]
        articles = []
        
        print(f"   -> 正在推送第 {i//chunk_size + 1} 批...")

        if i == 0:
            cover_pic = chunk_props[0].get('thumbnail_url')
            if not cover_pic or not str(cover_pic).startswith('http'):
                cover_pic = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&q=80&w=1080"
            
            header_article = {
                "title": f"👋 {task_name} 的专属日报\n📅 {today_str}  精选 {total_count} 套优质房源",
                "description": f"今日为您筛选了 {total_count} 套位于 {chunk_props[0]['region_name']} 等区域的房源，点击查看详情。",
                "url": chunk_props[0]['url'],
                "picurl": cover_pic
            }
            articles.append(header_article)

        for p in chunk_props:
            pic_url = p.get('thumbnail_url')
            if not pic_url or not str(pic_url).startswith('http'):
                pic_url = "https://cdn-icons-png.flaticon.com/512/25/25694.png"
            summary = generate_summary(qwen_config, p)
            if not summary:
                summary = f"{p['bedroom_count']}室{p['bathroom_count']}卫 | {p['region_name']}"
            title = (
                f"${int(p['price'])} | {p['region_name']} | "
                f"{p['bedroom_count']}b{p['bathroom_count']}b | "
                f"⭐{p['average_score']}"
            )

            article = {
                "title": title,
                "description": summary, 
                "url": p['url'],
                "picurl": pic_url
            }
            articles.append(article)

        payload = {
            "msgtype": "news",
            "news": {
                "articles": articles
            }
        }

        try:
            res = requests.post(webhook_url, json=payload, timeout=10)
            if res.status_code != 200:
                print(f"   -> [ERROR] 推送响应异常: {res.text}")
            else:
                print("   -> 推送成功")
        except Exception as e:
            print(f"   -> [ERROR] 推送请求失败: {e}")

def send_webhookV2(webhook_url: str, task_name: str, props: List[Dict], qwen_config: Dict):
    """
    发送企业微信 Webhook (使用图文消息 News 类型以显示图片)
    """
    if not props: return
    chunk_size = 8
    
    for i in range(0, len(props), chunk_size):
        chunk_props = props[i:i + chunk_size]
        articles = []
        
        print(f"   -> 正在推送第 {i//chunk_size + 1} 批，共 {len(chunk_props)} 条...")

        for p in chunk_props:
            pic_url = p.get('thumbnail_url')
            if not pic_url or not str(pic_url).startswith('http'):
                pic_url = "https://cdn-icons-png.flaticon.com/512/25/25694.png"

            summary = generate_summary(qwen_config, p)
            if not summary:
                summary = f"{p['bedroom_count']}室{p['bathroom_count']}卫 | {p['region_name']}"

            title = (
                f"${int(p['price'])}/wk | {p['region_name']} | "
                f"{p['bedroom_count']}b{p['bathroom_count']}b | "
                f"⭐{p['average_score']}"
            )

            article = {
                "title": title,
                "description": summary, 
                "url": p['url'],
                "picurl": pic_url
            }
            articles.append(article)

        payload = {
            "msgtype": "news",
            "news": {
                "articles": articles
            }
        }

        try:
            res = requests.post(webhook_url, json=payload, timeout=10)
            if res.status_code != 200:
                print(f"   -> [ERROR] 推送响应异常: {res.text}")
            else:
                print("   -> 推送成功")
        except Exception as e:
            print(f"   -> [ERROR] 推送请求失败: {e}")

def send_webhookV1(webhook_url: str, task_name: str, props: List[Dict], qwen_config: Dict):
    if not props: return
    print(f"   -> 正在推送到 {task_name}，共 {len(props)} 条...")
    content_lines = [f"## 🏠 {task_name} 今日推荐 ({len(props)}套)"]
    
    for idx, p in enumerate(props):
        summary = generate_summary(qwen_config, p)
        summary_block = f"> {summary}\n" if summary else ""

        avail_raw = p.get('available_date')
        if avail_raw:
            if hasattr(avail_raw, 'strftime'):
                date_str = avail_raw.strftime('%Y-%m-%d')
            else:
                date_str = str(avail_raw)[:10]
            avail_info = f"{date_str}"
        else:
            avail_info = "待定"
        
        commute_str = f"🚶{p['commute_time']}min\n" if p.get('commute_time') else ""

        thumb = p.get('thumbnail_url')
        img_markdown = ""
        if thumb and str(thumb).strip():
            img_markdown = f"\n[房源预览]({thumb})"
        
        item_text = (
            f"**[{idx+1}. {p['address']}]({p['url']})**\n"
            f"💰 <font color='warning'>${int(p['price'])}/wk</font> | "
            f"📍 {p['region_name']} | "
            f"📅 {avail_info} | "
            f"🏠 {p['bedroom_count']}b{p['bathroom_count']}b | "
            f"⭐ {p['average_score']} | {commute_str}"
            f"{img_markdown}\n"
            f"{summary_block}\n\n"
        )
        content_lines.append(item_text)

    payload = {
        "msgtype": "markdown",
        "markdown": {"content": "\n".join(content_lines)}
    }
    
    try:
        res = requests.post(webhook_url, json=payload, timeout=10)
        if res.status_code != 200:
            print(f"   -> [ERROR] 推送响应异常: {res.text}")
        else:
            print("   -> 推送成功")
    except Exception as e:
        print(f"   -> [ERROR] 推送请求失败: {e}")

# ================= 4. 主程序 =================

def main():
    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 开始执行任务...")

    if len(sys.argv) < 2 or len(sys.argv) > 2:
        print("Usage: python bot.py <config.json>")
        sys.exit(1)

    config_path = sys.argv[1]
    config = load_json_file(config_path)
    
    if not config:
        print("[FATAL] 无法加载配置文件，程序退出。")
        sys.exit(1)

    db_config = config.get("database", {})
    settings = config.get("settings", {})
    qwen_config = config.get("qwen", {})
    tasks = config.get("tasks", [])

    dedup_file_name = settings.get("dedup_file", "sent_records.json")
    dedup_path = os.path.join(BASE_DIR, dedup_file_name)
    
    sent_records = load_json_file(dedup_path) or []
    sent_ids_set = set(str(r) for r in sent_records)
    new_sent_ids = []

    enable_dedup = settings.get("enable_dedup", True)

    if not tasks:
        print("[WARN] 配置文件中没有发现任务 (tasks)。")
        return

    for task in tasks:
        name = task.get("name", "Unnamed Task")
        webhook = task.get("webhook_url")
        prefs = task.get("preferences", {})

        print(f"\n=== 处理任务: {name} ===")
        
        if not webhook:
            print("   -> 跳过: 缺少 webhook_url")
            continue

        raw_props = fetch_properties(db_config, prefs, settings)
        
        props_to_send = []
        for p in raw_props:
            p_id = str(p['id'])
            if enable_dedup and (p_id in sent_ids_set):
                continue
            props_to_send.append(p)
        
        print(f"   -> 查找到 {len(raw_props)} 条，去重后剩余 {len(props_to_send)} 条。")

        if props_to_send:
            send_webhookV1(webhook, name, props_to_send, qwen_config)
            for p in props_to_send:
                p_id = str(p['id'])
                if p_id not in sent_ids_set:
                    sent_ids_set.add(p_id)
                    new_sent_ids.append(p_id)
        else:
            print("   -> 无需推送。")

    if new_sent_ids:
        updated_records = (sent_records + new_sent_ids)[-2000:]
        save_json_file(dedup_path, updated_records)
        print(f"\n已更新去重记录，新增 {len(new_sent_ids)} 条。")

    print(f"\n任务结束。\n")

if __name__ == "__main__":
    main()
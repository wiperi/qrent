"""
CSV -> 数据库导入模块
保留旧数据：无新 thumbnail_url/commute_time 时不覆盖。
学校名称统一使用短名：UNSW / USYD / UTS。
"""
from __future__ import annotations

import os
import logging
from datetime import datetime
from typing import Optional, Tuple, Dict, Any

import pandas as pd
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

logger = logging.getLogger(__name__)


def load_env() -> Optional[str]:
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(here, "..", ".env"),
        os.path.join(here, "..", "..", ".env"),
        os.path.join(here, "..", "..", "..", ".env"),
        ".env",
    ]
    for p in candidates:
        if os.path.exists(p):
            load_dotenv(p, override=False)
            return p
    load_dotenv(override=False)
    return None


ENV_PATH = load_env()

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_DATABASE"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "connect_timeout": 60,
    "autocommit": False,
    "charset": "utf8mb4",
    "use_unicode": True,
}


def safe_int(val, default=0):
    if val is None or pd.isna(val) or val == "":
        return default
    try:
        return int(float(val))
    except Exception:
        return default


def safe_float(val, default=0.0):
    if val is None or pd.isna(val) or val == "":
        return default
    try:
        return float(val)
    except Exception:
        return default


def safe_str(val, default=""):
    if val is None or pd.isna(val):
        return default
    return str(val).strip()


def safe_datetime(val, default=None):
    if val is None or pd.isna(val) or val == "":
        return default or datetime.now()
    try:
        if isinstance(val, datetime):
            return val
        val_str = str(val).strip()
        for fmt in [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%m/%d/%Y",
            "%Y/%m/%d",
            "%Y-%m-%d %H:%M:%S.%f",
            "%d-%m-%Y",
            "%d-%m-%Y %H:%M:%S",
        ]:
            try:
                return datetime.strptime(val_str, fmt)
            except ValueError:
                continue
    except Exception:
        pass
    return default or datetime.now()


def normalize_region(value: str) -> str:
    text = str(value).strip().lower()
    for ch in ["–", "—", "_"]:
        text = text.replace(ch, "-")
    return "-".join(text.split())


def fetch_region_lookup(cursor) -> Dict[str, Dict[str, Any]]:
    cursor.execute("SELECT id, name, state, postcode FROM regions")
    lookup = {}
    for region_id, name, state, postcode in cursor.fetchall():
        key = normalize_region(name)
        lookup[key] = {"id": region_id, "name": name, "state": state, "postcode": postcode}
    return lookup


def parse_region_from_address(address_line2: str, region_lookup: Dict[str, Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    解析地址，支持多种格式：
    1. 完整格式: "Kensington, NSW, 2033" 或 "Kensington-NSW-2033"
    2. 简单格式: "Kensington" (新爬取的数据)
    
    通过模糊匹配数据库中已有的区域
    """
    if not address_line2 or pd.isna(address_line2):
        return None
    normalized = normalize_region(address_line2)
    try:
        # 情况1: 解析完整格式 "suburb-state-postcode"
        parts = normalized.split("-")
        if len(parts) >= 3:
            for i, part in enumerate(parts):
                if part.upper() == "NSW":
                    if i > 0 and i < len(parts) - 1:
                        suburb = " ".join(parts[:i]).replace("-", " ").strip()
                        postcode = safe_int(parts[i + 1])
                        return {"name": suburb, "state": "NSW", "postcode": postcode if postcode > 0 else 0}
        
        # 情况2: 尝试完全匹配
        if normalized in region_lookup:
            region = region_lookup[normalized]
            return {"name": region["name"], "state": region["state"], "postcode": region["postcode"]}
        
        # 情况3: 简单suburb名称，需要在数据库中模糊匹配
        # 提取suburb核心名称
        suburb_core = normalized.split("-")[0].replace("-", " ").strip()
        
        # 在region_lookup中查找匹配的区域
        for lookup_key, region_data in region_lookup.items():
            # 检查lookup_key是否以suburb_core开头或完全匹配suburb部分
            lookup_suburb = lookup_key.split("-")[0] if "-" in lookup_key else lookup_key
            
            if lookup_suburb == suburb_core:
                logger.info(f"模糊匹配成功: '{address_line2}' -> '{region_data['name']}'")
                return {"name": region_data["name"], "state": region_data["state"], "postcode": region_data["postcode"]}
            
            # 检查region_data的name是否匹配
            region_name_norm = normalize_region(region_data["name"])
            if region_name_norm == suburb_core:
                logger.info(f"模糊匹配成功: '{address_line2}' -> '{region_data['name']}'")
                return {"name": region_data["name"], "state": region_data["state"], "postcode": region_data["postcode"]}
        
        # 情况4: 如果suburb_core包含空格，尝试替换为连字符再匹配
        if " " in suburb_core:
            suburb_with_dash = suburb_core.replace(" ", "-")
            for lookup_key, region_data in region_lookup.items():
                lookup_suburb = lookup_key.split("-")[0] if "-" in lookup_key else lookup_key
                if lookup_suburb == suburb_with_dash:
                    logger.info(f"模糊匹配成功: '{address_line2}' -> '{region_data['name']}'")
                    return {"name": region_data["name"], "state": region_data["state"], "postcode": region_data["postcode"]}
        
        # 情况5: 如果都匹配不上，创建新的简单suburb记录（state=NSW, postcode=0）
        suburb_only = normalized.replace("-", " ").strip()
        if suburb_only:
            logger.warning(f"未找到匹配区域: '{address_line2}'，将创建新记录")
            return {"name": suburb_only, "state": "NSW", "postcode": 0}
            
    except Exception as e:
        logger.warning(f"parse region error for {address_line2}: {e}")
    return None


def get_or_create_region(cursor, connection, region_info, region_lookup):
    if not region_info:
        return None
    key = normalize_region(region_info["name"])
    if key in region_lookup:
        return region_lookup[key]["id"]
    try:
        cursor.execute(
            "SELECT id, name, state, postcode FROM regions WHERE name = %s AND state = %s AND postcode = %s",
            (region_info["name"], region_info["state"], region_info["postcode"]),
        )
        result = cursor.fetchone()
        if result:
            region_id = result[0]
            region_lookup[key] = {"id": region_id, "name": result[1], "state": result[2], "postcode": result[3]}
            return region_id
        cursor.execute(
            "INSERT INTO regions (name, state, postcode) VALUES (%s, %s, %s)",
            (region_info["name"], region_info["state"], region_info["postcode"]),
        )
        connection.commit()
        region_id = cursor.lastrowid
        region_lookup[key] = {
            "id": region_id,
            "name": region_info["name"],
            "state": region_info["state"],
            "postcode": region_info["postcode"],
        }
        return region_id
    except Exception as e:
        logger.error(f"create region failed {region_info}: {e}")
        return None


def get_school_id(cursor, school_name: str) -> Optional[int]:
    try:
        cursor.execute("SELECT id FROM schools WHERE name = %s", (school_name,))
        result = cursor.fetchone()
        if result:
            return result[0]
        cursor.execute("INSERT INTO schools (name) VALUES (%s)", (school_name,))
        cursor.connection.commit() if hasattr(cursor, "connection") else None
        cursor.execute("SELECT id FROM schools WHERE name = %s", (school_name,))
        result = cursor.fetchone()
        return result[0] if result else None
    except Exception as e:
        logger.error(f"get/create school id failed {school_name}: {e}")
        return None


def import_dataframe(df: pd.DataFrame, school_name: str) -> Tuple[int, int]:
    """核心导入逻辑，返回 (new+updated, errors)"""
    connection = None
    cursor = None
    total_processed = 0
    errors = 0
    try:
        logger.info(f"connecting db... host={DB_CONFIG['host']} db={DB_CONFIG['database']}")
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor(buffered=True)

        school_id = get_school_id(cursor, school_name)
        if not school_id:
            logger.error(f"school not found: {school_name}")
            return 0, 1

        cursor.execute("SELECT house_id FROM properties WHERE house_id IS NOT NULL")
        existing = {row[0] for row in cursor.fetchall()}
        region_lookup = fetch_region_lookup(cursor)

        for index, row in df.iterrows():
            try:
                house_id = safe_int(row.get("houseId"))
                if house_id == 0:
                    continue

                region_info = parse_region_from_address(row.get("addressLine2"), region_lookup)
                region_id = get_or_create_region(cursor, connection, region_info, region_lookup)
                if not region_id:
                    continue

                price = safe_int(row.get("pricePerWeek"))
                address = safe_str(row.get("addressLine1"))
                bedroom_count = safe_float(row.get("bedroomCount"))
                bathroom_count = safe_float(row.get("bathroomCount"))
                parking_count = safe_float(row.get("parkingCount"))
                property_type = safe_int(row.get("propertyType"), 1)
                available_date = safe_datetime(row.get("available_date"), None)
                keywords = safe_str(row.get("keywords"), None) if safe_str(row.get("keywords")) else None
                average_score = safe_float(row.get("average_score"), None) if pd.notna(row.get("average_score")) else None
                description_en = safe_str(row.get("description_en"), None) if safe_str(row.get("description_en")) else None
                description_cn = safe_str(row.get("description_cn"), None) if safe_str(row.get("description_cn")) else None
                url = safe_str(row.get("url"), None) if safe_str(row.get("url")) else None

                thumbnail_url = ""
                if "thumbnail_url" in df.columns and safe_str(row.get("thumbnail_url")):
                    thumbnail_url = safe_str(row.get("thumbnail_url"))
                elif "image" in df.columns and safe_str(row.get("image")):
                    thumbnail_url = safe_str(row.get("image"))

                if "published_at" in df.columns:
                    published_at = safe_datetime(row.get("published_at"))
                elif "publishedAt" in df.columns:
                    published_at = safe_datetime(row.get("publishedAt"))
                elif "date_published" in df.columns:
                    published_at = safe_datetime(row.get("date_published"))
                else:
                    published_at = datetime.now()

                if house_id in existing:
                    update_sql = """
                        UPDATE properties SET 
                            price = %s, address = %s, region_id = %s, 
                            bedroom_count = %s, bathroom_count = %s, 
                            parking_count = %s, property_type = %s,
                            available_date = %s, keywords = %s, 
                            average_score = %s, description_en = %s,
                            description_cn = %s, url = %s, published_at = %s,
                            thumbnail_url = %s
                        WHERE house_id = %s
                    """
                    cursor.execute(
                        update_sql,
                        (
                            price,
                            address,
                            region_id,
                            bedroom_count,
                            bathroom_count,
                            parking_count,
                            property_type,
                            available_date,
                            keywords,
                            average_score,
                            description_en,
                            description_cn,
                            url,
                            published_at,
                            thumbnail_url,
                            house_id,
                        ),
                    )
                    cursor.execute("SELECT id FROM properties WHERE house_id = %s", (house_id,))
                    result = cursor.fetchone()
                    property_id = result[0] if result else None
                else:
                    insert_sql = """
                        INSERT INTO properties (
                            price, address, region_id, bedroom_count, 
                            bathroom_count, parking_count, property_type, 
                            house_id, available_date, keywords, 
                            average_score, description_en, description_cn, 
                            url, published_at, thumbnail_url
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    cursor.execute(
                        insert_sql,
                        (
                            price,
                            address,
                            region_id,
                            bedroom_count,
                            bathroom_count,
                            parking_count,
                            property_type,
                            house_id,
                            available_date,
                            keywords,
                            average_score,
                            description_en,
                            description_cn,
                            url,
                            published_at,
                            thumbnail_url,
                        ),
                    )
                    property_id = cursor.lastrowid
                    existing.add(house_id)

                if not property_id:
                    errors += 1
                    continue

                if thumbnail_url:
                    cursor.execute("DELETE FROM property_images WHERE property_id = %s", (property_id,))
                    cursor.execute(
                        "INSERT INTO property_images (property_id, url, display_order) VALUES (%s, %s, %s)",
                        (property_id, thumbnail_url, 0),
                    )

                cursor.execute("DELETE FROM property_school WHERE property_id = %s AND school_id = %s", (property_id, school_id))

                commute_time = None
                raw_commute_value = None
                if school_name == "UNSW":
                    raw_commute_value = row.get("commuteTime_UNSW")
                elif school_name == "USYD":
                    raw_commute_value = row.get("commuteTime_USYD")
                elif school_name == "UTS":
                    raw_commute_value = row.get("commuteTime_UTS")
                if raw_commute_value is not None and not pd.isna(raw_commute_value):
                    commute_time = safe_int(raw_commute_value)
                if commute_time is None:
                    raw_general_value = row.get("commute_time")
                    if raw_general_value is not None and not pd.isna(raw_general_value):
                        commute_time = safe_int(raw_general_value)

                cursor.execute(
                    """
                    INSERT INTO property_school (property_id, school_id, commute_time)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE commute_time = VALUES(commute_time)
                    """,
                    (property_id, school_id, commute_time),
                )

                total_processed += 1

                if total_processed % 100 == 0:
                    connection.commit()
                    logger.info("import progress: %s rows", total_processed)

            except Exception as e:
                logger.error(f"row {index+1} failed: {e}")
                errors += 1
                continue

        connection.commit()
        
        # 删除过期的 RealEstate 房源（不删除 Domain 房源）
        logger.info("\n🔍 检查并删除过期的 RealEstate 房源...")
        
        # 获取 CSV 中所有的 RealEstate house_id
        csv_realestate_house_ids = set()
        if 'url' in df.columns:
            csv_realestate_house_ids = set(
                df[df['url'].str.contains('realestate.com.au', na=False, case=False)]['houseId'].dropna().astype(int)
            )
        
        logger.info(f"  CSV 中有 {len(csv_realestate_house_ids)} 个 RealEstate house_id")
        
        # 查询数据库中该学校的所有 RealEstate 房源
        cursor.execute("""
            SELECT DISTINCT p.house_id, p.id, p.url
            FROM properties p
            JOIN property_school ps ON p.id = ps.property_id
            WHERE ps.school_id = %s AND p.house_id IS NOT NULL
        """, (school_id,))
        db_properties = cursor.fetchall()
        
        # 筛选出 RealEstate 房源
        db_realestate_properties = {}
        for house_id, property_id, url in db_properties:
            if url and 'realestate.com.au' in url.lower():
                db_realestate_properties[house_id] = property_id
        
        db_realestate_house_ids = set(db_realestate_properties.keys())
        logger.info(f"  数据库中有 {len(db_realestate_house_ids)} 个 {school_name} 的 RealEstate house_id")
        
        # 找出过期的 RealEstate 房源（数据库有但 CSV 没有）
        outdated_house_ids = db_realestate_house_ids - csv_realestate_house_ids
        
        if outdated_house_ids:
            logger.info(f"  ⚠️  发现 {len(outdated_house_ids)} 个过期的 RealEstate 房源")
            deleted_count = 0
            
            for house_id in outdated_house_ids:
                try:
                    property_id = db_realestate_properties.get(house_id)
                    if property_id:
                        # 删除该学校的关联
                        cursor.execute(
                            "DELETE FROM property_school WHERE property_id = %s AND school_id = %s",
                            (property_id, school_id)
                        )
                        
                        # 检查是否还有其他学校关联
                        cursor.execute(
                            "SELECT COUNT(*) FROM property_school WHERE property_id = %s",
                            (property_id,)
                        )
                        remaining_schools = cursor.fetchone()[0]
                        
                        # 如果没有其他学校关联，删除房源及其图片
                        if remaining_schools == 0:
                            cursor.execute("DELETE FROM property_images WHERE property_id = %s", (property_id,))
                            cursor.execute("DELETE FROM properties WHERE id = %s", (property_id,))
                            deleted_count += 1
                            
                except Exception as e:
                    logger.error(f"    删除 house_id {house_id} 时出错: {e}")
                    continue
            
            connection.commit()
            logger.info(f"  ✅ 删除了 {deleted_count} 个过期的 RealEstate 房源")
        else:
            logger.info(f"  ✅ 没有发现过期的 RealEstate 房源")
        
        return total_processed, errors
    except Error as e:
        logger.error(f"db error: {e}")
        if connection and connection.is_connected():
            connection.rollback()
        return total_processed, errors + 1
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
            logger.info("db disconnected")


def import_csv(csv_path: str, school_name: Optional[str] = None) -> Tuple[int, int]:
    fname_upper = csv_path.upper()
    if not school_name:
        if "UNSW" in fname_upper:
            school_name = "UNSW"
        elif "USYD" in fname_upper:
            school_name = "USYD"
        elif "UTS" in fname_upper:
            school_name = "UTS"
    if not school_name:
        raise ValueError(f"cannot infer school from file: {csv_path}")

    logger.info("start import csv=%s school=%s env=%s", csv_path, school_name, ENV_PATH or "")
    df = pd.read_csv(csv_path, encoding="utf-8-sig")
    return import_dataframe(df, school_name)


__all__ = ["import_csv", "import_dataframe"]

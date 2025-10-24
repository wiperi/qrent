#!/usr/bin/env python3
import os
import sys
import pandas as pd
import mysql.connector
from mysql.connector import Error
from tqdm import tqdm
from datetime import datetime
import glob
from dotenv import load_dotenv
import os

# Try to load .env from multiple possible locations
env_paths = [
    '.env',
    '../.env', 
    '../../.env',
    '/app/.env'
]

for env_path in env_paths:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break
else:
    # If no .env file found, try to load from environment
    load_dotenv()

DB_CONFIG = {
    'host': os.getenv("DB_HOST"),
    'user': os.getenv("DB_USER"),
    'password': os.getenv("DB_PASSWORD"),
    'database': os.getenv("DB_DATABASE"),
    'port': int(os.getenv("DB_PORT", 3306)),
    'connect_timeout': 60,
    'autocommit': False,
    'charset': 'utf8mb4',
    'use_unicode': True
}

def safe_int(val, default=0):
    if val is None or pd.isna(val) or val == '':
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default

def safe_float(val, default=0.0):
    if val is None or pd.isna(val) or val == '':
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

def safe_str(val, default=''):
    if val is None or pd.isna(val):
        return default
    return str(val).strip()

def safe_datetime(val, default=None):
    if val is None or pd.isna(val) or val == '':
        return default or datetime.now()
    
    try:
        if isinstance(val, datetime):
            return val
        
        val_str = str(val).strip()
        if val_str:
            formats = [
                '%Y-%m-%d %H:%M:%S',
                '%Y-%m-%d',
                '%d/%m/%Y',
                '%m/%d/%Y',
                '%Y/%m/%d',
                '%Y-%m-%d %H:%M:%S.%f',
                '%d-%m-%Y',
                '%d-%m-%Y %H:%M:%S'
            ]
            
            for fmt in formats:
                try:
                    return datetime.strptime(val_str, fmt)
                except ValueError:
                    continue
    except Exception:
        pass
    
    return default or datetime.now()

def clean_csv_file(csv_file, output_file=None):
    print(f"clean: {csv_file}")
    
    try:
        df = pd.read_csv(csv_file)
        original_cols = len(df.columns)
        print(f"file {len(df)} ，{original_cols} ")
        print(f" {list(df.columns)}")
        
        columns_to_remove = ['averageScore', 'commuteTime', 'availableDate']
        
        removed_cols = []
        for col in columns_to_remove:
            if col in df.columns:
                df = df.drop(columns=[col])
                removed_cols.append(col)
        
        if removed_cols:
            print(f"delete: {removed_cols}")
        else:
            print("donot find")
        
        print(f"now {len(df.columns)} lines")
        print(f"name of the line: {list(df.columns)}")
        
        if output_file is None:
            base_name = os.path.splitext(csv_file)[0]
            output_file = f"{base_name}_cleaned.csv"
        
        df.to_csv(output_file, index=False)
        print(f"save to: {output_file}")
        
        return output_file, df
        
    except Exception as e:
        print(f"error {e}")
        return None, None

def parse_region_from_address(address_line2):
    if not address_line2 or pd.isna(address_line2):
        return None
    
    try:
        parts = str(address_line2).split('-')
        if len(parts) >= 3:
            nsw_index = -1
            for i, part in enumerate(parts):
                if part.strip().upper() == 'NSW':
                    nsw_index = i
                    break
            
            if nsw_index > 0 and nsw_index < len(parts) - 1:
                suburb = ' '.join(parts[:nsw_index]).strip().lower()
                state = 'NSW'
                postcode = safe_int(parts[nsw_index + 1].strip())
                
                if postcode > 0:
                    return {'name': suburb, 'state': state, 'postcode': postcode}
    except Exception as e:
        print(f"{address_line2}, error: {e}")
    
    return None

def get_or_create_region(cursor, connection, region_info):
    if not region_info:
        return None
    
    try:
        cursor.execute(
            "SELECT id FROM regions WHERE name = %s AND state = %s AND postcode = %s",
            (region_info['name'], region_info['state'], region_info['postcode'])
        )
        result = cursor.fetchone()
        
        if result:
            return result[0]
        
        cursor.execute(
            "INSERT INTO regions (name, state, postcode) VALUES (%s, %s, %s)",
            (region_info['name'], region_info['state'], region_info['postcode'])
        )
        connection.commit()
        return cursor.lastrowid
    
    except Exception as e:
        print(f"error in creat region: {e}")
        return None

def normalize_school_name(school_name):
    """Normalize school names to use short names"""
    name_mapping = {
        'UNSW': 'UNSW',
        'University of New South Wales': 'UNSW',
        'USYD': 'USYD', 
        'University of Sydney': 'USYD',
        'UTS': 'UTS',
        'University of Technology Sydney': 'UTS'
    }
    return name_mapping.get(school_name, school_name)

def get_school_id(cursor, school_name):
    try:
        # Normalize school name first
        normalized_name = normalize_school_name(school_name)
        
        cursor.execute("SELECT id FROM schools WHERE name = %s", (normalized_name,))
        result = cursor.fetchone()
        if result:
            return result[0]
        cursor.execute("INSERT INTO schools (name) VALUES (%s)", (normalized_name,))
        cursor.connection.commit() if hasattr(cursor, 'connection') else None
        cursor.execute("SELECT id FROM schools WHERE name = %s", (normalized_name,))
        result = cursor.fetchone()
        return result[0] if result else None
    except Exception as e:
        print(f"error to get or create school id  {e}")
        return None

def remove_delisted_properties(cursor, connection, current_house_ids, school_name, dry_run=False):
    """Remove properties that exist in database but not in current scraping data for this school"""
    try:
        school_id = get_school_id(cursor, school_name)
        if not school_id:
            print(f"Cannot find school: {school_name}")
            return 0
        
        # Get all house_ids currently in database for this school
        cursor.execute("""
            SELECT DISTINCT p.house_id 
            FROM properties p 
            JOIN property_school ps ON p.id = ps.property_id 
            WHERE ps.school_id = %s AND p.house_id IS NOT NULL
        """, (school_id,))
        
        db_house_ids = {row[0] for row in cursor.fetchall()}
        current_house_ids_set = set(current_house_ids)
        
        # Find house_ids that are in database but not in current scraping
        delisted_house_ids = db_house_ids - current_house_ids_set
        
        if not delisted_house_ids:
            print(f"✅ No delisted properties found for {school_name}")
            return 0
        
        print(f"🔍 Found {len(delisted_house_ids)} delisted properties for {school_name}")
        print(f"   Delisted house_ids: {sorted(list(delisted_house_ids))[:10]}{'...' if len(delisted_house_ids) > 10 else ''}")
        
        if dry_run:
            print(f"🧪 DRY RUN: Would remove {len(delisted_house_ids)} delisted properties")
            return len(delisted_house_ids)
        
        # First, remove property_school relationships for this school
        relationship_deleted = 0
        for house_id in delisted_house_ids:
            cursor.execute("""
                DELETE ps FROM property_school ps 
                JOIN properties p ON ps.property_id = p.id 
                WHERE p.house_id = %s AND ps.school_id = %s
            """, (house_id, school_id))
            relationship_deleted += cursor.rowcount
        
        # Then, delete properties that no longer have ANY school relationships
        properties_to_delete = []
        for house_id in delisted_house_ids:
            cursor.execute("""
                SELECT COUNT(*) FROM property_school ps 
                JOIN properties p ON ps.property_id = p.id 
                WHERE p.house_id = %s
            """, (house_id,))
            
            relationship_count = cursor.fetchone()[0]
            if relationship_count == 0:
                properties_to_delete.append(house_id)
        
        # Delete properties that have no school relationships left
        deleted_count = 0
        if properties_to_delete:
            placeholders = ','.join(['%s'] * len(properties_to_delete))
            cursor.execute(f"""
                DELETE FROM properties WHERE house_id IN ({placeholders})
            """, properties_to_delete)
            deleted_count = cursor.rowcount
        
        connection.commit()
        
        print(f"✨ Successfully removed {deleted_count} delisted properties for {school_name}")
        print(f"   (Removed {relationship_deleted} school relationships)")
        print(f"   (Properties with other school relationships were preserved)")
        return deleted_count
        
    except Exception as e:
        print(f"❌ Error removing delisted properties: {e}")
        connection.rollback()
        return 0

def import_to_database(df, school_name):
    connection = None
    cursor = None
    
    try:
        print(f"\nconnecting...")
        print(f"host: {DB_CONFIG['host']}")
        print(f"database: {DB_CONFIG['database']}")
        
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor(buffered=True)
        
        print(f"connected")
        
        school_id = get_school_id(cursor, school_name)
        if not school_id:
            print(f"do not find school: {school_name}")
            return
        
        print(f"school ID: {school_id}")
        
        # Get current house_ids from scraping data
        current_house_ids = []
        for index, row in df.iterrows():
            house_id = safe_int(row.get('houseId'))
            if house_id != 0:
                current_house_ids.append(house_id)
        
        print(f"Current scraping found {len(current_house_ids)} properties")
        
        # First do a dry run to see what would be removed
        dry_run_count = remove_delisted_properties(cursor, connection, current_house_ids, school_name, dry_run=True)
        
        if dry_run_count > 0:
            # Check if auto-delete is enabled (for Docker/automation)
            auto_delete = os.getenv('AUTO_DELETE_DELISTED', 'false').lower() in ['true', '1', 'yes']
            
            if auto_delete:
                print(f"🤖 AUTO_DELETE_DELISTED is enabled. Removing {dry_run_count} delisted properties automatically.")
                removed_count = remove_delisted_properties(cursor, connection, current_house_ids, school_name, dry_run=False)
            else:
                # Interactive mode - ask user
                try:
                    response = input(f"⚠️  This will remove {dry_run_count} delisted properties for {school_name}. Continue? (y/N): ").strip().lower()
                    if response in ['y', 'yes']:
                        removed_count = remove_delisted_properties(cursor, connection, current_house_ids, school_name, dry_run=False)
                    else:
                        print("❌ Skipping deletion of delisted properties")
                        removed_count = 0
                except (EOFError, KeyboardInterrupt):
                    print("\n❌ User cancelled. Skipping deletion of delisted properties")
                    removed_count = 0
        else:
            removed_count = 0
        
        cursor.execute("SELECT house_id FROM properties WHERE house_id IS NOT NULL")
        existing_properties = {row[0] for row in cursor.fetchall()}
        print(f"Database now has {len(existing_properties)} properties (after removing {removed_count})")
        
        new_count = 0
        update_count = 0
        error_count = 0
        skipped_count = 0
        commute_inserted = 0
        commute_skipped = 0
        
        for index, row in tqdm(df.iterrows(), total=len(df), desc=f"导入{school_name}房源"):
            try:
                house_id = safe_int(row.get('houseId'))
                if house_id == 0:
                    print(f"skip house_id: {index+1}line")
                    skipped_count += 1
                    continue
                
                region_info = parse_region_from_address(row.get('addressLine2'))
                region_id = get_or_create_region(cursor, connection, region_info)
                if not region_id:
                    print(f"cannot phrase: {row.get('addressLine2')}")
                    skipped_count += 1
                    continue
                
                price = safe_int(row.get('pricePerWeek'))
                address = safe_str(row.get('addressLine1'))
                bedroom_count = safe_float(row.get('bedroomCount'))
                bathroom_count = safe_float(row.get('bathroomCount'))
                parking_count = safe_float(row.get('parkingCount'))
                property_type = safe_int(row.get('propertyType'), 1)
                available_date = safe_datetime(row.get('available_date'), None)
                keywords = safe_str(row.get('keywords'), None) if safe_str(row.get('keywords')) else None
                average_score = safe_float(row.get('average_score'), None) if pd.notna(row.get('average_score')) else None
                description_en = safe_str(row.get('description_en'), None) if safe_str(row.get('description_en')) else None
                description_cn = safe_str(row.get('description_cn'), None) if safe_str(row.get('description_cn')) else None
                url = safe_str(row.get('url'), None) if safe_str(row.get('url')) else None
                image = safe_str(row.get('image'), None) if safe_str(row.get('image')) else None
                
                published_at = None
                if 'published_at' in df.columns:
                    published_at = safe_datetime(row.get('published_at'))
                elif 'publishedAt' in df.columns:
                    published_at = safe_datetime(row.get('publishedAt'))
                elif 'date_published' in df.columns:
                    published_at = safe_datetime(row.get('date_published'))
                else:
                    published_at = datetime.now()
                
                if house_id in existing_properties:
                    # Check if release_time exists for this property
                    cursor.execute("SELECT id, release_time FROM properties WHERE house_id = %s", (house_id,))
                    result = cursor.fetchone()
                    property_id = result[0] if result else None
                    existing_release_time = result[1] if result and result[1] else None
                    
                    # If release_time is null, set it to current time
                    release_time = existing_release_time if existing_release_time else datetime.now()
                    
                    update_sql = """
                        UPDATE properties SET 
                            price = %s, address = %s, region_id = %s, 
                            bedroom_count = %s, bathroom_count = %s, 
                            parking_count = %s, property_type = %s,
                            available_date = %s, keywords = %s, 
                            average_score = %s, description_en = %s,
                            description_cn = %s, url = %s, published_at = %s,
                            release_time = %s, image = %s
                        WHERE house_id = %s
                    """
                    cursor.execute(update_sql, (
                        price, address, region_id, bedroom_count, 
                        bathroom_count, parking_count, property_type,
                        available_date, keywords, average_score,
                        description_en, description_cn, url, published_at,
                        release_time, image, house_id
                    ))
                    
                    update_count += 1
                else:
                    # For new properties, set release_time to current time
                    release_time = datetime.now()
                    
                    insert_sql = """
                        INSERT INTO properties (
                            price, address, region_id, bedroom_count, 
                            bathroom_count, parking_count, property_type, 
                            house_id, available_date, keywords, 
                            average_score, description_en, description_cn, 
                            url, published_at, release_time, image
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    cursor.execute(insert_sql, (
                        price, address, region_id, bedroom_count,
                        bathroom_count, parking_count, property_type, 
                        house_id, available_date, keywords, 
                        average_score, description_en, description_cn, 
                        url, published_at, release_time, image
                    ))
                    property_id = cursor.lastrowid
                    existing_properties.add(house_id)
                    new_count += 1
                
                if property_id:
                    cursor.execute("DELETE FROM property_school WHERE property_id = %s AND school_id = %s", 
                                 (property_id, school_id))
                    
                    commute_time = None
                    raw_commute_value = None
                    
                    if school_name == 'UNSW':
                        raw_commute_value = row.get('commuteTime_UNSW')
                    elif school_name == 'USYD':
                        raw_commute_value = row.get('commuteTime_USYD')
                    elif school_name == 'UTS':
                        raw_commute_value = row.get('commuteTime_UTS')
                    
                    if raw_commute_value is not None and not pd.isna(raw_commute_value):
                        commute_time = safe_int(raw_commute_value)
                    
                    if commute_time is None:
                        raw_general_value = row.get('commute_time')
                        if raw_general_value is not None and not pd.isna(raw_general_value):
                            commute_time = safe_int(raw_general_value)
                    
                    cursor.execute(
                        "INSERT INTO property_school (property_id, school_id, commute_time) VALUES (%s, %s, %s)",
                        (property_id, school_id, commute_time)
                    )
                    
                    if commute_time is not None:
                        commute_inserted += 1
                        if index % 500 == 0:
                            print(f"add {school_name} commute time: {commute_time} ")
                    else:
                        commute_skipped += 1
                        if index % 500 == 0:
                            print(f"add {school_name} commute time: NULL")
            
                if (new_count + update_count) % 100 == 0:
                    connection.commit()
                    print(f"completed {new_count + update_count} lines (new: {new_count}, update: {update_count}, skip: {skipped_count}, error: {error_count})")
                    
            except Exception as e:
                print(f"error {index + 1} : {e}")
                error_count += 1
                continue
        
        connection.commit()
        print(f"\n {school_name} compete:")
        print(f" new: {new_count} lines")
        print(f"  update: {update_count}") 
        print(f"  skip: {skipped_count} ")
        print(f"  error: {error_count} ")
        print(f"  coummte time add: {commute_inserted}")
        print(f"  commute time skip: {commute_skipped}")
        
        cursor.execute("SELECT COUNT(*) FROM properties")
        total_properties = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM property_school WHERE school_id = %s", (school_id,))
        total_commutes = cursor.fetchone()[0]
        
        print(f"  property in school: {total_commutes}")
        print(f"  property in database {total_properties}")
        
    except Error as e:
        print(f"error: {e}")
        if connection and connection.is_connected():
            connection.rollback()
    except Exception as e:
        print(f"error: {e}")
        if connection and connection.is_connected():
            connection.rollback()
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
            print(f"disconneted")

def process_csv_file(csv_file, clean_only=False):
    if 'UNSW' in csv_file.upper():
        school_name = 'UNSW'
    elif 'USYD' in csv_file.upper():
        school_name = 'USYD'
    elif 'UTS' in csv_file.upper():
        school_name = 'UTS'
    else:
        print(f"cannot find : {csv_file}")
        return

    print(f"school: {school_name}")
    print("=" * 60)

    cleaned_file, df = clean_csv_file(csv_file)

    import_to_database(df, school_name)

def find_csv_files():
    patterns = ['*UNSW*.csv', '*USYD*.csv', '*UTS*.csv']
    found_files = []

    for pattern in patterns:
        files = glob.glob(pattern)
        found_files.extend(files)

    return found_files

def find_today_csv_files():
    current_date = datetime.now().strftime('%y%m%d')
    today_files = [
        f'UNSW_rentdata_{current_date}.csv',
        f'USYD_rentdata_{current_date}.csv',
        f'UTS_rentdata_{current_date}.csv'
    ]

    existing_files = []
    for file in today_files:
        if os.path.exists(file):
            existing_files.append(file)
        else:
            print(f"cannot find : {file}")

    return existing_files

def main():
    if len(sys.argv) < 2:
        current_date = datetime.now().strftime('%y%m%d')
        print(f"   python csv_cleaner_and_importer.py process UNSW_rentdata_{current_date}.csv")
        print(f"   python csv_cleaner_and_importer.py clean USYD_rentdata_{current_date}.csv")
        print("   python csv_cleaner_and_importer.py today")
        print("=" * 60)
        return
    
    mode = sys.argv[1].lower()
    
    if mode == 'process':
        if len(sys.argv) < 3:
            return
        
        csv_file = sys.argv[2]
        if not os.path.exists(csv_file):
            print(f"cannot find : {csv_file}")
            return
        
        process_csv_file(csv_file, clean_only=False)
        
    elif mode == 'clean':
        if len(sys.argv) < 3:
            print("error")
            return
        
        csv_file = sys.argv[2]
        if not os.path.exists(csv_file):
            print(f"error: {csv_file}")
            return
        
        process_csv_file(csv_file, clean_only=True)
        
    elif mode == 'today':
        today_files = find_today_csv_files()
        if not today_files:
            current_date = datetime.now().strftime('%y%m%d')
            print(f"cannot find (UNSW_rentdata_{current_date}.csv, USYD_rentdata_{current_date}.csv)")
            return
        
        print(f"find {len(today_files)} file:")
        for file in today_files:
            print(f"  - {file}")
        
        for csv_file in today_files:
            print(f"\n: {csv_file}")
            process_csv_file(csv_file, clean_only=False)
        
    elif mode == 'auto':
        csv_files = find_csv_files()
        if not csv_files:
            return
        
        print(f"find {len(csv_files)}:")
        for file in csv_files:
            print(f"  - {file}")
        
        for csv_file in csv_files:
            print(f"\n: {csv_file}")
            process_csv_file(csv_file, clean_only=False)
        
    else:
        print(f"error: {mode}")
        print("format: process, clean, auto, today")

if __name__ == "__main__":
    main()
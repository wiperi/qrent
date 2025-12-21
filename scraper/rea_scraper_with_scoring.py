#!/usr/bin/env python3
"""
REA Property Complete Processing Program - Following scraper workflow
Process:
1. Fetch property data using REA API
2. Save data to CSV file
3. Score properties using DashScope API
4. Calculate commute time to universities
5. Upload to database (using region_id, house_id and school_id)
"""

import os
import sys
import time
import pandas as pd
import mysql.connector
from mysql.connector import Error
from datetime import datetime, timedelta
import logging
from typing import List, Dict, Optional
import re
import dashscope
import googlemaps
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

# Load environment variables
env_paths = ['.env', '../.env', '../../.env', '/app/.env']
for env_path in env_paths:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break
else:
    load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import REA API client
from rea_scraper import REAApiClient

# ==================== Configuration Parameters ====================
# API Keys
REA_CLIENT_ID = os.getenv('REA_CLIENT_ID')
REA_CLIENT_SECRET = os.getenv('REA_CLIENT_SECRET')
DASHSCOPE_API_KEY = os.getenv('PROPERTY_RATING_API_KEY')
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')

# Database configuration
DB_CONFIG = {
    'host': os.getenv("DB_HOST"),
    'user': os.getenv("DB_USER"),
    'password': os.getenv("DB_PASSWORD"),
    'database': os.getenv("DB_DATABASE"),
    'port': int(os.getenv("DB_PORT", 3306)),
    'connect_timeout': 60,
    'charset': 'utf8mb4',
    'use_unicode': True
}

# University coordinates
SCHOOL_COORDINATES = {
    'UNSW': "University of New South Wales, Kensington NSW 2052, Australia",
    'USYD': "University of Sydney, Camperdown NSW 2006, Australia",
    'UTS': "University of Technology Sydney, Ultimo NSW 2007, Australia"
}

# Property scoring configuration
NUM_CALLS = 2         # Number of API calls
SCORES_PER_CALL = 4   # 4 score groups per call
MODEL_NAME = "qwen-plus-1220"

SYSTEM_PROMPT = """你是一位专业的房屋居住质量评估员，需要对房屋进行"分项打分"和"总评分"，标准如下：
1. 房屋质量 (0~10 分)：
   - 如果房屋缺少翻新、老旧或有明显缺陷，可给 3 分以下。
   - 普通装修或信息不足，可给 4~6 分。
   - 有翻新、材料优质或描述明确，可给 7~9 分。
   - 高端精装修或全新房，给 10 分。
2. 居住体验 (0~10 分)：
   - 噪音、空间狭小、采光差，可给 3 分以下。
   - 一般居住条件或描述不清，可给 4~6 分。
   - 宽敞、通风良好、配有空调等，可给 7~9 分。
   - 特别舒适、配置高级，可给 10 分。
3. 房屋内部配套设施 (0~10 分)：
   - 若只具备基本设施或缺少描述，可给 3~5 分。
   - 普通现代设施（空调、洗衣机、厨房电器等）可给 6~8 分。
   - 特别齐全、高端智能家居，可给 9~10 分。

总评分 (0~20)：
   = (房屋质量 + 居住体验 + 房屋内部配套设施) / 30 * 20

请一次性给出4组【独立的】打分结果，每组包括：
   房屋质量:X, 居住体验:Y, 房屋内配套:Z, 总评分:W
仅输出以上格式，每组一行，不可包含除数字、小数点、逗号、冒号、换行以外的文本。
示例：
房屋质量:7, 居住体验:6, 房屋内配套:8, 总评分:14.0
房屋质量:8, 居住体验:7, 房屋内配套:7, 总评分:14.7
房屋质量:6, 居住体验:8, 房屋内配套:9, 总评分:15.3
房屋质量:9, 居住体验:6, 房屋内配套:7, 总评分:14.7
"""

# ==================== Step 1: Fetch REA listings to CSV ====================
def fetch_rea_listings_to_csv(days_back=7):
    """Fetch REA property listings and save to CSV"""
    logger.info("=" * 60)
    logger.info("Step 1: Fetch property listings from REA API")
    logger.info("=" * 60)
    
    # Initialize REA API client
    client = REAApiClient(REA_CLIENT_ID, REA_CLIENT_SECRET)
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)
    
    logger.info(f"Date range: {start_date.date()} to {end_date.date()}")
    
    # Get all listings
    properties = client.get_all_listings(
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat()
    )
    
    logger.info(f"Total properties fetched: {len(properties)}")
    
    if not properties:
        logger.warning("No properties found!")
        return None, None
    
    # Convert to DataFrame
    df = pd.DataFrame(properties)
    
    # Generate output filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    csv_file = f"rea_listings_{timestamp}.csv"
    
    # Save to CSV
    df.to_csv(csv_file, index=False, encoding='utf-8-sig')
    logger.info(f"Saved {len(df)} properties to {csv_file}")
    
    # Display sample data
    logger.info("\nSample data (first 3 rows):")
    print(df.head(3))
    
    return csv_file, df


# ==================== Step 2: Score properties using DashScope ====================
def call_dashscope_with_retry(user_content, max_retries=3):
    """Call DashScope API with retry mechanism"""
    for attempt in range(max_retries):
        try:
            messages = [
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {'role': 'user', 'content': user_content}
            ]
            
            response = dashscope.Generation.call(
                model=MODEL_NAME,
                messages=messages,
                result_format='message',
                temperature=0.85,
                top_p=0.9
            )
            
            if response.status_code == 200:
                return response.output.choices[0]['message']['content']
            else:
                logger.error(f"DashScope API error: {response.code} - {response.message}")
                
        except Exception as e:
            logger.error(f"Attempt {attempt + 1} failed: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
    
    return None

def parse_scores(response_text):
    """Parse scores from API response"""
    pattern = r'房屋质量[:\s]*(\d+(?:\.\d+)?)[,\s]+居住体验[:\s]*(\d+(?:\.\d+)?)[,\s]+房屋内配套[:\s]*(\d+(?:\.\d+)?)[,\s]+总评分[:\s]*(\d+(?:\.\d+)?)'
    matches = re.findall(pattern, response_text, re.IGNORECASE)
    
    scores = []
    for match in matches:
        try:
            quality = float(match[0])
            experience = float(match[1])
            facilities = float(match[2])
            total = float(match[3])
            scores.append((quality, experience, facilities, total))
        except:
            continue
    
    return scores

def get_property_score(address, description, keywords):
    """Get property score using DashScope API"""
    user_content = f"""房屋信息：
地址：{address}
描述：{description}
关键词：{keywords}

请对这个房屋进行评估。"""
    
    all_scores = []
    
    for i in range(NUM_CALLS):
        response_text = call_dashscope_with_retry(user_content)
        
        if response_text:
            scores = parse_scores(response_text)
            if scores:
                all_scores.extend(scores)
        
        if i < NUM_CALLS - 1:
            time.sleep(1)  # Avoid rate limiting
    
    if all_scores:
        # Calculate average of total scores
        avg_score = sum(s[3] for s in all_scores) / len(all_scores)
        return round(avg_score, 1)
    
    return 13.0  # Default score

def score_properties_in_csv(csv_file):
    """Add scores to properties in CSV"""
    logger.info("=" * 60)
    logger.info("Step 2: Score properties using DashScope")
    logger.info("=" * 60)
    
    df = pd.read_csv(csv_file)
    logger.info(f"Scoring {len(df)} properties...")
    
    # Initialize DashScope
    dashscope.api_key = DASHSCOPE_API_KEY
    
    scores = []
    for idx, row in tqdm(df.iterrows(), total=len(df), desc="Scoring progress"):
        score = get_property_score(
            row.get('address', ''),
            row.get('description_en', ''),
            row.get('keywords', '')
        )
        scores.append(score)
    
    df['averageScore'] = scores
    
    # Overwrite original file
    df.to_csv(csv_file, index=False, encoding='utf-8-sig')
    logger.info(f"Scoring complete, average score: {df['averageScore'].mean():.1f}")
    
    return csv_file


# ==================== Step 3: Calculate commute times ====================
def get_commute_time(address, school_address, gmaps):
    """Get commute time from property to school"""
    try:
        directions = gmaps.directions(
            address,
            school_address,
            mode="transit",
            departure_time=datetime.now().replace(hour=8, minute=30)
        )
        
        if directions:
            duration = directions[0]['legs'][0]['duration']['value']  # seconds
            return duration // 60  # convert to minutes
    except Exception as e:
        logger.error(f"Error calculating commute time: {e}")
    
    return None

def process_property_commute(row, gmaps):
    """Process commute time for a single property"""
    address = row['address']
    results = {'house_id': row['house_id']}
    
    for school_name, school_addr in SCHOOL_COORDINATES.items():
        commute_time = get_commute_time(address, school_addr, gmaps)
        results[f'{school_name}_commute'] = commute_time
    
    return results

def add_commute_times_to_csv(csv_file):
    """Add commute times to CSV"""
    logger.info("=" * 60)
    logger.info("Step 3: Calculate commute times to universities")
    logger.info("=" * 60)
    
    df = pd.read_csv(csv_file)
    logger.info(f"Calculating commute times for {len(df)} properties...")
    
    # Initialize Google Maps client
    gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
    
    # Process with threading for better performance
    results = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(process_property_commute, row, gmaps) for _, row in df.iterrows()]
        
        for future in tqdm(as_completed(futures), total=len(futures), desc="Commute calculation"):
            try:
                result = future.result()
                results.append(result)
            except Exception as e:
                logger.error(f"Error processing property: {e}")
    
    # Merge results into DataFrame
    commute_df = pd.DataFrame(results)
    df = df.merge(commute_df, on='house_id', how='left')
    
    # Save to CSV
    df.to_csv(csv_file, index=False, encoding='utf-8-sig')
    logger.info("Commute times added successfully")
    
    return csv_file


# ==================== Step 4: Upload to database ====================
def get_or_create_region(cursor, connection, suburb, state, postcode):
    """Get or create region and return region_id"""
    try:
        # Clean suburb name
        suburb_clean = suburb.lower().strip()
        
        # Check if region exists
        cursor.execute(
            "SELECT id FROM regions WHERE name = %s AND state = %s AND postcode = %s",
            (suburb_clean, state, postcode)
        )
        result = cursor.fetchone()
        
        if result:
            return result[0]
        
        # Create new region
        cursor.execute(
            "INSERT INTO regions (name, state, postcode) VALUES (%s, %s, %s)",
            (suburb_clean, state, postcode)
        )
        connection.commit()
        return cursor.lastrowid
        
    except Exception as e:
        logger.error(f"Error getting/creating region: {e}")
        return None

def get_school_id(cursor, school_name):
    """Get school_id from database"""
    cursor.execute("SELECT id FROM schools WHERE name = %s", (school_name,))
    result = cursor.fetchone()
    return result[0] if result else None

def get_existing_property(cursor, house_id):
    """Get existing property data from database"""
    cursor.execute(
        """
        SELECT id, price, address, bedroom_count, bathroom_count, 
               parking_count, keywords, average_score, description_en, url
        FROM properties WHERE house_id = %s
        """,
        (house_id,)
    )
    result = cursor.fetchone()
    if result:
        return {
            'id': result[0],
            'price': result[1],
            'address': result[2],
            'bedroom_count': result[3],
            'bathroom_count': result[4],
            'parking_count': result[5],
            'keywords': result[6],
            'average_score': result[7],
            'description_en': result[8],
            'url': result[9]
        }
    return None

def property_has_changes(existing, new_data):
    """Check if property has changes"""
    # Compare key fields
    changes = []
    
    if existing['price'] != new_data['price']:
        changes.append(f"price: {existing['price']} -> {new_data['price']}")
    
    if existing['bedroom_count'] != new_data['bedroom_count']:
        changes.append(f"bedrooms: {existing['bedroom_count']} -> {new_data['bedroom_count']}")
    
    if existing['bathroom_count'] != new_data['bathroom_count']:
        changes.append(f"bathrooms: {existing['bathroom_count']} -> {new_data['bathroom_count']}")
    
    if existing['parking_count'] != new_data['parking_count']:
        changes.append(f"parking: {existing['parking_count']} -> {new_data['parking_count']}")
    
    # Description changes (if new description is not empty and different)
    if new_data['description_en'] and existing['description_en'] != new_data['description_en']:
        changes.append("description updated")
    
    # Keywords changes
    if new_data['keywords'] and existing['keywords'] != new_data['keywords']:
        changes.append("keywords updated")
    
    # URL changes
    if new_data['url'] and existing['url'] != new_data['url']:
        changes.append(f"url updated")
    
    return changes

def update_property(cursor, connection, property_id, row, region_id):
    """Update property data"""
    try:
        update_query = """
        UPDATE properties SET
            price = %s,
            address = %s,
            region_id = %s,
            bedroom_count = %s,
            bathroom_count = %s,
            parking_count = %s,
            keywords = %s,
            average_score = %s,
            description_en = %s,
            url = %s,
            published_at = %s
        WHERE id = %s
        """
        
        values = (
            int(row.get('price', 0)),
            str(row.get('address', ''))[:60],
            region_id,
            int(row.get('bedroom_count', 0)),
            int(row.get('bathroom_count', 0)),
            int(row.get('parking_count', 0)),
            str(row.get('keywords', ''))[:255],
            float(row.get('averageScore', 13.0)),
            str(row.get('description_en', ''))[:1024],
            str(row.get('url', ''))[:255],
            row.get('published_at', datetime.now()),
            property_id
        )
        
        cursor.execute(update_query, values)
        connection.commit()
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to update property: {e}")
        connection.rollback()
        return False

def update_property_school(cursor, connection, property_id, school_id, row):
    """Update property-school relationship and commute time"""
    try:
        # Get school name
        cursor.execute("SELECT name FROM schools WHERE id = %s", (school_id,))
        result = cursor.fetchone()
        if not result:
            return False
        
        school_name = result[0]
        commute_time = row.get(f'{school_name}_commute')
        
        if pd.isna(commute_time):
            return False
        
        # Check if relationship exists
        cursor.execute(
            "SELECT id FROM property_school WHERE property_id = %s AND school_id = %s",
            (property_id, school_id)
        )
        
        if cursor.fetchone():
            # Update
            cursor.execute(
                "UPDATE property_school SET commute_time = %s WHERE property_id = %s AND school_id = %s",
                (int(commute_time), property_id, school_id)
            )
        else:
            # Insert
            cursor.execute(
                "INSERT INTO property_school (property_id, school_id, commute_time) VALUES (%s, %s, %s)",
                (property_id, school_id, int(commute_time))
            )
        
        connection.commit()
        return True
        
    except Exception as e:
        logger.error(f"Failed to update property_school: {e}")
        connection.rollback()
        return False

def insert_property(cursor, connection, row, region_id, school_id):
    """Insert property data"""
    try:
        house_id = int(row['house_id'])
        
        # Prepare new data
        new_data = {
            'price': int(row.get('price', 0)),
            'address': str(row.get('address', ''))[:60],
            'bedroom_count': int(row.get('bedroom_count', 0)),
            'bathroom_count': int(row.get('bathroom_count', 0)),
            'parking_count': int(row.get('parking_count', 0)),
            'keywords': str(row.get('keywords', ''))[:255],
            'average_score': float(row.get('averageScore', 13.0)),
            'description_en': str(row.get('description_en', ''))[:1024],
            'url': str(row.get('url', ''))[:255]
        }
        
        # Check if property exists (duplicate check by house_id)
        existing = get_existing_property(cursor, house_id)
        
        if existing:
            # Check for changes
            changes = property_has_changes(existing, new_data)
            
            if changes:
                # Has changes, update property
                logger.info(f"Property {house_id} has updates: {', '.join(changes)}")
                if update_property(cursor, connection, existing['id'], row, region_id):
                    property_id = existing['id']
                    # Update property_school relationship
                    if school_id:
                        update_property_school(cursor, connection, property_id, school_id, row)
                    logger.info(f"Successfully updated property {house_id} (property_id: {property_id})")
                    return ('updated', property_id)
                else:
                    return None
            else:
                # No changes, skip
                logger.info(f"Property {house_id} exists with no changes, skipping")
                return ('skipped', existing['id'])
        
        # Property doesn't exist, insert new
        insert_query = """
        INSERT INTO properties (
            price, address, region_id, bedroom_count, bathroom_count,
            parking_count, keywords, average_score, description_en,
            url, house_id, published_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        values = (
            new_data['price'],
            new_data['address'],
            region_id,
            new_data['bedroom_count'],
            new_data['bathroom_count'],
            new_data['parking_count'],
            new_data['keywords'],
            new_data['average_score'],
            new_data['description_en'],
            new_data['url'],
            house_id,
            row.get('published_at', datetime.now())
        )
        
        cursor.execute(insert_query, values)
        connection.commit()
        property_id = cursor.lastrowid
        
        # Insert property_school relationship
        if school_id:
            update_property_school(cursor, connection, property_id, school_id, row)
        
        logger.info(f"Successfully inserted property {house_id} (property_id: {property_id})")
        
        return ('inserted', property_id)
        
    except Exception as e:
        logger.error(f"Failed to insert property: {e}")
        connection.rollback()
        return None

def upload_csv_to_database(csv_file):
    """Upload CSV to database"""
    logger.info("=" * 60)
    logger.info("Step 4: Upload to database")
    logger.info("=" * 60)
    
    df = pd.read_csv(csv_file)
    logger.info(f"Starting upload of {len(df)} properties to database...")
    
    # Connect to database
    connection = mysql.connector.connect(**DB_CONFIG)
    cursor = connection.cursor()
    
    inserted_count = 0
    updated_count = 0
    skipped_count = 0
    
    try:
        for idx, row in tqdm(df.iterrows(), total=len(df), desc="Upload progress"):
            try:
                # Get region_id
                region_id = get_or_create_region(
                    cursor, connection,
                    row['suburb'],
                    row['state'],
                    int(row['postcode']) if pd.notna(row['postcode']) else 0
                )
                
                # Get school_id
                school_id = None
                if 'school' in row and pd.notna(row['school']):
                    school_id = get_school_id(cursor, row['school'])
                
                # Insert or update property
                result = insert_property(cursor, connection, row, region_id, school_id)
                
                if result:
                    action, property_id = result
                    if action == 'inserted':
                        inserted_count += 1
                    elif action == 'updated':
                        updated_count += 1
                    elif action == 'skipped':
                        skipped_count += 1
                else:
                    skipped_count += 1
                    
            except Exception as e:
                logger.error(f"Error processing property {row.get('house_id', 'unknown')}: {e}")
                skipped_count += 1
        
        logger.info(f"Upload complete: {inserted_count} inserted, {updated_count} updated, {skipped_count} skipped")
        
    finally:
        cursor.close()
        connection.close()
    
    return inserted_count, updated_count, skipped_count


# ==================== Main Process ====================
def main():
    """Main process"""
    try:
        print("\n" + "=" * 60)
        print("REA Property Complete Processing Program")
        print("=" * 60 + "\n")
        
        # Step 1: Fetch REA listings and save to CSV
        csv_file, df = fetch_rea_listings_to_csv(days_back=7)
        
        if not csv_file or df is None or len(df) == 0:
            logger.error("No property data, program terminated")
            return
        
        # Step 2: Score properties
        csv_file = score_properties_in_csv(csv_file)
        
        # Step 3: Add commute times
        csv_file = add_commute_times_to_csv(csv_file)
        
        # Step 4: Upload to database
        inserted, updated, skipped = upload_csv_to_database(csv_file)
        
        print("\n" + "=" * 60)
        print("Processing Complete!")
        print("=" * 60)
        print(f"Total properties: {len(df)}")
        print(f"Inserted: {inserted}")
        print(f"Updated: {updated}")
        print(f"Skipped: {skipped}")
        print(f"CSV file: {csv_file}")
        print("=" * 60 + "\n")
        
    except Exception as e:
        logger.error(f"Program error: {e}")
        raise

if __name__ == "__main__":
    main()

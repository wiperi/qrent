"""
RealEstate.com.au Data Fetching Script
Uses REA Partner Platform API to fetch property data and convert to QRent database format
"""

import os
import sys
import json
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
import mysql.connector
from mysql.connector import Error
import re
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import time

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('rea_scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class PropertyData:
    """Property data structure"""
    price: int
    address: str
    region_id: int
    bedroom_count: int
    bathroom_count: int
    parking_count: int
    property_type: int
    house_id: int
    available_date: Optional[datetime]
    keywords: str
    average_score: float
    description_en: Optional[str]
    description_cn: Optional[str]
    url: str
    published_at: datetime

class REAApiClient:
    """REA API Client"""
    
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = "https://api.realestate.com.au"
        self.access_token = None
        self.token_expires_at = None
        
    def get_access_token(self) -> str:
        """Get access token"""
        if self.access_token and self.token_expires_at and datetime.now() < self.token_expires_at:
            return self.access_token
            
        url = f"{self.base_url}/oauth/token"
        
        response = requests.post(
            url,
            auth=(self.client_id, self.client_secret),
            data={'grant_type': 'client_credentials'},
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to get access token: {response.status_code} - {response.text}")
        
        token_data = response.json()
        self.access_token = token_data['access_token']
        # Set expiration time as current time + expires_in - 60 seconds buffer
        self.token_expires_at = datetime.now() + timedelta(seconds=token_data['expires_in'] - 60)
        
        logger.info("Successfully obtained access token")
        return self.access_token
    
    def get_listings(self, listing_types: List[str] = None, status: List[str] = None, 
                    since: datetime = None, page_size: int = 200) -> List[Dict]:
        """Get property listings"""
        if listing_types is None:
            listing_types = ['residential', 'rental']
        if status is None:
            status = ['current']
            
        token = self.get_access_token()
        url = f"{self.base_url}/listing/v1/export"
        
        params = {
            'listing_types': ','.join(listing_types),
            'status': ','.join(status),
            'page_size': page_size
        }
        
        if since:
            params['since'] = since.isoformat() + 'Z'
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/xml'
        }
        
        all_listings = []
        next_page = None
        
        while True:
            if next_page:
                current_url = f"{self.base_url}{next_page}"
            else:
                current_url = url
                
            logger.info(f"Fetching listings from: {current_url}")
            
            response = requests.get(current_url, headers=headers, params=params if not next_page else None)
            
            if response.status_code == 429:  # Rate limit
                logger.warning("Rate limit hit, waiting 60 seconds...")
                time.sleep(60)
                continue
                
            if response.status_code != 200:
                logger.error(f"Failed to fetch listings: {response.status_code} - {response.text}")
                break
            
            # Parse XML response
            try:
                listings = self.parse_xml_listings(response.text)
                all_listings.extend(listings)
                logger.info(f"Parsed {len(listings)} listings from current page")
            except Exception as e:
                logger.error(f"Failed to parse XML response: {e}")
                break
            
            # Check for next page
            next_page = response.headers.get('x-next-link')
            if not next_page:
                break
                
            # Clear params as next page params are in URL
            params = None
            
            # Add delay to avoid rate limiting
            time.sleep(1)
        
        logger.info(f"Total listings fetched: {len(all_listings)}")
        return all_listings
    
    def parse_xml_listings(self, xml_content: str) -> List[Dict]:
        """Parse XML format property data"""
        try:
            root = ET.fromstring(xml_content)
            listings = []
            
            # Process different property types
            for property_type in ['residential', 'rental', 'rural', 'land', 'commercial']:
                for prop in root.findall(property_type):
                    listing_data = self.extract_property_data(prop, property_type)
                    if listing_data:
                        listings.append(listing_data)
            
            return listings
        except ET.ParseError as e:
            logger.error(f"XML parsing error: {e}")
            return []
    
    def extract_property_data(self, prop_element, property_type: str) -> Optional[Dict]:
        """Extract property data from XML element"""
        try:
            # Basic attributes
            mod_time = prop_element.get('modTime')
            status = prop_element.get('status')
            
            # Get address information
            address_elem = prop_element.find('address')
            if address_elem is None:
                return None
            
            # Address details
            sub_number = self.get_element_text(address_elem, 'subNumber', '')
            lot_number = self.get_element_text(address_elem, 'lotNumber', '')
            street_number = self.get_element_text(address_elem, 'streetNumber', '')
            street = self.get_element_text(address_elem, 'street', '')
            suburb = self.get_element_text(address_elem, 'suburb', '')
            state = self.get_element_text(address_elem, 'state', '')
            postcode = self.get_element_text(address_elem, 'postcode', '')
            
            # Build full address
            address_parts = [part for part in [sub_number, lot_number, street_number, street, suburb] if part]
            full_address = ' '.join(address_parts)
            
            # Price information - rent is in <rent> tag text content
            price = 0
            rent_elem = prop_element.find('rent')
            if rent_elem is not None and rent_elem.text:
                try:
                    # Rent is in text, e.g.: <rent period="weekly">500</rent>
                    price = int(float(rent_elem.text.strip()))
                except (ValueError, TypeError):
                    price = 0
            
            # Property features
            features = prop_element.find('features')
            bedrooms = 0
            bathrooms = 0
            parking = 0
            
            if features is not None:
                bedrooms = int(self.get_element_text(features, 'bedrooms', '0') or '0')
                bathrooms = int(self.get_element_text(features, 'bathrooms', '0') or '0')
                garage = int(self.get_element_text(features, 'garages', '0') or '0')
                carport = int(self.get_element_text(features, 'carports', '0') or '0')
                parking = garage + carport
            
            # Property type mapping
            property_type_mapping = {
                'residential': 1,  # Residential
                'rental': 1,       # Rental (usually residential)
                'unit': 2,         # Unit
                'townhouse': 3,    # Townhouse
                'house': 1,        # House
                'apartment': 2,    # Apartment
                'studio': 4,       # Studio
                'rural': 5,        # Rural
                'land': 6,         # Land
                'commercial': 7    # Commercial
            }
            
            # Get specific property category
            category = self.get_element_text(prop_element, 'category', property_type)
            mapped_property_type = property_type_mapping.get(category.lower(), 1)
            
            # Get description
            description = self.get_element_text(prop_element, 'description', '')
            
            # Get special features as keywords
            keywords = []
            if features is not None:
                # Add special features
                for feature_type in ['airConditioning', 'alarms', 'balcony', 'broadband', 
                                   'builtInRobes', 'courtyard', 'deck', 'dishwasher', 
                                   'fireplace', 'floorboards', 'pool', 'rumpusRoom', 
                                   'shed', 'study', 'vacuum', 'workshop']:
                    if features.find(feature_type) is not None:
                        keywords.append(feature_type.replace('_', ' ').title())
            
            # Generate property ID
            house_id = self.generate_house_id(full_address, postcode)
            
            # Get URL - construct REA URL using listingId
            url = ''
            listing_id_elem = prop_element.find('listingId')
            if listing_id_elem is not None and listing_id_elem.text:
                listing_id = listing_id_elem.text.strip()
                url = f'https://www.realestate.com.au/property-{listing_id}'
            
            # Fallback: try to extract from objects/img (if no listingId)
            if not url:
                objects = prop_element.find('objects')
                if objects is not None:
                    img_elem = objects.find('img')
                    if img_elem is not None and 'url' in img_elem.attrib:
                        # Extract listing ID from image URL
                        img_url = img_elem.attrib['url']
                        # Image URL format: http://.../{listingId}-image-M.jpg
                        import re
                        match = re.search(r'/(\d+)-image-', img_url)
                        if match:
                            listing_id = match.group(1)
                            url = f'https://www.realestate.com.au/property-{listing_id}'
            
            # Parse published time
            published_at = datetime.now()
            if mod_time:
                try:
                    published_at = datetime.fromisoformat(mod_time.replace('Z', '+00:00'))
                except:
                    pass
            
            return {
                'price': price,
                'address': full_address[:60],  # Limit length
                'suburb': suburb,
                'state': state,
                'postcode': postcode,
                'bedroom_count': bedrooms,
                'bathroom_count': bathrooms,
                'parking_count': parking,
                'property_type': mapped_property_type,
                'house_id': house_id,
                'available_date': None,  # Needs further parsing
                'keywords': ', '.join(keywords),
                'average_score': 13.0,  # Default score
                'description_en': description[:1024] if description else None,
                'description_cn': None,  # Needs translation
                'url': url[:255] if url else '',
                'published_at': published_at,
                'status': status
            }
            
        except Exception as e:
            logger.error(f"Error extracting property data: {e}")
            return None
    
    def get_element_text(self, parent, tag, default=''):
        """Safely get element text"""
        element = parent.find(tag)
        return element.text if element is not None and element.text else default
    
    def generate_house_id(self, address: str, postcode: str) -> int:
        """Generate property ID"""
        combined = f"{address}{postcode}".lower().replace(' ', '')
        return abs(hash(combined)) % (10**9)  # Generate 9-digit ID
    
    def get_all_listings(self, start_date=None, end_date=None):
        """Get all listings for date range (used by scoring script)"""
        since_date = None
        if start_date:
            since_date = datetime.fromisoformat(start_date) if isinstance(start_date, str) else start_date
        
        return self.get_listings(
            listing_types=['residential', 'rental'],
            status=['current'],
            since=since_date
        )


class DatabaseManager:
    """Database Manager"""
    
    def __init__(self, host: str, user: str, password: str, database: str, port: int = 3306):
        self.host = host
        self.user = user
        self.password = password
        self.database = database
        self.port = port
        self.connection = None
    
    def connect(self):
        """Connect to database"""
        try:
            self.connection = mysql.connector.connect(
                host=self.host,
                user=self.user,
                password=self.password,
                database=self.database,
                port=self.port,
                charset='utf8mb4',
                collation='utf8mb4_unicode_ci'
            )
            logger.info("Successfully connected to database")
        except Error as e:
            logger.error(f"Error connecting to database: {e}")
            raise
    
    def disconnect(self):
        """Disconnect from database"""
        if self.connection and self.connection.is_connected():
            self.connection.close()
            logger.info("Database connection closed")
    
    def get_or_create_region(self, suburb: str, state: str, postcode: str) -> int:
        """Get or create region record"""
        cursor = self.connection.cursor()
        
        # Try to find existing region
        select_query = "SELECT id FROM regions WHERE name = %s AND state = %s AND postcode = %s"
        cursor.execute(select_query, (suburb, state, int(postcode) if postcode.isdigit() else 0))
        result = cursor.fetchone()
        
        if result:
            cursor.close()
            return result[0]
        
        # Create new region if doesn't exist
        insert_query = """
        INSERT INTO regions (name, state, postcode) 
        VALUES (%s, %s, %s)
        """
        cursor.execute(insert_query, (suburb, state, int(postcode) if postcode.isdigit() else 0))
        self.connection.commit()
        
        region_id = cursor.lastrowid
        cursor.close()
        logger.info(f"Created new region: {suburb}, {state} {postcode} (ID: {region_id})")
        return region_id
    
    def property_exists(self, house_id: int) -> bool:
        """Check if property exists"""
        cursor = self.connection.cursor()
        query = "SELECT COUNT(*) FROM properties WHERE house_id = %s"
        cursor.execute(query, (house_id,))
        count = cursor.fetchone()[0]
        cursor.close()
        return count > 0
    
    def insert_property(self, property_data: Dict) -> Optional[int]:
        """Insert property data"""
        try:
            # Check if already exists
            if self.property_exists(property_data['house_id']):
                logger.info(f"Property {property_data['house_id']} already exists, skipping")
                return None
            
            # Get or create region
            region_id = self.get_or_create_region(
                property_data['suburb'],
                property_data['state'],
                property_data['postcode']
            )
            
            cursor = self.connection.cursor()
            
            insert_query = """
            INSERT INTO properties (
                price, address, region_id, bedroom_count, bathroom_count, parking_count,
                property_type, house_id, available_date, keywords, average_score,
                description_en, description_cn, url, published_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            values = (
                property_data['price'],
                property_data['address'],
                region_id,
                property_data['bedroom_count'],
                property_data['bathroom_count'],
                property_data['parking_count'],
                property_data['property_type'],
                property_data['house_id'],
                property_data['available_date'],
                property_data['keywords'],
                property_data['average_score'],
                property_data['description_en'],
                property_data['description_cn'],
                property_data['url'],
                property_data['published_at']
            )
            
            cursor.execute(insert_query, values)
            self.connection.commit()
            
            property_id = cursor.lastrowid
            cursor.close()
            
            logger.info(f"Inserted property {property_data['house_id']} (ID: {property_id})")
            return property_id
            
        except Error as e:
            logger.error(f"Error inserting property: {e}")
            self.connection.rollback()
            return None


class REAPropertyScraper:
    """REA Property Scraper Main Class"""
    
    def __init__(self):
        # Get configuration from environment variables
        self.rea_client_id = os.getenv('REA_CLIENT_ID')
        self.rea_client_secret = os.getenv('REA_CLIENT_SECRET')
        
        # Database configuration
        self.db_host = os.getenv('DB_HOST')
        self.db_user = os.getenv('DB_USER')
        self.db_password = os.getenv('DB_PASSWORD')
        self.db_database = os.getenv('DB_DATABASE')
        self.db_port = int(os.getenv('DB_PORT', 3306))
        
        # Validate required environment variables
        required_vars = [
            'REA_CLIENT_ID', 'REA_CLIENT_SECRET',
            'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE'
        ]
        
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
        
        # Initialize clients
        self.api_client = REAApiClient(self.rea_client_id, self.rea_client_secret)
        self.db_manager = DatabaseManager(
            self.db_host, self.db_user, self.db_password, 
            self.db_database, self.db_port
        )
    
    def run_scraper(self, listing_types: List[str] = None, 
                   status: List[str] = None, since_days: int = 7):
        """Run scraper"""
        try:
            logger.info("Starting REA property scraper...")
            
            # Connect to database
            self.db_manager.connect()
            
            # Calculate start time
            since_date = None
            if since_days:
                from datetime import timedelta
                since_date = datetime.now() - timedelta(days=since_days)
            
            # Fetch property data
            logger.info(f"Fetching listings from last {since_days} days...")
            listings = self.api_client.get_listings(
                listing_types=listing_types or ['residential', 'rental'],
                status=status or ['current'],
                since=since_date
            )
            
            # Process data
            inserted_count = 0
            skipped_count = 0
            
            for listing in listings:
                if listing.get('status') == 'current' and listing.get('price', 0) > 0:
                    property_id = self.db_manager.insert_property(listing)
                    if property_id:
                        inserted_count += 1
                    else:
                        skipped_count += 1
                else:
                    skipped_count += 1
            
            logger.info(f"Scraping completed. Inserted: {inserted_count}, Skipped: {skipped_count}")
            
        except Exception as e:
            logger.error(f"Error in scraper: {e}")
            raise
        finally:
            self.db_manager.disconnect()


def main():
    """Main function"""
    try:
        scraper = REAPropertyScraper()
        
        # Run scraper, fetch last 7 days of data
        scraper.run_scraper(
            listing_types=['residential', 'rental'],
            status=['current'],
            since_days=7
        )
        
    except Exception as e:
        logger.error(f"Failed to run scraper: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

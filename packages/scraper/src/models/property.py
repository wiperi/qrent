"""
Property data model
Unified data structure definitions
"""
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum


class PropertySource(Enum):
    """Property source"""
    DOMAIN = "domain"
    REALESTATE = "realestate"
    # Future extensions
    # RENT_COM_AU = "rent.com.au"
    # FLATMATES = "flatmates"


@dataclass
class PropertyData:
    """
    Property data model
    Unified data structure that all scrapers should output
    """
    # Basic information
    house_id: str  # Unique property identifier
    source: PropertySource  # Data source
    
    # Price information
    price_per_week: int = 0
    
    # Address information
    address_line1: str = ""
    address_line2: str = ""
    suburb: str = ""
    state: str = "NSW"
    postcode: str = ""
    
    # Property features
    bedroom_count: int = 0
    bathroom_count: int = 0
    parking_count: int = 0
    property_type: int = 1  # 1=house, 2=apartment, 3=studio, etc.
    property_type_raw: str = ""  # Raw property type string
    
    # Detailed information
    description_en: Optional[str] = None
    description_cn: Optional[str] = None
    keywords: Optional[str] = None
    
    # Images and links
    url: str = ""
    thumbnail_url: Optional[str] = None
    
    # Date information
    available_date: Optional[datetime] = None
    published_at: Optional[datetime] = None
    scraped_at: datetime = field(default_factory=datetime.now)
    
    # Scoring
    average_score: Optional[float] = None
    scores: List[float] = field(default_factory=list)
    
    # Commute time (minutes)
    commute_times: Dict[str, Optional[int]] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['source'] = self.source.value
        return data
    
    def get_combined_address(self) -> str:
        """Get combined address (for building URL)"""
        return f"{self.address_line1}-{self.address_line2}-{self.house_id}"
    
    def get_full_address(self) -> str:
        """Get full address"""
        parts = [self.address_line1, self.address_line2]
        return ", ".join(p for p in parts if p)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PropertyData':
        """Create from dictionary"""
        if 'source' in data and isinstance(data['source'], str):
            data['source'] = PropertySource(data['source'])
        return cls(**data)


@dataclass
class ScrapeResult:
    """
    Scrape result
    Used to encapsulate results and status of a single scrape operation
    """
    success: bool
    properties: List[PropertyData] = field(default_factory=list)
    error_message: Optional[str] = None
    pages_scraped: int = 0
    total_found: int = 0
    
    def __len__(self):
        return len(self.properties)


@dataclass
class RegionInfo:
    """区域信息"""
    name: str
    state: str = "NSW"
    postcode: int = 0
    
    @classmethod
    def from_address_line2(cls, address_line2: str) -> Optional['RegionInfo']:
        """从 addressLine2 解析区域信息"""
        if not address_line2:
            return None
        
        try:
            parts = str(address_line2).replace(' ', '-').split('-')
            if len(parts) >= 3:
                nsw_index = -1
                for i, part in enumerate(parts):
                    if part.strip().upper() == 'NSW':
                        nsw_index = i
                        break
                
                if nsw_index > 0 and nsw_index < len(parts) - 1:
                    suburb = ' '.join(parts[:nsw_index]).strip().lower()
                    state = 'NSW'
                    postcode = int(parts[nsw_index + 1].strip())
                    
                    if postcode > 0:
                        return cls(name=suburb, state=state, postcode=postcode)
        except Exception:
            pass
        
        return None


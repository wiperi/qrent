"""
房产数据模型
统一的数据结构定义
"""
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum


class PropertySource(Enum):
    """房源来源"""
    DOMAIN = "domain"
    REALESTATE = "realestate"
    # 未来可扩展
    # RENT_COM_AU = "rent.com.au"
    # FLATMATES = "flatmates"


@dataclass
class PropertyData:
    """
    房产数据模型
    统一的数据结构，所有爬虫都应该输出这种格式
    """
    # 基础信息
    house_id: str  # 房源唯一标识
    source: PropertySource  # 数据来源
    
    # 价格信息
    price_per_week: int = 0
    
    # 地址信息
    address_line1: str = ""
    address_line2: str = ""
    suburb: str = ""
    state: str = "NSW"
    postcode: str = ""
    
    # 房产特征
    bedroom_count: int = 0
    bathroom_count: int = 0
    parking_count: int = 0
    property_type: int = 1  # 1=house, 2=apartment, 3=studio, etc.
    property_type_raw: str = ""  # 原始房产类型字符串
    
    # 详细信息
    description_en: Optional[str] = None
    description_cn: Optional[str] = None
    keywords: Optional[str] = None
    
    # 图片和链接
    url: str = ""
    thumbnail_url: Optional[str] = None
    
    # 日期信息
    available_date: Optional[datetime] = None
    published_at: Optional[datetime] = None
    scraped_at: datetime = field(default_factory=datetime.now)
    
    # 评分
    average_score: Optional[float] = None
    scores: List[float] = field(default_factory=list)
    
    # 通勤时间 (分钟)
    commute_times: Dict[str, Optional[int]] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        data = asdict(self)
        data['source'] = self.source.value
        return data
    
    def get_combined_address(self) -> str:
        """获取组合地址（用于构建 URL）"""
        return f"{self.address_line1}-{self.address_line2}-{self.house_id}"
    
    def get_full_address(self) -> str:
        """获取完整地址"""
        parts = [self.address_line1, self.address_line2]
        return ", ".join(p for p in parts if p)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PropertyData':
        """从字典创建"""
        if 'source' in data and isinstance(data['source'], str):
            data['source'] = PropertySource(data['source'])
        return cls(**data)


@dataclass
class ScrapeResult:
    """
    爬取结果
    用于封装单次爬取的结果和状态
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


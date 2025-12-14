"""
通用工具函数
"""
import re
import logging
from datetime import datetime
from typing import Optional, Any, Union
import pandas as pd

logger = logging.getLogger(__name__)


def safe_int(val: Any, default: int = 0) -> int:
    """安全转换为整数"""
    if val is None or (isinstance(val, float) and pd.isna(val)) or val == '':
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default


def safe_float(val: Any, default: float = 0.0) -> float:
    """安全转换为浮点数"""
    if val is None or (isinstance(val, float) and pd.isna(val)) or val == '':
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def safe_str(val: Any, default: str = '') -> str:
    """安全转换为字符串"""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return default
    return str(val).strip()


def safe_datetime(val: Any, default: Optional[datetime] = None) -> Optional[datetime]:
    """安全转换为日期时间"""
    if val is None or (isinstance(val, float) and pd.isna(val)) or val == '':
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


def extract_price(price_str: str) -> int:
    """从字符串中提取价格"""
    if not price_str:
        return 0
    
    try:
        # 移除货币符号、逗号等
        cleaned = re.sub(r'[^\d.]', '', str(price_str))
        if cleaned:
            return int(float(cleaned))
    except (ValueError, TypeError):
        pass
    
    return 0


def extract_number(text: str) -> int:
    """从字符串中提取数字"""
    if not text:
        return 0
    
    try:
        match = re.search(r'(\d+)', str(text))
        if match:
            return int(match.group(1))
    except (ValueError, TypeError):
        pass
    
    return 0


def clean_address(address: str) -> str:
    """
    清理地址字符串
    - 移除逗号
    - 转小写
    - 将斜杠和空格替换为连字符
    """
    if not address:
        return ""
    
    return (
        str(address)
        .replace(',', '')
        .lower()
        .replace('/', '-')
        .replace(' ', '-')
    )


def parse_available_date(date_text: str) -> Optional[datetime]:
    """
    解析可用日期
    支持格式如 "Available Now", "Available from Monday, 15 January 2024"
    """
    if not date_text:
        return None
    
    date_text = str(date_text).strip()
    
    if "Available Now" in date_text or "now" in date_text.lower():
        return datetime.now()
    
    if "Available from" in date_text:
        date_text = date_text.replace("Available from", "").strip()
    
    try:
        # 移除序数后缀 (1st, 2nd, 3rd, 4th, etc.)
        cleaned = re.sub(r'(\d+)(st|nd|rd|th)', r'\1', date_text)
        
        # 尝试多种日期格式
        formats = [
            "%A, %d %B %Y",  # Monday, 15 January 2024
            "%d %B %Y",     # 15 January 2024
            "%d/%m/%Y",     # 15/01/2024
            "%Y-%m-%d",     # 2024-01-15
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(cleaned, fmt)
            except ValueError:
                continue
    except Exception as e:
        logger.debug(f"解析日期失败: {date_text}, 错误: {e}")
    
    return None


def is_valid_image_url(img_url: str) -> bool:
    """
    检查图片 URL 是否有效
    排除嵌套 URL 等异常情况
    """
    if not img_url or not img_url.startswith('http'):
        return False
    
    # 排除嵌套 URL
    http_count = img_url.count('http://') + img_url.count('https://')
    return http_count == 1


def generate_house_id(address: str, postcode: str) -> str:
    """生成房源唯一标识"""
    combined = f"{address}{postcode}".lower().replace(' ', '')
    return str(abs(hash(combined)) % (10**9))


def truncate_string(text: str, max_length: int) -> str:
    """截断字符串到指定长度"""
    if not text:
        return ""
    if len(text) <= max_length:
        return text
    return text[:max_length]


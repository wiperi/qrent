"""
数据库服务
统一的数据库操作接口
"""
import logging
from typing import List, Optional, Dict, Any, Set
from datetime import datetime
from contextlib import contextmanager

import mysql.connector
from mysql.connector import Error

from ..models import PropertyData, RegionInfo
from ..config import settings, DatabaseConfig, SCHOOL_NAME_MAPPING
from ..utils import safe_int, safe_float, safe_str, safe_datetime, truncate_string

logger = logging.getLogger(__name__)


class DatabaseService:
    """
    数据库服务
    处理所有与数据库相关的操作
    """
    
    def __init__(self, config: Optional[DatabaseConfig] = None):
        self.config = config or settings.database
        self.connection = None
        self.cursor = None
        self._existing_house_ids: Set[str] = set()
    
    def connect(self):
        """连接数据库"""
        try:
            self.connection = mysql.connector.connect(
                host=self.config.host,
                user=self.config.user,
                password=self.config.password,
                database=self.config.database,
                port=self.config.port,
                charset=self.config.charset,
                connect_timeout=self.config.connect_timeout,
                use_unicode=True,
                autocommit=False
            )
            self.cursor = self.connection.cursor(buffered=True)
            logger.info(f"数据库连接成功: {self.config.host}/{self.config.database}")
        except Error as e:
            logger.error(f"数据库连接失败: {e}")
            raise
    
    def disconnect(self):
        """断开数据库连接"""
        if self.cursor:
            self.cursor.close()
        if self.connection and self.connection.is_connected():
            self.connection.close()
            logger.info("数据库连接已关闭")
    
    def commit(self):
        """提交事务"""
        if self.connection:
            self.connection.commit()
    
    def rollback(self):
        """回滚事务"""
        if self.connection:
            self.connection.rollback()
    
    @contextmanager
    def session(self):
        """数据库会话上下文管理器"""
        try:
            self.connect()
            yield self
            self.commit()
        except Exception as e:
            self.rollback()
            raise
        finally:
            self.disconnect()
    
    def load_existing_house_ids(self):
        """加载已存在的 house_id 集合"""
        self.cursor.execute("SELECT house_id FROM properties WHERE house_id IS NOT NULL")
        self._existing_house_ids = {str(row[0]) for row in self.cursor.fetchall()}
        logger.info(f"已加载 {len(self._existing_house_ids)} 个现有房源ID")
    
    def house_id_exists(self, house_id: str) -> bool:
        """检查 house_id 是否存在"""
        return str(house_id) in self._existing_house_ids
    
    def get_or_create_region(self, region_info: RegionInfo) -> Optional[int]:
        """获取或创建区域记录"""
        if not region_info:
            return None
        
        try:
            # 查询已有区域
            self.cursor.execute(
                "SELECT id FROM regions WHERE name = %s AND state = %s AND postcode = %s",
                (region_info.name, region_info.state, region_info.postcode)
            )
            result = self.cursor.fetchone()
            
            if result:
                return result[0]
            
            # 创建新区域
            self.cursor.execute(
                "INSERT INTO regions (name, state, postcode) VALUES (%s, %s, %s)",
                (region_info.name, region_info.state, region_info.postcode)
            )
            self.commit()
            return self.cursor.lastrowid
            
        except Exception as e:
            logger.error(f"获取/创建区域失败: {e}")
            return None
    
    def get_school_id(self, school_name: str) -> Optional[int]:
        """获取学校 ID"""
        try:
            self.cursor.execute("SELECT id FROM schools WHERE name = %s", (school_name,))
            result = self.cursor.fetchone()
            
            if result:
                return result[0]
            
            # 创建新学校
            self.cursor.execute("INSERT INTO schools (name) VALUES (%s)", (school_name,))
            self.commit()
            return self.cursor.lastrowid
            
        except Exception as e:
            logger.error(f"获取学校ID失败: {e}")
            return None
    
    def get_property_by_house_id(self, house_id: str) -> Optional[Dict[str, Any]]:
        """根据 house_id 获取房产信息"""
        try:
            self.cursor.execute(
                """
                SELECT id, price, address, bedroom_count, bathroom_count, 
                       parking_count, keywords, average_score, description_en, 
                       url, release_time
                FROM properties WHERE house_id = %s
                """,
                (house_id,)
            )
            result = self.cursor.fetchone()
            
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
                    'url': result[9],
                    'release_time': result[10]
                }
            return None
            
        except Exception as e:
            logger.error(f"查询房产失败: {e}")
            return None
    
    def insert_property(self, prop: PropertyData, region_id: int) -> Optional[int]:
        """插入新房产"""
        try:
            insert_sql = """
            INSERT INTO properties (
                price, address, region_id, bedroom_count, bathroom_count,
                parking_count, property_type, house_id, available_date, 
                keywords, average_score, description_en, description_cn,
                url, published_at, thumbnail_url
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            values = (
                prop.price_per_week,
                truncate_string(prop.address_line1, 60),
                region_id,
                prop.bedroom_count,
                prop.bathroom_count,
                prop.parking_count,
                prop.property_type,
                prop.house_id,
                prop.available_date,
                truncate_string(prop.keywords, 255) if prop.keywords else None,
                prop.average_score,
                truncate_string(prop.description_en, 1024) if prop.description_en else None,
                truncate_string(prop.description_cn, 1024) if prop.description_cn else None,
                truncate_string(prop.url, 255) if prop.url else None,
                prop.published_at or datetime.now(),
                prop.thumbnail_url
            )
            
            self.cursor.execute(insert_sql, values)
            property_id = self.cursor.lastrowid
            
            # 更新缓存
            self._existing_house_ids.add(str(prop.house_id))
            
            return property_id
            
        except Exception as e:
            logger.error(f"插入房产失败: {e}")
            self.rollback()
            return None
    
    def update_property(self, property_id: int, prop: PropertyData, region_id: int) -> bool:
        """更新房产信息"""
        try:
            update_sql = """
            UPDATE properties SET
                price = %s, address = %s, region_id = %s,
                bedroom_count = %s, bathroom_count = %s,
                parking_count = %s, property_type = %s,
                available_date = %s, keywords = %s,
                average_score = %s, description_en = %s,
                description_cn = %s, url = %s, published_at = %s,
                thumbnail_url = %s
            WHERE id = %s
            """
            
            values = (
                prop.price_per_week,
                truncate_string(prop.address_line1, 60),
                region_id,
                prop.bedroom_count,
                prop.bathroom_count,
                prop.parking_count,
                prop.property_type,
                prop.available_date,
                truncate_string(prop.keywords, 255) if prop.keywords else None,
                prop.average_score,
                truncate_string(prop.description_en, 1024) if prop.description_en else None,
                truncate_string(prop.description_cn, 1024) if prop.description_cn else None,
                truncate_string(prop.url, 255) if prop.url else None,
                prop.published_at or datetime.now(),
                prop.thumbnail_url,
                property_id
            )
            
            self.cursor.execute(update_sql, values)
            return True
            
        except Exception as e:
            logger.error(f"更新房产失败: {e}")
            self.rollback()
            return False
    
    def upsert_property_school(
        self, 
        property_id: int, 
        school_id: int, 
        commute_time: Optional[int]
    ) -> bool:
        """插入或更新房产-学校关系"""
        try:
            # 删除已有关系
            self.cursor.execute(
                "DELETE FROM property_school WHERE property_id = %s AND school_id = %s",
                (property_id, school_id)
            )
            
            # 插入新关系
            self.cursor.execute(
                "INSERT INTO property_school (property_id, school_id, commute_time) VALUES (%s, %s, %s)",
                (property_id, school_id, commute_time)
            )
            
            return True
            
        except Exception as e:
            logger.error(f"更新房产-学校关系失败: {e}")
            return False
    
    def save_properties(
        self, 
        properties: List[PropertyData], 
        university: str
    ) -> Dict[str, int]:
        """
        批量保存房产数据
        
        Args:
            properties: 房产列表
            university: 大学代码 (UNSW, USYD, UTS)
            
        Returns:
            统计信息 {inserted, updated, skipped, errors}
        """
        stats = {
            'inserted': 0,
            'updated': 0,
            'skipped': 0,
            'errors': 0
        }
        
        school_name = SCHOOL_NAME_MAPPING.get(university)
        if not school_name:
            logger.error(f"未知的大学代码: {university}")
            return stats
        
        school_id = self.get_school_id(school_name)
        if not school_id:
            logger.error(f"无法获取学校ID: {school_name}")
            return stats
        
        # 加载已有 house_id
        self.load_existing_house_ids()
        
        for prop in properties:
            try:
                # 获取或创建区域
                region_info = RegionInfo.from_address_line2(prop.address_line2)
                region_id = self.get_or_create_region(region_info)
                
                if not region_id:
                    logger.warning(f"无法解析区域: {prop.address_line2}")
                    stats['skipped'] += 1
                    continue
                
                # 检查是否已存在
                existing = self.get_property_by_house_id(prop.house_id)
                
                if existing:
                    # 更新现有记录
                    if self.update_property(existing['id'], prop, region_id):
                        property_id = existing['id']
                        stats['updated'] += 1
                    else:
                        stats['errors'] += 1
                        continue
                else:
                    # 插入新记录
                    property_id = self.insert_property(prop, region_id)
                    if property_id:
                        stats['inserted'] += 1
                    else:
                        stats['errors'] += 1
                        continue
                
                # 更新房产-学校关系
                commute_time = prop.commute_times.get(university)
                self.upsert_property_school(property_id, school_id, commute_time)
                
                # 定期提交
                if (stats['inserted'] + stats['updated']) % 100 == 0:
                    self.commit()
                    
            except Exception as e:
                logger.error(f"保存房产失败 ({prop.house_id}): {e}")
                stats['errors'] += 1
        
        # 最终提交
        self.commit()
        
        logger.info(f"保存完成: 新增 {stats['inserted']}, 更新 {stats['updated']}, "
                   f"跳过 {stats['skipped']}, 错误 {stats['errors']}")
        
        return stats


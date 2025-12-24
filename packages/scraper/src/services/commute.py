"""
通勤时间计算服务
使用 Google Maps API 计算公交通勤时间
"""
import time
import logging
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

import googlemaps
from tqdm import tqdm

from ..models import PropertyData
from ..config import settings, CommuteConfig, SCHOOL_COORDINATES

logger = logging.getLogger(__name__)


class CommuteService:
    """
    通勤时间计算服务
    使用 Google Maps API 计算从房产到学校的公交通勤时间
    """
    
    def __init__(self, config: Optional[CommuteConfig] = None):
        self.config = config or settings.commute
        self.gmaps = None
        
        if self.config.api_key:
            self.gmaps = googlemaps.Client(key=self.config.api_key)
    
    def _get_address(self, prop: PropertyData) -> str:
        """获取房产完整地址"""
        parts = []
        
        if prop.address_line1:
            address1 = prop.address_line1.replace('-', ' ')
            parts.append(address1)
        
        if prop.address_line2:
            address2 = prop.address_line2.replace('-', ' ')
            parts.append(address2)
        
        if parts:
            return ", ".join(parts) + ", Australia"
        
        return ""
    
    def calculate_transit_time(
        self, 
        origin: str, 
        destination: str
    ) -> Optional[int]:
        """
        计算公交通勤时间
        
        Args:
            origin: 起点地址
            destination: 终点地址
            
        Returns:
            通勤时间（分钟），失败返回 None
        """
        if not self.gmaps:
            logger.error("Google Maps API 未初始化")
            return None
        
        if not origin:
            return None
        
        try:
            # 使用明天早上 8:30 作为出发时间
            tomorrow_morning = (
                datetime.now()
                .replace(hour=8, minute=30, second=0, microsecond=0) 
                + timedelta(days=1)
            )
            
            result = self.gmaps.directions(
                origin=origin,
                destination=destination,
                mode="transit",
                departure_time=tomorrow_morning,
                alternatives=False
            )
            
            if result and len(result) > 0:
                route = result[0]
                leg = route['legs'][0]
                duration_seconds = leg['duration']['value']
                duration_minutes = int(round(duration_seconds / 60))
                
                logger.debug(f"公交时间: {origin[:30]}... -> {destination[:20]}... = {duration_minutes} 分钟")
                return duration_minutes
            else:
                logger.debug(f"未找到路线: {origin[:30]}...")
                return None
                
        except googlemaps.exceptions.ApiError as e:
            logger.error(f"Google Maps API 错误: {e}")
            return None
        except Exception as e:
            logger.error(f"计算通勤时间失败: {e}")
            return None
    
    def calculate_driving_time(
        self, 
        origin: str, 
        destination: str
    ) -> Optional[int]:
        """
        计算驾车时间（作为备用）
        
        Args:
            origin: 起点地址
            destination: 终点地址
            
        Returns:
            驾车时间（分钟），失败返回 None
        """
        if not self.gmaps:
            return None
        
        try:
            tomorrow_morning = (
                datetime.now()
                .replace(hour=8, minute=30, second=0, microsecond=0) 
                + timedelta(days=1)
            )
            
            result = self.gmaps.distance_matrix(
                origins=[origin],
                destinations=[destination],
                mode="driving",
                departure_time=tomorrow_morning,
                traffic_model="best_guess"
            )
            
            if (result['status'] == 'OK' and 
                result['rows'][0]['elements'][0]['status'] == 'OK'):
                element = result['rows'][0]['elements'][0]
                duration_seconds = element['duration']['value']
                return int(round(duration_seconds / 60))
            
            return None
            
        except Exception as e:
            logger.error(f"计算驾车时间失败: {e}")
            return None
    
    def calculate_commute_time(
        self, 
        prop: PropertyData, 
        university: str
    ) -> Optional[int]:
        """
        计算到指定大学的通勤时间
        
        Args:
            prop: 房产数据
            university: 大学代码 (UNSW, USYD, UTS)
            
        Returns:
            通勤时间（分钟）
        """
        destination = SCHOOL_COORDINATES.get(university)
        if not destination:
            logger.warning(f"未知大学: {university}")
            return None
        
        origin = self._get_address(prop)
        if not origin:
            logger.debug(f"无法获取房产地址: {prop.house_id}")
            return None
        
        # 首先尝试公交
        transit_time = self.calculate_transit_time(origin, destination)
        if transit_time and transit_time > 0:
            return transit_time
        
        # 公交失败，使用驾车时间估算
        driving_time = self.calculate_driving_time(origin, destination)
        if driving_time and driving_time > 0:
            # 估算公交时间为驾车时间的 1.5 倍
            estimated_transit = int(driving_time * 1.5)
            logger.debug(f"使用驾车时间估算: {driving_time} * 1.5 = {estimated_transit}")
            return estimated_transit
        
        return None
    
    def _process_single_property(
        self, 
        prop: PropertyData, 
        university: str
    ) -> tuple:
        """处理单个房产的通勤时间"""
        commute_time = self.calculate_commute_time(prop, university)
        time.sleep(self.config.request_delay)  # API 限流
        return prop.house_id, commute_time
    
    def process_properties(
        self, 
        properties: List[PropertyData],
        university: str,
        skip_existing: bool = True
    ) -> List[PropertyData]:
        """
        批量计算房产的通勤时间
        
        Args:
            properties: 房产列表
            university: 大学代码
            skip_existing: 是否跳过已有通勤时间的房产
            
        Returns:
            更新后的房产列表
        """
        if not self.gmaps:
            logger.error("Google Maps API 未配置")
            return properties
        
        # 筛选需要处理的房产
        to_process = []
        for prop in properties:
            existing_time = prop.commute_times.get(university)
            if skip_existing and existing_time is not None:
                continue
            to_process.append(prop)
        
        if not to_process:
            logger.info(f"没有需要计算通勤时间的房产")
            return properties
        
        logger.info(f"开始计算 {len(to_process)} 个房产到 {university} 的通勤时间")
        
        successful = 0
        failed = 0
        
        # 使用线程池并行处理
        results = {}
        with ThreadPoolExecutor(max_workers=self.config.max_workers) as executor:
            futures = {
                executor.submit(self._process_single_property, prop, university): prop
                for prop in to_process
            }
            
            for future in tqdm(as_completed(futures), total=len(futures), 
                              desc=f"计算 {university} 通勤时间"):
                try:
                    house_id, commute_time = future.result()
                    results[house_id] = commute_time
                    if commute_time is not None:
                        successful += 1
                    else:
                        failed += 1
                except Exception as e:
                    logger.error(f"处理失败: {e}")
                    failed += 1
        
        # 更新房产数据
        for prop in properties:
            if prop.house_id in results:
                prop.commute_times[university] = results[prop.house_id]
        
        logger.info(f"通勤时间计算完成: 成功 {successful}, 失败 {failed}")
        
        return properties
    
    def process_all_universities(
        self, 
        properties: List[PropertyData],
        universities: List[str] = None,
        skip_existing: bool = True
    ) -> List[PropertyData]:
        """
        计算到所有大学的通勤时间
        
        Args:
            properties: 房产列表
            universities: 大学代码列表，默认全部
            skip_existing: 是否跳过已有通勤时间的房产
            
        Returns:
            更新后的房产列表
        """
        if universities is None:
            universities = list(SCHOOL_COORDINATES.keys())
        
        for university in universities:
            properties = self.process_properties(
                properties, 
                university, 
                skip_existing=skip_existing
            )
        
        return properties


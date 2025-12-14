"""
爬虫基类
定义所有爬虫的通用接口和基础功能
"""
import time
import logging
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from datetime import datetime
from bs4 import BeautifulSoup

from ..models import PropertyData, PropertySource, ScrapeResult
from ..utils import BrowserManager, browser_session
from ..config import settings, ScraperConfig, TARGET_AREAS

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """
    爬虫基类
    所有具体爬虫都应该继承这个类并实现抽象方法
    
    类似 Java 的抽象类，定义了爬虫的基本框架：
    1. 浏览器管理
    2. 页面导航和翻页
    3. 数据解析（由子类实现）
    4. 错误处理和重试
    """
    
    # 子类需要定义的属性
    SOURCE: PropertySource = None  # 数据来源
    BASE_URL: str = ""  # 基础 URL
    
    def __init__(self, config: Optional[ScraperConfig] = None):
        """
        初始化爬虫
        
        Args:
            config: 爬虫配置，如果不提供则使用默认配置
        """
        self.config = config or settings.scraper
        self.browser: Optional[BrowserManager] = None
        self.scraped_count = 0
        self.error_count = 0
    
    @abstractmethod
    def get_search_url(self, area: str) -> str:
        """
        生成搜索 URL
        
        Args:
            area: 搜索区域（如 "kensington-nsw-2033"）
            
        Returns:
            完整的搜索 URL
        """
        pass
    
    @abstractmethod
    def parse_listing_page(self, html: str) -> List[PropertyData]:
        """
        解析列表页面
        
        Args:
            html: 页面 HTML 源码
            
        Returns:
            解析出的房产数据列表
        """
        pass
    
    @abstractmethod
    def parse_detail_page(self, property_data: PropertyData, html: str) -> PropertyData:
        """
        解析详情页面
        
        Args:
            property_data: 基础房产数据
            html: 页面 HTML 源码
            
        Returns:
            更新后的房产数据
        """
        pass
    
    @abstractmethod
    def find_next_button(self, soup: BeautifulSoup) -> Optional[Any]:
        """
        查找下一页按钮
        
        Args:
            soup: BeautifulSoup 对象
            
        Returns:
            下一页按钮元素，如果没有则返回 None
        """
        pass
    
    @abstractmethod
    def get_detail_url(self, property_data: PropertyData) -> str:
        """
        获取详情页 URL
        
        Args:
            property_data: 房产数据
            
        Returns:
            详情页 URL
        """
        pass
    
    def scrape_area(self, area: str) -> ScrapeResult:
        """
        爬取指定区域的房源
        
        Args:
            area: 区域标识
            
        Returns:
            爬取结果
        """
        url = self.get_search_url(area)
        logger.info(f"开始爬取区域: {area}, URL: {url}")
        
        properties = []
        pages_scraped = 0
        
        try:
            # 导航到首页
            if not self.browser.navigate(url, wait_time=self.config.page_delay):
                return ScrapeResult(
                    success=False,
                    error_message=f"无法加载页面: {url}"
                )
            
            # 遍历所有页面
            for page_num in range(self.config.max_pages):
                try:
                    # 获取页面源码
                    html = self.browser.get_page_source()
                    soup = BeautifulSoup(html, "html.parser")
                    
                    # 解析当前页
                    page_properties = self.parse_listing_page(html)
                    
                    if not page_properties:
                        logger.info(f"第 {page_num + 1} 页没有找到房源，停止翻页")
                        break
                    
                    properties.extend(page_properties)
                    pages_scraped += 1
                    logger.info(f"第 {page_num + 1} 页解析成功，找到 {len(page_properties)} 个房源")
                    
                    # 查找下一页按钮
                    next_button = self.find_next_button(soup)
                    if not next_button:
                        logger.info(f"没有找到下一页按钮，共爬取 {pages_scraped} 页")
                        break
                    
                    # 点击下一页
                    if not self._click_next_page(next_button):
                        logger.info("点击下一页失败，停止翻页")
                        break
                    
                    # 等待页面加载
                    time.sleep(self.config.page_delay)
                    
                except Exception as e:
                    logger.error(f"第 {page_num + 1} 页处理失败: {e}")
                    self.error_count += 1
                    break
            
            self.scraped_count += len(properties)
            
            return ScrapeResult(
                success=True,
                properties=properties,
                pages_scraped=pages_scraped,
                total_found=len(properties)
            )
            
        except Exception as e:
            logger.error(f"爬取区域 {area} 失败: {e}")
            return ScrapeResult(
                success=False,
                error_message=str(e),
                properties=properties,
                pages_scraped=pages_scraped
            )
    
    def scrape_areas(self, areas: List[str]) -> List[PropertyData]:
        """
        爬取多个区域
        
        Args:
            areas: 区域列表
            
        Returns:
            所有房产数据
        """
        all_properties = []
        
        with browser_session() as browser:
            self.browser = browser
            
            for area in areas:
                result = self.scrape_area(area)
                if result.success:
                    all_properties.extend(result.properties)
                else:
                    logger.warning(f"区域 {area} 爬取失败: {result.error_message}")
                
                # 区域间间隔
                time.sleep(self.config.request_delay)
        
        logger.info(f"爬取完成，共获取 {len(all_properties)} 个房源")
        return all_properties
    
    def scrape_by_university(self, university: str) -> List[PropertyData]:
        """
        按大学爬取周边房源
        
        Args:
            university: 大学代码 (UNSW, USYD, UTS)
            
        Returns:
            房产数据列表
        """
        areas = TARGET_AREAS.get(university, [])
        if not areas:
            logger.warning(f"未找到大学 {university} 的目标区域配置")
            return []
        
        logger.info(f"开始爬取 {university} 周边 {len(areas)} 个区域")
        return self.scrape_areas(areas)
    
    def scrape_property_details(
        self, 
        properties: List[PropertyData],
        skip_existing: bool = True
    ) -> List[PropertyData]:
        """
        爬取房产详情页
        
        Args:
            properties: 房产列表
            skip_existing: 是否跳过已有详情的房产
            
        Returns:
            更新后的房产列表
        """
        logger.info(f"开始爬取 {len(properties)} 个房产的详情")
        
        with browser_session() as browser:
            self.browser = browser
            
            for i, prop in enumerate(properties):
                # 跳过已有描述的房产
                if skip_existing and prop.description_en:
                    continue
                
                try:
                    url = self.get_detail_url(prop)
                    if not url:
                        continue
                    
                    if self.browser.navigate(url, wait_time=self.config.page_delay):
                        html = self.browser.get_page_source()
                        prop = self.parse_detail_page(prop, html)
                        logger.debug(f"详情页爬取成功: {prop.address_line1}")
                    
                    # 请求间隔
                    time.sleep(self.config.request_delay)
                    
                except Exception as e:
                    logger.error(f"爬取详情失败 ({prop.house_id}): {e}")
                    self.error_count += 1
                
                # 进度日志
                if (i + 1) % 10 == 0:
                    logger.info(f"详情爬取进度: {i + 1}/{len(properties)}")
        
        return properties
    
    def _click_next_page(self, next_button) -> bool:
        """
        点击下一页按钮
        
        Args:
            next_button: 按钮元素
            
        Returns:
            是否成功
        """
        try:
            self.browser.scroll_to_element(next_button)
            time.sleep(1)
            self.browser.click_element(next_button)
            return True
        except Exception as e:
            logger.error(f"点击下一页失败: {e}")
            return False
    
    def get_stats(self) -> Dict[str, int]:
        """获取爬取统计"""
        return {
            "scraped_count": self.scraped_count,
            "error_count": self.error_count
        }


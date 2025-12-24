"""
Domain.com.au 爬虫
使用 Playwright 浏览器爬取 Domain 网站的租房信息
"""
import re
import os
import time
import logging
from typing import List, Optional, Any
from datetime import datetime
from bs4 import BeautifulSoup

from .base import BaseScraper
from ..models import PropertyData, PropertySource
from ..config import PROPERTY_TYPE_MAPPING, ScraperConfig
from ..utils import (
    extract_price, extract_number, clean_address,
    parse_available_date, is_valid_image_url
)
from ..utils.browser import BrowserManager, BrowserType

logger = logging.getLogger(__name__)


class DomainScraper(BaseScraper):
    """
    Domain.com.au 爬虫实现
    使用 Playwright 进行爬取
    """
    
    SOURCE = PropertySource.DOMAIN
    BASE_URL = "https://www.domain.com.au"
    
    # Domain 特有的 CSS 选择器
    SELECTORS = {
        'listing': 'li[data-testid^="listing-"]',
        'price': 'p[data-testid="listing-card-price"]',
        'address_line1': 'span[data-testid="address-line1"]',
        'address_line2': 'span[data-testid="address-line2"]',
        'features': 'span[data-testid="property-features-feature"]',
        'property_type': 'span.css-693528',
        'next_button': 'a[data-testid="paginator-navigation-button"]',
        'description': 'div[data-testid="listing-details__description"]',
        'description_headline': 'h3[data-testid="listing-details__description-headline"]',
        'available_date': 'ul[data-testid="listing-summary-strip"]',
    }
    
    def __init__(self, config: ScraperConfig = None, profile_dir: str = None):
        """
        初始化爬虫
        
        Args:
            config: 爬虫配置
            profile_dir: Playwright 浏览器配置目录
        """
        super().__init__(config)
        self.profile_dir = profile_dir or os.path.join(os.getcwd(), 'domain_profile')
        self.browser = None
    
    def get_search_url(self, area: str) -> str:
        """生成 Domain 租房搜索 URL"""
        return f"{self.BASE_URL}/rent/{area}/?excludedeposittaken=1"
    
    def get_detail_url(self, property_data: PropertyData) -> str:
        """获取房产详情页 URL"""
        if property_data.url:
            return property_data.url
        combined_address = property_data.get_combined_address()
        return f"{self.BASE_URL}/{combined_address}/"
    
    def scrape_area(self, area: str) -> List[PropertyData]:
        """
        爬取指定区域 - 使用 Playwright
        """
        properties = []
        url = self.get_search_url(area)
        logger.info(f"Domain 爬取: {url}")
        
        try:
            # 使用 Playwright
            self.browser = BrowserManager(
                browser_type=BrowserType.PLAYWRIGHT,
                profile_dir=self.profile_dir
            )
            self.browser.create_driver()
            
            page = 1
            while page <= self.config.max_pages:
                if page == 1:
                    page_url = url
                else:
                    page_url = f"{url}&page={page}"
                
                logger.info(f"爬取第 {page} 页: {page_url}")
                
                # 导航到页面
                self.browser.navigate(page_url, wait_time=5.0)
                
                # 等待页面加载
                self.browser.wait(3.0)
                
                # 滚动加载更多内容
                for _ in range(3):
                    self.browser.scroll_page(500)
                    self.browser.wait(1.0)
                
                # 获取页面内容
                html = self.browser.get_page_source()
                
                # 解析页面
                page_properties = self.parse_listing_page(html)
                
                if not page_properties:
                    logger.info(f"第 {page} 页没有找到房源，停止")
                    break
                
                # 为每个房源设置 URL
                for prop in page_properties:
                    if not prop.url:
                        prop.url = self.get_detail_url(prop)
                
                properties.extend(page_properties)
                logger.info(f"第 {page} 页找到 {len(page_properties)} 个房源")
                
                # 检查是否有下一页
                if not self._has_next_page(html, page):
                    break
                
                page += 1
                time.sleep(self.config.request_delay)
            
        except Exception as e:
            logger.error(f"Domain 爬取失败: {e}")
            import traceback
            traceback.print_exc()
        finally:
            if self.browser:
                self.browser.close()
                self.browser = None
        
        return properties
    
    def scrape_areas(self, areas: List[str]) -> List[PropertyData]:
        """爬取多个区域"""
        all_properties = []
        
        for area in areas:
            properties = self.scrape_area(area)
            all_properties.extend(properties)
            time.sleep(self.config.request_delay)
        
        return all_properties
    
    def _has_next_page(self, html: str, current_page: int) -> bool:
        """检查是否有下一页"""
        soup = BeautifulSoup(html, 'html.parser')
        next_buttons = soup.find_all('a', {'data-testid': 'paginator-navigation-button'})
        
        for btn in next_buttons:
            text = btn.get_text(strip=True).lower()
            if 'next' in text:
                return True
        
        return False
    
    def parse_listing_page(self, html: str) -> List[PropertyData]:
        """解析 Domain 列表页面"""
        soup = BeautifulSoup(html, "html.parser")
        listings = soup.find_all("li", {"data-testid": lambda v: v and v.startswith("listing-")})
        
        properties = []
        for listing in listings:
            try:
                prop = self._parse_listing_item(listing)
                if prop:
                    properties.append(prop)
            except Exception as e:
                logger.debug(f"解析房源失败: {e}")
        
        return properties
    
    def _parse_listing_item(self, listing) -> Optional[PropertyData]:
        """解析单个房源列表项"""
        # 价格
        price_elem = listing.find('p', {'data-testid': 'listing-card-price'})
        price = extract_price(price_elem.text if price_elem else "")
        
        # 地址
        address1_elem = listing.find('span', {'data-testid': 'address-line1'})
        address_line1 = clean_address(address1_elem.text if address1_elem else "")
        
        address2_elem = listing.find('span', {'data-testid': 'address-line2'})
        address_line2_raw = address2_elem.text.strip() if address2_elem else ""
        address_line2 = address_line2_raw.lower().replace(' ', '-')
        
        # 解析区域信息
        suburb, state, postcode = self._parse_address_line2(address_line2_raw)
        
        # 房产特征 (卧室、浴室、车位)
        features = listing.find_all('span', {'data-testid': 'property-features-feature'})
        bedroom_count = extract_number(features[0].text) if len(features) > 0 else 0
        bathroom_count = extract_number(features[1].text) if len(features) > 1 else 0
        parking_count = extract_number(features[2].text) if len(features) > 2 else 0
        
        # 房产类型
        type_elem = listing.find('span', {'class': 'css-693528'})
        property_type_raw = type_elem.text.strip() if type_elem else ""
        property_type = PROPERTY_TYPE_MAPPING.get(
            property_type_raw.lower(), 5  # 默认为其他
        )
        
        # 房源 ID
        house_id = ""
        data_testid = listing.get('data-testid', '')
        if data_testid.startswith('listing-'):
            house_id = data_testid.split('-')[-1]
        
        # 获取详情页 URL
        url = ""
        link = listing.find('a', href=lambda h: h and '/rent/' in str(h) or h and '-' in str(h) and str(h).endswith('/'))
        if link:
            href = link.get('href', '')
            if href:
                url = f"{self.BASE_URL}{href}" if href.startswith('/') else href
        
        # 缩略图
        thumbnail_url = None
        img = listing.find('img')
        if img:
            src = img.get('src') or img.get('data-src')
            if src and is_valid_image_url(src):
                thumbnail_url = src
        
        if not house_id or not address_line1:
            return None
        
        return PropertyData(
            house_id=house_id,
            source=self.SOURCE,
            price_per_week=price,
            address_line1=address_line1,
            address_line2=address_line2,
            suburb=suburb,
            state=state,
            postcode=postcode,
            bedroom_count=bedroom_count,
            bathroom_count=bathroom_count,
            parking_count=parking_count,
            property_type=property_type,
            property_type_raw=property_type_raw,
            url=url,
            thumbnail_url=thumbnail_url,
            scraped_at=datetime.now()
        )
    
    def _parse_address_line2(self, address_line2: str) -> tuple:
        """解析 addressLine2 获取区域信息"""
        suburb, state, postcode = "", "NSW", ""
        
        if not address_line2:
            return suburb, state, postcode
        
        try:
            parts = address_line2.replace('-', ' ').split()
            for i, part in enumerate(parts):
                if part.upper() == 'NSW':
                    suburb = ' '.join(parts[:i]).strip().lower()
                    state = 'NSW'
                    if i + 1 < len(parts):
                        postcode = parts[i + 1]
                    break
        except Exception:
            pass
        
        return suburb, state, postcode
    
    def scrape_property_details(
        self, 
        properties: List[PropertyData],
        skip_existing: bool = True
    ) -> List[PropertyData]:
        """
        爬取房产详情页 - 使用 Playwright
        """
        to_scrape = [p for p in properties if not (skip_existing and p.description_en)]
        
        if not to_scrape:
            logger.info("没有需要爬取详情的房产")
            return properties
        
        logger.info(f"开始爬取 {len(to_scrape)} 个房产的详情页")
        
        try:
            if not self.browser:
                self.browser = BrowserManager(
                    browser_type=BrowserType.PLAYWRIGHT,
                    profile_dir=self.profile_dir
                )
                self.browser.create_driver()
            
            for i, prop in enumerate(to_scrape):
                try:
                    url = prop.url or self.get_detail_url(prop)
                    if not url:
                        continue
                    
                    logger.debug(f"爬取详情 ({i+1}/{len(to_scrape)}): {url}")
                    
                    self.browser.navigate(url, wait_time=3.0)
                    
                    # 滚动加载
                    for _ in range(2):
                        self.browser.scroll_page(400)
                        self.browser.wait(0.5)
                    
                    html = self.browser.get_page_source()
                    
                    if len(html) > 5000:
                        self.parse_detail_page(prop, html)
                        logger.debug(f"详情获取成功: {prop.address_line1}")
                    
                    if (i + 1) % 10 == 0:
                        logger.info(f"详情爬取进度: {i + 1}/{len(to_scrape)}")
                    
                    time.sleep(self.config.request_delay)
                    
                except Exception as e:
                    logger.error(f"爬取详情失败 ({prop.house_id}): {e}")
            
        except Exception as e:
            logger.error(f"详情爬取失败: {e}")
        finally:
            if self.browser:
                self.browser.close()
                self.browser = None
        
        return properties
    
    def parse_detail_page(self, property_data: PropertyData, html: str) -> PropertyData:
        """解析 Domain 详情页面"""
        soup = BeautifulSoup(html, "html.parser")
        
        # 描述
        description = self._parse_description(soup)
        property_data.description_en = description
        
        # 可用日期
        available_date = self._parse_available_date(soup)
        property_data.available_date = available_date
        
        # 缩略图
        if not property_data.thumbnail_url:
            thumbnail_url = self._parse_thumbnail(soup)
            property_data.thumbnail_url = thumbnail_url
        
        # 发布时间
        property_data.published_at = datetime.now()
        
        return property_data
    
    def _parse_description(self, soup: BeautifulSoup) -> str:
        """解析房产描述"""
        description_container = soup.find("div", {"data-testid": "listing-details__description"})
        if not description_container:
            return ""
        
        headline = description_container.find("h3", {"data-testid": "listing-details__description-headline"})
        paragraphs = description_container.find_all("p")
        
        description = ""
        if headline:
            description = headline.text.strip()
        if paragraphs:
            description += " " + " ".join(p.text.strip() for p in paragraphs)
        
        return description.strip()
    
    def _parse_available_date(self, soup: BeautifulSoup) -> Optional[str]:
        """解析可用日期"""
        date_container = soup.find("ul", {"data-testid": "listing-summary-strip"})
        if not date_container:
            return None
        
        li_item = date_container.find("li")
        if not li_item:
            return None
        
        date_text = li_item.get_text(strip=True)
        
        if "Available Now" in date_text:
            return datetime.now().strftime('%Y-%m-%d')
        
        if "Available from" in date_text:
            strong_tag = li_item.find("strong")
            if strong_tag:
                parsed = parse_available_date(strong_tag.text.strip())
                if parsed:
                    return parsed.strftime('%Y-%m-%d') if hasattr(parsed, 'strftime') else str(parsed)
        
        return None
    
    def _parse_thumbnail(self, soup: BeautifulSoup) -> Optional[str]:
        """解析房产缩略图"""
        # 方法1: 查找包含房产地址的图片
        all_imgs = soup.find_all("img")
        for img in all_imgs:
            src = img.get('src', '')
            alt = img.get('alt', '').lower()
            
            if 'image' in alt and src and 'domainstatic.com.au' in src:
                if is_valid_image_url(src):
                    if not any(x in alt for x in ['logo', 'avatar', 'agent', 'powered by']):
                        return src
        
        # 方法2: 查找 picture 标签内的图片
        picture_tag = soup.find("picture")
        if picture_tag:
            img_tag = picture_tag.find("img")
            if img_tag:
                src = img_tag.get('src') or img_tag.get('data-src')
                if src:
                    full_url = src if src.startswith('http') else f"{self.BASE_URL}{src}"
                    if is_valid_image_url(full_url):
                        return full_url
        
        # 方法3: 查找第一个有效的 domainstatic 图片
        for img in all_imgs:
            src = img.get('src', '')
            alt = img.get('alt', '').lower()
            
            if src and 'domainstatic.com.au' in src and is_valid_image_url(src):
                if not any(x in src.lower() for x in ['logo', 'avatar', 'icon', 'insight']):
                    if not any(x in alt for x in ['logo', 'avatar', 'agent', 'powered by']):
                        return src
        
        return None
    
    def find_next_button(self, soup: BeautifulSoup) -> Optional[Any]:
        """查找下一页按钮（兼容 BaseScraper）"""
        return soup.find('a', {'data-testid': 'paginator-navigation-button'})

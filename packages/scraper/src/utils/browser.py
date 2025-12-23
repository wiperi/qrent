"""
浏览器管理工具
封装 Selenium WebDriver 和 Playwright 的创建和管理
支持普通 Chrome、undetected-chromedriver 和 Playwright 持久化模式
"""
import tempfile
import logging
import time
import os
import asyncio
from typing import Optional
from contextlib import contextmanager
from enum import Enum

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException, WebDriverException

from ..config import settings, SeleniumConfig

logger = logging.getLogger(__name__)


class BrowserType(Enum):
    """浏览器类型"""
    CHROME = "chrome"
    UNDETECTED = "undetected"  # undetected-chromedriver
    PLAYWRIGHT = "playwright"  # Playwright 持久化模式


class BrowserManager:
    """
    浏览器管理器
    负责创建、配置和管理 Chrome WebDriver 或 Playwright
    """
    
    def __init__(
        self, 
        config: Optional[SeleniumConfig] = None,
        browser_type: BrowserType = BrowserType.CHROME,
        profile_dir: Optional[str] = None
    ):
        self.config = config or settings.selenium
        self.browser_type = browser_type
        self.profile_dir = profile_dir
        self.driver = None
        self._temp_dir: Optional[str] = None
        # Playwright 相关
        self._playwright = None
        self._playwright_context = None
        self._playwright_page = None
    
    def create_driver(self):
        """创建并配置浏览器"""
        if self.browser_type == BrowserType.PLAYWRIGHT:
            return self._create_playwright_driver()
        elif self.browser_type == BrowserType.UNDETECTED:
            return self._create_undetected_driver()
        else:
            return self._create_chrome_driver()
    
    def _create_chrome_driver(self):
        """创建普通 Chrome WebDriver"""
        options = Options()
        
        if self.config.headless:
            options.add_argument("--headless")
        
        if self.config.disable_gpu:
            options.add_argument("--disable-gpu")
        
        options.add_argument(f"--window-size={self.config.window_size}")
        options.add_argument(f"--log-level={self.config.log_level}")
        options.add_argument(f"user-agent={self.config.user_agent}")
        
        # 反检测设置
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-infobars")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        
        # 使用临时用户数据目录
        self._temp_dir = tempfile.mkdtemp()
        options.add_argument(f"--user-data-dir={self._temp_dir}")
        
        # 创建驱动
        try:
            self.driver = webdriver.Chrome(options=options)
            self.driver.set_page_load_timeout(self.config.page_load_timeout)
            self.driver.implicitly_wait(self.config.implicit_wait)
            logger.info("Chrome WebDriver created successfully")
            return self.driver
        except WebDriverException as e:
            logger.error(f"Failed to create Chrome WebDriver: {e}")
            raise
    
    def _create_undetected_driver(self):
        """创建 undetected-chromedriver (用于反反爬虫)"""
        try:
            import undetected_chromedriver as uc
            
            options = uc.ChromeOptions()
            options.add_argument(f"--window-size={self.config.window_size}")
            
            if self.config.disable_gpu:
                options.add_argument("--disable-gpu")
            
            self.driver = uc.Chrome(
                options=options,
                headless=self.config.headless
            )
            
            logger.info("Undetected Chrome WebDriver created successfully")
            return self.driver
            
        except ImportError:
            logger.warning("undetected-chromedriver not installed, falling back to regular Chrome")
            return self._create_chrome_driver()
        except Exception as e:
            logger.error(f"Failed to create undetected Chrome: {e}")
            return self._create_chrome_driver()
    
    def _create_playwright_driver(self):
        """创建 Playwright 持久化浏览器"""
        try:
            from playwright.sync_api import sync_playwright
            
            # 确定配置目录
            if self.profile_dir:
                profile_path = self.profile_dir
            else:
                # 默认在项目目录下
                profile_path = os.path.join(os.getcwd(), 'rea_profile')
            
            os.makedirs(profile_path, exist_ok=True)
            
            self._playwright = sync_playwright().start()
            
            # 默认使用非 headless 模式 (通过 Xvfb 虚拟显示器在服务器上运行)
            # 如果明确设置 HEADLESS=true 则使用 headless 模式
            use_headless = os.environ.get('HEADLESS', '').lower() == 'true'
            
            self._playwright_context = self._playwright.chromium.launch_persistent_context(
                profile_path,
                headless=use_headless,
                viewport={'width': 1920, 'height': 1080},
                locale='en-AU',
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                ],
            )
            
            # 获取或创建页面
            if self._playwright_context.pages:
                self._playwright_page = self._playwright_context.pages[0]
            else:
                self._playwright_page = self._playwright_context.new_page()
            
            logger.info(f"Playwright browser created with profile: {profile_path}")
            return self._playwright_page
            
        except ImportError:
            logger.error("Playwright not installed. Install with: pip install playwright && playwright install chromium")
            raise
        except Exception as e:
            logger.error(f"Failed to create Playwright browser: {e}")
            raise
    
    def get_driver(self):
        """获取驱动实例，如果不存在则创建"""
        if self.browser_type == BrowserType.PLAYWRIGHT:
            if self._playwright_page is None:
                self.create_driver()
            return self._playwright_page
        else:
            if self.driver is None:
                self.create_driver()
            return self.driver
    
    def close(self):
        """关闭浏览器"""
        if self.browser_type == BrowserType.PLAYWRIGHT:
            try:
                # 先关闭页面
                if self._playwright_page:
                    try:
                        self._playwright_page.close()
                    except:
                        pass
                    self._playwright_page = None
                
                # 关闭上下文
                if self._playwright_context:
                    try:
                        self._playwright_context.close()
                    except:
                        pass
                    self._playwright_context = None
                
                # 停止 Playwright
                if self._playwright:
                    try:
                        self._playwright.stop()
                    except:
                        pass
                    self._playwright = None
                
                # 等待进程完全退出
                time.sleep(2)
                logger.info("Playwright browser closed")
                
            except Exception as e:
                logger.warning(f"Error closing Playwright: {e}")
            finally:
                self._playwright_page = None
                self._playwright_context = None
                self._playwright = None
        else:
            if self.driver:
                try:
                    self.driver.quit()
                    logger.info("Chrome WebDriver closed")
                except Exception as e:
                    logger.warning(f"Error closing Chrome WebDriver: {e}")
                finally:
                    self.driver = None
    
    def navigate(self, url: str, wait_time: float = 5.0) -> bool:
        """
        导航到指定 URL
        
        Args:
            url: 目标 URL
            wait_time: 等待时间（秒）
            
        Returns:
            是否成功
        """
        try:
            if self.browser_type == BrowserType.PLAYWRIGHT:
                page = self.get_driver()
                # RealEstate.com.au 等站点可能持续加载资源导致 "load" 事件迟迟不触发，
                # 使用 domcontentloaded 可显著降低 page.goto 超时概率。
                page.goto(url, timeout=60000, wait_until="domcontentloaded")
                page.wait_for_timeout(int(wait_time * 1000))
            else:
                driver = self.get_driver()
                driver.get(url)
                time.sleep(wait_time)
            return True
        except TimeoutException:
            logger.warning(f"Page load timeout: {url}")
            return False
        except Exception as e:
            logger.error(f"Navigation failed: {url}, error: {e}")
            return False
    
    def wait_for_element(self, by: By, value: str, timeout: int = 10):
        """等待元素出现"""
        if self.browser_type == BrowserType.PLAYWRIGHT:
            try:
                page = self.get_driver()
                selector = self._convert_selector(by, value)
                page.wait_for_selector(selector, timeout=timeout * 1000)
                return page.query_selector(selector)
            except Exception:
                return None
        else:
            try:
                driver = self.get_driver()
                element = WebDriverWait(driver, timeout).until(
                    EC.presence_of_element_located((by, value))
                )
                return element
            except TimeoutException:
                logger.warning(f"Element wait timeout: {by}={value}")
                return None
    
    def _convert_selector(self, by: By, value: str) -> str:
        """将 Selenium 选择器转换为 Playwright 选择器"""
        if by == By.CSS_SELECTOR:
            return value
        elif by == By.ID:
            return f"#{value}"
        elif by == By.CLASS_NAME:
            return f".{value}"
        elif by == By.XPATH:
            return f"xpath={value}"
        elif by == By.TAG_NAME:
            return value
        else:
            return value
    
    def wait_for_elements(self, by: By, value: str, timeout: int = 10):
        """等待多个元素出现"""
        if self.browser_type == BrowserType.PLAYWRIGHT:
            try:
                page = self.get_driver()
                selector = self._convert_selector(by, value)
                page.wait_for_selector(selector, timeout=timeout * 1000)
                return page.query_selector_all(selector)
            except Exception:
                return []
        else:
            try:
                driver = self.get_driver()
                elements = WebDriverWait(driver, timeout).until(
                    EC.presence_of_all_elements_located((by, value))
                )
                return elements
            except TimeoutException:
                logger.warning(f"Elements wait timeout: {by}={value}")
                return []
    
    def scroll_to_element(self, element):
        """滚动到指定元素"""
        if self.browser_type == BrowserType.PLAYWRIGHT:
            element.scroll_into_view_if_needed()
        else:
            driver = self.get_driver()
            driver.execute_script("arguments[0].scrollIntoView();", element)
    
    def click_element(self, element):
        """点击元素"""
        if self.browser_type == BrowserType.PLAYWRIGHT:
            element.click()
        else:
            driver = self.get_driver()
            driver.execute_script("arguments[0].click();", element)
    
    def get_page_source(self) -> str:
        """获取页面源码"""
        if self.browser_type == BrowserType.PLAYWRIGHT:
            return self._playwright_page.content()
        else:
            return self.get_driver().page_source
    
    def scroll_page(self, distance: int = 500):
        """滚动页面"""
        if self.browser_type == BrowserType.PLAYWRIGHT:
            self._playwright_page.evaluate(f"window.scrollBy(0, {distance})")
        else:
            self.get_driver().execute_script(f"window.scrollBy(0, {distance})")
    
    def wait(self, seconds: float):
        """等待指定时间"""
        if self.browser_type == BrowserType.PLAYWRIGHT:
            self._playwright_page.wait_for_timeout(int(seconds * 1000))
        else:
            time.sleep(seconds)
    
    def __enter__(self):
        self.create_driver()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


@contextmanager
def browser_session(
    config: Optional[SeleniumConfig] = None,
    browser_type: BrowserType = BrowserType.CHROME,
    profile_dir: Optional[str] = None
):
    """
    浏览器会话上下文管理器
    
    使用示例:
        with browser_session() as browser:
            browser.navigate("https://example.com")
            html = browser.get_page_source()
        
        # 使用 undetected-chromedriver
        with browser_session(browser_type=BrowserType.UNDETECTED) as browser:
            browser.navigate("https://protected-site.com")
        
        # 使用 Playwright 持久化模式
        with browser_session(browser_type=BrowserType.PLAYWRIGHT, profile_dir="./my_profile") as browser:
            browser.navigate("https://realestate.com.au")
    """
    manager = BrowserManager(config, browser_type, profile_dir)
    try:
        manager.create_driver()
        yield manager
    finally:
        manager.close()

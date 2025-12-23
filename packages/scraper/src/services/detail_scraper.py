"""
轻量封装详情页/图片爬取，统一从 src 中调用 scrape_details_only / scrape_images_only。
保持原有 Playwright + profile 逻辑及重试参数。
"""
from __future__ import annotations

import os
import logging
from typing import Optional
import importlib

logger = logging.getLogger(__name__)


def scrape_details(csv_path: str, profile_name: str = "rea_profile", limit: Optional[int] = None) -> None:
    """
    爬取详情页（description_en、available_date、thumbnail_url）。
    - profile_name: 复用 Playwright 配置，便于反爬。
    - limit: 仅处理前 N 条缺失详情的记录（用于快速测试）。
    """
    # 避免相对导入在脚本模式下失败，改为动态导入
    scrape_mod = importlib.import_module("scrape_details_only")
    scrape_details_from_csv = getattr(scrape_mod, "scrape_details_from_csv")

    if limit is not None:
        os.environ["DETAILS_LIMIT"] = str(max(0, int(limit)))
    logger.info(f"[detail_scraper] start details csv={csv_path} profile={profile_name} limit={limit}")
    scrape_details_from_csv(csv_path, profile_name)


def scrape_images(csv_path: str, profile_name: str = "profile_img", limit: Optional[int] = None) -> None:
    """
    仅重新爬取图片 thumbnail_url；保持原有“缺失/重刷”策略。
    """
    scrape_mod = importlib.import_module("scrape_images_only")
    scrape_images_from_csv = getattr(scrape_mod, "scrape_images_from_csv")

    if limit is not None:
        os.environ["IMAGES_LIMIT"] = str(max(0, int(limit)))
    logger.info(f"[detail_scraper] start images csv={csv_path} profile={profile_name} limit={limit}")
    scrape_images_from_csv(csv_path, profile_name)


__all__ = ["scrape_details", "scrape_images"]

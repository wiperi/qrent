"""
Pipeline orchestrator for scraper_detailed:
1) 详情页爬取（可选，沿用 Playwright + profile）
2) AI 评分与关键词提取（可选，沿用 ScoringService）
3) 通勤时间计算（可选，Google Maps API）
4) CSV 入库（复用 database_importer 逻辑）
"""
import os
import logging
from typing import Optional, List, Dict

import pandas as pd

from .scoring import ScoringService
from .commute import CommuteService
from .detail_scraper import scrape_details, scrape_images
from .database_importer import import_csv
from ..models import PropertyData, PropertySource
from ..config import settings

logger = logging.getLogger(__name__)


def _ensure_score_columns(df: pd.DataFrame, total_scores: int) -> pd.DataFrame:
    if "average_score" not in df.columns:
        df["average_score"] = pd.NA
    if "keywords" not in df.columns:
        df["keywords"] = pd.NA
    if "description_cn" not in df.columns:
        df["description_cn"] = pd.NA
    for i in range(1, total_scores + 1):
        col = f"Score_{i}"
        if col not in df.columns:
            df[col] = pd.NA
    return df


def _row_to_prop(row: pd.Series, idx: int) -> Optional[PropertyData]:
    desc = row.get("description_en", "")
    if pd.isna(desc) or not str(desc).strip():
        return None

    house_id = row.get("houseId") or row.get("house_id") or str(idx)
    source_val = row.get("source") or "realestate"
    try:
        source = PropertySource(str(source_val))
    except Exception:
        source = PropertySource.REALESTATE

    prop = PropertyData(house_id=str(house_id), source=source)
    prop.description_en = str(desc)
    prop.address_line1 = str(row.get("addressLine1") or "")
    prop.address_line2 = str(row.get("addressLine2") or "")
    prop.price_per_week = int(row.get("pricePerWeek") or 0)
    prop.bedroom_count = int(row.get("bedroomCount") or 0)
    prop.bathroom_count = int(row.get("bathroomCount") or 0)
    prop.parking_count = int(row.get("parkingCount") or 0)
    prop.property_type = int(row.get("propertyType") or 1)
    prop.url = str(row.get("url") or "")
    prop.thumbnail_url = row.get("thumbnail_url") if pd.notna(row.get("thumbnail_url", None)) else None
    prop.available_date = row.get("available_date") if not pd.isna(row.get("available_date", None)) else None
    prop.published_at = row.get("published_at") if not pd.isna(row.get("published_at", None)) else None

    # 已有结果，用于 skip_existing 判断
    prop.average_score = None if pd.isna(row.get("average_score")) else float(row.get("average_score"))
    prop.keywords = None if pd.isna(row.get("keywords")) else str(row.get("keywords"))
    prop.description_cn = None if pd.isna(row.get("description_cn")) else str(row.get("description_cn"))

    # 已有通勤，保留
    commute_fields = {
        "UNSW": row.get("commuteTime_UNSW"),
        "USYD": row.get("commuteTime_USYD"),
        "UTS": row.get("commuteTime_UTS"),
        "general": row.get("commute_time"),
    }
    for k, v in commute_fields.items():
        if v is not None and not pd.isna(v):
            prop.commute_times[k] = int(v)
    return prop


def _build_props_from_df(df: pd.DataFrame, limit: Optional[int] = None) -> List[PropertyData]:
    props: List[PropertyData] = []
    for idx, row in df.iterrows():
        prop = _row_to_prop(row, idx)
        if not prop:
            continue
        props.append(prop)
        if limit is not None and len(props) >= limit:
            break
    return props


def _write_props_back(
    df: pd.DataFrame,
    props: List[PropertyData],
    total_scores: int,
    target_school: Optional[str] = None,
) -> pd.DataFrame:
    id_index_map = {str(row.get("houseId") or row.get("house_id") or i): i for i, row in df.iterrows()}

    commute_col = None
    if target_school:
        commute_col = f"commuteTime_{target_school}"
        if commute_col not in df.columns:
            df[commute_col] = pd.NA

    for prop in props:
        idx = id_index_map.get(str(prop.house_id))
        if idx is None:
            continue

        if prop.average_score is not None:
            df.at[idx, "average_score"] = prop.average_score
        if prop.keywords is not None:
            df.at[idx, "keywords"] = prop.keywords
        if prop.description_cn is not None:
            df.at[idx, "description_cn"] = prop.description_cn

        scores = getattr(prop, "scores", []) or []
        for i in range(1, total_scores + 1):
            df.at[idx, f"Score_{i}"] = scores[i - 1] if i - 1 < len(scores) else pd.NA

        if commute_col and target_school:
            commute_time = prop.commute_times.get(target_school)
            if commute_time is not None:
                df.at[idx, commute_col] = commute_time

    return df


def _infer_school_from_path(csv_path: str) -> Optional[str]:
    upper = csv_path.upper()
    if "UNSW" in upper:
        return "UNSW"
    if "USYD" in upper:
        return "USYD"
    if "UTS" in upper:
        return "UTS"
    return None


def run_pipeline(
    csv_path: str,
    target_school: Optional[str] = None,
    profile_name: str = "rea_profile",
    do_details: bool = True,
    details_limit: Optional[int] = None,
    rescrape_images: bool = False,
    images_profile: Optional[str] = None,
    do_ai: bool = True,
    force_ai: bool = False,
    ai_limit: Optional[int] = None,
    do_commute: bool = True,
    force_commute: bool = False,
    do_import: bool = True,
) -> None:
    """
    一键流程：详情 -> AI 评分+关键词 -> 通勤 -> 入库
    - 保留旧图/旧通勤：数据库层按“有新值才覆盖”策略。
    - 详情页：沿用 scrape_details_only 的 Playwright + profile 重置逻辑。
    """
    target_school = target_school or _infer_school_from_path(csv_path)
    if not target_school:
        raise ValueError(f"无法从文件名识别学校 (UNSW/USYD/UTS): {csv_path}")

    if do_details:
        logger.info(f"[pipeline] 开始爬取详情: {csv_path} (profile={profile_name}, limit={details_limit})")
        scrape_details(csv_path, profile_name=profile_name, limit=details_limit)

    if rescrape_images:
        img_profile = images_profile or f"{profile_name}_img"
        logger.info(f"[pipeline] 重新爬取图片: {csv_path} (profile={img_profile})")
        scrape_images(csv_path, profile_name=img_profile, limit=None)

    if do_ai:
        logger.info(f"[pipeline] 开始 AI 评分/关键词: {csv_path} (force={force_ai}, limit={ai_limit})")
        df = pd.read_csv(csv_path, encoding="utf-8-sig")
        service = ScoringService(settings.scoring)
        total_scores = service.config.num_calls * service.config.scores_per_call
        df = _ensure_score_columns(df, total_scores)

        props = _build_props_from_df(df, limit=ai_limit)
        props = service.process_properties(
            props,
            skip_existing=not force_ai,
            force_update=force_ai,
            limit=ai_limit,
        )
        df = _write_props_back(df, props, total_scores, target_school=None)

        if do_commute:
            commute_service = CommuteService(settings.commute)
            if commute_service.gmaps:
                props = commute_service.process_properties(
                    props,
                    university=target_school,
                    skip_existing=not force_commute,
                )
                df = _write_props_back(df, props, total_scores, target_school=target_school)
            else:
                logger.warning("Google Maps API Key 未配置，跳过通勤时间计算")

        df.to_csv(csv_path, index=False, encoding="utf-8-sig")
        logger.info(f"[pipeline] AI/通勤 已写回 CSV: {csv_path}")
    elif do_commute:
        # 仅通勤模式（未跑 AI 时仍可跑）
        df = pd.read_csv(csv_path, encoding="utf-8-sig")
        total_scores = 0
        props = _build_props_from_df(df, limit=None)
        commute_service = CommuteService(settings.commute)
        if commute_service.gmaps:
            props = commute_service.process_properties(
                props,
                university=target_school,
                skip_existing=not force_commute,
            )
            df = _write_props_back(df, props, total_scores, target_school=target_school)
            df.to_csv(csv_path, index=False, encoding="utf-8-sig")
            logger.info(f"[pipeline] 通勤 已写回 CSV: {csv_path}")
        else:
            logger.warning("Google Maps API Key 未配置，跳过通勤时间计算")

    if do_import:
        logger.info(f"[pipeline] 开始入库: {csv_path}")
        import_csv(csv_path, school_name=target_school)
        logger.info(f"[pipeline] 入库完成: {csv_path}")


__all__ = ["run_pipeline"]

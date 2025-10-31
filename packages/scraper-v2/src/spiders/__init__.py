# spiders/__init__.py - Spider registry exposing available implementations
from __future__ import annotations

from typing import Dict, Type

from ..utils.enums import SpiderName
from .base_spider import BaseSpider
from .domain_spider import DomainSpider
from .realestate_spider import RealEstateSpider

SPIDER_REGISTRY: Dict[SpiderName, Type[BaseSpider]] = {
    SpiderName.REALESTATE_AU: RealEstateSpider,
    SpiderName.DOMAIN_COM_AU: DomainSpider,
}

__all__ = ["SPIDER_REGISTRY", "BaseSpider", "RealEstateSpider", "DomainSpider"]

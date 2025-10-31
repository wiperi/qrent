# utils/logger.py - Logger configuration helpers wrapping loguru
from __future__ import annotations

from pathlib import Path
from typing import Optional

from loguru import logger


def setup_logger(log_level: str = "INFO", log_dir: Optional[Path] = None) -> None:
    """Configure loguru logger with console and optional file outputs."""
    logger.remove()

    logger.add(
        sink=lambda msg: print(msg, end=""),
        level=log_level,
        enqueue=True,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    )

    if log_dir is not None:
        log_dir.mkdir(parents=True, exist_ok=True)
        logger.add(
            log_dir / "scraper_{time:YYYY-MM-DD}.log",
            rotation="00:00",
            retention="30 days",
            compression="zip",
            level="DEBUG",
            enqueue=True,
            serialize=True,
        )
        logger.add(
            log_dir / "errors_{time:YYYY-MM-DD}.log",
            rotation="00:00",
            retention="90 days",
            level="ERROR",
            enqueue=True,
        )

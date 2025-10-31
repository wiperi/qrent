# main.py - Command line entry point for scraper-v2 application
from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from loguru import logger

from .config import load_config
from .coordinator.task_coordinator import TaskCoordinator
from .scheduler import TaskScheduler
from .utils.logger import setup_logger


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments for the scraper application."""
    parser = argparse.ArgumentParser(description="scraper-v2 execution CLI")
    parser.add_argument("--config", type=Path, default=Path("config/scraper_config.yaml"), help="Path to config file")
    parser.add_argument("--run-now", action="store_true", help="Run the scraper immediately instead of scheduling.")
    return parser.parse_args()


async def run_once(config_path: Path) -> None:
    """Execute a single scrape cycle."""
    config = load_config(config_path)
    setup_logger(config.logging.level, Path("logs"))
    coordinator = TaskCoordinator(config)
    await coordinator.run_all_tasks()


def main() -> None:
    """Entrypoint invoked by python -m."""
    args = parse_args()
    if args.run_now:
        logger.info("Running immediate scrape job.")
        asyncio.run(run_once(args.config))
    else:
        scheduler = TaskScheduler(args.config)
        scheduler.start()


if __name__ == "__main__":
    main()

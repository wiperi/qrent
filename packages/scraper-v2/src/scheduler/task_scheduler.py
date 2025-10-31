# scheduler/task_scheduler.py - APScheduler based daily scrape scheduler
from __future__ import annotations

import asyncio
from datetime import time
from pathlib import Path
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from loguru import logger

from ..config import load_config
from ..config.models import ScheduleConfig
from ..coordinator.task_coordinator import TaskCoordinator
from ..utils.logger import setup_logger


class TaskScheduler:
    """Schedules recurring scrape jobs based on configuration."""

    def __init__(self, config_path: Path) -> None:
        self.config_path = config_path
        self.scheduler = AsyncIOScheduler()
        self._config = load_config(config_path)
        setup_logger(self._config.logging.level, Path("logs"))

    def start(self) -> None:
        """Start APScheduler with configured daily job."""
        schedule = self._config.schedule
        trigger = self._build_trigger(schedule.time_of_day, schedule.timezone)
        self.scheduler.add_job(
            self._run_daily_scrape,
            trigger=trigger,
            id="daily_scrape",
            max_instances=1,
        )
        logger.info("Starting scheduler...")
        self.scheduler.start()
        self._run_event_loop()

    def _run_event_loop(self) -> None:
        """Run the asyncio event loop indefinitely."""
        try:
            asyncio.get_event_loop().run_forever()
        except (KeyboardInterrupt, SystemExit):
            logger.info("Scheduler stopped by signal.")
        finally:
            self.scheduler.shutdown(wait=True)

    async def _run_daily_scrape(self) -> None:
        """Execute the daily scrape job."""
        logger.info("Triggered scheduled scrape run.")
        coordinator = TaskCoordinator(self._config)
        await coordinator.run_all_tasks()

    def _build_trigger(self, run_time: time, timezone: str) -> CronTrigger:
        zone = ZoneInfo(timezone)
        return CronTrigger(hour=run_time.hour, minute=run_time.minute, timezone=zone)

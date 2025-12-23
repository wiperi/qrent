"""
日志配置
实时控制台输出 + 文件记录
"""
import logging
import sys
from pathlib import Path
from typing import Optional

from ..config import settings

# 确保 stdout 实时刷新
sys.stdout.reconfigure(line_buffering=True) if hasattr(sys.stdout, 'reconfigure') else None


class FlushStreamHandler(logging.StreamHandler):
    """每条日志后立即刷新的处理器"""
    def emit(self, record):
        super().emit(record)
        self.flush()


def setup_logger(
    name: str = "scraper",
    level: Optional[str] = None,
    log_file: Optional[str] = None
) -> logging.Logger:
    """
    配置并返回日志记录器
    
    Args:
        name: 日志记录器名称
        level: 日志级别（默认从配置读取）
        log_file: 日志文件路径（默认从配置读取）
    """
    level = level or settings.log_level
    log_file = log_file or settings.log_file
    
    # 创建日志记录器
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    
    # 清除已有的处理器
    logger.handlers.clear()
    
    # 日志格式 - 更清晰的格式
    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s - %(message)s',
        datefmt='%H:%M:%S'
    )
    
    # 控制台处理器 - 使用实时刷新
    console_handler = FlushStreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # 文件处理器
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger


# 默认日志记录器
default_logger = setup_logger()


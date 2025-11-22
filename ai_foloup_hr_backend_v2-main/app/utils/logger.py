#centralized logger setup for the application

import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from typing import Optional
import os
from dotenv import load_dotenv
load_dotenv()

def setup_logger(
    name: str = "ai_interview_tool",
    log_level: str = "INFO",
    log_file: Optional[str] = None,
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5
) -> logging.Logger:
    """
    Set up a centralized logger for the application.
    
    Args:
        name: Logger name
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional path to log file. If None, logs only to console.
        max_bytes: Maximum size of log file before rotation
        backup_count: Number of backup log files to keep
    
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    
    if logger.handlers:
        return logger
    
    level = getattr(logging, log_level.upper(), logging.INFO)
    logger.setLevel(level)
    
    formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding='utf-8'
        )
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """
    Get a logger instance. If name is provided, creates a child logger.
    Otherwise returns the default application logger.
    
    Usage:
        from utils.logger import get_logger
        logger = get_logger(__name__)
        logger.info("This is an info message")
        logger.error("This is an error message")
    """
    
    current_file = Path(__file__).resolve()
    app_dir = current_file.parent.parent
    
    log_level = os.getenv("LOG_LEVEL", "INFO")
    log_file = os.getenv("LOG_FILE", None)
   
    if log_file:
        log_path = Path(log_file)
        if not log_path.is_absolute():
            log_file = str(app_dir / log_path)
        else:
            log_file = str(log_path)
    else:
        # Default log file path
        log_file = str(app_dir / "cache" / "logs" / "app.log")
    
    main_logger = setup_logger(
        name="ai_interview_tool",
        log_level=log_level,
        log_file=log_file
    )
    
    if name:
        return main_logger.getChild(name)
    return main_logger


logger = get_logger()

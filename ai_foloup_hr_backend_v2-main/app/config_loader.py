# For reading config.yaml / .env

import os
import yaml
from utils.logger import get_logger
from dotenv import load_dotenv

load_dotenv()

logger = get_logger(__name__)

def load_config(path: str = None) -> dict:
    if path is None:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(current_dir)
        path = os.path.join(project_root, "config.yaml")
    
    try:
        with open(path, "r", encoding="utf-8") as f:
            raw = f.read()
        expanded = os.path.expandvars(raw)
        return yaml.safe_load(expanded) or {}
    except FileNotFoundError:
        logger.warning(f"Could not find config.yaml at {path}")
        return {}
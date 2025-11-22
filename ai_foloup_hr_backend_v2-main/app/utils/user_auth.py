import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from passlib.context import CryptContext
from jose import jwt, JWTError
import smtplib
from email.message import EmailMessage
from utils.logger import get_logger
from config_loader import load_config

_config = load_config()
logger = get_logger(__name__)


_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = _config.get("jwt", {}).get("secret_key")
REFRESH_SECRET = _config.get("jwt", {}).get("refresh_secret_key")
ALGORITHM = _config.get("jwt", {}).get("algorithm")
ACCESS_TOKEN_EXPIRE_SECONDS = _config.get("jwt", {}).get("access_token_expires_in")
REFRESH_TOKEN_EXPIRE_DAYS = _config.get("jwt", {}).get("refresh_token_expires_in")


def hash_password(password: str) -> str:
    if not password:
        raise ValueError("Password cannot be empty")
    return _pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    if not password:
        return False
    return _pwd_context.verify(password, hashed)


def create_access_token(data: dict, expires_delta: Optional[int] = None) -> str:
    to_encode = data.copy()
    expire_seconds = expires_delta or ACCESS_TOKEN_EXPIRE_SECONDS
    expire = datetime.now(timezone.utc) + timedelta(seconds=expire_seconds)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires_days: Optional[int] = None) -> str:
    to_encode = data.copy()
    expire_days = expires_days or REFRESH_TOKEN_EXPIRE_DAYS
    expire = datetime.now(timezone.utc) + timedelta(days=expire_days)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, REFRESH_SECRET, algorithm=ALGORITHM)


def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def verify_refresh_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        return jwt.decode(token, REFRESH_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return None


def send_email(to_email: str, subject: str, body_text: str) -> None:
    smtp_config = _config.get("SMTP", {})
    host = smtp_config.get("host")
    port = smtp_config.get("port")
    user = smtp_config.get("user")
    password = smtp_config.get("password")
    from_email = smtp_config.get("email", user or "no-reply@example.com")
    logger.info(f"Sending email to {to_email} via SMTP server {host}:{port}")
    msg = EmailMessage()
    msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body_text)

    with smtplib.SMTP(host, port) as server:
        server.starttls()
        server.login(user, password)
        server.send_message(msg)




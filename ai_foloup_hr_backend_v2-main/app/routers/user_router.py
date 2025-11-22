# CRUD endpoints for users

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from db import AsyncSessionLocal
from models import User
from schemas.user_schema import SignupRequest, LoginRequest, UserResponse, AuthResponse, ForgotPasswordRequest, ResetPasswordRequest, VerifyOtpRequest
from utils.user_auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    verify_refresh_token, verify_access_token, send_email
)
from config_loader import load_config
from utils.datetime_utils import convert_utc_to_ist

_config = load_config()
from utils.logger import get_logger
from fastapi import Request
import os
import secrets
from datetime import datetime, timedelta, timezone

logger = get_logger(__name__)


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
async def signup(payload: SignupRequest):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == payload.email))
        existing = result.scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="Email already in use")

        user = User(
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=payload.email,
            password_hash=hash_password(payload.password),
        )
        db.add(user)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=409, detail="Email already in use")
        await db.refresh(user)

        access_token = create_access_token({"sub": str(user.id), "email": user.email})
        refresh_token = create_refresh_token({"sub": str(user.id), "email": user.email})
        
        # Calculate expiration times
        access_token_expire_seconds = _config.get("jwt", {}).get("access_token_expires_in") or 420  # Default 7 minutes
        refresh_token_expire_days = _config.get("jwt", {}).get("refresh_token_expires_in") or 7  # Default 7 days
        
        access_token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=access_token_expire_seconds)
        refresh_token_expires_at = datetime.now(timezone.utc) + timedelta(days=refresh_token_expire_days)
        
        # Convert to IST for response (commented out - keeping UTC for now)
        # access_token_expires_at_utc = access_token_expires_at
        # refresh_token_expires_at_utc = refresh_token_expires_at
        # access_token_expires_at = convert_utc_to_ist(access_token_expires_at_utc)
        # refresh_token_expires_at = convert_utc_to_ist(refresh_token_expires_at_utc)
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            access_token_expires_at=access_token_expires_at,
            refresh_token_expires_at=refresh_token_expires_at,
            user=UserResponse(id=user.id, first_name=user.first_name, last_name=user.last_name, email=user.email, created_at=user.created_at),
        )


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == payload.email))
        user = result.scalar_one_or_none()
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        access_token = create_access_token({"sub": str(user.id), "email": user.email})
        refresh_token = create_refresh_token({"sub": str(user.id), "email": user.email})
        
        # Calculate expiration times
        access_token_expire_seconds = _config.get("jwt", {}).get("access_token_expires_in") or 900  # Default 15 minutes
        refresh_token_expire_days = _config.get("jwt", {}).get("refresh_token_expires_in") or 7  # Default 7 days
        
        access_token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=access_token_expire_seconds)
        refresh_token_expires_at = datetime.now(timezone.utc) + timedelta(days=refresh_token_expire_days)
        
        # Convert to IST for response (commented out - keeping UTC for now)
        # access_token_expires_at_utc = access_token_expires_at
        # refresh_token_expires_at_utc = refresh_token_expires_at
        # access_token_expires_at = convert_utc_to_ist(access_token_expires_at_utc)
        # refresh_token_expires_at = convert_utc_to_ist(refresh_token_expires_at_utc)
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            access_token_expires_at=access_token_expires_at,
            refresh_token_expires_at=refresh_token_expires_at,
            user=UserResponse(id=user.id, first_name=user.first_name, last_name=user.last_name, email=user.email, created_at=user.created_at),
        )


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == payload.email))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if payload.resend:
            if not user.reset_otp:
                raise HTTPException(status_code=400, detail="No OTP found. Please request a new OTP first.")
            if user.reset_otp_expires_at and user.reset_otp_expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="Previous OTP has expired. Please request a new OTP.")

        otp = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
        user.reset_otp = otp
        user.reset_otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)  # OTP expires in 10 minutes
        await db.commit()

        email_subject = "Password Reset OTP (Resent)" if payload.resend else "Password Reset OTP"
        email_message = f"Hello {user.first_name},\n\nYour password reset OTP is: {otp}\n\nThis OTP will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.\n"

        try:
            send_email(user.email, email_subject, email_message)
        except Exception as e:
            logger.error(f"Failed to send OTP email: {e}")
            raise HTTPException(status_code=500, detail="Failed to send OTP email. Please try again later.")
        
        message = f"OTP {'resent' if payload.resend else 'sent'} successfully to {user.email}"
        return {"ok": True, "message": message}


@router.post("/verify-otp")
async def verify_otp(payload: VerifyOtpRequest):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == payload.email))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not user.reset_otp or user.reset_otp != payload.otp:
            raise HTTPException(status_code=400, detail="Invalid OTP")
        
        if not user.reset_otp_expires_at or user.reset_otp_expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
        
        user.reset_otp = None
        user.otp_verified_at = datetime.now(timezone.utc)
        await db.commit()
        
        return {"ok": True, "message": "OTP verified successfully"}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == payload.email))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not user.otp_verified_at:
            raise HTTPException(status_code=400, detail="Please verify OTP first before resetting password")
        
        verification_expiry = user.otp_verified_at + timedelta(minutes=5)  # 5 minutes window to reset after verification
        if verification_expiry < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Verification has expired. Please verify OTP again.")

        user.password_hash = hash_password(payload.new_password)
        user.reset_otp = None
        user.reset_otp_expires_at = None
        user.otp_verified_at = None
        await db.commit()
        
        return {"ok": True, "message": "Password reset successfully"}


@router.post("/refresh")
async def refresh_token(request: Request):
    refresh_token = request.headers.get("x-refresh-token")
    
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
    
    payload = verify_refresh_token(refresh_token)
    if not payload:
        raise HTTPException(status_code=403, detail="Invalid refresh token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
    
    new_access_token = create_access_token({"sub": str(user_id), "email": payload.get("email", "")})
    
    # Calculate expiration times
    access_token_expire_seconds = _config.get("jwt", {}).get("access_token_expires_in") or 900  # Default 15 minutes
    access_token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=access_token_expire_seconds)
    
    # Get refresh token expiration from the JWT payload (exp claim is Unix timestamp)
    refresh_token_exp = payload.get("exp")
    if refresh_token_exp:
        refresh_token_expires_at = datetime.fromtimestamp(refresh_token_exp, tz=timezone.utc)
    else:
        # Fallback: calculate from config if exp not found
        refresh_token_expire_days = _config.get("jwt", {}).get("refresh_token_expires_in") or 7  # Default 7 days
        refresh_token_expires_at = datetime.now(timezone.utc) + timedelta(days=refresh_token_expire_days)
    
    # Convert to IST for response (commented out - keeping UTC for now)
    # access_token_expires_at = convert_utc_to_ist(access_token_expires_at)
    # refresh_token_expires_at = convert_utc_to_ist(refresh_token_expires_at)
    
    return {
        "access_token": new_access_token,
        "access_token_expires_at": access_token_expires_at,
        "refresh_token_expires_at": refresh_token_expires_at
    }


@router.post("/logout")
async def logout(request: Request):
    user_id = getattr(request.state, 'user_id', None)
    user_email = getattr(request.state, 'user_email', None)
    
    if not user_id:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "").strip()
            payload = verify_access_token(token)
            if payload:
                user_id = payload.get("sub")
                user_email = payload.get("email")
    
    if user_id:
        logger.info(f"User {user_email} (ID: {user_id}) logged out")
    
    return {
        "ok": True,
        "message": "Logged out successfully."
    }


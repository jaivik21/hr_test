# User validation schemas

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str 

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    email: EmailStr
    created_at: datetime

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    access_token_expires_at: datetime
    refresh_token_expires_at: datetime
    user: UserResponse

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    resend: Optional[bool] = False  # Flag to indicate if this is a resend request

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP")

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str 
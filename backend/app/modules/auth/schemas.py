from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from app.modules.auth.models import UserRole

# Pydantic Schemas cho Auth

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Mật khẩu tối thiểu 6 ký tự")
    full_name: str = Field(..., min_length=2)
    phone: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AddressCreate(BaseModel):
    receiver_name: str
    phone: str
    province: str
    district: str
    ward: str
    detail: str
    is_default: bool = False

class AddressResponse(BaseModel):
    id: int
    receiver_name: str
    phone: str
    province: str
    district: str
    ward: str
    detail: str
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SocialLoginRequest(BaseModel):
    """Schema nhận thông tin user từ Google/Facebook OAuth để upsert vào iam.users"""
    email: EmailStr
    full_name: str
    avatar_url: Optional[str] = None
    provider: str  # 'google' hoặc 'facebook'
    provider_id: Optional[str] = None


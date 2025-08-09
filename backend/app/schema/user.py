from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class UserStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    SUSPENDED = "suspended"
    REJECTED = "rejected"

class UserRole(str, Enum):
    USER = "operator"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    password: str = Field(..., min_length=8)
    firstname: Optional[str] = Field(None, max_length=100)
    middlename: Optional[str] = Field(None, max_length=100)
    lastname: str = Field(..., max_length=100)
    status: Optional[UserStatus] = Field(default=UserStatus.PENDING)
    role: Optional[UserRole] = Field(default=UserRole.USER)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    
class UserAdminUpdate(BaseModel):
    """Admin-only update schema that includes status and role"""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    status: Optional[UserStatus] = None
    role: Optional[UserRole] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    phone: Optional[str] = None
    firstname: str
    middlename: Optional[str] = None
    lastname: str
    status: UserStatus
    role: UserRole
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 3600 * 24 * 7 
    user: UserResponse

class UserStatsResponse(BaseModel):
    total_users: int
    pending_users: int
    approved_users: int
    suspended_users: int
    rejected_users: int
    admin_users: int
    super_admin_users: int
    recent_registrations: int

class UserListResponse(BaseModel):
    users: list[UserResponse]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool
from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    """Base user schema with common fields"""
    username: str
    firstname: str
    middlename: Optional[str] = None
    lastname: Optional[str] = None
    email: EmailStr
    phone: str

    class Config:
        from_attributes = True

class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str

class UserUpdate(BaseModel):
    """Schema for updating user (all fields optional)"""
    username: Optional[str] = None
    firstname: Optional[str] = None
    middlename: Optional[str] = None
    lastname: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None

    class Config:
        from_attributes = True 

class UserResponse(UserBase):
    """Schema for user response (excludes password)"""
    id: int
    
    class Config:
        from_attributes = True

class UserInDB(UserBase):
    """Schema for user as stored in database"""
    id: int
    password: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    is_active: Optional[bool] = True

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    """Schema for user login"""
    username: str
    password: str

class PasswordChange(BaseModel):
    """Schema for password change"""
    old_password: str
    new_password: str

class TokenResponse(BaseModel):
    """Schema for token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: Optional[int] = None
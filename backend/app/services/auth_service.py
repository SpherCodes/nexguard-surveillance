from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
from passlib.context import CryptContext

from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

from ..dependencies import DatabaseDep
from ..core.models import User
from ..utils.database_crud import CRUDBase
from ..schema.user import UserCreate, UserUpdate

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))  # Default to 30 minutes

if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is required")

auth_scheme = OAuth2PasswordBearer(tokenUrl="token")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService(CRUDBase[User, UserCreate, UserUpdate]):
    """Service for user authentication and management operations"""

    def __init__(self):
        super().__init__(User)

    def create_user(self, db: Session, user_data: UserCreate) -> User:
        """Create a new user with hashed password"""
        existing_user = self.get_user_by_username(db, user_data.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
            
        if hasattr(user_data, 'email') and user_data.email:
            existing_email = self.get_user_by_email(db, user_data.email)
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
        
        hashed_password = self.hash_password(user_data.password)
        user_data.password = hashed_password
        
        user = self.create(db=db, obj_in=user_data)
        return user

    def get_user_by_username(self, db: Session, username: str) -> Optional[User]:
        """Get a user by username"""
        return db.query(User).filter(User.username == username).first()

    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get a user by email"""
        return db.query(User).filter(User.email == email).first()

    def get_user_by_id(self, db: Session, user_id: int) -> Optional[User]:
        """Get a user by ID"""
        return db.query(User).filter(User.id == user_id).first()

    def authenticate_user(self, db: Session, username: str, password: str) -> Optional[User]:
        """Authenticate a user with username and password"""
        user = self.get_user_by_username(db, username)
        if not user:
            return None
        if not self.verify_password(password, user.password):
            return None
        return user

    def create_access_token(self, username: str, expires_delta: Optional[timedelta] = None) -> str:
        """Create access token for authenticated user"""
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode = {
            "sub": username,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "access"
        }
        
        try:
            encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
            return encoded_jwt
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not create access token"
            )

    def verify_token(self, token: str) -> str:
        """Verify JWT token and return username"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            
            if username is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: no username found",
                    headers={"WWW-Authenticate": "Bearer"}
                )
            
            # Check token type if you use multiple token types
            token_type = payload.get("type")
            if token_type != "access":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type",
                    headers={"WWW-Authenticate": "Bearer"}
                )
            
            return username
            
        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: JWT decode error",
                headers={"WWW-Authenticate": "Bearer"}
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token verification failed",
                headers={"WWW-Authenticate": "Bearer"}
            )

    def decode_token(self, token: str) -> Dict[str, Any]:
        """Decode token and return full payload (for debugging/admin use)"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)

    def update_user(self, db: Session, user_id: int, user_data: UserUpdate) -> User:
        """Update user information"""
        user = self.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        try:
            update_data = user_data.model_dump(exclude_unset=True) 
        except AttributeError:
            update_data = user_data.model_dump(exclude_unset=True) 
        if 'password' in update_data:
            update_data['password'] = self.hash_password(update_data['password'])
        
        updated_user = self.update(db=db, db_obj=user, obj_in=update_data)
        return updated_user

    def change_password(self, db: Session, user_id: int, old_password: str, new_password: str) -> bool:
        """Change user password with verification of old password"""
        user = self.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if not self.verify_password(old_password, user.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password"
            )
        
        hashed_new_password = self.hash_password(new_password)
        self.update(db=db, db_obj=user, obj_in={"password": hashed_new_password})
        return True

# Create singleton instance
auth_service = AuthService()
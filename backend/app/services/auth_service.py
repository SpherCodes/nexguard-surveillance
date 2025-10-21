from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from dotenv import load_dotenv
import os
from passlib.context import CryptContext
from passlib.exc import PasswordValueError

from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError


from ..dependencies import DatabaseDep
from ..core.models import User
from ..utils.database_crud import CRUDBase
from ..schema.user import UserCreate, UserRole, UserStatus, UserUpdate

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))  # Default to 30 minutes

if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is required")

auth_scheme = OAuth2PasswordBearer(tokenUrl="token")
pwd_context = CryptContext(
    schemes=["argon2", "bcrypt_sha256"],
    deprecated="auto"
)

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
    
    def delete_user(self, db: Session, user_id: int) -> bool:
        """Delete a user"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        db.delete(user)
        db.commit()
        return True

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
        print(f"Authenticating user: {username}")
        if not user:
            return None
        if not self.verify_password(password, user.password):
            return None
        return user
    
    def get_all_users(
        self,
        db: Session,
        status_filter: Optional[UserStatus] = None,
        role_filter: Optional[UserRole] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[User]:
        """Get all users with optional filtering and search"""
        query = db.query(User)
        
        if status_filter:
            query = query.filter(User.status == status_filter)
        
        if role_filter:
            query = query.filter(User.role == role_filter)
        
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    User.username.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.full_name.ilike(search_pattern)
                )
            )
        
        return query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    
    def update_last_login(self, db: Session, user_id: int) -> None:
        """Update user's last login timestamp"""
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.last_login = datetime.now()
            db.commit()
            
    def get_users_by_status(
        self,
        db: Session,
        status: UserStatus,
        limit: int = 50,
        offset: int = 0
    ) -> List[User]:
        """Get users by specific status"""
        return db.query(User).filter(
            User.status == status
        ).order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    
    def update_user_status(self, db: Session, user_id: int, new_status: UserStatus) -> User:
        """Update user status"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        old_status = user.status
        user.status = new_status
        user.updated_at = datetime.now(timezone.utc)
        
        if new_status == UserStatus.APPROVED and old_status == UserStatus.PENDING:
            user.last_login = None
        
        db.commit()
        db.refresh(user)
        return user

    def update_user_role(self, db: Session, user_id: int, new_role: UserRole) -> User:
        """Update user role"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        user.role = new_role
        user.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(user)
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
        """Hash a password using Argon2 with bcrypt fallback."""
        if password is None:
            raise ValueError("Password cannot be None")

        if not isinstance(password, str):
            password = str(password)

        # Helpful diagnostics for long secrets
        password_length = len(password)
        if password_length > 72:
            print(f"[AuthService] Hashing password length: {password_length} (Argon2 preferred)")

        try:
            hashed = pwd_context.hash(password)
            return hashed
        except PasswordValueError as exc:
            print(f"[AuthService] Password hashing failed for length {password_length}: {exc}")
            raise ValueError(
                "Password hashing failed. Ensure the password is a UTF-8 string."
            ) from exc
    
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
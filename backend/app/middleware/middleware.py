from fastapi import HTTPException, status, Depends
from fastapi import Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import logging

from ..dependencies import DatabaseDep
from ..services.auth_service import auth_service
from ..schema.user import UserResponse, UserStatus, UserRole

logger = logging.getLogger(__name__)

security = HTTPBearer()

class AuthMiddleware:
    """Authentication and Authorization middleware class"""
    
    @staticmethod
    def get_current_user_from_token(
        db: DatabaseDep,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
        access_token: Optional[str] = Cookie(default=None, alias="access_token")
    ) -> UserResponse:
        """Dependency to get current user from JWT token"""
        try:
            token_value: Optional[str] = None
            if credentials and credentials.credentials:
                token_value = credentials.credentials
            elif access_token:
                token_value = access_token

            if not token_value:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Missing authentication token",
                    headers={"WWW-Authenticate": "Bearer"}
                )

            username = auth_service.verify_token(token_value)
            if not username:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token",
                    headers={"WWW-Authenticate": "Bearer"}
                )
            
            user = auth_service.get_user_by_username(db, username)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            return user
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token verification failed",
                headers={"WWW-Authenticate": "Bearer"}
            )

    @staticmethod
    def require_authentication(
        current_user: UserResponse = Depends(get_current_user_from_token)
    ) -> UserResponse:
        """Basic authentication middleware - just requires valid token"""
        return current_user

    @staticmethod
    def require_approved_user(
        current_user: UserResponse = Depends(get_current_user_from_token)
    ) -> UserResponse:
        """Middleware to require approved user status"""
        if current_user.status != UserStatus.APPROVED:
            logger.warning(f"Non-approved user {current_user.username} attempted to access protected endpoint")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account approval required. Please wait for admin approval.",
                headers={
                    "X-Account-Status": current_user.status,
                    "X-User-ID": str(current_user.id)
                }
            )
        return current_user

    @staticmethod
    def require_admin(
        current_user: UserResponse = Depends(get_current_user_from_token)
    ) -> UserResponse:
        """Middleware to require admin role (admin or super_admin)"""
        if current_user.status != UserStatus.APPROVED:
            logger.warning(f"Non-approved admin user {current_user.username} attempted access")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account not approved",
                headers={"X-Account-Status": current_user.status}
            )
        
        if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
            logger.warning(f"Non-admin user {current_user.username} attempted to access admin endpoint")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required",
                headers={
                    "X-Required-Role": "admin",
                    "X-User-Role": current_user.role
                }
            )
        return current_user

    @staticmethod
    def require_super_admin(
        current_user: UserResponse = Depends(get_current_user_from_token)
    ) -> UserResponse:
        """Middleware to require super admin role"""
        if current_user.status != UserStatus.APPROVED:
            logger.warning(f"Non-approved super admin user {current_user.username} attempted access")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account not approved",
                headers={"X-Account-Status": current_user.status}
            )
        if current_user.role != UserRole.SUPER_ADMIN:
            logger.warning(f"Non-super-admin user {current_user.username} attempted to access super admin endpoint")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super admin access required",
                headers={
                    "X-Required-Role": "super_admin",
                    "X-User-Role": current_user.role
                }
            )
        return current_user

    @staticmethod
    def require_user_or_admin(
        current_user: UserResponse = Depends(get_current_user_from_token)
    ) -> UserResponse:
        """Middleware for endpoints that regular approved users or admins can access"""
        if current_user.status != UserStatus.APPROVED:
            logger.warning(f"Non-approved user {current_user.username} attempted access")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account approval required",
                headers={"X-Account-Status": current_user.status}
            )
        return current_user

    @staticmethod
    def require_self_or_admin(user_id: int):
        """Middleware factory for endpoints where users can access their own data or admins can access any"""
        def _require_self_or_admin(
            current_user: UserResponse = Depends(AuthMiddleware.get_current_user_from_token)
        ) -> UserResponse:
            if current_user.status != UserStatus.APPROVED:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account approval required"
                )
            
            if (current_user.id == user_id or 
                current_user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]):
                return current_user
            
            logger.warning(
                f"User {current_user.username} attempted to access user {user_id}'s data without permission"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this user's data"
            )
        
        return _require_self_or_admin

    @staticmethod
    def optional_authentication(
        db: DatabaseDep,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
    ) -> Optional[UserResponse]:
        """Optional authentication - returns None if no token provided"""
        if not credentials:
            return None
        
        try:
            username = auth_service.verify_token(credentials.credentials)
            if not username:
                return None
            
            user = auth_service.get_user_by_username(db, username)
            return user
            
        except Exception as e:
            logger.warning(f"Optional auth failed: {e}")
            return None

get_current_user = AuthMiddleware.get_current_user_from_token
require_authentication = AuthMiddleware.require_authentication
require_approved_user = AuthMiddleware.require_approved_user
require_admin = AuthMiddleware.require_admin
require_super_admin = AuthMiddleware.require_super_admin
require_user_or_admin = AuthMiddleware.require_user_or_admin
require_self_or_admin = AuthMiddleware.require_self_or_admin
optional_authentication = AuthMiddleware.optional_authentication

class AuthenticationError(Exception):
    """Custom authentication error"""
    def __init__(self, message: str, status_code: int = 401, headers: dict = None):
        self.message = message
        self.status_code = status_code
        self.headers = headers or {}

class AuthorizationError(Exception):
    """Custom authorization error"""
    def __init__(self, message: str, status_code: int = 403, headers: dict = None):
        self.message = message
        self.status_code = status_code
        self.headers = headers or {}

def log_auth_attempt(func):
    """Decorator to log authentication attempts"""
    def wrapper(*args, **kwargs):
        try:
            result = func(*args, **kwargs)
            if hasattr(result, 'username'):
                logger.info(f"Successful authentication for user: {result.username}")
            return result
        except HTTPException as e:
            logger.warning(f"Authentication failed: {e.detail}")
            raise
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            raise
    return wrapper
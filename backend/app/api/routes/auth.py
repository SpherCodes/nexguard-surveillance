from fastapi import APIRouter, HTTPException, Response, status, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import logging

from ...dependencies import DatabaseDep
from ...services.auth_service import auth_service
from ...schema.user import UserCreate, UserUpdate, UserResponse, UserLogin, TokenResponse

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()

#TODO: change to secure cookies in production
COOKIE_CONFIG = {
    "httponly": True,
    "secure": False,
    "samesite": "lax",
    "path": "/",
    "max_age": 3600 * 24 * 7
}

def get_current_user_from_token(
    db: DatabaseDep,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> UserResponse:
    """Dependency to get current user from token"""
    try:
        username = auth_service.verify_token(credentials.credentials)
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

def get_current_user_from_cookie(
    request: Request,
    db: DatabaseDep
) -> Optional[UserResponse]:
    """Get current user from cookie (optional)"""
    try:
        token = request.cookies.get("access_token")
        if not token:
            return None
        
        username = auth_service.verify_token(token)
        if not username:
            return None
        
        return auth_service.get_user_by_username(db, username)
    except Exception as e:
        logger.warning(f"Error getting user from cookie: {e}")
        return None

def set_auth_cookie(response: Response, token: str) -> None:
    """Helper function to set authentication cookie"""
    response.set_cookie(
        key="access_token",
        value=token,
        **COOKIE_CONFIG
    )

@router.post("/register", response_model=UserResponse)
def register_user(
    response: Response,
    user: UserCreate,
    db: DatabaseDep,
):
    """Endpoint to register a new user"""
    try:
        logger.info(f"Registering new user: {user.username}")
        
        created_user = auth_service.create_user(db, user)
        access_token = auth_service.create_access_token(created_user.username)
        
        set_auth_cookie(response, access_token)
        
        logger.info(f"User registered successfully: {created_user.username}")
        return created_user
        
    except HTTPException as e:
        logger.warning(f"Registration failed for {user.username}: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed due to server error"
        )

@router.post("/login", response_model=UserResponse)
def login_user(
    response: Response,
    user_credentials: UserLogin,
    db: DatabaseDep
):
    """Endpoint to authenticate user and return user data"""
    try:
        logger.info(f"Login attempt for user: {user_credentials.username}")
        
        user = auth_service.authenticate_user(
            db, user_credentials.username, user_credentials.password
        )
        
        if not user:
            logger.warning(f"Failed login attempt for: {user_credentials.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        access_token = auth_service.create_access_token(user.username)
        set_auth_cookie(response, access_token)
        
        logger.info(f"User logged in successfully: {user.username}")
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed due to server error"
        )

@router.post("/logout")
def logout_user(response: Response):
    """Endpoint to logout user by clearing the authentication cookie"""
    response.delete_cookie(
        key="access_token",
        path="/",
        domain=None
    )
    return {"message": "Successfully logged out"}

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: DatabaseDep,
    current_user: UserResponse = Depends(get_current_user_from_token)
):
    """Endpoint to update an existing user"""
    try:
        user_to_update = auth_service.get_user_by_id(db, user_id)
        if not user_to_update:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if current_user.id != user_to_update.id:
            logger.warning(f"Unauthorized update attempt: {current_user.username} tried to update user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this user"
            )
        
        updated_user = auth_service.update_user(db, user_id, user_data)
        logger.info(f"User updated successfully: {updated_user.username}")
        return updated_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user due to server error"
        )

@router.get("/users/me", response_model=UserResponse)
def get_current_user(
    current_user: UserResponse = Depends(get_current_user_from_token)
):
    """Get current user information"""
    return current_user

@router.get("/users/profile", response_model=Optional[UserResponse])
def get_user_profile(
    request: Request,
    db: DatabaseDep
):
    """Get user profile from cookie (for frontend state initialization)"""
    user = get_current_user_from_cookie(request, db)
    return user

@router.post("/refresh-token", response_model=UserResponse)
def refresh_token(
    response: Response,
    current_user: UserResponse = Depends(get_current_user_from_token)
):
    """Refresh the authentication token"""
    try:
        new_token = auth_service.create_access_token(current_user.username)
        set_auth_cookie(response, new_token)
        logger.info(f"Token refreshed for user: {current_user.username}")
        return current_user
    except Exception as e:
        logger.error(f"Error refreshing token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token"
        )
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ...dependencies import DatabaseDep
from ...services.auth_service import auth_service
from ...schema.user import UserCreate, UserUpdate, UserResponse, UserLogin, TokenResponse

router = APIRouter()
security = HTTPBearer()

@router.post("/register", response_model=UserResponse)
def register_user(
    user: UserCreate,
    db: DatabaseDep,
):
    """Endpoint to register a new user"""
    try:
        print("userData:",user)
        created_user = auth_service.create_user(db, user)
        return created_user
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

@router.post("/login", response_model=TokenResponse)
def login_user(
    user_credentials: UserLogin,
    db: DatabaseDep
):
    """Endpoint to authenticate user and return token"""
    try:
        print(f"login user: {user_credentials}")
        user = auth_service.authenticate_user(
            db, user_credentials.username, user_credentials.password
        )
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        token = auth_service.create_access_token(user.username)
        return TokenResponse(access_token=token, token_type="bearer")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to authenticate user: {str(e)}"
        )

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: DatabaseDep,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Endpoint to update an existing user"""
    try:
        # Verify the token
        username = auth_service.verify_token(credentials.credentials)
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # Get the user to update
        user = auth_service.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="User not found"
            )
        
        # Check authorization - user can only update their own profile
        if username != user.username:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Not authorized to update this user"
            )
        
        # Update the user
        updated_user = auth_service.update_user(db, user_id, user_data)
        return updated_user
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )

@router.get("/users/me", response_model=UserResponse)
def get_current_user(
    db: DatabaseDep,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get current user information"""
    try:
        username = auth_service.verify_token(credentials.credentials)
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user: {str(e)}"
        )
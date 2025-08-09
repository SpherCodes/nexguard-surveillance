from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from typing import Optional, List
import logging

from ...dependencies import DatabaseDep
from ...services.auth_service import auth_service
from ...schema.user import (
    UserCreate, UserUpdate, UserResponse, UserLogin, 
    TokenResponse, UserStatus, UserRole
)
from ...middleware.middleware import (
    require_admin, require_super_admin, require_approved_user,
    require_user_or_admin, require_self_or_admin, get_current_user
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register_user(
    user: UserCreate,
    db: DatabaseDep,
):
    """Endpoint to register a new user (with pending status by default)"""
    try:
        print(f"Registering user: {user.username}")
        logger.info(f"Registering new user: {user.username}")
        
        user.status = UserStatus.PENDING
        user.role = UserRole.USER
        
        created_user = auth_service.create_user(db, user)
        
        logger.info(f"User registered with pending status: {created_user.username}")
        return UserResponse.model_validate(created_user, from_attributes=True)
        
    except HTTPException as e:
        logger.warning(f"Registration failed for {user.username}: {e.detail}")
        raise
    except Exception as e:
        print(f"❌ Error during registration: {e}")
        logger.error(f"Unexpected error during registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed due to server error"
        )

@router.post("/login", response_model=TokenResponse)
def login_user(
    user_credentials: UserLogin,
    db: DatabaseDep
):
    """Endpoint to authenticate user and return JWT token"""
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
        
        if user.status != UserStatus.APPROVED:
            logger.warning(f"Login attempt by non-approved user: {user_credentials.username}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account status: {user.status}. Please wait for admin approval.",
                headers={
                    "X-Account-Status": user.status,
                    "WWW-Authenticate": "Bearer"
                }
            )
        
        auth_service.update_last_login(db, user.id)
        
        access_token = auth_service.create_access_token(user.username)
        
        logger.info(f"User logged in successfully: {user.username}")
        
        user_response = UserResponse.model_validate(user, from_attributes=True)
        response_payload = TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_response
        )
        response = JSONResponse(content=jsonable_encoder(response_payload))
        # Cookie config: HttpOnly for security
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            samesite="lax",
            secure=False,  # set True when using HTTPS
            path="/",
            max_age=60 * 60 * 24 * 7
        )
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error during login: {e}")
        logger.error(f"Unexpected error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed due to server error"
        )

@router.get("/users/me", response_model=UserResponse)
def get_current_user_info(
    current_user: UserResponse = Depends(require_approved_user)
):
    """Get current user information"""
    return current_user

# @router.put("/users/{user_id}", response_model=UserResponse)
# def update_user(
#     user_id: int,
#     user_data: UserUpdate,
#     db: DatabaseDep,
#     # current_user: UserResponse = Depends(require_self_or_admin(user_id))
# ):
#     """Endpoint to update user (users can update themselves, admins can update anyone)"""
#     try:
#         user_to_update = auth_service.get_user_by_id(db, user_id)
#         if not user_to_update:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="User not found"
#             )
        
#         updated_user = auth_service.update_user(db, user_id, user_data)
#         logger.info(f"User updated successfully: {updated_user.username} (updated by: {current_user.username})")
#         return updated_user
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error updating user {user_id}: {e}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail="Failed to update user due to server error"
#         )

@router.post("/refresh-token", response_model=TokenResponse)
def refresh_token(
    current_user: UserResponse = Depends(require_approved_user)
):
    """Refresh the authentication token"""
    try:
        new_token = auth_service.create_access_token(current_user.username)
        logger.info(f"Token refreshed for user: {current_user.username}")
        
        return TokenResponse(
            access_token=new_token,
            token_type="bearer",
            user=current_user
        )
    except Exception as e:
        logger.error(f"Error refreshing token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token"
        )

@router.get("/admin/users", response_model=List[UserResponse])
def get_all_users(
    db: DatabaseDep,
    user: UserResponse = Depends(require_approved_user),
    status_filter: Optional[UserStatus] = Query(None, description="Filter users by status"),
    role_filter: Optional[UserRole] = Query(None, description="Filter users by role"),
    search: Optional[str] = Query(None, description="Search by username or email"),
    limit: int = Query(100, ge=1, le=1000, description="Number of users to return"),
    offset: int = Query(0, ge=0, description="Number of users to skip")
):
    """Get all users with filtering and search (admin only)"""
    try:
        logger.info(f"Admin {user.username} requesting user list")
        
        users = auth_service.get_all_users(
            db, 
            status_filter=status_filter,
            role_filter=role_filter,
            search=search,
            limit=limit,
            offset=offset
        )
        
        logger.info(f"Returned {len(users)} requested by {user.username}")
        return users
        
    except Exception as e:
        logger.error(f"Error retrieving users for admin {user.username}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve users"
        )

@router.get("/admin/users/pending", response_model=List[UserResponse])
def get_pending_users(
    db: DatabaseDep,
    admin_user: UserResponse = Depends(require_admin),
    limit: int = Query(50, ge=1, le=200, description="Number of pending users to return"),
    offset: int = Query(0, ge=0, description="Number of pending users to skip")
):
    """Get all pending users awaiting approval"""
    try:
        logger.info(f"Admin {admin_user.username} requesting pending users")
        
        pending_users = auth_service.get_users_by_status(
            db, 
            UserStatus.PENDING,
            limit=limit,
            offset=offset
        )
        
        logger.info(f"Returned {len(pending_users)} pending users to admin {admin_user.username}")
        return pending_users
        
    except Exception as e:
        logger.error(f"Error retrieving pending users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve pending users"
        )

@router.put("/admin/users/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    new_status: UserStatus,
    db: DatabaseDep,
    admin_user: UserResponse = Depends(require_admin)
):
    """Update user status (approve/reject/suspend users)"""
    try:
        logger.info(f"Admin {admin_user.username} updating user {user_id} status to {new_status}")
        
        user_to_update = auth_service.get_user_by_id(db, user_id)
        if not user_to_update:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent non-super-admins from modifying other admins
        if (user_to_update.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN] and 
            admin_user.role != UserRole.SUPER_ADMIN):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot modify admin users without super admin privileges"
            )
        
        updated_user = auth_service.update_user_status(db, user_id, new_status)
        
        logger.info(f"User {user_id} status updated to {new_status} by admin {admin_user.username}")
        return updated_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user status"
        )

@router.post("/admin/users/{user_id}/approve", response_model=UserResponse)
def approve_user(
    user_id: int,
    db: DatabaseDep,
    admin_user: UserResponse = Depends(require_admin)
):
    """Approve a pending user account"""
    try:
        logger.info(f"Admin {admin_user.username} approving user {user_id}")
        
        user_to_approve = auth_service.get_user_by_id(db, user_id)
        if not user_to_approve:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user_to_approve.status != UserStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User status is {user_to_approve.status}, can only approve pending users"
            )
        
        approved_user = auth_service.update_user_status(db, user_id, UserStatus.APPROVED)
        
        # Optionally send approval notification email here
        # await notification_service.send_approval_email(approved_user.email)
        
        logger.info(f"User {user_id} approved by admin {admin_user.username}")
        return approved_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to approve user"
        )

@router.post("/admin/users/{user_id}/reject", response_model=UserResponse)
def reject_user(
    user_id: int,
    db: DatabaseDep,
    admin_user: UserResponse = Depends(require_admin)
):
    """Reject a pending user account"""
    try:
        logger.info(f"Admin {admin_user.username} rejecting user {user_id}")
        
        user_to_reject = auth_service.get_user_by_id(db, user_id)
        if not user_to_reject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user_to_reject.status != UserStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User status is {user_to_reject.status}, can only reject pending users"
            )
        
        rejected_user = auth_service.update_user_status(db, user_id, UserStatus.REJECTED)
        
        logger.info(f"User {user_id} rejected by admin {admin_user.username}")
        return rejected_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reject user"
        )

# Super admin endpoints
@router.put("/admin/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    new_role: UserRole,
    db: DatabaseDep,
    admin_user: UserResponse = Depends(require_super_admin)
):
    """Update user role (super admin only)"""
    try:
        logger.info(f"Super admin {admin_user.username} updating user {user_id} role to {new_role}")
        
        user_to_update = auth_service.get_user_by_id(db, user_id)
        if not user_to_update:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        updated_user = auth_service.update_user_role(db, user_id, new_role)
        
        logger.info(f"User {user_id} role updated to {new_role} by super admin {admin_user.username}")
        return updated_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user role: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user role"
        )

@router.delete("/admin/users/{user_id}")
def delete_user(
    user_id: int,
    db: DatabaseDep,
    admin_user: UserResponse = Depends(require_super_admin)
):
    """Delete a user account (super admin only)"""
    try:
        logger.warning(f"Super admin {admin_user.username} deleting user {user_id}")
        
        user_to_delete = auth_service.get_user_by_id(db, user_id)
        if not user_to_delete:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent deleting other super admins
        if user_to_delete.role == UserRole.SUPER_ADMIN and user_to_delete.id != admin_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete other super admin users"
            )
        
        auth_service.delete_user(db, user_id)
        
        logger.warning(f"User {user_id} deleted by super admin {admin_user.username}")
        return {"message": "User deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )

@router.get("/admin/stats")
def get_user_stats(
    db: DatabaseDep,
    admin_user: UserResponse = Depends(require_admin)
):
    """Get user statistics dashboard"""
    try:
        stats = auth_service.get_user_statistics(db)
        return stats
    except Exception as e:
        logger.error(f"Error retrieving user stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user statistics"
        )

@router.post("/logout")
def logout_user():
    """Clear auth cookie to log out the user"""
    response = JSONResponse({"message": "Logged out"})
    response.delete_cookie(key="access_token", path="/")
    return response
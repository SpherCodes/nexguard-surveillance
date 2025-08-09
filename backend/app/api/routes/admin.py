# from fastapi import APIRouter, HTTPException, Response, status, Depends, Query
# from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# from typing import List, Optional
# from enum import Enum
# import logging

# from ...dependencies import DatabaseDep
# from ...services.auth_service import auth_service
# from ...schema.user import UserListResponse, UserResponse, UserStatusUpdate, UserUpdate

# logger = logging.getLogger(__name__)

# router = APIRouter(prefix="/admin", tags=["admin"])
# security = HTTPBearer()

# class UserStatus(str, Enum):
#     PENDING = "pending"
#     APPROVED = "approved"
#     SUSPENDED = "suspended"
#     REJECTED = "rejected"

# def get_admin_user(
#     db: DatabaseDep,
#     credentials: HTTPAuthorizationCredentials = Depends(security)
# ) -> UserResponse:
#     """Dependency to verify admin access"""
#     try:
#         username = auth_service.verify_token(credentials.credentials)
#         if not username:
#             raise HTTPException(
#                 status_code=status.HTTP_401_UNAUTHORIZED,
#                 detail="Invalid token",
#                 headers={"WWW-Authenticate": "Bearer"}
#             )
        
#         user = auth_service.get_user_by_username(db, username)
#         if not user:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="User not found"
#             )
        

#         if not hasattr(user, 'role') or user.role != 'admin':
#             raise HTTPException(
#                 status_code=status.HTTP_403_FORBIDDEN,
#                 detail="Admin access required"
#             )
        
#         return user
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error verifying admin access: {e}")
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Authentication failed",
#             headers={"WWW-Authenticate": "Bearer"}
#         )

# @router.get("/users", response_model=UserListResponse)
# def get_all_users(
#     db: DatabaseDep,
#     admin_user: UserResponse = Depends(get_admin_user),
#     page: int = Query(1, ge=1),
#     limit: int = Query(10, ge=1, le=100),
#     status_filter: Optional[UserStatus] = Query(None),
#     search: Optional[str] = Query(None)
# ):
#     """Get paginated list of all users with optional filtering"""
#     try:
#         logger.info(f"Admin {admin_user.username} requesting user list")
        
#         users, total_count = auth_service.get_users_paginated(
#             db, 
#             page=page, 
#             limit=limit, 
#             status_filter=status_filter.value if status_filter else None,
#             search=search
#         )
        
#         total_pages = (total_count + limit - 1) // limit
        
#         response = UserListResponse(
#             users=users,
#             total_count=total_count,
#             page=page,
#             limit=limit,
#             total_pages=total_pages,
#             has_next=page < total_pages,
#             has_prev=page > 1
#         )
        
#         logger.info(f"Returned {len(users)} users for admin {admin_user.username}")
#         return response
        
#     except Exception as e:
#         logger.error(f"Error getting users list: {e}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Failed to retrieve users: {str(e)}"
#         )

# @router.get("/users/{user_id}", response_model=UserResponse)
# def get_user_by_id(
#     user_id: int,
#     db: DatabaseDep,
#     admin_user: UserResponse = Depends(get_admin_user)
# ):
#     """Get specific user details by ID"""
#     try:
#         user = auth_service.get_user_by_id(db, user_id)
#         if not user:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="User not found"
#             )
        
#         logger.info(f"Admin {admin_user.username} viewed user {user_id}")
#         return user
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error getting user {user_id}: {e}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Failed to retrieve user: {str(e)}"
#         )

# @router.put("/users/{user_id}/status", response_model=UserResponse)
# def update_user_status(
#     user_id: int,
#     status_update: UserStatusUpdate,
#     db: DatabaseDep,
#     admin_user: UserResponse = Depends(get_admin_user)
# ):
#     """Approve, suspend, or reject a user"""
#     try:
#         # Prevent admin from changing their own status
#         if user_id == admin_user.id:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Cannot modify your own status"
#             )
        
#         user = auth_service.get_user_by_id(db, user_id)
#         if not user:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="User not found"
#             )
        
#         # Update user status
#         updated_user = auth_service.update_user_status(
#             db, 
#             user_id, 
#             status_update.status, 
#             status_update.reason
#         )
        
#         logger.info(
#             f"Admin {admin_user.username} changed user {user_id} status to {status_update.status}"
#         )
        
#         return updated_user
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error updating user {user_id} status: {e}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Failed to update user status: {str(e)}"
#         )

# @router.delete("/users/{user_id}")
# def delete_user(
#     user_id: int,
#     db: DatabaseDep,
#     admin_user: UserResponse = Depends(get_admin_user)
# ):
#     """Delete a user (soft delete recommended)"""
#     try:
#         # Prevent admin from deleting themselves
#         if user_id == admin_user.id:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Cannot delete your own account"
#             )
        
#         user = auth_service.get_user_by_id(db, user_id)
#         if not user:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="User not found"
#             )
        
#         # Perform soft delete (recommended) or hard delete
#         success = auth_service.delete_user(db, user_id, soft_delete=True)
        
#         if not success:
#             raise HTTPException(
#                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#                 detail="Failed to delete user"
#             )
        
#         logger.warning(f"Admin {admin_user.username} deleted user {user_id}")
        
#         return {"message": f"User {user_id} has been deleted successfully"}
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error deleting user {user_id}: {e}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Failed to delete user: {str(e)}"
#         )

# @router.put("/users/{user_id}", response_model=UserResponse)
# def admin_update_user(
#     user_id: int,
#     user_data: UserUpdate,
#     db: DatabaseDep,
#     admin_user: UserResponse = Depends(get_admin_user)
# ):
#     """Admin can update any user's information"""
#     try:
#         user = auth_service.get_user_by_id(db, user_id)
#         if not user:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="User not found"
#             )
        
#         updated_user = auth_service.update_user(db, user_id, user_data)
        
#         logger.info(f"Admin {admin_user.username} updated user {user_id}")
#         return updated_user
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error updating user {user_id}: {e}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Failed to update user: {str(e)}"
#         )

# @router.get("/stats", response_model=AdminStats)
# def get_admin_stats(
#     db: DatabaseDep,
#     admin_user: UserResponse = Depends(get_admin_user)
# ):
#     """Get admin dashboard statistics"""
#     try:
#         stats = auth_service.get_admin_stats(db)
        
#         logger.info(f"Admin {admin_user.username} viewed admin stats")
#         return stats
        
#     except Exception as e:
#         logger.error(f"Error getting admin stats: {e}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Failed to retrieve statistics: {str(e)}"
#         )

# @router.post("/users/{user_id}/send-notification")
# def send_user_notification(
#     user_id: int,
#     notification_data: dict,
#     db: DatabaseDep,
#     admin_user: UserResponse = Depends(get_admin_user)
# ):
#     """Send notification to a specific user"""
#     try:
#         user = auth_service.get_user_by_id(db, user_id)
#         if not user:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="User not found"
#             )
        
#         # Implementation depends on your notification system
#         # This is a placeholder
#         success = auth_service.send_notification(
#             user_id, 
#             notification_data.get("subject", ""),
#             notification_data.get("message", ""),
#             notification_data.get("type", "info")
#         )
        
#         if success:
#             logger.info(f"Admin {admin_user.username} sent notification to user {user_id}")
#             return {"message": "Notification sent successfully"}
#         else:
#             raise HTTPException(
#                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#                 detail="Failed to send notification"
#             )
            
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error sending notification to user {user_id}: {e}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Failed to send notification: {str(e)}"
#         )
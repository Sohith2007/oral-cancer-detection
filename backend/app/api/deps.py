from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db.session import get_supabase
from supabase import Client

# HTTPBearer automatically extracts the "Bearer <token>" from the Authorization header
security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase)
):
    """
    FastAPI dependency to authenticate users via Supabase.
    It takes the JWT token, verifies it with Supabase, and returns the User object.
    """
    token = credentials.credentials
    try:
        # Send the JWT token to Supabase to verify it and retrieve the user session
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not getattr(user_response, 'user', None):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials or token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return user_response.user
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

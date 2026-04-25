from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from types import SimpleNamespace

from app.core.config import settings
from app.db.session import get_supabase
from supabase import Client

# HTTPBearer automatically extracts the "Bearer <token>" from the Authorization header
security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    supabase: Client | None = Depends(get_supabase)
):
    """
    FastAPI dependency to authenticate users via Supabase.
    It takes the JWT token, verifies it with Supabase, and returns the User object.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    if token == settings.DEMO_AUTH_TOKEN:
        return SimpleNamespace(id="demo-user", email="demo@doctor.com")

    try:
        # Send the JWT token to Supabase to verify it and retrieve the user session
        if supabase is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase authentication is not configured on the server",
            )
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

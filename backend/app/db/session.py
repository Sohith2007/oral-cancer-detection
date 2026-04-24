from supabase import create_client, Client
from app.core.config import settings

def get_supabase() -> Client:
    """FastAPI dependency that provides a Supabase client."""
    supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return supabase

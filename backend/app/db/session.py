from functools import lru_cache

from typing import Optional

from supabase import create_client, Client
from app.core.config import settings
from app.core.runtime import require_setting


@lru_cache(maxsize=1)
def _create_supabase_client() -> Optional[Client]:
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        return None
    supabase_url = require_setting(settings.SUPABASE_URL, "SUPABASE_URL")
    supabase_key = require_setting(settings.SUPABASE_KEY, "SUPABASE_KEY")
    return create_client(supabase_url, supabase_key)

def get_supabase() -> Optional[Client]:
    """FastAPI dependency that provides a Supabase client."""
    return _create_supabase_client()

from fastapi import HTTPException, status


def require_setting(value: str, setting_name: str) -> str:
    if value:
        return value
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"Server configuration error: {setting_name} is not set.",
    )

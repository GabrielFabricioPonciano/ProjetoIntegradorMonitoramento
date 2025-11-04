import time
from typing import Any, Optional, Dict
from functools import wraps


class SimpleCache:
    def __init__(self):
        self._cache: Dict[str, tuple[Any, float]] = {}
    
    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            value, expiry_time = self._cache[key]
            if time.time() < expiry_time:
                return value
            else:
                del self._cache[key]
        return None
    
    def set(self, key: str, value: Any, ttl: int = 30):
        expiry_time = time.time() + ttl
        self._cache[key] = (value, expiry_time)
    
    def clear(self):
        self._cache.clear()
    
    def remove(self, key: str):
        if key in self._cache:
            del self._cache[key]
    
    def cleanup_expired(self):
        current_time = time.time()
        expired_keys = [
            key for key, (_, expiry_time) in self._cache.items()
            if current_time >= expiry_time
        ]
        for key in expired_keys:
            del self._cache[key]


cache = SimpleCache()


def cached(ttl: int = 30):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            result = await func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator

"""
Simple in-memory cache for FastAPI endpoints
Reduces database load for frequently accessed data
"""
import time
from typing import Any, Optional, Dict
from functools import wraps


class SimpleCache:
    """
    Simple in-memory cache with TTL (Time To Live)
    Thread-safe for basic operations
    """
    
    def __init__(self):
        self._cache: Dict[str, tuple[Any, float]] = {}
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache if not expired
        
        Args:
            key: Cache key
        
        Returns:
            Cached value or None if not found/expired
        """
        if key in self._cache:
            value, expiry_time = self._cache[key]
            if time.time() < expiry_time:
                return value
            else:
                # Remove expired entry
                del self._cache[key]
        return None
    
    def set(self, key: str, value: Any, ttl: int = 30):
        """
        Set value in cache with TTL
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (default: 30)
        """
        expiry_time = time.time() + ttl
        self._cache[key] = (value, expiry_time)
    
    def clear(self):
        """Clear all cached entries"""
        self._cache.clear()
    
    def remove(self, key: str):
        """Remove specific cache entry"""
        if key in self._cache:
            del self._cache[key]
    
    def cleanup_expired(self):
        """Remove all expired entries"""
        current_time = time.time()
        expired_keys = [
            key for key, (_, expiry_time) in self._cache.items()
            if current_time >= expiry_time
        ]
        for key in expired_keys:
            del self._cache[key]


# Global cache instance
cache = SimpleCache()


def cached(ttl: int = 30):
    """
    Decorator to cache function results
    
    Args:
        ttl: Time to live in seconds
    
    Usage:
        @cached(ttl=60)
        async def expensive_function(arg1, arg2):
            # ... expensive operation
            return result
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            cache_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # Try to get from cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Call function and cache result
            result = await func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator

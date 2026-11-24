import time
from collections import defaultdict
from fastapi import HTTPException, Request, status


class RateLimiter:
    def __init__(self, requests_limit: int, window_seconds: int, scope: str = "default"):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.scope = scope
        self.history = defaultdict(list)

    async def __call__(self, request: Request):
        # Identify client by IP address
        client_ip = request.client.host if request.client else "unknown"
        # Combine client IP, endpoint route, and rate limiter scope to avoid collisions
        key = f"{client_ip}:{request.url.path}:{self.scope}"
        
        now = time.time()
        self.history[key] = [timestamp for timestamp in self.history[key] if now - timestamp < self.window_seconds]
        
        if len(self.history[key]) >= self.requests_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum of {self.requests_limit} requests per {self.window_seconds} seconds is allowed.",
                headers={"Retry-After": str(int(self.window_seconds))}
            )
        
        self.history[key].append(now)


# Instantiations of different limiter scopes
auth_limiter = RateLimiter(requests_limit=5, window_seconds=60, scope="auth")
api_limiter = RateLimiter(requests_limit=20, window_seconds=60, scope="external_api")

"""Hash de senha (bcrypt), tokens JWT e limitador de requisições."""
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import HTTPException, Request, status

from .config import settings

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def create_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "iat": now,
               "exp": now + timedelta(minutes=settings.TOKEN_EXPIRE_MINUTES)}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão expirada. Entre novamente.")


class RateLimiter:
    """Limite simples em memória: no máximo `limit` chamadas por `window` segundos por IP."""

    def __init__(self, limit: int, window: int):
        self.limit, self.window = limit, window
        self.hits: dict[str, deque] = defaultdict(deque)

    def __call__(self, request: Request) -> None:
        if settings.ENV == "test":
            return
        ip = request.client.host if request.client else "anon"
        now = time.monotonic()
        q = self.hits[ip]
        while q and now - q[0] > self.window:
            q.popleft()
        if len(q) >= self.limit:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                                "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.")
        q.append(now)


login_limiter = RateLimiter(limit=8, window=300)
form_limiter = RateLimiter(limit=6, window=600)

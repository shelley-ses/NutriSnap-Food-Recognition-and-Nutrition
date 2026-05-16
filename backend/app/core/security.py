from datetime import datetime, timedelta, timezone
import hashlib
import os
import random

from jose import jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(password, hashed_password)


def create_access_token(subject: str) -> str:
    settings = get_settings()
    expire_minutes = settings.access_token_expire_minutes
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def generate_otp() -> str:
    return f"{random.randint(0, 999999):06d}"


def hash_otp(otp: str) -> str:
    settings = get_settings()
    salt = settings.otp_pepper or os.getenv("OTP_PEPPER", "nutrisnap-otp-pepper")
    return hashlib.sha256(f"{otp}:{salt}".encode("utf-8")).hexdigest()


def is_otp_valid(otp: str, otp_hash: str) -> bool:
    return hash_otp(otp) == otp_hash

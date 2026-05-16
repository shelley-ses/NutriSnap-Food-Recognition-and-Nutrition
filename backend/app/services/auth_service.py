from datetime import datetime, timedelta
import smtplib
from email.message import EmailMessage

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, generate_otp, hash_otp, hash_password, is_otp_valid, verify_password
from app.models.auth import OtpCode, User


def _send_otp_email(email: str, otp: str) -> None:
    settings = get_settings()
    smtp_host = settings.smtp_host
    smtp_port = settings.smtp_port
    smtp_user = settings.smtp_user
    smtp_password = settings.smtp_password

    if not smtp_host or not smtp_user or not smtp_password:
        print(f"[NutriSnap OTP] {email}: {otp}")
        return "console"

    message = EmailMessage()
    message["Subject"] = "Your NutriSnap verification code"
    message["From"] = smtp_user
    message["To"] = email
    message.set_content(f"Your NutriSnap OTP is {otp}. It expires in 10 minutes.")

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(message)
    return "email"


def _store_otp(db: Session, email: str, purpose: str = "verify_email") -> tuple[str, str]:
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    existing = db.query(OtpCode).filter(OtpCode.email == email, OtpCode.purpose == purpose).one_or_none()
    if existing:
        existing.otp_hash = hash_otp(otp)
        existing.expires_at = expires_at
        existing.attempts = 0
    else:
        db.add(
            OtpCode(
                email=email,
                purpose=purpose,
                otp_hash=hash_otp(otp),
                expires_at=expires_at,
            )
        )

    db.commit()
    delivery_method = _send_otp_email(email, otp)
    return otp, delivery_method


def signup_user(db: Session, payload) -> dict:
    existing = db.query(User).filter(User.email == payload.email).one_or_none()
    if existing:
        raise ValueError("An account with this email already exists.")

    user = User(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        birthday=payload.birthday,
        hashed_password=hash_password(payload.password),
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    _, delivery_method = _store_otp(db, payload.email)
    return {
        "message": "Account created. OTP sent to email.",
        "user_id": user.id,
        "otp_required": True,
        "otp_delivery": delivery_method,
    }


def request_otp(db: Session, email: str) -> dict:
    user = db.query(User).filter(User.email == email).one_or_none()
    if not user:
        raise ValueError("No account found for this email.")

    _, delivery_method = _store_otp(db, email)
    return {"message": "OTP sent to your email.", "otp_delivery": delivery_method}


def verify_otp(db: Session, email: str, otp: str) -> dict:
    user = db.query(User).filter(User.email == email).one_or_none()
    if not user:
        raise ValueError("No account found for this email.")

    record = (
        db.query(OtpCode)
        .filter(OtpCode.email == email, OtpCode.purpose == "verify_email")
        .one_or_none()
    )
    if not record:
        raise ValueError("OTP not found. Request a new code.")

    if record.expires_at < datetime.utcnow():
        raise ValueError("OTP expired. Request a new code.")

    record.attempts += 1
    if record.attempts > 5:
        raise ValueError("Too many attempts. Request a new code.")

    if not is_otp_valid(otp, record.otp_hash):
        db.commit()
        raise ValueError("Invalid OTP.")

    user.is_verified = True
    db.delete(record)
    db.commit()
    token = create_access_token(user.email)
    return {"message": "Email verified.", "access_token": token, "user": {"email": user.email, "first_name": user.first_name, "last_name": user.last_name}}


def login_user(db: Session, email: str, password: str) -> dict:
    user = db.query(User).filter(User.email == email).one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        raise ValueError("Invalid email or password.")

    if not user.is_verified:
        _store_otp(db, email)
        raise ValueError("Account is not verified. A new OTP was sent to your email.")

    token = create_access_token(user.email)
    return {"access_token": token, "token_type": "bearer", "user": {"email": user.email, "first_name": user.first_name, "last_name": user.last_name}}

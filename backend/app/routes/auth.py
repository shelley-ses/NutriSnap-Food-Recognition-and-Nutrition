from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import LoginRequest, RequestOtpRequest, SignupRequest, VerifyOtpRequest
from app.services.auth_service import login_user, request_otp, signup_user, verify_otp

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    try:
        return signup_user(db, payload)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    try:
        return login_user(db, payload.email, payload.password)
    except ValueError as error:
        raise HTTPException(status_code=401, detail=str(error)) from error


@router.post("/request-otp")
def otp_request(payload: RequestOtpRequest, db: Session = Depends(get_db)):
    try:
        return request_otp(db, payload.email)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/verify-otp")
def otp_verify(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    try:
        return verify_otp(db, payload.email, payload.otp)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

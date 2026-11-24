from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from app.core.rate_limiter import auth_limiter
from app.core.security import get_current_user
from app.database import get_db
from app.models.auth import User
from app.models.calorie_goal import CalorieGoal
from app.schemas.auth import SignupRequest, LoginRequest, RequestOtpRequest, VerifyOtpRequest, ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.services.auth_service import signup_user, login_user, request_otp, verify_otp, change_user_password, request_forgot_password_otp, reset_password_with_otp

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", status_code=status.HTTP_201_CREATED, dependencies=[Depends(auth_limiter)])
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    try:
        return signup_user(db, payload)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/login", dependencies=[Depends(auth_limiter)])
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    try:
        res = login_user(db, payload.email, payload.password)
        response.set_cookie(
            key="nutrisnap_token",
            value=res["access_token"],
            httponly=True,
            max_age=1440 * 60,  # 24 hours
            samesite="lax",
            secure=False,  
        )
        return {"message": "Login successful", "user": res["user"]}
    except ValueError as error:
        raise HTTPException(status_code=401, detail=str(error)) from error


@router.post("/request-otp", dependencies=[Depends(auth_limiter)])
def otp_request(payload: RequestOtpRequest, db: Session = Depends(get_db)):
    try:
        return request_otp(db, payload.email)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/verify-otp", dependencies=[Depends(auth_limiter)])
def otp_verify(payload: VerifyOtpRequest, response: Response, db: Session = Depends(get_db)):
    try:
        res = verify_otp(db, payload.email, payload.otp)
        response.set_cookie(
            key="nutrisnap_token",
            value=res["access_token"],
            httponly=True,
            max_age=1440 * 60,  # 24 hours
            samesite="lax",
            secure=False,
        )
        return {"message": "Email verified and login successful", "user": res["user"]}
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key="nutrisnap_token",
        httponly=True,
        samesite="lax",
        secure=False,
    )
    return {"message": "Logout successful"}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    calorie_goal = db.query(CalorieGoal).filter(CalorieGoal.user_id == current_user.id).one_or_none()
    
    calorie_goal_data = None
    if calorie_goal:
        calorie_goal_data = {
            "id": calorie_goal.id,
            "name": calorie_goal.name,
            "goal": calorie_goal.goal,
            "activity_level": calorie_goal.activity_level,
            "sex": calorie_goal.sex,
            "birthday": calorie_goal.birthday,
            "height_cm": calorie_goal.height_cm,
            "weight_kg": calorie_goal.weight_kg,
            "goal_weight_kg": calorie_goal.goal_weight_kg,
            "weekly_goal_kg": calorie_goal.weekly_goal_kg,
            "daily_calorie_goal": calorie_goal.daily_calorie_goal,
            "daily_carbs_goal": calorie_goal.daily_carbs_goal,
            "daily_protein_goal": calorie_goal.daily_protein_goal,
            "daily_fat_goal": calorie_goal.daily_fat_goal,
            "daily_sodium_goal": calorie_goal.daily_sodium_goal,
            "daily_sugar_goal": calorie_goal.daily_sugar_goal,
        }
        
    return {
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "calorie_goal": calorie_goal_data
    }


@router.post("/change-password")
def change_password(payload: ChangePasswordRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        change_user_password(db, current_user, payload.current_password, payload.new_password)
        return {"message": "Password changed successfully."}
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/forgot-password/request", dependencies=[Depends(auth_limiter)])
def forgot_password_request(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    try:
        return request_forgot_password_otp(db, payload.email)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/forgot-password/reset", dependencies=[Depends(auth_limiter)])
def forgot_password_reset(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        return reset_password_with_otp(db, payload.email, payload.otp, payload.new_password)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error




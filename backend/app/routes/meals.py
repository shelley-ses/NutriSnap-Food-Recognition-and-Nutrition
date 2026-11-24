from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database import get_db
from app.models.auth import User
from app.schemas.meal import MealCreate
from app.services.meal_service import delete_meal, list_meals, save_meal

router = APIRouter(prefix="/meals", tags=["meals"])


@router.get("")
def read_meals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return list_meals(db, current_user.id)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_meal(payload: MealCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return save_meal(db, payload, current_user.id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.delete("/{meal_id}")
def remove_meal(meal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        delete_meal(db, meal_id, current_user.id)
        return {"message": "Meal deleted."}
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.put("/{meal_id}")
def update_existing_meal(meal_id: int, payload: MealCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        from app.services.meal_service import update_meal
        return update_meal(db, meal_id, payload, current_user.id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

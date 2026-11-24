from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database import get_db
from app.models.auth import User
from app.models.calorie_goal import CalorieGoal
from app.schemas.calorie_goal import CalorieGoalCreate, CalorieGoalResponse, CalorieGoalManualUpdate

router = APIRouter(prefix="/calorie-goal", tags=["calorie-goal"])


def calculate_goals(payload: CalorieGoalCreate) -> dict:
    current_year = datetime.utcnow().year
    try:
        birth_year = int(payload.birthday[:4])
    except (ValueError, IndexError, TypeError):
        birth_year = current_year - 25
    age = current_year - birth_year
    if age < 0:
        age = 0

    # BMR calculation using Mifflin-St Jeor formula
    if payload.sex.lower() == "male":
        bmr = 10 * payload.weight_kg + 6.25 * payload.height_cm - 5 * age + 5
    else:
        bmr = 10 * payload.weight_kg + 6.25 * payload.height_cm - 5 * age - 161

    # TDEE multipliers
    activity_multipliers = {
        "not_very": 1.2,
        "lightly": 1.375,
        "active": 1.55,
        "very": 1.725
    }
    multiplier = activity_multipliers.get(payload.activity_level.lower(), 1.2)
    tdee = bmr * multiplier

    # Adjust based on goal
    daily_calories = tdee
    if payload.goal.lower() == "lose":
        weekly_rate = payload.weekly_goal_kg or 0.5
        daily_deficit = (weekly_rate * 7700) / 7
        daily_calories = tdee - daily_deficit
    elif payload.goal.lower() == "gain":
        weekly_rate = payload.weekly_goal_kg or 0.5
        daily_surplus = (weekly_rate * 7700) / 7
        daily_calories = tdee + daily_surplus

    # Cap to safety floor
    min_calories = 1500 if payload.sex.lower() == "male" else 1200
    if daily_calories < min_calories:
        daily_calories = min_calories

    daily_calories = round(daily_calories)

    # Standard distribution
    # Carbs: 50%, Protein: 20%, Fat: 30%, Sugar: 10%, Sodium: 2300mg
    carbs = round((daily_calories * 0.50) / 4)
    protein = round((daily_calories * 0.20) / 4)
    fat = round((daily_calories * 0.30) / 9)
    sugar = round((daily_calories * 0.10) / 4)
    sodium = 2300

    return {
        "daily_calorie_goal": daily_calories,
        "daily_carbs_goal": carbs,
        "daily_protein_goal": protein,
        "daily_fat_goal": fat,
        "daily_sodium_goal": sodium,
        "daily_sugar_goal": sugar
    }


@router.post("", response_model=CalorieGoalResponse)
def create_or_update_calorie_goal(
    payload: CalorieGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validations
    if payload.goal.lower() == "lose" and payload.goal_weight_kg is not None:
        if payload.goal_weight_kg >= payload.weight_kg:
            raise HTTPException(
                status_code=400,
                detail="For lose weight goal, goal weight must be less than current weight."
            )
    elif payload.goal.lower() == "gain" and payload.goal_weight_kg is not None:
        if payload.goal_weight_kg <= payload.weight_kg:
            raise HTTPException(
                status_code=400,
                detail="For gain weight goal, goal weight must be greater than current weight."
            )

    computed = calculate_goals(payload)

    # Check if a goal already exists
    existing = db.query(CalorieGoal).filter(CalorieGoal.user_id == current_user.id).one_or_none()
    if existing:
        existing.name = payload.name
        existing.goal = payload.goal
        existing.activity_level = payload.activity_level
        existing.sex = payload.sex
        existing.birthday = payload.birthday
        existing.height_cm = payload.height_cm
        existing.weight_kg = payload.weight_kg
        existing.goal_weight_kg = payload.goal_weight_kg if payload.goal.lower() != "maintain" else None
        existing.weekly_goal_kg = payload.weekly_goal_kg if payload.goal.lower() != "maintain" else None
        
        existing.daily_calorie_goal = computed["daily_calorie_goal"]
        existing.daily_carbs_goal = computed["daily_carbs_goal"]
        existing.daily_protein_goal = computed["daily_protein_goal"]
        existing.daily_fat_goal = computed["daily_fat_goal"]
        existing.daily_sodium_goal = computed["daily_sodium_goal"]
        existing.daily_sugar_goal = computed["daily_sugar_goal"]
        
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_goal = CalorieGoal(
            user_id=current_user.id,
            name=payload.name,
            goal=payload.goal,
            activity_level=payload.activity_level,
            sex=payload.sex,
            birthday=payload.birthday,
            height_cm=payload.height_cm,
            weight_kg=payload.weight_kg,
            goal_weight_kg=payload.goal_weight_kg if payload.goal.lower() != "maintain" else None,
            weekly_goal_kg=payload.weekly_goal_kg if payload.goal.lower() != "maintain" else None,
            
            daily_calorie_goal=computed["daily_calorie_goal"],
            daily_carbs_goal=computed["daily_carbs_goal"],
            daily_protein_goal=computed["daily_protein_goal"],
            daily_fat_goal=computed["daily_fat_goal"],
            daily_sodium_goal=computed["daily_sodium_goal"],
            daily_sugar_goal=computed["daily_sugar_goal"]
        )
        db.add(new_goal)
        db.commit()
        db.refresh(new_goal)
        return new_goal


@router.get("/current", response_model=CalorieGoalResponse)
def get_calorie_goal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goal = db.query(CalorieGoal).filter(CalorieGoal.user_id == current_user.id).one_or_none()
    if not goal:
        raise HTTPException(
            status_code=404,
            detail="Calorie goal configuration not found for this user."
        )
    return goal


@router.patch("/manual", response_model=CalorieGoalResponse)
def update_calorie_goal_manual(
    payload: CalorieGoalManualUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goal = db.query(CalorieGoal).filter(CalorieGoal.user_id == current_user.id).one_or_none()
    if not goal:
        raise HTTPException(
            status_code=404,
            detail="Calorie goal configuration not found. Please complete onboarding first."
        )
    
    goal.daily_calorie_goal = payload.daily_calorie_goal
    goal.daily_carbs_goal = payload.daily_carbs_goal
    goal.daily_protein_goal = payload.daily_protein_goal
    goal.daily_fat_goal = payload.daily_fat_goal
    goal.daily_sodium_goal = payload.daily_sodium_goal
    goal.daily_sugar_goal = payload.daily_sugar_goal
    
    db.commit()
    db.refresh(goal)
    return goal

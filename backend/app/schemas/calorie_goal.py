from datetime import datetime
from pydantic import BaseModel, Field

class CalorieGoalCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    goal: str = Field(..., description="'lose' | 'maintain' | 'gain'")
    activity_level: str = Field(..., description="'not_very' | 'lightly' | 'active' | 'very'")
    sex: str = Field(..., description="'male' | 'female'")
    birthday: str = Field(..., min_length=1, description="Birthday string (YYYY-MM-DD)")
    height_cm: float = Field(..., gt=0)
    weight_kg: float = Field(..., gt=0)
    goal_weight_kg: float | None = Field(None, gt=0)
    weekly_goal_kg: float | None = Field(None, ge=0)

class CalorieGoalResponse(BaseModel):
    id: int
    user_id: int
    name: str
    goal: str
    activity_level: str
    sex: str
    birthday: str
    height_cm: float
    weight_kg: float
    goal_weight_kg: float | None
    weekly_goal_kg: float | None
    
    daily_calorie_goal: int
    daily_carbs_goal: int
    daily_protein_goal: int
    daily_fat_goal: int
    daily_sodium_goal: int
    daily_sugar_goal: int
    
    created_at: datetime

    class Config:
        from_attributes = True


class CalorieGoalManualUpdate(BaseModel):
    daily_calorie_goal: int = Field(..., gt=0)
    daily_carbs_goal: int = Field(..., ge=0)
    daily_protein_goal: int = Field(..., ge=0)
    daily_fat_goal: int = Field(..., ge=0)
    daily_sodium_goal: int = Field(..., ge=0)
    daily_sugar_goal: int = Field(..., ge=0)

from datetime import datetime
from pydantic import BaseModel, Field


class MealCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str = Field(default="Meal", max_length=100)
    search_query: str | None = Field(default=None, max_length=255)
    serving_size: str | None = Field(default=None, max_length=100)
    calories: float = Field(default=0, ge=0)
    protein: float = Field(default=0, ge=0)
    carbs: float = Field(default=0, ge=0)
    fat: float = Field(default=0, ge=0)
    fiber: float = Field(default=0, ge=0)
    confidence: int | None = Field(default=None, ge=0, le=100)
    description: str | None = Field(default=None, max_length=1000)
    source: str = Field(default="manual", max_length=50)
    image: str | None = Field(default=None)
    created_at: datetime | None = Field(default=None)
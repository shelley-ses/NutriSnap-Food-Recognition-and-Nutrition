from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class CalorieGoal(Base):
    __tablename__ = "calorie_goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    goal: Mapped[str] = mapped_column(String(50), nullable=False)  # 'lose', 'maintain', 'gain'
    activity_level: Mapped[str] = mapped_column(String(50), nullable=False)  # 'not_very', 'lightly', 'active', 'very'
    sex: Mapped[str] = mapped_column(String(20), nullable=False)  # 'male', 'female'
    birthday: Mapped[str] = mapped_column(String(50), nullable=False)
    height_cm: Mapped[float] = mapped_column(Float, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    goal_weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    weekly_goal_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    # Computed goals
    daily_calorie_goal: Mapped[int] = mapped_column(Integer, nullable=False)
    daily_carbs_goal: Mapped[int] = mapped_column(Integer, nullable=False)
    daily_protein_goal: Mapped[int] = mapped_column(Integer, nullable=False)
    daily_fat_goal: Mapped[int] = mapped_column(Integer, nullable=False)
    daily_sodium_goal: Mapped[int] = mapped_column(Integer, nullable=False)
    daily_sugar_goal: Mapped[int] = mapped_column(Integer, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

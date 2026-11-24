from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Meal(Base):
    __tablename__ = "meals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="Meal")
    search_query: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    serving_size: Mapped[str | None] = mapped_column(String(100), nullable=True)
    calories: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    protein: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    carbs: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    fat: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    fiber: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    confidence: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    source: Mapped[str] = mapped_column(String(50), default="manual", nullable=False)
    image: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
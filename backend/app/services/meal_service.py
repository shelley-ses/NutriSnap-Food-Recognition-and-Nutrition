from datetime import datetime

from sqlalchemy.orm import Session

from app.models.meal import Meal


def _serialize_meal(meal: Meal) -> dict:
    return {
        "id": meal.id,
        "name": meal.name,
        "category": meal.category,
        "search_query": meal.search_query,
        "serving_size": meal.serving_size,
        "calories": meal.calories,
        "protein": meal.protein,
        "carbs": meal.carbs,
        "fat": meal.fat,
        "fiber": meal.fiber,
        "confidence": meal.confidence,
        "description": meal.description,
        "source": meal.source,
        "image": meal.image,
        "created_at": meal.created_at.isoformat(),
    }


def list_meals(db: Session, user_id: int) -> list[dict]:
    meals = db.query(Meal).filter(Meal.user_id == user_id).order_by(Meal.created_at.desc(), Meal.id.desc()).all()
    return [_serialize_meal(meal) for meal in meals]


def save_meal(db: Session, payload, user_id: int) -> dict:
    meal_name = payload.name.strip()
    if not meal_name:
        raise ValueError("Meal name is required.")

    meal = Meal(
        user_id=user_id,
        name=meal_name,
        category=(payload.category or "Meal").strip() or "Meal",
        search_query=(payload.search_query or "").strip() or None,
        serving_size=(payload.serving_size or "").strip() or None,
        calories=float(payload.calories or 0),
        protein=float(payload.protein or 0),
        carbs=float(payload.carbs or 0),
        fat=float(payload.fat or 0),
        fiber=float(payload.fiber or 0),
        confidence=payload.confidence,
        description=(payload.description or "").strip() or None,
        source=(payload.source or "manual").strip() or "manual",
        image=payload.image,
        created_at=payload.created_at if payload.created_at is not None else datetime.utcnow(),
    )
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return _serialize_meal(meal)


def delete_meal(db: Session, meal_id: int, user_id: int) -> None:
    meal = db.query(Meal).filter(Meal.id == meal_id, Meal.user_id == user_id).one_or_none()
    if not meal:
        raise ValueError("Meal not found.")

    db.delete(meal)
    db.commit()


def update_meal(db: Session, meal_id: int, payload, user_id: int) -> dict:
    meal = db.query(Meal).filter(Meal.id == meal_id, Meal.user_id == user_id).one_or_none()
    if not meal:
        raise ValueError("Meal not found.")

    meal_name = payload.name.strip()
    if not meal_name:
        raise ValueError("Meal name is required.")

    meal.name = meal_name
    meal.category = (payload.category or "Meal").strip() or "Meal"
    meal.search_query = (payload.search_query or "").strip() or None
    meal.serving_size = (payload.serving_size or "").strip() or None
    meal.calories = float(payload.calories or 0)
    meal.protein = float(payload.protein or 0)
    meal.carbs = float(payload.carbs or 0)
    meal.fat = float(payload.fat or 0)
    meal.fiber = float(payload.fiber or 0)
    meal.confidence = payload.confidence
    meal.description = (payload.description or "").strip() or None
    meal.source = (payload.source or "manual").strip() or "manual"
    meal.image = payload.image
    if payload.created_at is not None:
        meal.created_at = payload.created_at

    db.commit()
    db.refresh(meal)
    return _serialize_meal(meal)
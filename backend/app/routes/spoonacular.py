from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.rate_limiter import api_limiter
from app.services.spoonacular_service import (
	get_ingredient_nutrition_with_spoonacular,
	guess_nutrition_with_spoonacular,
)
from app.services.gemini_consensus_service import estimate_nutrition_from_text

router = APIRouter(prefix="/nutrition", tags=["nutrition"])


class IngredientItem(BaseModel):
	name: str = Field(min_length=1)
	amount: float = Field(default=100.0, gt=0)
	unit: str = Field(default="g")


class BatchNutritionRequest(BaseModel):
	ingredients: list[IngredientItem]


@router.get("/guess", dependencies=[Depends(api_limiter)])
async def guess_nutrition(query: str = Query(..., min_length=1)):
	try:
		res = guess_nutrition_with_spoonacular(query=query)
		# If Spoonacular returns no calories or 0 calories, use Gemini fallback
		if res.get("calories") is None or float(res.get("calories") or 0) == 0:
			try:
				gem_res = estimate_nutrition_from_text(food_label=query, amount=1.0, unit="serving")
				return {
					"provider": "gemini-fallback",
					"query": query,
					"title": query,
					"serving_size": "1 serving",
					"calories": gem_res.get("calories", 0.0),
					"carbs": gem_res.get("carbs", 0.0),
					"fat": gem_res.get("fat", 0.0),
					"protein": gem_res.get("protein", 0.0),
					"nutrition": {
						"calories": {"amount": gem_res.get("calories", 0.0), "unit": "kcal"},
						"protein": {"amount": gem_res.get("protein", 0.0), "unit": "g"},
						"carbohydrates": {"amount": gem_res.get("carbs", 0.0), "unit": "g"},
						"fat": {"amount": gem_res.get("fat", 0.0), "unit": "g"},
						"fiber": {"amount": gem_res.get("fiber", 0.0), "unit": "g"}
					}
				}
			except Exception:
				pass
		return res
	except Exception:
		# Fallback to Gemini if Spoonacular service raises any exception
		try:
			gem_res = estimate_nutrition_from_text(food_label=query, amount=1.0, unit="serving")
			return {
				"provider": "gemini-fallback",
				"query": query,
				"title": query,
				"serving_size": "1 serving",
				"calories": gem_res.get("calories", 0.0),
				"carbs": gem_res.get("carbs", 0.0),
				"fat": gem_res.get("fat", 0.0),
				"protein": gem_res.get("protein", 0.0),
				"nutrition": {
					"calories": {"amount": gem_res.get("calories", 0.0), "unit": "kcal"},
					"protein": {"amount": gem_res.get("protein", 0.0), "unit": "g"},
					"carbohydrates": {"amount": gem_res.get("carbs", 0.0), "unit": "g"},
					"fat": {"amount": gem_res.get("fat", 0.0), "unit": "g"},
					"fiber": {"amount": gem_res.get("fiber", 0.0), "unit": "g"}
				}
			}
		except Exception as error:
			raise HTTPException(status_code=502, detail=f"Spoonacular failed and Gemini fallback failed: {str(error)}") from error


@router.get("/ingredient", dependencies=[Depends(api_limiter)])
async def ingredient_nutrition(
	query: str = Query(..., min_length=1),
	amount: float = Query(100, gt=0),
	unit: str = Query("g", min_length=1),
):
	try:
		return get_ingredient_nutrition_with_spoonacular(query=query, amount=amount, unit=unit)
	except ValueError as error:
		raise HTTPException(status_code=400, detail=str(error)) from error
	except RuntimeError as error:
		raise HTTPException(status_code=502, detail=str(error)) from error


@router.post("/batch", dependencies=[Depends(api_limiter)])
async def batch_ingredient_nutrition(payload: BatchNutritionRequest):
	results = []
	for ing in payload.ingredients:
		resolved = False
		nutrition = None
		try:
			res = get_ingredient_nutrition_with_spoonacular(
				query=ing.name,
				amount=ing.amount,
				unit=ing.unit,
			)
			cal_val = res.get("calories")
			if cal_val is not None and float(cal_val) > 0:
				nutrition = {
					"calories": float(cal_val),
					"protein": float(res.get("protein", 0)),
					"carbs": float(res.get("carbs", 0)),
					"fat": float(res.get("fat", 0)),
					"fiber": float(res.get("fiber", 0)),
					"source": "spoonacular",
					"resolved": True
				}
				resolved = True
		except Exception:
			pass

		if not resolved:
			try:
				gem_res = estimate_nutrition_from_text(
					food_label=ing.name,
					amount=ing.amount,
					unit=ing.unit,
				)
				nutrition = {
					**gem_res,
					"source": "gemini-fallback",
					"resolved": False
				}
			except Exception:
				nutrition = {
					"calories": 0.0,
					"protein": 0.0,
					"carbs": 0.0,
					"fat": 0.0,
					"fiber": 0.0,
					"source": "unresolved",
					"resolved": False
				}

		results.append({
			"name": ing.name,
			"amount": ing.amount,
			"unit": ing.unit,
			**nutrition
		})

	return {"results": results}


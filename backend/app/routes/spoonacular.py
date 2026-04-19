from fastapi import APIRouter, HTTPException, Query

from app.services.spoonacular_service import guess_nutrition_with_spoonacular

router = APIRouter(prefix="/nutrition", tags=["nutrition"])


@router.get("/guess")
async def guess_nutrition(query: str = Query(..., min_length=1)):
	try:
		return guess_nutrition_with_spoonacular(query=query)
	except ValueError as error:
		raise HTTPException(status_code=400, detail=str(error)) from error
	except RuntimeError as error:
		raise HTTPException(status_code=502, detail=str(error)) from error
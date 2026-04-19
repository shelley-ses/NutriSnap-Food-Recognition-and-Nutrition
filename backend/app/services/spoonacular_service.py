import json
from typing import Any
from urllib import error, parse, request

from app.core.config import get_settings


def _build_guess_nutrition_url(query: str, api_key: str) -> str:
	encoded_query = parse.urlencode({"title": query, "apiKey": api_key})
	return f"https://api.spoonacular.com/recipes/guessNutrition?{encoded_query}"


def guess_nutrition_with_spoonacular(query: str) -> dict[str, Any]:
	clean_query = query.strip()
	if not clean_query:
		raise ValueError("Query is empty.")

	settings = get_settings()
	if not settings.enable_spoonacular:
		raise RuntimeError("Spoonacular is disabled (ENABLE_SPOONACULAR=false)")
	if not settings.spoonacular_api_key:
		raise RuntimeError(
			"SPOONACULAR_API_KEY is missing. Add it to backend/.env and restart the API."
		)

	url = _build_guess_nutrition_url(query=clean_query, api_key=settings.spoonacular_api_key)
	http_request = request.Request(url=url, method="GET")

	try:
		with request.urlopen(http_request, timeout=30) as response:
			response_body = response.read().decode("utf-8")
		response_data = json.loads(response_body)
	except error.HTTPError as http_error:
		error_body = http_error.read().decode("utf-8", errors="ignore")
		raise RuntimeError(f"Spoonacular request failed ({http_error.code}): {error_body}") from http_error
	except error.URLError as url_error:
		raise RuntimeError(f"Spoonacular request failed: {url_error.reason}") from url_error
	except json.JSONDecodeError as decode_error:
		raise RuntimeError("Spoonacular returned invalid JSON response.") from decode_error

	nutrients = response_data.get("nutrients", [])
	nutrition_map: dict[str, Any] = {}
	if isinstance(nutrients, list):
		for nutrient in nutrients:
			if not isinstance(nutrient, dict):
				continue
			name = str(nutrient.get("name", "")).strip().lower()
			amount = nutrient.get("amount")
			unit = str(nutrient.get("unit", "")).strip()
			if not name:
				continue
			nutrition_map[name] = {
				"amount": amount,
				"unit": unit,
			}

	return {
		"provider": "spoonacular",
		"query": clean_query,
		"title": response_data.get("title"),
		"serving_size": response_data.get("servingSize"),
		"calories": response_data.get("calories"),
		"carbs": response_data.get("carbs"),
		"fat": response_data.get("fat"),
		"protein": response_data.get("protein"),
		"nutrition": nutrition_map,
		"raw": response_data,
	}
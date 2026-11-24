import json
from typing import Any
from urllib import error, parse, request

from app.core.config import get_settings


def _build_guess_nutrition_url(query: str, api_key: str) -> str:
	encoded_query = parse.urlencode({"title": query, "apiKey": api_key})
	return f"https://api.spoonacular.com/recipes/guessNutrition?{encoded_query}"


def _build_ingredient_search_url(query: str, api_key: str) -> str:
	encoded_query = parse.urlencode({"query": query, "number": 1, "apiKey": api_key})
	return f"https://api.spoonacular.com/food/ingredients/search?{encoded_query}"


def _build_ingredient_autocomplete_url(query: str, api_key: str) -> str:
	encoded_query = parse.urlencode({"query": query, "number": 1, "metaInformation": True, "apiKey": api_key})
	return f"https://api.spoonacular.com/food/ingredients/autocomplete?{encoded_query}"


def _build_ingredient_info_url(ingredient_id: int, amount: float, unit: str, api_key: str) -> str:
	encoded_query = parse.urlencode({"amount": amount, "unit": unit, "apiKey": api_key})
	return f"https://api.spoonacular.com/food/ingredients/{ingredient_id}/information?{encoded_query}"


def _build_request(url: str) -> request.Request:
	return request.Request(
		url=url,
		method="GET",
		headers={
			"Accept": "application/json",
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NutriSnap/1.0",
			"Referer": "https://spoonacular.com/",
		},
	)


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
	http_request = _build_request(url=url)

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


def get_ingredient_nutrition_with_spoonacular(
	query: str,
	amount: float = 100,
	unit: str = "g",
) -> dict[str, Any]:
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

	selected_id = None
	selected_name = clean_query
	lookup_errors: list[str] = []

	for builder_name, build_url in (
		("search", _build_ingredient_search_url),
		("autocomplete", _build_ingredient_autocomplete_url),
	):
		lookup_url = build_url(query=clean_query, api_key=settings.spoonacular_api_key)
		lookup_request = _build_request(url=lookup_url)

		try:
			with request.urlopen(lookup_request, timeout=30) as response:
				lookup_body = response.read().decode("utf-8")
			lookup_data = json.loads(lookup_body)
		except error.HTTPError as http_error:
			error_body = http_error.read().decode("utf-8", errors="ignore")
			lookup_errors.append(f"{builder_name} failed ({http_error.code}): {error_body}")
			continue
		except error.URLError as url_error:
			lookup_errors.append(f"{builder_name} failed: {url_error.reason}")
			continue
		except json.JSONDecodeError:
			lookup_errors.append(f"{builder_name} returned invalid JSON response.")
			continue

		if isinstance(lookup_data, list):
			results = lookup_data
		elif isinstance(lookup_data, dict):
			results = lookup_data.get("results", [])
		else:
			results = []

		if not results:
			lookup_errors.append(f"{builder_name} returned no results.")
			continue

		first_result = results[0]
		if not isinstance(first_result, dict):
			lookup_errors.append(f"{builder_name} returned an invalid result entry.")
			continue

		selected_id = first_result.get("id")
		selected_name = str(first_result.get("name", clean_query)).strip() or clean_query
		break

	if selected_id is None:
		# Fallback to guessNutrition when the ingredient search has no hit.
		if lookup_errors:
			# Preserve the most useful upstream error for debugging in the UI/logs.
			last_error = lookup_errors[-1]
		else:
			last_error = "No ingredient lookup results"
		if lookup_errors:
			# Keep the fallback behavior, but surface the lookup error in the response when needed.
			pass
		fallback = guess_nutrition_with_spoonacular(clean_query)
		fallback["mode"] = "guess"
		fallback["ingredient_lookup_errors"] = lookup_errors
		return fallback

	info_url = _build_ingredient_info_url(
		ingredient_id=int(selected_id),
		amount=amount,
		unit=unit,
		api_key=settings.spoonacular_api_key,
	)
	info_request = _build_request(url=info_url)

	try:
		with request.urlopen(info_request, timeout=30) as response:
			info_body = response.read().decode("utf-8")
		info_data = json.loads(info_body)
	except error.HTTPError as http_error:
		error_body = http_error.read().decode("utf-8", errors="ignore")
		raise RuntimeError(f"Spoonacular ingredient info failed ({http_error.code}): {error_body}") from http_error
	except error.URLError as url_error:
		raise RuntimeError(f"Spoonacular ingredient info failed: {url_error.reason}") from url_error
	except json.JSONDecodeError as decode_error:
		raise RuntimeError("Spoonacular ingredient info returned invalid JSON response.") from decode_error

	nutrients = info_data.get("nutrition", {}).get("nutrients", [])
	nutrition_map: dict[str, Any] = {}
	if isinstance(nutrients, list):
		for nutrient in nutrients:
			if not isinstance(nutrient, dict):
				continue
			name = str(nutrient.get("name", "")).strip().lower()
			amount_value = nutrient.get("amount")
			unit_value = str(nutrient.get("unit", "")).strip()
			if not name:
				continue
			nutrition_map[name] = {
				"amount": amount_value,
				"unit": unit_value,
			}

	# Extract helper to fetch nutrients from list if root attributes are None
	def get_nutrient_amount(key_names: list[str]) -> float | None:
		for name in key_names:
			if name in nutrition_map:
				return float(nutrition_map[name].get("amount") or 0)
		return None

	calories = info_data.get("calories") or get_nutrient_amount(["calories"])
	protein = info_data.get("protein") or get_nutrient_amount(["protein"])
	carbs = info_data.get("carbs") or get_nutrient_amount(["carbohydrates", "carbs"])
	fat = info_data.get("fat") or get_nutrient_amount(["fat"])
	fiber = get_nutrient_amount(["fiber", "dietary fiber"]) or 0.0

	return {
		"provider": "spoonacular",
		"mode": "ingredient",
		"query": clean_query,
		"resolved_ingredient": selected_name,
		"amount": amount,
		"unit": unit,
		"calories": calories,
		"protein": protein,
		"carbs": carbs,
		"fat": fat,
		"fiber": fiber,
		"nutrition": nutrition_map,
		"ingredient_lookup_errors": lookup_errors,
		"raw": info_data,
	}
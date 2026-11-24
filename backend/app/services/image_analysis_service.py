import json
from typing import Any
from concurrent.futures import ThreadPoolExecutor

from app.core.config import get_settings
from app.services.clarifai_service import detect_food_with_clarifai
from app.services.roboflow_service import detect_food_with_roboflow_models
from app.services.yolo_service import detect_spatial_features
from app.services.gemini_consensus_service import (
	run_gemini_consensus,
	estimate_nutrition_with_gemini,
	estimate_nutrition_from_text,
	normalize_food_label,
)
from app.services.serving_weights import get_baseline_weight
from app.services.spoonacular_service import get_ingredient_nutrition_with_spoonacular

def _log_provider_status(label: str, status: str) -> None:
	print(f"Ensemble Layer: {label} = {status}")

def _resolve_single_ingredient(ing: dict[str, Any], settings: Any) -> dict[str, Any]:
	name = ing.get("name")
	amount = float(ing.get("amount", 100))
	unit = ing.get("unit", "g")
	if not name:
		return None

	ing_resolved = False
	ing_nutrition = None

	if settings.enable_spoonacular and settings.spoonacular_api_key:
		try:
			ing_res = get_ingredient_nutrition_with_spoonacular(
				query=name,
				amount=amount,
				unit=unit,
			)
			ing_cal = ing_res.get("calories")
			if ing_cal is not None and float(ing_cal) > 0:
				ing_nutrition = {
					"calories": float(ing_cal),
					"protein": float(ing_res.get("protein", 0)),
					"carbs": float(ing_res.get("carbs", 0)),
					"fat": float(ing_res.get("fat", 0)),
					"fiber": float(ing_res.get("fiber", 0)),
					"source": "spoonacular",
					"resolved": True
				}
				ing_resolved = True
		except Exception:
			pass
	
	if not ing_resolved:
		try:
			gem_ing_nutrition = estimate_nutrition_from_text(
				food_label=name,
				amount=amount,
				unit=unit,
			)
			ing_nutrition = {
				**gem_ing_nutrition,
				"source": "gemini-fallback",
				"resolved": False
			}
		except Exception:
			ing_nutrition = {
				"calories": 0.0,
				"protein": 0.0,
				"carbs": 0.0,
				"fat": 0.0,
				"fiber": 0.0,
				"source": "unresolved",
				"resolved": False
			}

	return {
		"name": name,
		"amount": amount,
		"unit": unit,
		**ing_nutrition
	}

def _resolve_main_meal_nutrition(final_food_label: str, grams: float, image_bytes: bytes, settings: Any) -> dict[str, Any]:
	nutrition_val = None
	if settings.enable_spoonacular and settings.spoonacular_api_key:
		try:
			spoonacular_res = get_ingredient_nutrition_with_spoonacular(
				query=final_food_label,
				amount=grams,
				unit="g",
			)
			cal_val = spoonacular_res.get("calories")
			if cal_val is not None and float(cal_val) > 0:
				nutrition_val = {
					"calories": float(cal_val),
					"protein": float(spoonacular_res.get("protein", 0)),
					"carbs": float(spoonacular_res.get("carbs", 0)),
					"fat": float(spoonacular_res.get("fat", 0)),
					"fiber": float(spoonacular_res.get("fiber", 0)),
					"provider": "spoonacular",
				}
				_log_provider_status("spoonacular-nutrition", "200")
		except Exception as err:
			_log_provider_status("spoonacular-nutrition", f"error fallback triggered: {err}")

	if nutrition_val is None or nutrition_val.get("calories", 0) <= 0:
		try:
			gemini_nutrition = estimate_nutrition_with_gemini(
				image_bytes=image_bytes,
				food_label=final_food_label,
				grams=grams,
			)
			nutrition_val = {
				**gemini_nutrition,
				"provider": "gemini-fallback",
			}
			_log_provider_status("gemini-nutrition-fallback", "200")
		except Exception as err:
			nutrition_val = {
				"calories": 150.0,
				"protein": 5.0,
				"carbs": 20.0,
				"fat": 5.0,
				"fiber": 1.0,
				"provider": "default-fallback",
			}
			_log_provider_status("default-nutrition-fallback", f"error: {err}")

	return nutrition_val

def analyze_food_image(
	image_bytes: bytes,
	use_gemini: bool | None = None,
	use_clarifai: bool | None = None,
	filipino_context: bool | None = None,
) -> dict[str, Any]:
	settings = get_settings()

	# 1, 2, 3. Run predictions concurrently to minimize response latency
	with ThreadPoolExecutor(max_workers=3) as executor:
		roboflow_future = executor.submit(
			lambda: detect_food_with_roboflow_models(image_bytes, top_k=5)
			if settings.enable_roboflow and settings.roboflow_api_key else {"foods": []}
		)
		clarifai_future = executor.submit(
			lambda: detect_food_with_clarifai(image_bytes, top_k=5)
			if (settings.enable_clarifai if use_clarifai is None else use_clarifai) and settings.clarifai_pat else {"foods": []}
		)
		spatial_future = executor.submit(detect_spatial_features, image_bytes)

		try:
			roboflow_result = roboflow_future.result()
			roboflow_foods = roboflow_result.get("foods", [])
			_log_provider_status("roboflow", "200")
		except Exception as err:
			roboflow_foods = []
			_log_provider_status("roboflow", f"error: {err}")

		try:
			clarifai_result = clarifai_future.result()
			clarifai_foods = clarifai_result.get("foods", [])
			_log_provider_status("clarifai", "200")
		except Exception as err:
			clarifai_foods = []
			_log_provider_status("clarifai", f"error: {err}")

		try:
			spatial_res = spatial_future.result()
			portion_ratio = spatial_res.get("portion_ratio", 0.35)
			_log_provider_status("yolov11-spatial", f"ratio: {portion_ratio}")
		except Exception as err:
			spatial_res = {}
			portion_ratio = 0.35
			_log_provider_status("yolov11-spatial", f"error: {err}")

	# Determine primary name for mapping standard baseline serving weight
	primary_name = "Food Item"
	if roboflow_foods:
		primary_name = roboflow_foods[0]["name"]
	elif clarifai_foods:
		primary_name = clarifai_foods[0]["name"]

	baseline_weight = get_baseline_weight(primary_name)
	geometry_portion_weight = portion_ratio * baseline_weight

	# 4. Gemini Consensus Engine (Decision-making, Conflict Resolution, & Portion Validation)
	consensus_res = {}
	if settings.gemini_api_key:
		try:
			consensus_res = run_gemini_consensus(
				image_bytes=image_bytes,
				roboflow_preds=roboflow_foods,
				clarifai_preds=clarifai_foods,
				geometry_weight=geometry_portion_weight,
			)
			_log_provider_status("gemini-consensus", "200")
		except Exception as err:
			_log_provider_status("gemini-consensus", f"error: {err}")
	else:
		_log_provider_status("gemini-consensus", "missing api key")

	# Standardize consensus values
	is_food = consensus_res.get("is_food", True)
	error_message = consensus_res.get("error_message")
	final_food_label = normalize_food_label(consensus_res.get("final_food_label") or primary_name)
	
	raw_alt_labels = consensus_res.get("alternative_labels") or []
	alternative_labels = []
	seen_labels = {final_food_label.lower()}
	for lbl in raw_alt_labels:
		norm_lbl = normalize_food_label(lbl)
		if norm_lbl and norm_lbl.lower() not in seen_labels:
			alternative_labels.append(norm_lbl)
			seen_labels.add(norm_lbl.lower())
			
	confidence_reasoning = consensus_res.get("confidence_reasoning") or "Consensus completed successfully."
	consensus_explanation = consensus_res.get("consensus_explanation") or "Resolved predictions across all layers."
	is_filipino_food = consensus_res.get("is_filipino_food", False)

	# Parse portion estimate grams
	portion_estimate_dict = consensus_res.get("portion_estimate") or {}
	grams = geometry_portion_weight
	if portion_estimate_dict:
		val = list(portion_estimate_dict.values())[0]
		try:
			if isinstance(val, (int, float)):
				grams = float(val)
			else:
				# Clean string weight (e.g. "250g" -> 250)
				cleaned_val = "".join(ch for ch in str(val) if ch.isdigit() or ch == '.')
				grams = float(cleaned_val)
		except Exception:
			grams = geometry_portion_weight

	# Form portion estimate output
	portion_estimate = {final_food_label: round(grams, 1)}

	# 5. Resolve main meal nutrition and guessed ingredients concurrently
	resolved_ingredients = []
	guessed_ingredients = consensus_res.get("guessed_ingredients") or []

	with ThreadPoolExecutor(max_workers=len(guessed_ingredients) + 1) as executor:
		main_meal_future = executor.submit(
			_resolve_main_meal_nutrition, final_food_label, grams, image_bytes, settings
		)
		ing_futures = [
			executor.submit(_resolve_single_ingredient, ing, settings)
			for ing in guessed_ingredients
		]

		# Fetch results
		nutrition_val = main_meal_future.result()
		for future in ing_futures:
			res_ing = future.result()
			if res_ing:
				resolved_ingredients.append(res_ing)

	# Form legacy structures for Frontend compatibility
	legacy_foods = []
	for item in (roboflow_foods + clarifai_foods):
		if item["name"] not in [f["name"] for f in legacy_foods]:
			legacy_foods.append(item)
	if not legacy_foods:
		legacy_foods.append({"name": final_food_label, "confidence": 0.90})

	gemini_insights = {
		"dish_guess": final_food_label,
		"identified_foods": [{"name": final_food_label, "confidence": "high"}],
		"nutrition_estimate": {
			"calories_kcal": nutrition_val["calories"],
			"protein_g": nutrition_val["protein"],
			"carbs_g": nutrition_val["carbs"],
			"fat_g": nutrition_val["fat"],
			"fiber_g": nutrition_val.get("fiber", 0),
		},
		"portion_size": {
			"text": f"{int(grams)}g",
			"grams": int(grams),
		},
		"portion_note": consensus_explanation,
		"confidence_note": confidence_reasoning,
	}

	return {
		# User strict JSON keys
		"is_food": is_food,
		"error_message": error_message,
		"final_food_label": final_food_label,
		"alternative_labels": alternative_labels,
		"confidence_reasoning": confidence_reasoning,
		"portion_estimate": portion_estimate,
		"consensus_explanation": consensus_explanation,
		"is_filipino_food": is_filipino_food,
		"ingredients": resolved_ingredients,
		# Legacy / compatibility keys
		"analysis_provider": "ensemble",
		"provider_route": "roboflow+clarifai+yolo+gemini+spoonacular",
		"is_filipino_context": is_filipino_food,
		"foods": legacy_foods,
		"top_prediction": final_food_label,
		"needs_user_confirmation": False,
		"user_confirmation_options": alternative_labels[:3],
		"gemini_validation": {
			"enabled": True,
			"model": "consensus-engine",
			"verdict": "agree",
			"final_label": final_food_label,
			"options": alternative_labels,
			"reason": confidence_reasoning,
		},
		"gemini_detected_foods": [{"name": final_food_label, "confidence": "high"}],
		"clarifai_model_url": settings.clarifai_model_url,
		"clarifai_error": None,
		"gemini_ready": True,
		"gemini_used": True,
		"gemini": {
			"enabled": True,
			"model": "consensus-engine",
			"insights": gemini_insights,
			"identified_foods": [{"name": final_food_label, "confidence": "high"}],
		},
		"yolo_ready": spatial_res.get("yolo_ready", False),
		"spatial_analysis": spatial_res,
	}

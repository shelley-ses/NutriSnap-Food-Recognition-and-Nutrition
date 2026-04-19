from typing import Any

from app.core.config import get_settings
from app.services.clarifai_service import detect_food_with_clarifai
from app.services.gemini_service import (
	detect_filipino_context_with_gemini,
	generate_nutrition_with_gemini,
	validate_food_prediction_with_gemini,
)
from app.services.roboflow_service import detect_food_with_roboflow_models


def analyze_food_image(
	image_bytes: bytes,
	use_gemini: bool | None = None,
	use_clarifai: bool | None = None,
	filipino_context: bool | None = None,
) -> dict[str, Any]:
	settings = get_settings()
	effective_use_clarifai = (
		settings.enable_clarifai if use_clarifai is None else use_clarifai
	)
	effective_use_roboflow = settings.enable_roboflow
	effective_use_gemini = settings.enable_gemini if use_gemini is None else use_gemini

	primary_provider_error: str | None = None
	primary_model_ref = settings.clarifai_model_url
	foods: list[dict[str, Any]] = []
	context_detector: dict[str, Any] | None = None

	if filipino_context is None and effective_use_gemini and settings.gemini_api_key:
		try:
			context_detector = detect_filipino_context_with_gemini(
				image_bytes=image_bytes,
				label_hints=[],
			)
			is_filipino_context = bool(context_detector.get("is_filipino_context"))
		except RuntimeError:
			is_filipino_context = False
	else:
		is_filipino_context = bool(filipino_context)

	if is_filipino_context:
		if not effective_use_roboflow:
			primary_provider_error = "Roboflow is disabled (ENABLE_ROBOFLOW=false)"
		elif not settings.roboflow_api_key:
			primary_provider_error = "ROBOFLOW_API_KEY is not configured"
		else:
			try:
				roboflow_result = detect_food_with_roboflow_models(image_bytes=image_bytes, top_k=5)
				foods = roboflow_result.get("foods", [])
				models = roboflow_result.get("models", [])
				if isinstance(models, list) and models:
					primary_model_ref = ", ".join([str(model) for model in models])
			except RuntimeError as error:
				primary_provider_error = str(error)
	else:
		if not effective_use_clarifai:
			primary_provider_error = "Clarifai is disabled (ENABLE_CLARIFAI=false)"
		elif not settings.clarifai_pat:
			primary_provider_error = "Clarifai PAT is not configured"
		else:
			try:
				clarifai_result = detect_food_with_clarifai(image_bytes=image_bytes, top_k=5)
				foods = clarifai_result["foods"]
				primary_model_ref = clarifai_result["model_url"]
			except RuntimeError as error:
				primary_provider_error = str(error)

	if primary_provider_error:
		raise RuntimeError(primary_provider_error)

	top_prediction = ""
	if foods:
		first_food = foods[0]
		top_prediction = str(first_food.get("name", "")).strip()

	gemini_validation: dict[str, Any] = {
		"enabled": bool(effective_use_gemini and settings.gemini_api_key),
		"model": None,
		"verdict": None,
		"final_label": None,
		"options": [],
		"reason": None,
		"raw_text": None,
		"error": None,
	}

	if top_prediction and effective_use_gemini and settings.gemini_api_key:
		try:
			alternate_predictions = [
				str(item.get("name", "")).strip()
				for item in foods[1:5]
				if isinstance(item, dict)
			]
			alternate_predictions = [item for item in alternate_predictions if item]
			validation_result = validate_food_prediction_with_gemini(
				image_bytes=image_bytes,
				prediction=top_prediction,
				alternate_predictions=alternate_predictions,
			)
			gemini_validation["model"] = validation_result.get("model")
			gemini_validation["verdict"] = validation_result.get("verdict")
			gemini_validation["final_label"] = validation_result.get("final_label")
			gemini_validation["options"] = validation_result.get("options", [])
			gemini_validation["reason"] = validation_result.get("reason")
			gemini_validation["raw_text"] = validation_result.get("raw_text")
		except RuntimeError as error:
			gemini_validation["error"] = str(error)
		except ValueError as error:
			gemini_validation["error"] = str(error)

	gemini_result: dict[str, Any] = {
		"enabled": bool(effective_use_gemini and settings.gemini_api_key),
		"model": None,
		"insights": None,
		"identified_foods": [],
		"raw_text": None,
		"error": None,
	}

	# Check if Gemini is enabled for this request.
	if not effective_use_gemini:
		gemini_result["enabled"] = False
		gemini_result["error"] = "Gemini is disabled"
	elif settings.gemini_api_key:
		try:
			gemini_api_result = generate_nutrition_with_gemini(
				image_bytes=image_bytes,
				foods=foods,
			)
			gemini_result["model"] = gemini_api_result.get("model")
			gemini_result["insights"] = gemini_api_result.get("insights")
			gemini_result["identified_foods"] = gemini_api_result.get(
				"identified_foods",
				[],
			)
			gemini_result["raw_text"] = gemini_api_result.get("raw_text")
			if not gemini_result["identified_foods"]:
				gemini_result["error"] = (
					"Gemini response did not include structured identified_foods. "
					"Check gemini.raw_text for details."
				)
		except RuntimeError as error:
			gemini_result["error"] = str(error)
		except ValueError as error:
			gemini_result["error"] = str(error)
	elif not settings.gemini_api_key:
		gemini_result["error"] = (
			"GEMINI_API_KEY is missing."
		)

	final_food_label: str | None = top_prediction or None
	confirmation_options: list[str] = []
	needs_user_confirmation = False

	verdict = str(gemini_validation.get("verdict") or "").lower()
	if verdict == "agree" and top_prediction:
		final_food_label = top_prediction
	elif verdict == "disagree":
		candidate = str(gemini_validation.get("final_label") or "").strip()
		final_food_label = candidate or top_prediction or None
	elif verdict == "unsure":
		needs_user_confirmation = True
		final_food_label = None
		raw_options = gemini_validation.get("options", [])
		if isinstance(raw_options, list):
			for option in raw_options:
				name = str(option).strip()
				if not name:
					continue
				if name not in confirmation_options:
					confirmation_options.append(name)

		if top_prediction and top_prediction not in confirmation_options:
			confirmation_options.insert(0, top_prediction)

		for food in foods[1:5]:
			if not isinstance(food, dict):
				continue
			name = str(food.get("name", "")).strip()
			if not name or name in confirmation_options:
				continue
			confirmation_options.append(name)

		confirmation_options = confirmation_options[:3]

	analysis_provider = "roboflow" if is_filipino_context else "clarifai"
	if gemini_result.get("enabled"):
		analysis_provider = f"{analysis_provider}+gemini"

	provider_route = "filipino-roboflow" if is_filipino_context else "general-clarifai"

	return {
		"analysis_provider": analysis_provider,
		"provider_route": provider_route,
		"is_filipino_context": is_filipino_context,
		"context_detector": context_detector,
		"foods": foods,
		"top_prediction": top_prediction or None,
		"final_food_label": final_food_label,
		"needs_user_confirmation": needs_user_confirmation,
		"user_confirmation_options": confirmation_options,
		"gemini_validation": gemini_validation,
		"gemini_detected_foods": gemini_result.get("identified_foods", []),
		"clarifai_model_url": primary_model_ref,
		"clarifai_error": primary_provider_error,
		"gemini_ready": bool(effective_use_gemini and settings.gemini_api_key),
		"gemini_used": bool(effective_use_gemini and settings.gemini_api_key),
		"gemini": gemini_result,
		"yolo_ready": False,
	}

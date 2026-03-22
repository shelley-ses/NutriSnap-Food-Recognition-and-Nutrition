from typing import Any

from app.core.config import get_settings
from app.services.clarifai_service import detect_food_with_clarifai
from app.services.gemini_service import generate_nutrition_with_gemini


def analyze_food_image(image_bytes: bytes, use_gemini: bool = True) -> dict[str, Any]:
	settings = get_settings()
	clarifai_error: str | None = None
	clarifai_model_url = settings.clarifai_model_url
	foods: list[dict[str, Any]] = []

	# Check if Clarifai is enabled
	if not settings.enable_clarifai:
		clarifai_error = "Clarifai is disabled (ENABLE_CLARIFAI=false)"
	# Check if Clarifai has credentials
	elif not settings.clarifai_pat:
		clarifai_error = "Clarifai PAT is not configured"
	else:
		try:
			clarifai_result = detect_food_with_clarifai(image_bytes=image_bytes, top_k=5)
			foods = clarifai_result["foods"]
			clarifai_model_url = clarifai_result["model_url"]
		except RuntimeError as error:
			clarifai_error = str(error)

	gemini_result: dict[str, Any] = {
		"enabled": bool(use_gemini and settings.gemini_api_key),
		"model": None,
		"insights": None,
		"identified_foods": [],
		"raw_text": None,
		"error": None,
	}

	# Check if Gemini is enabled
	if not settings.enable_gemini:
		gemini_result["enabled"] = False
		gemini_result["error"] = "Gemini is disabled (ENABLE_GEMINI=false)"
	elif use_gemini and settings.gemini_api_key:
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
	elif use_gemini and not settings.gemini_api_key:
		gemini_result["error"] = (
			"GEMINI_API_KEY is missing. Add it to backend/.env and restart the API."
		)

	gemini_ok = bool(gemini_result.get("enabled") and not gemini_result.get("error"))
	if clarifai_error and not gemini_ok:
		if use_gemini:
			raise RuntimeError(
				f"Clarifai failed: {clarifai_error}. Gemini failed: {gemini_result.get('error')}"
			)
		raise RuntimeError(f"Clarifai failed: {clarifai_error}")

	analysis_provider = "clarifai"
	if clarifai_error and gemini_ok:
		analysis_provider = "gemini"
	elif not clarifai_error and gemini_ok:
		analysis_provider = "clarifai+gemini"

	return {
		"analysis_provider": analysis_provider,
		"foods": foods,
		"gemini_detected_foods": gemini_result.get("identified_foods", []),
		"clarifai_model_url": clarifai_model_url,
		"clarifai_error": clarifai_error,
		"gemini_ready": bool(settings.gemini_api_key),
		"gemini_used": bool(use_gemini and settings.gemini_api_key),
		"gemini": gemini_result,
		"yolo_ready": False,
	}

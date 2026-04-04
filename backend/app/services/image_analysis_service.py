from typing import Any

from app.core.config import get_settings
from app.services.clarifai_service import detect_food_with_clarifai
from app.services.gemini_service import generate_nutrition_with_gemini


def analyze_food_image(
	image_bytes: bytes,
	use_gemini: bool | None = None,
	use_clarifai: bool | None = None,
) -> dict[str, Any]:
	settings = get_settings()
	effective_use_clarifai = (
		settings.enable_clarifai if use_clarifai is None else use_clarifai
	)
	effective_use_gemini = settings.enable_gemini if use_gemini is None else use_gemini

	clarifai_error: str | None = None
	clarifai_model_url = settings.clarifai_model_url
	foods: list[dict[str, Any]] = []

	# Check if Clarifai is enabled for this request.
	if not effective_use_clarifai:
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

	clarifai_ok = not clarifai_error
	gemini_ok = bool(gemini_result.get("enabled") and not gemini_result.get("error"))
	any_provider_enabled = bool(effective_use_clarifai or effective_use_gemini)
	if not clarifai_ok and not gemini_ok and any_provider_enabled:
		if effective_use_clarifai and effective_use_gemini:
			raise RuntimeError(
				f"Clarifai failed: {clarifai_error}. Gemini failed: {gemini_result.get('error')}"
			)
		if effective_use_clarifai:
			raise RuntimeError(f"Clarifai failed: {clarifai_error}")
		raise RuntimeError(f"Gemini failed: {gemini_result.get('error')}")

	analysis_provider = "none"
	if clarifai_ok and gemini_ok:
		analysis_provider = "clarifai+gemini"
	elif clarifai_ok:
		analysis_provider = "clarifai"
	elif gemini_ok:
		analysis_provider = "gemini"

	return {
		"analysis_provider": analysis_provider,
		"foods": foods,
		"gemini_detected_foods": gemini_result.get("identified_foods", []),
		"clarifai_model_url": clarifai_model_url,
		"clarifai_error": clarifai_error,
		"gemini_ready": bool(effective_use_gemini and settings.gemini_api_key),
		"gemini_used": bool(effective_use_gemini and settings.gemini_api_key),
		"gemini": gemini_result,
		"yolo_ready": False,
	}

import base64
import json
from typing import Any
from urllib import error, parse, request

from app.core.config import get_settings


def _normalize_model_id(model_id: str) -> str:
	return model_id.strip().strip("/")


def _build_roboflow_url(model_id: str, api_key: str, confidence: float) -> str:
	safe_model_id = _normalize_model_id(model_id)
	query = parse.urlencode(
		{
			"api_key": api_key,
			"confidence": max(0, min(int(confidence * 100), 100)),
			"format": "json",
		}
	)
	return f"https://detect.roboflow.com/{safe_model_id}?{query}"


def _extract_predictions(response_data: dict[str, Any]) -> list[dict[str, Any]]:
	predictions = response_data.get("predictions", [])
	if not isinstance(predictions, list):
		return []

	foods: list[dict[str, Any]] = []
	for item in predictions:
		if not isinstance(item, dict):
			continue

		name = str(item.get("class", "")).strip()
		confidence = item.get("confidence")
		if not name:
			continue

		if isinstance(confidence, (int, float)):
			confidence_value = round(float(confidence), 4)
		else:
			confidence_value = None

		food = {"name": name}
		if confidence_value is not None:
			food["confidence"] = confidence_value
		foods.append(food)

	return foods


def _merge_ranked_foods(candidates: list[dict[str, Any]], top_k: int) -> list[dict[str, Any]]:
	by_name: dict[str, float] = {}
	for candidate in candidates:
		name = str(candidate.get("name", "")).strip()
		if not name:
			continue

		confidence = candidate.get("confidence")
		if not isinstance(confidence, (int, float)):
			confidence = 0.0

		existing = by_name.get(name)
		if existing is None or float(confidence) > existing:
			by_name[name] = float(confidence)

	sorted_items = sorted(by_name.items(), key=lambda item: item[1], reverse=True)
	results: list[dict[str, Any]] = []
	for name, confidence in sorted_items[: max(1, top_k)]:
		results.append({"name": name, "confidence": round(confidence, 4)})

	return results


def detect_food_with_roboflow_models(
	image_bytes: bytes,
	top_k: int = 5,
	confidence_threshold: float = 0.2,
) -> dict[str, Any]:
	if not image_bytes:
		raise ValueError("Image data is empty.")

	settings = get_settings()
	if not settings.roboflow_api_key:
		raise RuntimeError(
			"ROBOFLOW_API_KEY is missing. Add it to backend/.env and restart the API."
		)

	model_ids = [
		_normalize_model_id(settings.roboflow_model_1),
		_normalize_model_id(settings.roboflow_model_2),
	]
	model_ids = [model_id for model_id in model_ids if model_id]
	if not model_ids:
		raise RuntimeError(
			"ROBOFLOW_MODEL_1 and ROBOFLOW_MODEL_2 are not configured."
		)

	encoded_image = base64.b64encode(image_bytes)
	all_candidates: list[dict[str, Any]] = []
	model_errors: list[str] = []

	for model_id in model_ids:
		url = _build_roboflow_url(
			model_id=model_id,
			api_key=settings.roboflow_api_key,
			confidence=confidence_threshold,
		)
		http_request = request.Request(
			url=url,
			data=encoded_image,
			headers={"Content-Type": "application/x-www-form-urlencoded"},
			method="POST",
		)

		try:
			with request.urlopen(http_request, timeout=30) as response:
				response_body = response.read().decode("utf-8")
			response_data = json.loads(response_body)
			all_candidates.extend(_extract_predictions(response_data))
		except error.HTTPError as http_error:
			error_body = http_error.read().decode("utf-8", errors="ignore")
			model_errors.append(f"{model_id} -> ({http_error.code}) {error_body}")
		except error.URLError as url_error:
			model_errors.append(f"{model_id} -> {url_error.reason}")
		except json.JSONDecodeError:
			model_errors.append(f"{model_id} -> invalid JSON response")
		except Exception as request_error:
			model_errors.append(f"{model_id} -> {request_error}")

	foods = _merge_ranked_foods(all_candidates, top_k=top_k)
	if not foods and model_errors:
		error_summary = " | ".join(model_errors)
		raise RuntimeError(f"Roboflow request failed for all models: {error_summary}")

	return {
		"provider": "roboflow",
		"models": model_ids,
		"foods": foods,
		"errors": model_errors,
	}

import base64
import json
import os
from typing import Any, Optional
from urllib import error, request

from app.core.config import get_settings

DEFAULT_GEMINI_MODELS = (
	"gemini-2.5-flash",
	"gemini-2.5-flash-lite",
	"gemini-2.0-flash",
	"gemini-1.5-flash",
	"gemini-1.5-flash-8b",
)


def _normalize_model_name(model_name: str) -> str:
	normalized = model_name.strip()
	if normalized.startswith("models/"):
		normalized = normalized.split("models/", 1)[1]
	return normalized


def _build_generate_url(model_name: str, api_key: str) -> str:
	return (
		"https://generativelanguage.googleapis.com/v1beta/models/"
		f"{model_name}:generateContent?key={api_key}"
	)


def _build_candidate_models() -> list[str]:
	configured_model = _normalize_model_name(os.getenv("GEMINI_MODEL", "").strip())

	candidates: list[str] = []
	if configured_model:
		candidates.append(configured_model)

	for model_name in DEFAULT_GEMINI_MODELS:
		if model_name not in candidates:
			candidates.append(model_name)

	return candidates


def _discover_generate_models(api_key: str) -> list[str]:
	url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
	http_request = request.Request(url=url, method="GET")

	with request.urlopen(http_request, timeout=20) as response:
		response_body = response.read().decode("utf-8")

	response_data = json.loads(response_body)

	discovered: list[str] = []
	for model in response_data.get("models", []):
		if not isinstance(model, dict):
			continue

		supported_methods = model.get("supportedGenerationMethods", [])
		if not isinstance(supported_methods, list):
			continue
		if "generateContent" not in supported_methods:
			continue

		name = _normalize_model_name(str(model.get("name", "")))
		if not name:
			continue

		if name not in discovered:
			discovered.append(name)

	return discovered


def _guess_image_mime_type(image_bytes: bytes) -> str:
	if image_bytes.startswith(b"\xff\xd8\xff"):
		return "image/jpeg"
	if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
		return "image/png"
	if image_bytes.startswith(b"GIF87a") or image_bytes.startswith(b"GIF89a"):
		return "image/gif"
	if image_bytes.startswith(b"RIFF") and image_bytes[8:12] == b"WEBP":
		return "image/webp"
	return "image/jpeg"


def _build_prompt(foods: list[dict[str, Any]]) -> str:
	label_lines: list[str] = []
	for food in foods:
		name = str(food.get("name", "")).strip()
		confidence = food.get("confidence")
		if not name:
			continue

		if confidence is None:
			label_lines.append(f"- {name}")
		else:
			label_lines.append(f"- {name} (confidence: {confidence})")

	labels = "\n".join(label_lines) if label_lines else "- unknown"

	return (
		"You are a food-recognition and nutrition assistant for a food-photo app.\n"
		"Analyze the IMAGE directly to identify what food is present.\n"
		"Label hints are secondary and may be noisy.\n\n"
		f"Label hints:\n{labels}\n\n"
		"Respond with STRICT JSON only (no markdown fences) using this schema:\n"
		"{\n"
		'  "dish_guess": "string",\n'
		'  "identified_foods": [\n'
		'    {"name": "string", "confidence": "high|medium|low"}\n'
		"  ],\n"
		'  "nutrition_estimate": {\n'
		'    "calories_kcal": number,\n'
		'    "protein_g": number,\n'
		'    "carbs_g": number,\n'
		'    "fat_g": number\n'
		"  },\n"
		'  "portion_note": "string",\n'
		'  "confidence_note": "string"\n'
		"}\n"
		"If uncertain, still provide best-effort estimates and explain uncertainty in confidence_note."
	)


def _extract_text_from_response(response_data: dict[str, Any]) -> str:
	candidates = response_data.get("candidates", [])
	if not isinstance(candidates, list) or not candidates:
		return ""

	first_candidate = candidates[0] if isinstance(candidates[0], dict) else {}
	content = first_candidate.get("content", {})
	parts = content.get("parts", []) if isinstance(content, dict) else []

	texts: list[str] = []
	for part in parts:
		if not isinstance(part, dict):
			continue

		text = part.get("text")
		if isinstance(text, str) and text.strip():
			texts.append(text.strip())

	return "\n".join(texts).strip()


def _parse_json_from_text(text: str) -> Optional[dict[str, Any]]:
	cleaned = text.strip()
	if not cleaned:
		return None

	if cleaned.startswith("```"):
		cleaned = cleaned.replace("```json", "").replace("```", "").strip()

	parse_candidates = [cleaned]
	start = cleaned.find("{")
	end = cleaned.rfind("}")
	if start != -1 and end != -1 and end > start:
		parse_candidates.append(cleaned[start : end + 1])

	for candidate in parse_candidates:
		try:
			parsed = json.loads(candidate)
			if isinstance(parsed, dict):
				return parsed
		except json.JSONDecodeError:
			continue

	return None


def _request_gemini_with_retry(
	payload: dict[str, Any],
	api_key: str,
) -> tuple[str, dict[str, Any]]:
	tried_models: list[str] = []
	model_errors: list[str] = []
	response_data: dict[str, Any] | None = None
	selected_model: str | None = None

	def _try_models(candidate_models: list[str]) -> None:
		nonlocal response_data
		nonlocal selected_model

		for model_name in candidate_models:
			if model_name in tried_models:
				continue

			tried_models.append(model_name)
			url = _build_generate_url(model_name=model_name, api_key=api_key)
			http_request = request.Request(
				url=url,
				data=json.dumps(payload).encode("utf-8"),
				headers={"Content-Type": "application/json"},
				method="POST",
			)

			try:
				with request.urlopen(http_request, timeout=35) as response:
					response_body = response.read().decode("utf-8")
				response_data = json.loads(response_body)
				selected_model = model_name
				return
			except error.HTTPError as http_error:
				error_body = http_error.read().decode("utf-8", errors="ignore")
				model_errors.append(f"{model_name} -> ({http_error.code}) {error_body}")
				if http_error.code in (400, 404):
					continue
				raise RuntimeError(
					f"Gemini request failed ({http_error.code}): {error_body}"
				) from http_error
			except error.URLError as url_error:
				raise RuntimeError(f"Gemini request failed: {url_error.reason}") from url_error
			except json.JSONDecodeError as decode_error:
				raise RuntimeError("Gemini returned invalid JSON response.") from decode_error
			except Exception as request_error:
				raise RuntimeError(f"Gemini request failed: {request_error}") from request_error

	_try_models(_build_candidate_models())

	if selected_model is None:
		try:
			discovered_models = _discover_generate_models(api_key=api_key)
		except Exception:
			discovered_models = []

		if discovered_models:
			_try_models(discovered_models)

	if selected_model is None or response_data is None:
		error_summary = " | ".join(model_errors) if model_errors else "no model attempts"
		raise RuntimeError(
			"Gemini request failed for all candidate models. "
			"Set GEMINI_MODEL in backend/.env to a valid model from ListModels. "
			f"Details: {error_summary}"
		)

	return selected_model, response_data


def detect_filipino_context_with_gemini(
	image_bytes: bytes,
	label_hints: list[dict[str, Any]],
) -> dict[str, Any]:
	settings = get_settings()
	if not settings.gemini_api_key:
		raise RuntimeError("GEMINI_API_KEY is missing.")
	if not image_bytes:
		raise ValueError("Image data is empty.")

	mime_type = _guess_image_mime_type(image_bytes=image_bytes)
	encoded_image = base64.b64encode(image_bytes).decode("utf-8")

	hints = [str(item.get("name", "")).strip() for item in label_hints if isinstance(item, dict)]
	hints = [hint for hint in hints if hint]
	hints_text = ", ".join(hints[:5]) if hints else "none"

	prompt = (
		"Decide if this food image should be analyzed with a Filipino-food specialized model.\n"
		"Return STRICT JSON only with this schema:\n"
		"{\n"
		'  "is_filipino_context": true|false,\n'
		'  "confidence": "high|medium|low",\n'
		'  "reason": "string"\n'
		"}\n"
		f"Label hints: {hints_text}"
	)

	payload = {
		"contents": [
			{
				"parts": [
					{"text": prompt},
					{
						"inline_data": {
							"mime_type": mime_type,
							"data": encoded_image,
						}
					},
				]
			}
		],
		"generationConfig": {"temperature": 0.1},
	}

	model_name, response_data = _request_gemini_with_retry(
		payload=payload,
		api_key=settings.gemini_api_key,
	)
	raw_text = _extract_text_from_response(response_data=response_data)
	parsed = _parse_json_from_text(raw_text)

	if not isinstance(parsed, dict):
		raise RuntimeError("Gemini context detector returned invalid JSON.")

	return {
		"provider": "gemini",
		"model": model_name,
		"raw_text": raw_text,
		"is_filipino_context": bool(parsed.get("is_filipino_context")),
		"confidence": str(parsed.get("confidence", "")).strip().lower() or "low",
		"reason": str(parsed.get("reason", "")).strip(),
	}


def validate_food_prediction_with_gemini(
	image_bytes: bytes,
	prediction: str,
	alternate_predictions: list[str] | None = None,
) -> dict[str, Any]:
	settings = get_settings()
	if not settings.gemini_api_key:
		raise RuntimeError("GEMINI_API_KEY is missing.")
	if not image_bytes:
		raise ValueError("Image data is empty.")

	mime_type = _guess_image_mime_type(image_bytes=image_bytes)
	encoded_image = base64.b64encode(image_bytes).decode("utf-8")

	alternatives = [item.strip() for item in (alternate_predictions or []) if isinstance(item, str) and item.strip()]
	alternative_text = ", ".join(alternatives[:6]) if alternatives else "none"

	prompt = (
		"You are validating a food classification. Look at the image and decide if the suggested label is correct.\n"
		f"Suggested label: {prediction.strip()}\n"
		f"Alternative labels: {alternative_text}\n\n"
		"Return STRICT JSON only with this schema:\n"
		"{\n"
		'  "verdict": "agree|disagree|unsure",\n'
		'  "final_label": "string",\n'
		'  "options": ["string", "string", "string"],\n'
		'  "reason": "string"\n'
		"}\n"
		"Rules: if verdict=agree, final_label must match the suggested label. "
		"If verdict=disagree, provide a better final_label. "
		"If verdict=unsure, provide 2-3 options in options."
	)

	payload = {
		"contents": [
			{
				"parts": [
					{"text": prompt},
					{
						"inline_data": {
							"mime_type": mime_type,
							"data": encoded_image,
						}
					},
				]
			}
		],
		"generationConfig": {"temperature": 0.1},
	}

	model_name, response_data = _request_gemini_with_retry(
		payload=payload,
		api_key=settings.gemini_api_key,
	)
	raw_text = _extract_text_from_response(response_data=response_data)
	parsed = _parse_json_from_text(raw_text)

	if not isinstance(parsed, dict):
		raise RuntimeError("Gemini validation returned invalid JSON.")

	verdict = str(parsed.get("verdict", "")).strip().lower()
	if verdict not in {"agree", "disagree", "unsure"}:
		verdict = "unsure"

	final_label = str(parsed.get("final_label", "")).strip()
	if verdict == "agree":
		final_label = prediction.strip()

	raw_options = parsed.get("options", [])
	options: list[str] = []
	if isinstance(raw_options, list):
		for item in raw_options:
			label = str(item).strip()
			if not label:
				continue
			if label not in options:
				options.append(label)

	if verdict == "unsure":
		if final_label and final_label not in options:
			options.insert(0, final_label)
		if prediction.strip() and prediction.strip() not in options:
			options.insert(0, prediction.strip())
		options = options[:3]

	return {
		"provider": "gemini",
		"model": model_name,
		"raw_text": raw_text,
		"verdict": verdict,
		"final_label": final_label,
		"options": options,
		"reason": str(parsed.get("reason", "")).strip(),
	}


def generate_nutrition_with_gemini(
	image_bytes: bytes,
	foods: list[dict[str, Any]],
) -> dict[str, Any]:
	settings = get_settings()
	if not settings.gemini_api_key:
		raise RuntimeError(
			"GEMINI_API_KEY is missing. Add it to backend/.env and restart the API."
		)

	if not image_bytes:
		raise ValueError("Image data is empty.")

	mime_type = _guess_image_mime_type(image_bytes=image_bytes)
	encoded_image = base64.b64encode(image_bytes).decode("utf-8")

	payload = {
		"contents": [
			{
				"parts": [
					{
						"text": _build_prompt(foods=foods),
					}
					,
					{
						"inline_data": {
							"mime_type": mime_type,
							"data": encoded_image,
						}
					}
				]
			}
		],
		"generationConfig": {
			"temperature": 0.2,
		},
	}

	selected_model, response_data = _request_gemini_with_retry(
		payload=payload,
		api_key=settings.gemini_api_key,
	)

	raw_text = _extract_text_from_response(response_data=response_data)
	if not raw_text:
		raise RuntimeError("Gemini returned no text output.")

	parsed_insights = _parse_json_from_text(raw_text)
	identified_foods: list[dict[str, str]] = []
	if isinstance(parsed_insights, dict):
		parsed_foods = parsed_insights.get("identified_foods")
		if isinstance(parsed_foods, list):
			for item in parsed_foods:
				if not isinstance(item, dict):
					continue

				name = str(item.get("name", "")).strip()
				confidence = str(item.get("confidence", "")).strip().lower()
				if not name:
					continue

				normalized: dict[str, str] = {"name": name}
				if confidence:
					normalized["confidence"] = confidence
				identified_foods.append(normalized)

	return {
		"provider": "gemini",
		"model": selected_model,
		"insights": parsed_insights,
		"identified_foods": identified_foods,
		"raw_text": raw_text,
	}

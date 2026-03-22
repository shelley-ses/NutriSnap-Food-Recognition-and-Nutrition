from typing import Any

from app.core.config import get_settings

try:
	from clarifai.client.model import Model
except Exception as import_error:
	Model = None
	_clarifai_import_error = import_error
else:
	_clarifai_import_error = None


def detect_food_with_clarifai(image_bytes: bytes, top_k: int = 5) -> dict[str, Any]:
	if not image_bytes:
		raise ValueError("Image data is empty.")

	settings = get_settings()
	if not settings.clarifai_pat:
		raise RuntimeError(
			"CLARIFAI_PAT is missing. Add it to backend/.env and restart the API."
		)

	if Model is None:
		raise RuntimeError(
			"Clarifai SDK is not available. Install it with 'pip install clarifai'."
		) from _clarifai_import_error

	safe_top_k = max(top_k, 1)

	try:
		model = Model(url=settings.clarifai_model_url, pat=settings.clarifai_pat)
		response = model.predict_by_bytes(image_bytes, input_type="image")
	except Exception as error:
		raise RuntimeError(f"Clarifai request failed: {error}") from error

	outputs = getattr(response, "outputs", None) or []
	if not outputs:
		return {
			"provider": "clarifai",
			"model_url": settings.clarifai_model_url,
			"foods": [],
		}

	first_output_data = getattr(outputs[0], "data", None)
	concepts = getattr(first_output_data, "concepts", None) or []

	foods: list[dict[str, Any]] = []
	for concept in concepts[:safe_top_k]:
		name = getattr(concept, "name", None)
		confidence = getattr(concept, "value", None)
		if name is None or confidence is None:
			continue

		foods.append(
			{
				"name": str(name),
				"confidence": round(float(confidence), 4),
			}
		)

	return {
		"provider": "clarifai",
		"model_url": settings.clarifai_model_url,
		"foods": foods,
	}

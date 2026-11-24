import base64
import json
import re
from typing import Any

from app.core.config import get_settings
from app.services.gemini_service import (
	_guess_image_mime_type,
	_request_gemini_with_retry,
	_extract_text_from_response,
	_parse_json_from_text,
)

def _title_case_clean(text: str) -> str:
	words = text.split()
	if not words:
		return ""
	lowercase_words = {"and", "or", "but", "with", "of", "in", "on", "at", "to", "for", "a", "an", "the"}
	res = []
	for i, w in enumerate(words):
		if i == 0 or w.lower() not in lowercase_words:
			res.append(w.capitalize())
		else:
			res.append(w.lower())
	return " ".join(res)


def _normalize_dish_base(val: str) -> str:
	if "chicken adobo" in val:
		return "Chicken Adobo"
	if "pork adobo" in val:
		return "Pork Adobo"
	if "adobo" in val:
		return "Chicken Adobo"
	if "sinigang" in val:
		if "pork" in val:
			return "Pork Sinigang"
		if "beef" in val:
			return "Beef Sinigang"
		if "shrimp" in val:
			return "Shrimp Sinigang"
		return "Sinigang"
	if "pancit" in val:
		return "Pancit"
	if "lumpia" in val:
		return "Lumpia"
	if "lechon" in val:
		return "Lechon"
	if "tapa" in val:
		return "Beef Tapa"
	if "sisig" in val:
		return "Sisig"
	return _title_case_clean(val)


def normalize_food_label(label: str) -> str:
	if not label:
		return ""
	
	val = label.lower().strip()
	
	# Find if there is a separator like "with", "and", or "w/"
	match = re.search(r'\s+(with|and|w/)\s+(.*)', val)
	if match:
		prefix = val[:match.start()].strip()
		suffix = match.group(2).strip()
		connector = match.group(1).strip()
		
		# Normalize prefix (dish name) and suffix (accompaniment)
		normalized_prefix = _normalize_dish_base(prefix)
		normalized_suffix = _title_case_clean(suffix)
		
		# Use standard "with" or the original connector capitalized
		conn_str = "with" if connector in ("with", "w/") else connector
		return f"{normalized_prefix} {conn_str} {normalized_suffix}"
	else:
		return _normalize_dish_base(val)


def run_gemini_consensus(
	image_bytes: bytes,
	roboflow_preds: list[dict[str, Any]],
	clarifai_preds: list[dict[str, Any]],
	geometry_weight: float,
) -> dict[str, Any]:
	settings = get_settings()
	if not settings.gemini_api_key:
		raise RuntimeError("GEMINI_API_KEY is missing.")
	if not image_bytes:
		raise ValueError("Image data is empty.")

	mime_type = _guess_image_mime_type(image_bytes=image_bytes)
	encoded_image = base64.b64encode(image_bytes).decode("utf-8")

	roboflow_str = json.dumps(roboflow_preds, indent=2)
	clarifai_str = json.dumps(clarifai_preds, indent=2)
	geometry_str = f"{geometry_weight:.1f} grams"

	prompt = (
		"You are the Consensus Engine for a food-photo application.\n"
		"Analyze the provided food image, resolve classification predictions from two different models, and validate a geometry-based portion weight.\n\n"
		"INPUTS:\n"
		f"1. Roboflow predictions (Filipino Food Classifier):\n{roboflow_str}\n\n"
		f"2. Clarifai predictions (Western/General Food Classifier):\n{clarifai_str}\n\n"
		f"3. Mathematical geometry-based portion weight estimate:\n{geometry_str}\n\n"
		"INSTRUCTIONS:\n"
		"1. Determine the 'final_food_label' and 'alternative_labels' based on the following rules:\n"
		"   - CASE 1: AGREEMENT\n"
		"     If both models agree or output semantically similar names (e.g., \"chicken adobo\" and \"braised chicken\"), choose the most specific Filipino food label (e.g., \"Chicken Adobo\") and set 'final_food_label' to it.\n"
		"   - CASE 2: PARTIAL DISAGREEMENT\n"
		"     If outputs are different but related (e.g., \"sinigang\" and \"soup\"), select the most likely specific food class (e.g., \"Sinigang\").\n"
		"   - CASE 3: STRONG CONFLICT\n"
		"     If outputs are completely different (e.g., \"beef tapa\" and \"chocolate cake\"), analyze the image directly to decide what food it actually is.\n"
		"   - IMPORTANT: Choose the most specific Filipino food label (e.g. 'Chicken Adobo' or 'Pork Adobo' instead of generic 'Adobo'; 'Beef Tapa' instead of generic 'Tapa'). You may include standard accompaniments if clearly present in the image or predictions (e.g., 'Chicken Adobo with Rice' or 'Beef Tapa with Fried Egg'). Ensure clean, consistent title-case naming.\n\n"
		"2. Validate the geometry-based portion weight estimate:\n"
		"   - Check if the estimated weight (grams) is realistic for a typical serving of the decided food class.\n"
		"   - If the weight is extreme or impossible (e.g., > 1200g or < 30g), adjust it to a realistic range (typically 100g to 600g for standard Filipino servings).\n"
		"   - Do not replace the mathematical calculation completely; only clamp or scale it to a realistic portion boundary.\n\n"
		"3. Check if the image actually contains edible items/food/drink:\n"
		"   - Set 'is_food' to true if it contains food or drink.\n"
		"   - Set 'is_food' to false if the image contains only non-edible items (like keyboards, keys, faces, empty plates, text, household items) or if it is too blurry/dark to see any food.\n"
		"   - Also, set 'is_food' to false if there are too many separate, disjointed food items/plates in the frame (e.g. buffet, massive layout of many plates) and it's impossible to identify a single main meal.\n"
		"   - If 'is_food' is false, set 'error_message' to a helpful validation message (e.g. \"This image does not appear to contain food. Please take a clear photo of your meal.\" or \"Multiple plates detected. Please focus on a single meal/plate at a time.\") and keep 'final_food_label' empty/generic.\n"
		"4. Identify if the decided food is a Filipino dish (e.g., Adobo, Sinigang, Pancit, Lechon, Sisig, Kare-Kare, Tapa, Lumpia, Pinakbet, Dinuguan, Kaldereta, etc.).\n"
		"   - Set 'is_filipino_food' to true if it is a Filipino dish, false otherwise.\n"
		"5. Guess the ingredients breakdown for this decided food item and typical weight (in grams or standard units like serving, tbsp, cups) for each ingredient required to prepare this portion size. The sum of the guessed ingredient weights should be approximately equal to the total portion estimate.\n\n"
		"6. Respond with a STRICT JSON object only. No markdown formatting, no code fences.\n\n"
		"JSON SCHEMA:\n"
		"{\n"
		'  "is_food": boolean,\n'
		'  "error_message": "string",\n'
		'  "final_food_label": "string",\n'
		'  "alternative_labels": ["string"],\n'
		'  "confidence_reasoning": "string",\n'
		'  "portion_estimate": {\n'
		'    "food_item": "grams" \n'
		'  },\n'
		'  "consensus_explanation": "string",\n'
		'  "is_filipino_food": boolean,\n'
		'  "guessed_ingredients": [\n'
		'    {"name": "string", "amount": number, "unit": "string"}\n'
		'  ]\n'
		"}\n"
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
		"generationConfig": {"temperature": 0.0},
	}

	try:
		model_name, response_data = _request_gemini_with_retry(
			payload=payload,
			api_key=settings.gemini_api_key,
		)
		raw_text = _extract_text_from_response(response_data=response_data)
		parsed = _parse_json_from_text(raw_text)
		if isinstance(parsed, dict):
			if "final_food_label" in parsed:
				parsed["final_food_label"] = normalize_food_label(parsed["final_food_label"])
			if "alternative_labels" in parsed and isinstance(parsed["alternative_labels"], list):
				parsed["alternative_labels"] = [normalize_food_label(lbl) for lbl in parsed["alternative_labels"]]
			return parsed
	except Exception as err:
		print(f"Gemini consensus request failed: {err}")

	# Fallback response
	fallback_label = roboflow_preds[0]["name"] if roboflow_preds else (clarifai_preds[0]["name"] if clarifai_preds else "Unknown Food")
	normalized_fallback = normalize_food_label(fallback_label)
	return {
		"is_food": True,
		"error_message": None,
		"final_food_label": normalized_fallback,
		"alternative_labels": [],
		"confidence_reasoning": "Fallback consensus triggered due to API error.",
		"portion_estimate": {
			normalized_fallback: round(geometry_weight, 1)
		},
		"consensus_explanation": "System automatically resolved via highest confidence prediction.",
		"is_filipino_food": False,
		"guessed_ingredients": []
	}


def estimate_nutrition_with_gemini(
	image_bytes: bytes,
	food_label: str,
	grams: float,
) -> dict[str, float]:
	settings = get_settings()
	if not settings.gemini_api_key:
		raise RuntimeError("GEMINI_API_KEY is missing.")
	if not image_bytes:
		raise ValueError("Image data is empty.")

	mime_type = _guess_image_mime_type(image_bytes=image_bytes)
	encoded_image = base64.b64encode(image_bytes).decode("utf-8")

	prompt = (
		"You are a professional dietitian assistant.\n"
		f"Given this food image and the verified food label: \"{food_label}\" with serving size: {grams:.1f}g, estimate its nutritional breakdown.\n"
		"Respond with a STRICT JSON object only. No markdown formatting, no code fences.\n\n"
		"JSON SCHEMA:\n"
		"{\n"
		'  "calories": number,\n'
		'  "protein": number,\n'
		'  "carbs": number,\n'
		'  "fat": number,\n'
		'  "fiber": number\n'
		"}\n"
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
		"generationConfig": {"temperature": 0.0},
	}

	try:
		model_name, response_data = _request_gemini_with_retry(
			payload=payload,
			api_key=settings.gemini_api_key,
		)
		raw_text = _extract_text_from_response(response_data=response_data)
		parsed = _parse_json_from_text(raw_text)
		if isinstance(parsed, dict):
			# Ensure all required float fields exist
			return {
				"calories": float(parsed.get("calories", 0)),
				"protein": float(parsed.get("protein", 0)),
				"carbs": float(parsed.get("carbs", 0)),
				"fat": float(parsed.get("fat", 0)),
				"fiber": float(parsed.get("fiber", 0)),
			}
	except Exception as err:
		print(f"Gemini nutrition estimation failed: {err}")

	# Default fallback estimation values
	return {
		"calories": 150.0,
		"protein": 5.0,
		"carbs": 20.0,
		"fat": 5.0,
		"fiber": 1.0,
	}


def estimate_nutrition_from_text(food_label: str, amount: float, unit: str) -> dict[str, float]:
	settings = get_settings()
	if not settings.gemini_api_key:
		raise RuntimeError("GEMINI_API_KEY is missing.")

	prompt = (
		"You are a professional dietitian assistant.\n"
		f"Estimate the nutritional breakdown for: \"{amount} {unit} of {food_label}\".\n"
		"Respond with a STRICT JSON object only. No markdown formatting, no code fences.\n\n"
		"JSON SCHEMA:\n"
		"{\n"
		'  "calories": number,\n'
		'  "protein": number,\n'
		'  "carbs": number,\n'
		'  "fat": number,\n'
		'  "fiber": number\n'
		"}\n"
	)

	payload = {
		"contents": [
			{
				"parts": [
					{"text": prompt}
				]
			}
		],
		"generationConfig": {"temperature": 0.0},
	}

	try:
		model_name, response_data = _request_gemini_with_retry(
			payload=payload,
			api_key=settings.gemini_api_key,
		)
		raw_text = _extract_text_from_response(response_data=response_data)
		parsed = _parse_json_from_text(raw_text)
		if isinstance(parsed, dict):
			return {
				"calories": float(parsed.get("calories", 0)),
				"protein": float(parsed.get("protein", 0)),
				"carbs": float(parsed.get("carbs", 0)),
				"fat": float(parsed.get("fat", 0)),
				"fiber": float(parsed.get("fiber", 0)),
			}
	except Exception as err:
		print(f"Gemini text nutrition estimation failed: {err}")

	# Default fallback estimation values
	return {
		"calories": 0.0,
		"protein": 0.0,
		"carbs": 0.0,
		"fat": 0.0,
		"fiber": 0.0,
	}


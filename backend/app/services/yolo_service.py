import io
import os
from typing import Any, Optional
from app.core.config import get_settings

try:
	from PIL import Image
	from ultralytics import YOLO
	_yolo_available = True
except ImportError:
	YOLO = None
	Image = None
	_yolo_available = False

_model_cache: dict[str, Any] = {}

def get_yolo_model(model_path: str) -> Optional[Any]:
	if not _yolo_available or YOLO is None:
		return None
	
	if model_path not in _model_cache:
		try:
			_model_cache[model_path] = YOLO(model_path)
		except Exception as err:
			print(f"Failed to load YOLO model at {model_path}: {err}")
			return None
	return _model_cache[model_path]


def detect_spatial_features(image_bytes: bytes) -> dict[str, Any]:
	settings = get_settings()
	model_path = settings.yolo_model_path or "yolo11n.pt"
	
	model = get_yolo_model(model_path)
	if not model or Image is None:
		print("YOLOv11 is not available or failed to load. Using mock spatial fallback.")
		return {
			"portion_ratio": 0.35,
			"A_food": 35000.0,
			"A_plate": 100000.0,
			"boxes": [],
			"yolo_ready": False
		}
		
	try:
		image = Image.open(io.BytesIO(image_bytes))
		width, height = image.size
		
		results = model(image, verbose=False)
		predictions = results[0]
		boxes = predictions.boxes
		
		plate_box = None
		food_boxes = []
		all_detected = []
		
		# COCO class indexes:
		# 41: cup, 45: bowl, 60: dining table -> represent plate / container
		# 46-55: COCO food items -> represent food
		container_classes = {41, 45, 60}
		food_classes = {46, 47, 48, 49, 50, 51, 52, 53, 54, 55}
		
		for box in boxes:
			x1, y1, x2, y2 = box.xyxy[0].tolist()
			conf = float(box.conf[0])
			cls = int(box.cls[0])
			class_name = model.names[cls] if cls in model.names else f"class_{cls}"
			
			box_area = (x2 - x1) * (y2 - y1)
			box_info = {
				"class": class_name,
				"class_id": cls,
				"confidence": round(conf, 4),
				"box": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
				"area": round(box_area, 1)
			}
			all_detected.append(box_info)
			
			if cls in container_classes:
				if plate_box is None or box_area > plate_box["area"]:
					plate_box = box_info
			
			if cls in food_classes:
				food_boxes.append(box_info)
				
		if plate_box is not None:
			A_plate = plate_box["area"]
		else:
			A_plate = float(width * height)
			
		if food_boxes:
			# Case 1: Food Detected
			A_food = sum(b["area"] for b in food_boxes)
		else:
			# Case 2: No Plate Detected 
			non_containers = [b for b in all_detected if b["class_id"] not in container_classes]
			if non_containers:
				A_food = max(b["area"] for b in non_containers)
			# Case 3: No Food Detected 
			else:
				A_food = A_plate * 0.35
				
		portion_ratio = round(max(0.01, min(1.5, A_food / A_plate)), 4)
		
		return {
			"portion_ratio": portion_ratio,
			"A_food": round(A_food, 1),
			"A_plate": round(A_plate, 1),
			"boxes": all_detected,
			"yolo_ready": True
		}
	except Exception as err:
		print(f"YOLO spatial analysis failed: {err}")
		return {
			"portion_ratio": 0.35,
			"A_food": 35000.0,
			"A_plate": 100000.0,
			"boxes": [],
			"yolo_ready": False
		}

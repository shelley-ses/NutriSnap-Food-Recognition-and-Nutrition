from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.rate_limiter import api_limiter
from app.services.image_analysis_service import analyze_food_image

router = APIRouter(prefix="/camera", tags=["camera"])

# Constants
ALLOWED_TYPES = {"image/png", "image/jpeg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/analyze", dependencies=[Depends(api_limiter)])
async def analyze_image(
	file: UploadFile = File(...),
	use_gemini: bool | None = None,
	use_clarifai: bool | None = None,
	filipino_context: bool | None = None,
):
	# Validate file type via Content-Type header
	if file.content_type not in ALLOWED_TYPES:
		raise HTTPException(
			status_code=400,
			detail=f"Invalid file type. Only PNG and JPEG are allowed. You uploaded: {file.content_type or 'unknown'}",
		)

	# Validate file extension
	filename_lower = file.filename.lower() if file.filename else ""
	if not (filename_lower.endswith(".png") or filename_lower.endswith(".jpg") or filename_lower.endswith(".jpeg")):
		raise HTTPException(
			status_code=400,
			detail="Invalid file extension. Only .png, .jpg, and .jpeg are allowed.",
		)

	image_bytes = await file.read()

	# Validate file size
	if len(image_bytes) > MAX_FILE_SIZE:
		size_mb = len(image_bytes) / (1024 * 1024)
		raise HTTPException(
			status_code=413,
			detail=f"File is too large ({size_mb:.2f} MB). Maximum size is 10 MB.",
		)

	if not image_bytes:
		raise HTTPException(status_code=400, detail="Uploaded file is empty.")

	# Validate image signature (Magic Bytes / File Header)
	is_png = image_bytes.startswith(b"\x89PNG\r\n\x1a\n")
	is_jpeg = image_bytes.startswith(b"\xff\xd8\xff")
	if not (is_png or is_jpeg):
		raise HTTPException(
			status_code=400,
			detail="File content signature does not match a valid PNG or JPEG image.",
		)


	try:
		result = analyze_food_image(
			image_bytes=image_bytes,
			use_gemini=use_gemini,
			use_clarifai=use_clarifai,
			filipino_context=filipino_context,
		)
	except ValueError as error:
		raise HTTPException(status_code=400, detail=str(error)) from error
	except RuntimeError as error:
		raise HTTPException(status_code=502, detail=str(error)) from error

	return {
		"filename": file.filename,
		**result,
	}

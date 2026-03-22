from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Camera
from app.routes.camera import router as camera_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(camera_router)

@app.get("/")
async def main():
    return {"message": "NutriSnap is working! yey!"}
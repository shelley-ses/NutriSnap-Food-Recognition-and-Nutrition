from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Camera
from app.database import Base, engine
from app.routes.auth import router as auth_router
from app.routes.camera import router as camera_router
from app.routes.spoonacular import router as spoonacular_router

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
app.include_router(spoonacular_router)
app.include_router(auth_router)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)

@app.get("/")
async def main():
    return {"message": "NutriSnap is working! yey!"}
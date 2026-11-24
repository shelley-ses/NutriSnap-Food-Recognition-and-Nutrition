from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Camera
from sqlalchemy import text
from app.database import Base, engine
from app.routes.auth import router as auth_router
from app.routes.camera import router as camera_router
from app.routes.meals import router as meals_router
from app.routes.spoonacular import router as spoonacular_router
from app.routes.calorie_goal import router as calorie_goal_router
from app.models.calorie_goal import CalorieGoal  # Ensure model is registered for create_all

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(camera_router)
app.include_router(spoonacular_router)
app.include_router(auth_router)
app.include_router(meals_router)
app.include_router(calorie_goal_router)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        if engine.name == "postgresql":
            # ── meals table ──────────────────────────────────────────────
            conn.execute(text("ALTER TABLE meals ADD COLUMN IF NOT EXISTS image TEXT"))

            # Columns added to the model after the table was first created.
            calorie_goal_migrations = [
                "ALTER TABLE calorie_goals ADD COLUMN IF NOT EXISTS sex VARCHAR(20)",
                "ALTER TABLE calorie_goals ADD COLUMN IF NOT EXISTS birthday VARCHAR(50)",
                "ALTER TABLE calorie_goals ADD COLUMN IF NOT EXISTS goal_weight_kg FLOAT",
                "ALTER TABLE calorie_goals ADD COLUMN IF NOT EXISTS weekly_goal_kg FLOAT",
                "ALTER TABLE calorie_goals ADD COLUMN IF NOT EXISTS daily_sodium_goal INTEGER",
                "ALTER TABLE calorie_goals ADD COLUMN IF NOT EXISTS daily_sugar_goal INTEGER",
                "ALTER TABLE calorie_goals DROP COLUMN IF EXISTS year_born",
            ]
            for stmt in calorie_goal_migrations:
                conn.execute(text(stmt))

            # Backfill NULL values for existing rows so SQLAlchemy doesn't crash
            # when reading rows that pre-date these columns being added.
            conn.execute(text("""
                UPDATE calorie_goals SET
                    sex              = COALESCE(sex, 'female'),
                    birthday         = COALESCE(birthday, '1990-01-01'),
                    daily_sodium_goal = COALESCE(daily_sodium_goal, 2300),
                    daily_sugar_goal  = COALESCE(daily_sugar_goal,
                        CASE WHEN daily_calorie_goal IS NOT NULL
                             THEN ROUND((daily_calorie_goal * 0.10) / 4)
                             ELSE 50 END)
                WHERE sex IS NULL
                   OR birthday IS NULL
                   OR daily_sodium_goal IS NULL
                   OR daily_sugar_goal IS NULL
            """))

        else:
            # SQLite fallback ─ check-and-add pattern (no IF NOT EXISTS support)
            res = conn.execute(text("PRAGMA table_info(meals)")).fetchall()
            existing = {r[1] for r in res}
            if "image" not in existing:
                conn.execute(text("ALTER TABLE meals ADD COLUMN image TEXT"))

            res = conn.execute(text("PRAGMA table_info(calorie_goals)")).fetchall()
            existing = {r[1] for r in res}
            sqlite_calorie_migrations = {
                "sex": "ALTER TABLE calorie_goals ADD COLUMN sex TEXT",
                "birthday": "ALTER TABLE calorie_goals ADD COLUMN birthday TEXT",
                "goal_weight_kg": "ALTER TABLE calorie_goals ADD COLUMN goal_weight_kg REAL",
                "weekly_goal_kg": "ALTER TABLE calorie_goals ADD COLUMN weekly_goal_kg REAL",
                "daily_sodium_goal": "ALTER TABLE calorie_goals ADD COLUMN daily_sodium_goal INTEGER",
                "daily_sugar_goal": "ALTER TABLE calorie_goals ADD COLUMN daily_sugar_goal INTEGER",
            }
            for col, stmt in sqlite_calorie_migrations.items():
                if col not in existing:
                    conn.execute(text(stmt))

@app.get("/")
async def main():
    return {"message": "NutriSnap is working! yey!"}
<p align="center">
  <img src="docs/logo.svg" alt="NutriSnap Logo" width="132" />
</p>

<h1 align="center">NutriSnap</h1>

<p align="center">
  <strong>See it. Snap it. Know it.</strong><br />
  AI-powered food recognition and nutrition tracking built for both <strong>Filipino cuisine</strong> and <strong>Western dishes</strong>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-SQLAlchemy-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/YOLOv11-Ultralytics-111F68?style=flat-square" alt="YOLOv11" />
  <img src="https://img.shields.io/badge/Gemini-Consensus_Engine-4285F4?style=flat-square&logo=googlegemini&logoColor=white" alt="Gemini" />
</p>

---

## Overview

**NutriSnap** is a full-stack food recognition and daily nutrition tracking web application. Users can capture or upload a photo of a meal, scan packaged food barcodes, or search/enter foods manually to get instant calorie, macronutrient, and ingredient breakdowns—then log meals toward personalized daily nutrition goals.

To reliably recognize local **Filipino dishes** (such as Chicken Adobo, Pork Sinigang, Beef Tapa, Pancit, Lumpia, and Sisig) alongside **Western/general foods**, NutriSnap runs a concurrent multi-model vision ensemble combined with a Gemini consensus and portion-validation layer.

---

## Key Features

- **Multi-Model Food Recognition Ensemble**
  - **Roboflow** custom-trained models for Filipino food detection.
  - **Clarifai** food-item recognition for Western and general dishes.
  - **YOLOv11** (`ultralytics`) spatial bounding-box analysis to estimate food-to-plate area ratios and baseline serving weights.
  - **Google Gemini Consensus Engine** to resolve disagreements across models, filter non-food images, determine Filipino food context, validate portion size in grams, and generate ingredient breakdowns.
- **Nutritional Breakdown & Editable Portions**
  - Resolves meal and ingredient nutrition via **Spoonacular** with automatic **Gemini** fallback estimation.
  - Interactive analysis view with adjustable portion weights and macro breakdowns (calories, protein, carbs, fat, fiber).
- **Barcode Scanning & Manual Logging**
  - Client-side barcode scanning via native browser `BarcodeDetector` with `@zxing/library` fallback and **Open Food Facts** product lookup.
  - Manual food search and quick-add entry directly from the daily log.
- **Daily Food Log, Saved Meals & Personalized Goals**
  - Onboarding wizard and profile goal settings calculating BMR/TDEE targets using the **Mifflin-St Jeor** equation (`lose`, `maintain`, `gain`, activity level, and weekly rate).
  - Daily food diary organized by **Breakfast**, **Lunch**, **Dinner**, and **Snacks** with live calorie balance and macro progress tracking.
  - Saved meals gallery with category filtering and detail modals.
- **Authentication & Security**
  - Email/password signup with **OTP email verification** and **forgot/reset password** flows.
  - **Argon2** password hashing, **JWT** authentication stored in `HttpOnly` cookies, and per-route rate limiting.
- **Interactive 3D Landing Page**
  - Three.js / React Three Fiber 3D hero scene, GSAP ScrollTrigger animations, and Lenis smooth scrolling.

---

## Recognition Pipeline

```text
Meal Photo (Camera / Upload)
   │
   ├──▶ Roboflow (Filipino Food Models) ───┐
   ├──▶ Clarifai (General / Western Food) ─┼──▶ Gemini Consensus Engine
   └──▶ YOLOv11 (Spatial Portion Ratio) ───┘      │
                                                  ├── Validates edible meal & dish label
                                                  ├── Clamps/refines portion weight (g)
                                                  └── Generates ingredient breakdown
                                                         │
                                                         ▼
                                            Spoonacular API (+ Gemini Fallback)
                                                         │
                                                         ▼
                                      Calories, Macros & Ingredients Result
```

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 19, Vite, React Router, Tailwind CSS, Three.js (`@react-three/fiber`, `@react-three/drei`), GSAP, Framer Motion, Lenis, ZXing |
| **Backend** | Python, FastAPI, Uvicorn, SQLAlchemy, Pydantic, `python-jose`, Passlib (Argon2) |
| **AI / Vision / Nutrition** | Ultralytics YOLOv11, Roboflow Inference API, Clarifai API, Google Gemini API, Spoonacular API, Open Food Facts API |
| **Database** | PostgreSQL (with automatic SQLite fallback for local development) |

---

## Project Structure

```text
NutriSnap-Food-Recognition-and-Nutrition/
├── docs/
│   └── logo.svg                     # NutriSnap SVG logo
├── backend/
│   ├── app/
│   │   ├── core/                    # Config (.env loader), JWT/Argon2 security, rate limiter
│   │   ├── models/                  # SQLAlchemy models (User, Meal, CalorieGoal)
│   │   ├── routes/                  # FastAPI routers (auth, camera, meals, calorie_goal, nutrition)
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── services/                # Ensemble orchestration, Roboflow, Clarifai, YOLO, Gemini, Spoonacular
│   │   ├── database.py              # Engine & session setup (PostgreSQL / SQLite)
│   │   └── main.py                  # FastAPI app entrypoint & startup migrations
│   ├── scripts/                     # DB creation & utility scripts
│   └── requirements.txt             # Python dependencies
└── frontend/
    ├── components/                  # Navbar, 3D hero, camera/upload modals, meal cards, onboarding
    ├── hooks/                       # Camera, upload flow, and Lenis hooks
    ├── pages/                       # Landing, Login/Signup, Daily Log, Camera, Analysis, Saved Meals, Profile
    ├── services/                    # Backend API client
    ├── utils/                       # Barcode scanner & image quality helpers
    ├── src/                         # App router, styles, assets, 3D model
    └── package.json
```

---

## Getting Started

### Prerequisites

- **Python** 3.10+
- **Node.js** 18+ and **npm**
- **PostgreSQL** (optional — defaults to local SQLite `nutrisnap.db` if `DATABASE_URL` is omitted)
- API keys for the enabled AI/nutrition providers (Gemini, Roboflow, Clarifai, Spoonacular)

### 1. Backend Setup

```bash
cd backend
python -m venv .venv

# Windows (PowerShell)
.venv\Scripts\Activate.ps1
# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
```

Create a `backend/.env` file:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/nutrisnap
JWT_SECRET_KEY=replace-with-a-strong-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
OTP_PEPPER=replace-with-otp-pepper

# Optional SMTP settings for OTP verification emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

# AI & Nutrition Providers
GEMINI_API_KEY=
ROBOFLOW_API_KEY=
ROBOFLOW_MODEL_1=
ROBOFLOW_MODEL_2=
CLARIFAI_PAT=
CLARIFAI_MODEL_URL=https://clarifai.com/clarifai/main/models/food-item-recognition
SPOONACULAR_API_KEY=
YOLO_MODEL_PATH=yolo11n.pt

ENABLE_GEMINI=true
ENABLE_ROBOFLOW=true
ENABLE_CLARIFAI=true
ENABLE_SPOONACULAR=true
```

> **Note:** On first run, `ultralytics` automatically downloads `yolo11n.pt` if it is not already present at `YOLO_MODEL_PATH`.

If using PostgreSQL, create the database first:

```bash
python scripts/create_db.py
```

Start the FastAPI server (defaults to `http://127.0.0.1:8000`):

```bash
uvicorn app.main:app --reload
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:5173` (which is configured in `ALLOWED_ORIGINS` on the backend).

---

## API Overview

| Prefix | Highlights |
| --- | --- |
| `/auth` | `POST /signup`, `POST /login`, `POST /logout`, `GET /me`, `POST /request-otp`, `POST /verify-otp`, `POST /change-password`, `POST /forgot-password/request`, `POST /forgot-password/reset` |
| `/camera` | `POST /analyze` — concurrent Roboflow + Clarifai + YOLOv11 + Gemini Consensus + Nutrition pipeline |
| `/meals` | `GET /`, `POST /`, `PUT /{meal_id}`, `DELETE /{meal_id}` |
| `/calorie-goal` | `POST /`, `GET /current`, `PATCH /manual` |
| `/nutrition` | `GET /guess`, `GET /ingredient`, `POST /batch` |

Interactive Swagger documentation is available at `http://127.0.0.1:8000/docs` when the backend is running.

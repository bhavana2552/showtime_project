## Showtime Backend (FastAPI)

This folder contains the **FastAPI** backend for the Showtime project.
It handles write operations such as creating bookings and recording payment
metadata against the same MySQL database used by the Next.js frontend.

### 1. Install dependencies

From the `ShowtimeV2` folder:

```bash
python -m venv .venv
.venv\Scripts\activate    # on Windows PowerShell
pip install -r requirements.txt
```

The root `requirements.txt` already includes FastAPI, Uvicorn, SQLAlchemy,
aiomysql and related libraries.

### 2. Configure environment

Create a `.env` file inside `ShowtimeV2/backend` (or at `ShowtimeV2/.env`)
with the same database settings used by your frontend `.env.local`:

```bash
DB_USER=Fall2025BIS698tueG4
DB_PASSWORD=warm
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=Fall2025BIS698tueG4s
```

You can adjust values to match your MySQL Workbench connection.

### 3. Run the backend

From the `ShowtimeV2/backend` directory:

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `https://showtime-project.onrender.com` and the main
router under `https://showtime-project.onrender.com/api`.

### 4. Current endpoints

- `POST /api/bookings` – create a booking, booking_seat rows and a payment
  record. This is used by the Next.js checkout screen; it **does not**
  contact any real payment gateway (data is stored only in your MySQL DB).

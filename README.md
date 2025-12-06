Showtime – Movie Ticket Booking System
======================================

## Overview

Showtime is a full‑stack movie ticket booking system built as a course final project. It allows users to:

- **Browse cities, theatres, movies, and showtimes**.
- **Select seats visually** on a seat map with availability and wheelchair indicators.
- **Complete a mock checkout** (no real payment gateway).
- **Receive a styled email confirmation** with a QR code and movie poster (if SMTP is configured).
- **View booking history** by logged‑in email.

The system is designed to demonstrate **web application architecture, database design, authentication, and basic security practices**.

---

## System Architecture

- **Frontend**: Next.js App Router (React, TypeScript)
  - Located in `showtime/`
  - Server components query MySQL directly using `mysql2/promise`.
  - Client components handle interactivity (seat selection, checkout forms, etc.).

- **Backend**: FastAPI (Python)
  - Located in `backend/`
  - Exposes a small REST API under `/api` for bookings and booking history.
  - Uses `aiomysql`/MySQL for persistence.
  - Sends HTML booking confirmation emails with QR code using `smtplib` and `qrcode`.

- **Database**: MySQL
  - Core tables: `city`, `theater`, `screen`, `tmdb_movies`, `showtime`, `seat`, `users`, `booking`, `booking_seat`, `payment`.
  - Data is seeded via SQL scripts (e.g., `showtime_local.sql`, `update.sql`) to create cities, theatres, movies, and future‑dated showtimes.

Communication:

- Frontend calls the backend at `http://localhost:8000` for:
  - `POST /api/bookings` – create booking and payment, send email.
  - `GET /api/bookings?email=...` – list booking history for a user.

Authentication:

- Users register and log in via Next.js pages under `/auth/register` and `/auth/login`.
- After login, the **user email is stored in `localStorage`** as `showtimeUserEmail` for:
  - Prefilling checkout email.
  - Automatically loading booking history.

---

## Technology Stack

- **Frontend**
  - Next.js (App Router)
  - React, TypeScript
  - Tailwind‑style utility classes (via PostCSS)
  - `mysql2/promise` for DB access from server components
  - `react-qr-code` for QR rendering in the confirmation page

- **Backend**
  - Python 3
  - FastAPI
  - Uvicorn (ASGI server)
  - MySQL with `aiomysql`
  - Pydantic / pydantic‑settings
  - `qrcode[pil]` for QR generation
  - `email-validator` for email field validation

- **Database**
  - MySQL 8+

---

## Prerequisites

Install the following before running the system:

- **Python**: 3.11 or later (3.10+ should also work)
- **Node.js**: 18+ (LTS) with npm
- **MySQL**: 8+

---

## Database Setup

1. **Create a new MySQL database**, for example:

   ```sql
   CREATE DATABASE Fall2025BIS698tueG4s CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Run the schema and seed scripts** in your MySQL client (MySQL Workbench, CLI, etc.).

   Use the scripts provided alongside this project, in this order (adjust file names/paths if yours differ):

   - `showtime_local.sql` – creates the schema (tables) and initial data.
   - `update.sql` – adds extra TMDb movies, future‑dated showtimes, and other incremental updates.

3. Verify that tables such as `city`, `theater`, `screen`, `tmdb_movies`, and `showtime` are populated.

> Note: Some SQL scripts may need safe‑update mode disabled if you are cleaning up old rows. In MySQL Workbench you can temporarily set `SET SQL_SAFE_UPDATES = 0;` before running those statements, then re‑enable it.

---

## Backend Setup (FastAPI)

From the repository root:

```bash
cd ShowtimeV2
python -m venv venv

# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file inside `backend/` with your configuration:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=<your_mysql_user>
DB_PASSWORD=<your_mysql_password>
DB_NAME=<your_database_name>

FRONTEND_ORIGIN=http://localhost:3000

# SMTP configuration for booking confirmation emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=<your_gmail_address>
SMTP_PASSWORD=<your_app_password>
MAIL_FROM=<your_gmail_address>
MAIL_FROM_NAME=Showtime
```

> If you leave SMTP settings blank or invalid, the backend will **silently skip sending emails**, so the app can still be tested without real email credentials.

Start the backend (from inside `backend/`):

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

- Open `http://localhost:8000/health` → should return `{"status": "ok"}`.

---

## Frontend Setup (Next.js)

In a separate terminal, from the repository root:

```bash
cd ShowtimeV2/showtime
npm install
npm run dev
```

Open the frontend in your browser:

- `http://localhost:3000`

Ensure the backend is running on port `8000` before testing full flows.

---

## How to Use the System

1. **Register a new user**
   - Navigate to `/auth/register` from the login screen.
   - Provide email, password, and any required details.

2. **Log in**
   - Go to `/auth/login`.
   - Enter the same email and password.
   - After successful login, you will be redirected to the Home page.

3. **Browse cities and movies**
   - On the Home page (`/home`), review highlighted upcoming showtimes and cities.
   - Click a city to go to `/movies` and view movies playing in that city.

4. **Choose a theatre and showtime**
   - From `/movies`, pick a theatre and movie to see showtimes.
   - Navigate to a specific showtime detail page and select a date and time.

5. **Select seats**
   - On the seats page, pick one or more available seats.
   - The seat map shows available, selected, booked, and wheelchair seats with a legend.
   - Click the button to proceed to checkout.

6. **Checkout**
   - On the checkout page, your **login email is prefilled and read‑only** for safety.
   - Enter mock payment details (no real payment is processed).
   - Click **Complete purchase** to create a booking.

7. **Confirmation and email**
   - After a successful booking, you are redirected to a confirmation page with:
     - Booking details
     - A QR code (containing only the booking ID)
   - If SMTP is configured, an HTML booking confirmation email with QR code and poster is sent to the user.

8. **View booking history**
   - Navigate to `/bookings`.
   - Your login email is prefilled.
   - The page automatically loads and lists your past bookings for that email.

---

## Test Accounts

You can test the system in either of two ways:

- **Option A – Register during testing (recommended)**
  - Use the Register page to create a new user with any email and password.
  - Example (you can actually create these during grading):
    - Email: `student_demo1@example.com`
    - Password: `Demo@123`

- **Option B – Pre‑seed users via SQL (optional)**
  - Insert rows into the `users` table in your SQL scripts and document them here, for example:

    ```sql
    INSERT INTO users (user_name, email, password_hash)
    VALUES ('Demo User', 'student_demo1@example.com', '<bcrypt_hash_here>');
    ```

If you pre‑seed any accounts, list the **exact email and password** combinations here for the instructor.

---

## Validations and Security Notes

- **Backend validations (FastAPI + Pydantic)**
  - Email fields use `EmailStr` and `email-validator` to ensure valid email format.
  - Booking creation requires:
    - A positive `showtime_id`.
    - A positive `total_amount` with 2 decimal places.
    - A known payment method (`"Credit Card"` or `"Debit Card"`).
  - The bookings API wraps database writes in transactions with commit/rollback.

- **Frontend validations (React)**
  - Checkout requires non‑empty name on card, card number, and at least one ticket.
  - Booked seats cannot be selected in the seat map.
  - The email used at checkout is locked to the logged‑in account email for consistency.

- **Authentication / passwords**
  - Passwords are stored as **hashes** (using bcrypt) in the database.
  - Sensitive data is not embedded in QR codes; they encode only the `bookingId`.

---

## Known Limitations

- **Mock payment only** – there is no real payment gateway integration (Stripe, etc.).
- **No cancellation/change UI** – bookings cannot be modified or cancelled through the UI.
- **No admin dashboard** – theatre/movie/showtime management is done via SQL scripts, not a web admin panel.
- **Concurrent seat booking** – there is no advanced seat‑locking logic; in rare race conditions two users could attempt to book the same seat at nearly the same time.

These limitations are acceptable for the scope of this course project but are highlighted here for completeness.

---

## How to Package and Submit

For final submission:

1. Ensure the project runs end‑to‑end without runtime errors using the steps above.
2. From the directory containing `ShowtimeV2/`, create a zip of the project:
   - Include: `ShowtimeV2/backend`, `ShowtimeV2/showtime`, top‑level `requirements.txt`, SQL scripts.
   - Exclude (recommended): `node_modules` directories and old archive folders (`Showtime_zip`, `showtime_zip2`), unless explicitly required.
3. Name the archive something like `ShowtimeV2_Final.zip` and submit it along with this README.

This README, combined with the code and SQL scripts, should give the instructor everything needed to configure, run, and evaluate the system.


## Showtime Frontend

This archive contains only the Next.js UI. Run the FastAPI backend (or provide your own datasource) separately.

### 1. Install dependencies

```bash
cd showtime
npm install
```

### 2. Configure environment

1. Copy `.env.example` → `.env.local`
   `cp .env.example .env.local` (or copy manually on Windows)

2. Edit `.env.local`. If you want the Next.js API routes to talk directly to MySQL, set:
   ```
   DB_HOST=your-mysql-host
   DB_PORT=3306
   DB_USER=username
   DB_PASSWORD=secret
   DB_DATABASE=fall2025bis698tueg4
   ```
   If you are calling the FastAPI backend instead, set
   `NEXT_PUBLIC_API_BASE=http://localhost:8000` and you can omit the DB_* values.

### 3. Start dev server

```bash
npm run dev
```

Visit `http://localhost:3000/`. The root shows the login screen; on success it redirects to `/home`.

### Notes

- `node_modules/` and `.next/` are excluded from the zip; `npm install` recreates them.
- Backend dependencies (FastAPI, SQLAlchemy, etc.) live in `Showtime_app/backend/requirements.txt` if you need the full stack.

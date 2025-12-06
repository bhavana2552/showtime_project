from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import api_router


app = FastAPI(title="Showtime Backend", version="0.1.0")

app.add_middleware(
  CORSMiddleware,
  allow_origins=[settings.frontend_origin],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
  return {"status": "ok"}


app.include_router(api_router, prefix="/api")

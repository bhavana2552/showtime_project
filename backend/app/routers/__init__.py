from fastapi import APIRouter

from . import bookings


api_router = APIRouter()

api_router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])

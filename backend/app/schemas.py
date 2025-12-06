from __future__ import annotations

from decimal import Decimal
from typing import List, Literal
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class BookingCreate(BaseModel):
  """Payload sent from the Next.js checkout screen."""

  showtime_id: int = Field(..., gt=0)
  email: EmailStr
  # Seat IDs are optional in this demo backend: if omitted, we still create
  # a booking + payment row, but skip booking_seat records.
  seat_ids: List[int] = Field(default_factory=list)
  total_amount: Decimal = Field(..., gt=0, max_digits=10, decimal_places=2)
  payment_method: Literal["Credit Card", "Debit Card"] = "Credit Card"


class BookingResponse(BaseModel):
  booking_id: int
  showtime_id: int
  seat_ids: List[int]
  total_amount: Decimal
  payment_status: Literal["Pending", "Success", "Failed"]


class BookingSummary(BaseModel):
  booking_id: int
  movie_title: str
  theater_name: str
  city: str
  state: str | None
  start_time: datetime
  seats: str | None
  total_amount: Decimal

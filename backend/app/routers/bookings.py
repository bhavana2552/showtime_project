from __future__ import annotations

from datetime import datetime
from typing import Any, List
from decimal import Decimal

import aiomysql
from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import ValidationError, EmailStr

from ..db import get_connection
from ..email import send_booking_email
from ..schemas import BookingCreate, BookingResponse, BookingSummary


router = APIRouter()


@router.post(
  "",
  response_model=BookingResponse,
  status_code=status.HTTP_201_CREATED,
)
async def create_booking(
  raw_payload: dict[str, Any] = Body(...),
  conn: aiomysql.Connection = Depends(get_connection),
) -> BookingResponse:
  """Create a booking + payment + booking_seat rows in one transaction.

  This records the booking in MySQL but does NOT talk to any real
  payment gateway. Seat availability is optimistic for now and relies
  on the front-end seat map.
  """

  # Convert the incoming JSON into our internal schema, but handle validation
  # errors ourselves so the frontend always gets a clear message instead of a
  # generic 422 from FastAPI.
  try:
    payload = BookingCreate.model_validate(raw_payload)
  except ValidationError as exc:  # pragma: no cover - defensive
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail=f"Invalid booking data: {exc.errors()}",
    ) from exc

  seats_label = ""

  async with conn.cursor() as cursor:
    try:
      await conn.begin()

      # Look up (or create) a user row by email so we can attach the booking.
      await cursor.execute(
        "SELECT user_id FROM users WHERE email = %s LIMIT 1;",
        (payload.email,),
      )
      row = await cursor.fetchone()

      user_id: int | None
      if row:
        user_id = int(row[0])
      else:
        # Create a lightweight user record with just the email;
        # name / password are managed elsewhere.
        await cursor.execute(
          "INSERT INTO users (user_name, email, phone) VALUES (%s, %s, %s);",
          (payload.email, payload.email, None),
        )
        await cursor.execute("SELECT LAST_INSERT_ID();")
        user_row = await cursor.fetchone()
        user_id = int(user_row[0])

      # Create booking row
      total_amount_dec = (
        payload.total_amount
        if isinstance(payload.total_amount, Decimal)
        else Decimal(str(payload.total_amount))
      )

      await cursor.execute(
        """
        INSERT INTO booking (user_id, showtime_id, booked_at, booking_status, total_amount)
        VALUES (%s, %s, %s, %s, %s);
        """,
        (
          user_id,
          payload.showtime_id,
          datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
          "Confirmed",
          str(total_amount_dec),
        ),
      )
      await cursor.execute("SELECT LAST_INSERT_ID();")
      booking_row = await cursor.fetchone()
      booking_id = int(booking_row[0])

      # Fetch showtime details for the confirmation email.
      await cursor.execute(
        """
        SELECT
          tm.title        AS movieTitle,
          th.theater_name AS theaterName,
          sc.screen_name  AS screenName,
          c.city_name     AS cityName,
          c.state         AS state,
          st.start_time   AS startTime,
          tm.poster_url   AS posterUrl
        FROM showtime st
        JOIN tmdb_movies tm ON tm.tmdb_id = st.tmdb_id
        JOIN screen sc      ON sc.screen_id = st.screen_id
        JOIN theater th     ON th.theater_id = sc.theater_id
        JOIN city c         ON c.city_id = th.city_id
        WHERE st.showtime_id = %s
        LIMIT 1;
        """,
        (payload.showtime_id,),
      )
      show_row = await cursor.fetchone()

      movie_title = str(show_row[0]) if show_row else f"Showtime {payload.showtime_id}"
      theater_name = str(show_row[1]) if show_row else "Unknown theatre"
      screen_name = (
        str(show_row[2]) if show_row and show_row[2] is not None else None
      )
      city_name = str(show_row[3]) if show_row else ""
      state = str(show_row[4]) if show_row and show_row[4] is not None else None
      start_time_raw = show_row[5] if show_row else None
      poster_url = str(show_row[6]) if show_row and show_row[6] is not None else None

      # Optionally insert booking_seat rows and resolve human-readable
      # seat labels (e.g. A5, H10) if we received specific seats.
      if payload.seat_ids:
        per_seat_price = total_amount_dec / len(payload.seat_ids)
        seat_values: List[tuple] = [
          (
            booking_id,
            seat_id,
            "Booked",
            False,
            str(per_seat_price),
          )
          for seat_id in payload.seat_ids
        ]
        await cursor.executemany(
          """
          INSERT INTO booking_seat (booking_id, seat_id, seat_status, is_wheelchair, price)
          VALUES (%s, %s, %s, %s, %s);
          """,
          seat_values,
        )

        placeholders = ",".join(["%s"] * len(payload.seat_ids))
        await cursor.execute(
          f"""
          SELECT seat_row, seat_number
          FROM seat
          WHERE seat_id IN ({placeholders})
          ORDER BY seat_row, seat_number;
          """,
          tuple(payload.seat_ids),
        )
        seat_rows = await cursor.fetchall()
        seats_label = ", ".join(f"{row[0]}{row[1]}" for row in seat_rows)

      # Insert payment row – purely informational for this project
      txn_ref = f"DEMO-{booking_id}"
      await cursor.execute(
        """
        INSERT INTO payment (booking_id, method, payment_status, amount, txn_ref)
        VALUES (%s, %s, %s, %s, %s);
        """,
        (
          booking_id,
          payload.payment_method,
          "Success",
           str(total_amount_dec),
          txn_ref,
        ),
      )

      await conn.commit()

    except Exception as exc:  # pragma: no cover - defensive
      await conn.rollback()
      raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Could not create booking: {exc}",
      ) from exc

  # Prepare a friendly label for the start time and seats for the email.
  if "start_time_raw" in locals() and start_time_raw is not None:
    dt = (
      start_time_raw
      if isinstance(start_time_raw, datetime)
      else datetime.fromisoformat(str(start_time_raw))
    )
    start_time_label = dt.strftime("%a, %b %d · %I:%M %p")
  else:
    start_time_label = "See app for showtime details"

  # Fire-and-forget email; errors here shouldn't affect the booking itself.
  try:
    await send_booking_email(
      to_email=payload.email,
      booking_id=booking_id,
      movie_title=movie_title,
      theater_name=theater_name,
      screen_name=screen_name,
      city=city_name,
      state=state,
      poster_url=poster_url,
      start_time_label=start_time_label,
      seats_label=seats_label,
      total_amount=str(total_amount_dec),
    )
  except Exception:
    # In this classroom project we silently ignore email failures so the
    # booking flow continues to work.
    pass

  return BookingResponse(
    booking_id=booking_id,
    showtime_id=payload.showtime_id,
    seat_ids=payload.seat_ids,
    total_amount=payload.total_amount,
    payment_status="Success",
  )


@router.get(
  "",
  response_model=List[BookingSummary],
  status_code=status.HTTP_200_OK,
)
async def list_bookings(
  email: EmailStr,
  conn: aiomysql.Connection = Depends(get_connection),
) -> List[BookingSummary]:
  """Return all bookings for a given email, most recent first."""

  async with conn.cursor() as cursor:
    await cursor.execute(
      """
      SELECT
        b.booking_id,
        tm.title        AS movieTitle,
        th.theater_name AS theaterName,
        c.city_name     AS cityName,
        c.state         AS state,
        st.start_time   AS startTime,
        b.total_amount  AS totalAmount,
        GROUP_CONCAT(
          DISTINCT CONCAT(s.seat_row, s.seat_number)
          ORDER BY s.seat_row, s.seat_number
          SEPARATOR ', '
        ) AS seatsLabel
      FROM booking b
      JOIN users u        ON u.user_id = b.user_id
      JOIN showtime st    ON st.showtime_id = b.showtime_id
      JOIN tmdb_movies tm ON tm.tmdb_id = st.tmdb_id
      JOIN screen sc      ON sc.screen_id = st.screen_id
      JOIN theater th     ON th.theater_id = sc.theater_id
      JOIN city c         ON c.city_id = th.city_id
      LEFT JOIN booking_seat bs ON bs.booking_id = b.booking_id
      LEFT JOIN seat s          ON s.seat_id = bs.seat_id
      WHERE u.email = %s
      GROUP BY
        b.booking_id,
        tm.title,
        th.theater_name,
        c.city_name,
        c.state,
        st.start_time,
        b.total_amount
      ORDER BY b.booked_at DESC;
      """,
      (email,),
    )

    rows = await cursor.fetchall()

  summaries: List[BookingSummary] = []
  for row in rows:
    (
      booking_id,
      movie_title,
      theater_name,
      city_name,
      state,
      start_time,
      total_amount,
      seats_label,
    ) = row

    summaries.append(
      BookingSummary(
        booking_id=int(booking_id),
        movie_title=str(movie_title),
        theater_name=str(theater_name),
        city=str(city_name),
        state=str(state) if state is not None else None,
        start_time=start_time,
        seats=seats_label or None,
        total_amount=Decimal(str(total_amount)),
      ),
    )

  return summaries


@router.delete(
  "/{booking_id}",
  status_code=status.HTTP_200_OK,
)
async def cancel_booking(
  booking_id: int,
  conn: aiomysql.Connection = Depends(get_connection),
) -> dict[str, Any]:
  """Hard-delete a booking and its dependent rows so seats are freed.

  To keep the database consistent with foreign keys we:
  - delete from payment for that booking_id
  - delete from booking_seat for that booking_id
  - delete the booking row itself
  """

  async with conn.cursor() as cursor:
    try:
      await conn.begin()

      # Ensure the booking exists
      await cursor.execute(
        "SELECT booking_id FROM booking WHERE booking_id = %s LIMIT 1;",
        (booking_id,),
      )
      row = await cursor.fetchone()
      if not row:
        await conn.rollback()
        raise HTTPException(
          status_code=status.HTTP_404_NOT_FOUND,
          detail=f"Booking {booking_id} not found",
        )

      # Delete child rows first to satisfy foreign-key constraints.
      await cursor.execute(
        "DELETE FROM payment WHERE booking_id = %s;",
        (booking_id,),
      )
      await cursor.execute(
        "DELETE FROM booking_seat WHERE booking_id = %s;",
        (booking_id,),
      )
      await cursor.execute(
        "DELETE FROM booking WHERE booking_id = %s;",
        (booking_id,),
      )

      await conn.commit()
    except HTTPException:
      # Already rolled back above for known error paths.
      raise
    except Exception as exc:  # pragma: no cover - defensive
      await conn.rollback()
      raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Could not cancel booking: {exc}",
      ) from exc

  return {"booking_id": booking_id, "status": "Deleted"}

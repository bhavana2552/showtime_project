from __future__ import annotations

import asyncio
import io
import json
import smtplib
from email.message import EmailMessage
from email.utils import make_msgid
from typing import Iterable

import qrcode

from .config import settings


def _generate_qr_png(data: str) -> bytes:
  """Generate a PNG image for the given QR payload."""
  qr = qrcode.QRCode(
    version=1,
    box_size=4,
    border=2,
    error_correction=qrcode.constants.ERROR_CORRECT_M,
  )
  qr.add_data(data)
  qr.make(fit=True)
  img = qr.make_image(fill_color="black", back_color="white")
  buf = io.BytesIO()
  img.save(buf, format="PNG")
  return buf.getvalue()


def _build_booking_message(
  to_email: str,
  subject: str,
  text_lines: Iterable[str],
  html_body: str,
  qr_png: bytes | None,
) -> EmailMessage:
  msg = EmailMessage()
  msg["Subject"] = subject
  msg["To"] = to_email
  sender = settings.mail_from or settings.smtp_username or to_email
  msg["From"] = (
    f"{settings.mail_from_name} <{sender}>"
    if settings.mail_from_name
    else sender
  )

  # Plain text fallback
  msg.set_content("\n".join(text_lines))

  # HTML part – `add_alternative` returns None, so we grab the last payload item
  # as the HTML part and attach the QR image there.
  if qr_png is not None:
    qr_cid = make_msgid(domain="showtime.local")
    html = html_body.format(qr_cid=qr_cid[1:-1])
    msg.add_alternative(html, subtype="html")
    html_part = msg.get_payload()[-1]
    html_part.add_related(
      qr_png,
      maintype="image",
      subtype="png",
      cid=qr_cid,
      filename="showtime-ticket-qr.png",
    )
  else:
    msg.add_alternative(html_body.format(qr_cid=""), subtype="html")

  return msg


def _send_email_sync(message: EmailMessage) -> None:
  if not settings.smtp_host or not settings.smtp_username or not settings.smtp_password:
    # Email is not configured; log and skip so the booking flow still works.
    print(
      "[email] SMTP not configured. "
      "Set SMTP_HOST, SMTP_USERNAME and SMTP_PASSWORD in backend .env to enable emails.",
    )
    return

  try:
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
      server.starttls()
      server.login(settings.smtp_username, settings.smtp_password)
      server.send_message(message)
      print(f"[email] Sent booking email to {message['To']}")
  except Exception as exc:  # pragma: no cover - defensive
    # Log SMTP errors but do not crash the app.
    print(f"[email] Failed to send email: {exc}")


async def send_booking_email(
  to_email: str,
  booking_id: int,
  movie_title: str,
  theater_name: str,
  screen_name: str | None,
  city: str,
  state: str | None,
  poster_url: str | None,
  start_time_label: str,
  seats_label: str,
  total_amount: str,
) -> None:
  """Send a booking confirmation email with a QR code in the background."""

  if not settings.smtp_host or not settings.smtp_username or not settings.smtp_password:
    print(
      "[email] Skipping booking email because SMTP is not fully configured.",
    )
    return

  location = f"{theater_name} · {city}"
  if state:
    location += f", {state}"

  screen_label = screen_name or "Screen"

  subject = f"Your Showtime booking #{booking_id} – {movie_title}"

  text_lines = [
    f"Thank you for booking with Showtime.",
    "",
    f"Booking ID: {booking_id}",
    f"Movie: {movie_title}",
    f"Theatre: {location}",
    f"Screen: {screen_label}",
    f"Showtime: {start_time_label}",
    f"Seats: {seats_label or 'N/A'}",
    f"Total paid: ${total_amount}",
    "",
    "Please present this email or the QR code in the app when you arrive at the theatre.",
  ]

  # Encode booking details as JSON so scanners show text but do not treat it
  # as a maps URL or navigation intent.
  qr_payload = json.dumps(
    {
      "bookingId": booking_id,
      "movie": movie_title,
      "theatre": theater_name,
      "screen": screen_label,
      "city": city,
      "state": state,
      "time": start_time_label,
      "seats": seats_label or None,
    },
  )
  qr_png = _generate_qr_png(qr_payload)

  poster_block = ""
  if poster_url:
    poster_block = f"""
        <div style="margin-bottom:16px;text-align:center;">
          <img
            src="{poster_url}"
            alt="{movie_title}"
            style="
              display:block;
              width:100%;
              max-width:220px;
              height:auto;
              margin:0 auto;
              border-radius:18px;
              border:1px solid #2b345a;
            "
          />
        </div>
    """

  html_body = f"""
  <html>
    <body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background-color:#19183B;color:#E7F2EF;">
      <div style="max-width:640px;margin:0 auto;">
        <p style="font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#A1C2BD;margin:0 0 8px;">
          Booking confirmed
        </p>
        <h1 style="font-size:22px;font-weight:600;margin:0 0 4px;">You&apos;re all set for {movie_title}</h1>
        <p style="font-size:13px;color:#708993;margin:0 0 16px;">
          {location} · {start_time_label}
        </p>

        {poster_block}

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-radius:18px;border:1px solid #2b345a;background:#19183B;margin-bottom:20px;">
          <tr>
            <td style="padding:16px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:13px;">
                <tr>
                  <td style="color:#A1C2BD;width:120px;">Booking ID</td>
                  <td style="color:#E7F2EF;font-weight:600;">{booking_id}</td>
                </tr>
                <tr>
                  <td style="color:#A1C2BD;width:120px;">Screen</td>
                  <td style="color:#E7F2EF;font-weight:600;">{screen_label}</td>
                </tr>
                <tr>
                  <td style="color:#A1C2BD;width:120px;">Seats</td>
                  <td style="color:#E7F2EF;font-weight:600;">{seats_label or 'N/A'}</td>
                </tr>
                <tr>
                  <td style="color:#A1C2BD;width:120px;">Total paid</td>
                  <td style="color:#E7F2EF;font-weight:600;">${total_amount}</td>
                </tr>
                <tr>
                  <td style="color:#A1C2BD;width:120px;">Tickets sent to</td>
                  <td style="color:#E7F2EF;font-weight:600;">{to_email}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-radius:24px;border:1px solid #2b345a;background:#141432;text-align:center;">
          <tr>
            <td style="padding:20px 24px;">
              <div style="display:inline-block;padding:16px;border-radius:20px;background:radial-gradient(circle at top,#A1C2BD33,#19183B);">
                <img src="cid:{{qr_cid}}" alt="Showtime QR code" width="160" height="160" style="display:block;border-radius:12px;" />
              </div>
              <p style="margin-top:12px;font-size:11px;color:#708993;max-width:360px;margin-left:auto;margin-right:auto;">
                This QR code encodes your booking reference so it can be scanned quickly at the theatre entrance.
              </p>
            </td>
          </tr>
        </table>
      </div>
    </body>
  </html>
  """

  message = _build_booking_message(
    to_email=to_email,
    subject=subject,
    text_lines=text_lines,
    html_body=html_body,
    qr_png=qr_png,
  )
  await asyncio.to_thread(_send_email_sync, message)

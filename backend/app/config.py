from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  """Configuration for the Showtime backend.

  We re-use the same DB_* variables as the Next.js frontend. This class
  reads (in order of preference):
  - DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_DATABASE
  - and DB_NAME as a fallback alias for DB_DATABASE.
  """

  model_config = SettingsConfigDict(
    env_file=".env",
    env_file_encoding="utf-8",
  )

  db_host: str = Field(default="127.0.0.1", alias="DB_HOST")
  db_port: int = Field(default=3306, alias="DB_PORT")
  db_user: str = Field(alias="DB_USER")
  db_password: str = Field(alias="DB_PASSWORD")
  # Prefer DB_DATABASE but also accept DB_NAME
  db_database: str = Field(alias="DB_DATABASE")
  db_name: str | None = Field(default=None, alias="DB_NAME")

  frontend_origin: str = "http://localhost:3000"

  # Outgoing email (optional). If these are not set, the backend will skip
  # sending confirmation emails.
  smtp_host: str | None = Field(default=None, alias="SMTP_HOST")
  smtp_port: int = Field(default=587, alias="SMTP_PORT")
  smtp_username: str | None = Field(default=None, alias="SMTP_USERNAME")
  smtp_password: str | None = Field(default=None, alias="SMTP_PASSWORD")
  mail_from: str | None = Field(default=None, alias="MAIL_FROM")
  mail_from_name: str = Field(default="Showtime Bookings", alias="MAIL_FROM_NAME")

  def effective_database(self) -> str:
    """Return whichever DB name is set (DB_DATABASE or DB_NAME)."""
    return self.db_database or (self.db_name or "")


settings = Settings()

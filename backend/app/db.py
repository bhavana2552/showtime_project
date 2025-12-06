from __future__ import annotations

import aiomysql

from .config import settings


_pool: aiomysql.Pool | None = None


async def get_pool() -> aiomysql.Pool:
  """Create (or return) a global aiomysql connection pool."""
  global _pool
  if _pool is None:
    _pool = await aiomysql.create_pool(
      host=settings.db_host,
      port=settings.db_port,
      user=settings.db_user,
      password=settings.db_password,
      db=settings.effective_database(),
      autocommit=False,
      minsize=1,
      maxsize=10,
      charset="utf8mb4",
    )
  return _pool


async def get_connection():
  """FastAPI dependency that yields a single DB connection per request."""
  pool = await get_pool()
  async with pool.acquire() as conn:
    try:
      yield conn
    finally:
      # Connection is returned to the pool automatically by context manager
      ...

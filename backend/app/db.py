import asyncio

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import settings

# Sync pool run in worker threads: psycopg's async mode does not work on the
# Windows default event loop, and this behaves the same on every OS.
pool = ConnectionPool(
    settings.database_url,
    open=False,
    kwargs={"row_factory": dict_row},
)


def _query(sql: str, params: tuple | dict, one: bool):
    with pool.connection() as conn:
        cur = conn.execute(sql, params)
        return cur.fetchone() if one else cur.fetchall()


async def fetch_all(sql: str, params: tuple | dict = ()) -> list[dict]:
    return await asyncio.to_thread(_query, sql, params, False)


async def fetch_one(sql: str, params: tuple | dict = ()) -> dict | None:
    return await asyncio.to_thread(_query, sql, params, True)

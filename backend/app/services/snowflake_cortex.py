"""OPTIONAL stretch (docs/PLAN.md phase 8). Not wired into any router yet.

Intended role, distinct from Gemini: grounded Q&A over council minutes / CIP documents
("why was the plaza rebuild rejected?"), with retrieved passages passed in as context.
"""
import httpx

from ..config import settings


async def complete(question: str, context: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{settings.snowflake_account_url}/api/v2/cortex/inference:complete",
            headers={"Authorization": f"Bearer {settings.snowflake_pat}", "Accept": "application/json"},
            json={
                "model": settings.snowflake_model,
                "stream": False,
                "messages": [
                    {"role": "system", "content": "Answer only from the provided town documents."},
                    {"role": "user", "content": f"Documents:\n{context}\n\nQuestion: {question}"},
                ],
            },
        )
        resp.raise_for_status()
        # TODO: confirm response shape against the Cortex REST docs for the chosen model.
        return resp.json()["choices"][0]["message"]["content"]

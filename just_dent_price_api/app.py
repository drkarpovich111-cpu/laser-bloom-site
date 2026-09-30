import os
import time
from collections import OrderedDict
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

CLINICCARDS_API_KEY = os.getenv("CLINICCARDS_API_KEY", "").strip()
CLINICCARDS_API_BASE = "https://cliniccards.com/api"
CACHE_TTL_SECONDS = 300

app = FastAPI(title="JUST DENT Price API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://just-dent-zakarpattia-2026.onrender.com",
        "https://just-dent-clinic.onrender.com",
        "https://just-dent-uzhhorod.onrender.com",
        "https://just-dent-site.onrender.com",
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

_cache: dict[str, Any] = {"expires": 0.0, "payload": None}


def first_value(row: dict[str, Any], keys: tuple[str, ...], default: Any = "") -> Any:
    for key in keys:
        value = row.get(key)
        if value not in (None, ""):
            return value
    return default


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").split()).strip()


def normalize_price(value: Any) -> Any:
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        return value
    text = str(value).strip().replace("\u00a0", " ")
    compact = text.replace(" ", "").replace(",", ".")
    try:
        number = float(compact)
        return int(number) if number.is_integer() else number
    except ValueError:
        return text


def normalize_prices(rows: list[Any]) -> dict[str, Any]:
    groups: OrderedDict[str, dict[str, Any]] = OrderedDict()
    item_count = 0

    for index, raw in enumerate(rows):
        if not isinstance(raw, dict):
            continue

        group_id = clean_text(first_value(raw, ("group_id", "price_group_id", "category_id"), f"group-{index}"))
        group_name = clean_text(first_value(raw, ("group_name", "price_group_name", "category_name", "category"), "Інше")) or "Інше"
        item_id = clean_text(first_value(raw, ("price_item_id", "price_id", "item_id", "id"), f"item-{index}"))
        item_name = clean_text(first_value(raw, ("price_item_name", "item_name", "price_name", "name", "title")))
        if not item_name:
            continue

        price = normalize_price(first_value(raw, ("price", "cost", "amount", "value", "price_value"), None))
        price_from = normalize_price(first_value(raw, ("price_from", "min_price", "minimum_price"), None))
        price_to = normalize_price(first_value(raw, ("price_to", "max_price", "maximum_price"), None))
        unit = clean_text(first_value(raw, ("unit", "unit_name", "measure")))
        currency = clean_text(first_value(raw, ("currency", "currency_name", "currency_code"), "UAH")) or "UAH"

        group = groups.setdefault(
            group_id,
            {"id": group_id, "name": group_name, "items": []},
        )
        group["items"].append(
            {
                "id": item_id,
                "name": item_name,
                "price": price,
                "price_from": price_from,
                "price_to": price_to,
                "unit": unit,
                "currency": currency,
            }
        )
        item_count += 1

    return {"groups": list(groups.values()), "count": item_count}


async def cliniccards_prices() -> list[Any]:
    if not CLINICCARDS_API_KEY:
        raise HTTPException(status_code=503, detail="Cliniccards API key is not configured")

    headers = {
        "Token": CLINICCARDS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(f"{CLINICCARDS_API_BASE}/prices", headers=headers)

    try:
        body = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Cliniccards returned an invalid response") from exc

    if response.status_code >= 400 or (isinstance(body, dict) and body.get("result") == "fail"):
        message = body.get("error") if isinstance(body, dict) else None
        raise HTTPException(status_code=502, detail=message or "Cliniccards request failed")

    data = body.get("data", body) if isinstance(body, dict) else body
    if not isinstance(data, list):
        raise HTTPException(status_code=502, detail="Unexpected Cliniccards price-list format")
    return data


@app.get("/")
async def health():
    return {
        "ok": True,
        "service": "JUST DENT Price API",
        "cliniccards_configured": bool(CLINICCARDS_API_KEY),
    }


@app.get("/prices")
async def prices():
    now = time.monotonic()
    if _cache["payload"] is not None and now < float(_cache["expires"]):
        return _cache["payload"]

    rows = await cliniccards_prices()
    normalized = normalize_prices(rows)
    payload = {
        "ok": True,
        "source": "Cliniccards",
        "updated_at": int(time.time()),
        **normalized,
    }
    _cache["payload"] = payload
    _cache["expires"] = now + CACHE_TTL_SECONDS
    return payload

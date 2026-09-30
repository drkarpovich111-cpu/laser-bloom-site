import os
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple
from zoneinfo import ZoneInfo

import httpx

API_BASE = "https://cliniccards.com/api"
KYIV_TZ = ZoneInfo("Europe/Kyiv")

# Accept several sensible names because the key may already have been saved in Render
# by a previous setup flow. Never print the secret value.
KNOWN_KEY_NAMES = (
    "CLINICCARDS_API_KEY",
    "CLINICCARDS_API_TOKEN",
    "CLINICCARDS_TOKEN",
    "CLINICCARDS_KEY",
    "CC_API_KEY",
    "CC_TOKEN",
)


class ClinicCardsError(RuntimeError):
    pass


def _discover_key() -> Tuple[str, Optional[str]]:
    for name in KNOWN_KEY_NAMES:
        value = os.getenv(name, "").strip()
        if value:
            return value, name

    # Also accept a custom variable name if it clearly refers to ClinicCards.
    for name, value in os.environ.items():
        upper = name.upper()
        if "CLINIC" in upper and "CARD" in upper and any(x in upper for x in ("KEY", "TOKEN", "API")):
            value = (value or "").strip()
            if value:
                return value, name
    return "", None


def configured() -> bool:
    key, _ = _discover_key()
    return bool(key)


def configured_env_name() -> Optional[str]:
    _, name = _discover_key()
    return name


def _unwrap_response(response: httpx.Response) -> Any:
    try:
        payload = response.json()
    except Exception as exc:
        raise ClinicCardsError("ClinicCards returned a non-JSON response") from exc

    if not isinstance(payload, dict):
        if response.status_code >= 400:
            raise ClinicCardsError(f"ClinicCards HTTP {response.status_code}")
        return payload

    if response.status_code >= 400 or str(payload.get("result", "")).lower() == "fail":
        error = payload.get("error") or f"ClinicCards HTTP {response.status_code}"
        raise ClinicCardsError(str(error))

    return payload.get("data", payload)


def request_sync(method: str, path: str, *, params: Optional[dict] = None, body: Optional[dict] = None) -> Any:
    key, _ = _discover_key()
    if not key:
        raise ClinicCardsError("ClinicCards API key is not configured")

    url = f"{API_BASE}/{path.lstrip('/')}"
    headers = {"Token": key, "Content-Type": "application/json"}
    with httpx.Client(timeout=15.0) as client:
        response = client.request(method.upper(), url, params=params, json=body, headers=headers)
    return _unwrap_response(response)


async def request(method: str, path: str, *, params: Optional[dict] = None, body: Optional[dict] = None) -> Any:
    key, _ = _discover_key()
    if not key:
        raise ClinicCardsError("ClinicCards API key is not configured")

    url = f"{API_BASE}/{path.lstrip('/')}"
    headers = {"Token": key, "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.request(method.upper(), url, params=params, json=body, headers=headers)
    return _unwrap_response(response)


async def get_staff() -> Any:
    return await request("GET", "staff")


async def get_booking_items() -> Any:
    return await request("GET", "booking-items")


async def get_booking_settings() -> Any:
    return await request("GET", "booking-settings")


async def get_cabinets() -> Any:
    return await request("GET", "cabinets")


async def get_schedule_shifts(date_from: str, date_to: str) -> Any:
    return await request("GET", "schedule-shifts", params={"from": date_from, "to": date_to})


async def get_visits(date_from: str, date_to: str) -> Any:
    return await request("GET", "visits", params={"from": date_from, "to": date_to})


async def get_schedule_spaces(date_from: str, date_to: str) -> Any:
    return await request("GET", "schedule-spaces", params={"from": date_from, "to": date_to})


def _count(value: Any) -> int:
    if isinstance(value, list):
        return len(value)
    if isinstance(value, dict):
        return len(value)
    return 0


def _safe_staff(staff: Any) -> list:
    out = []
    for row in staff if isinstance(staff, list) else []:
        if not isinstance(row, dict):
            continue
        out.append({
            "doctor_id": row.get("doctor_id"),
            "firstname": row.get("firstname"),
            "lastname": row.get("lastname"),
            "role": row.get("role"),
        })
    return out[:20]


def _safe_cabinets(cabinets: Any) -> list:
    out = []
    for row in cabinets if isinstance(cabinets, list) else []:
        if not isinstance(row, dict):
            continue
        out.append({"cabinet_id": row.get("cabinet_id"), "name": row.get("name")})
    return out[:30]


def _safe_booking_items(items: Any) -> list:
    out = []
    for row in items if isinstance(items, list) else []:
        if not isinstance(row, dict):
            continue
        services = []
        for item in row.get("booking_items", []) if isinstance(row.get("booking_items"), list) else []:
            if not isinstance(item, dict):
                continue
            services.append({
                "price_item_id": item.get("price_item_id"),
                "price_item_name": item.get("price_item_name"),
                "execution_time": item.get("execution_time"),
            })
        out.append({
            "specialist_id": row.get("specialist_id"),
            "specialist_name": row.get("specialist_name"),
            "services": services[:20],
        })
    return out[:20]


def _safe_shifts(shifts: Any) -> list:
    out = []
    for row in shifts if isinstance(shifts, list) else []:
        if not isinstance(row, dict):
            continue
        out.append({
            "doctor_id": row.get("doctor_id"),
            "cabinet_id": row.get("schedule_cabinets_id"),
            "shift_start": row.get("shift_start"),
            "shift_end": row.get("shift_end"),
        })
    return out[:50]


def safe_probe_sync() -> Dict[str, Any]:
    """Check ClinicCards without exposing the secret or any patient data."""
    key, env_name = _discover_key()
    summary: Dict[str, Any] = {
        "configured": bool(key),
        "env_name": env_name,
        "reachable": False,
    }
    if not key:
        return summary

    try:
        today = datetime.now(KYIV_TZ).date()
        date_from = today.isoformat()
        date_to = (today + timedelta(days=14)).isoformat()

        staff = request_sync("GET", "staff")
        items = request_sync("GET", "booking-items")
        cabinets = request_sync("GET", "cabinets")
        settings = request_sync("GET", "booking-settings")
        shifts = request_sync("GET", "schedule-shifts", params={"from": date_from, "to": date_to})

        summary.update(
            {
                "reachable": True,
                "staff_count": _count(staff),
                "booking_items_count": _count(items),
                "cabinets_count": _count(cabinets),
                "booking_interval": settings.get("booking_interval") if isinstance(settings, dict) else None,
                "staff": _safe_staff(staff),
                "cabinets": _safe_cabinets(cabinets),
                "booking_items": _safe_booking_items(items),
                "schedule_range": [date_from, date_to],
                "shift_count": _count(shifts),
                "shifts": _safe_shifts(shifts),
            }
        )
    except Exception as exc:
        # Error text may be useful, but never includes our token because the token is only in a header.
        summary["error"] = f"{type(exc).__name__}: {str(exc)[:200]}"
    return summary

import os
from typing import Any, Dict, Optional, Tuple

import httpx

API_BASE = "https://cliniccards.com/api"

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


def safe_probe_sync() -> Dict[str, Any]:
    """Check that ClinicCards is reachable without logging secrets or patient data."""
    key, env_name = _discover_key()
    summary: Dict[str, Any] = {
        "configured": bool(key),
        "env_name": env_name,
        "reachable": False,
    }
    if not key:
        return summary

    try:
        staff = request_sync("GET", "staff")
        items = request_sync("GET", "booking-items")
        cabinets = request_sync("GET", "cabinets")
        settings = request_sync("GET", "booking-settings")
        summary.update(
            {
                "reachable": True,
                "staff_count": _count(staff),
                "booking_items_count": _count(items),
                "cabinets_count": _count(cabinets),
                "booking_settings_keys": sorted(list(settings.keys()))[:20] if isinstance(settings, dict) else [],
                "cabinet_field_names": sorted(list(cabinets[0].keys()))[:20] if isinstance(cabinets, list) and cabinets and isinstance(cabinets[0], dict) else [],
                "staff_field_names": sorted(list(staff[0].keys()))[:20] if isinstance(staff, list) and staff and isinstance(staff[0], dict) else [],
            }
        )
    except Exception as exc:
        # Error text may be useful, but never includes our token because the token is only in a header.
        summary["error"] = f"{type(exc).__name__}: {str(exc)[:200]}"
    return summary

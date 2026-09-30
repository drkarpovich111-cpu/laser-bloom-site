from datetime import datetime, timedelta, time
from typing import Any, Dict, List
from zoneinfo import ZoneInfo

from .cliniccards import get_visits, ClinicCardsError

KYIV_TZ = ZoneInfo("Europe/Kyiv")
WORKDAY_START = time(9, 0)
WORKDAY_END = time(19, 0)
DEFAULT_DURATION_MIN = 30
LOOKAHEAD_DAYS = 14
MAX_SLOTS = 8

# Mapping follows the current Just Dent routing rules for primary patients.
# We use ClinicCards cabinet IDs because the API currently returns cabinet-level
# occupancy reliably while schedule-shifts is empty for this account.
LOCATIONS: Dict[str, Dict[str, Any]] = {
    "Цегольнянська 6В": {
        "city": "Ужгород",
        "live": True,
        "cabinets": {
            "1692": "Ростислав Карпович",
            "1717": "Вячеслав Бенца",
        },
    },
    "Заньковецької 38": {
        "city": "Ужгород",
        "live": True,
        "cabinets": {
            "4679": "Володимир Комарницький",
            "16158": "Андрій Русин",
        },
    },
    "Річка 137А": {
        "city": "Міжгір’я",
        # ClinicCards currently does not expose a branch/location field for these
        # visits, so we do not invent live availability for Rічка.
        "live": False,
        "cabinets": {},
    },
}

CANCELLED_STATUSES = {"CANCELLED", "CANCELED", "DELETED", "REMOVED"}


def _parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    text = str(value).strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
        try:
            dt = datetime.strptime(text, fmt)
            return dt.replace(tzinfo=KYIV_TZ)
        except ValueError:
            pass
    try:
        dt = datetime.fromisoformat(text)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=KYIV_TZ)
        return dt.astimezone(KYIV_TZ)
    except ValueError:
        return None


def _busy_for_cabinet(visits: Any, cabinet_id: str) -> List[tuple[datetime, datetime]]:
    busy: List[tuple[datetime, datetime]] = []
    if not isinstance(visits, list):
        return busy

    for row in visits:
        if not isinstance(row, dict):
            continue
        row_cabinet = str(row.get("cabinet_id") or row.get("schedule_cabinets_id") or "")
        if row_cabinet != str(cabinet_id):
            continue
        status = str(row.get("status") or "").upper()
        if status in CANCELLED_STATUSES:
            continue
        start = _parse_dt(row.get("visit_start"))
        end = _parse_dt(row.get("visit_end"))
        if start and end and end > start:
            busy.append((start, end))
    return busy


def _overlaps(start: datetime, end: datetime, busy: List[tuple[datetime, datetime]]) -> bool:
    return any(start < busy_end and end > busy_start for busy_start, busy_end in busy)


def _day_label(dt: datetime, lang: str) -> str:
    today = datetime.now(KYIV_TZ).date()
    if dt.date() == today:
        return {"uk": "Сьогодні", "sk": "Dnes", "en": "Today"}.get(lang, "Сьогодні")
    if dt.date() == today + timedelta(days=1):
        return {"uk": "Завтра", "sk": "Zajtra", "en": "Tomorrow"}.get(lang, "Завтра")

    weekdays = {
        "uk": ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"],
        "sk": ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"],
        "en": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    }
    return f"{weekdays.get(lang, weekdays['uk'])[dt.weekday()]} {dt.strftime('%d.%m')}"


async def get_live_slots(location: str, lang: str = "uk", duration_min: int = DEFAULT_DURATION_MIN) -> List[Dict[str, str]]:
    """Return actual free ClinicCards gaps for a mapped Just Dent location.

    Both start and end are restricted to :00 or :30. The default primary
    consultation is 30 minutes. A 60-minute treatment can use the same engine
    and is only returned when the whole interval is continuously free.
    """
    cfg = LOCATIONS.get(location)
    if not cfg or not cfg.get("live"):
        return []

    # The clinic rule requires both boundaries to be on :00/:30.
    if duration_min <= 0 or duration_min % 30 != 0:
        duration_min = DEFAULT_DURATION_MIN

    now = datetime.now(KYIV_TZ)
    date_from = now.date().isoformat()
    date_to = (now.date() + timedelta(days=LOOKAHEAD_DAYS)).isoformat()
    visits = await get_visits(date_from, date_to)

    candidates: List[Dict[str, str]] = []
    for cabinet_id, doctor_name in cfg["cabinets"].items():
        busy = _busy_for_cabinet(visits, cabinet_id)

        for day_offset in range(LOOKAHEAD_DAYS + 1):
            date = now.date() + timedelta(days=day_offset)
            cursor = datetime.combine(date, WORKDAY_START, tzinfo=KYIV_TZ)
            day_end = datetime.combine(date, WORKDAY_END, tzinfo=KYIV_TZ)

            while cursor + timedelta(minutes=duration_min) <= day_end:
                end = cursor + timedelta(minutes=duration_min)

                # Never offer a slot in the past or starting too close to now.
                if cursor > now + timedelta(minutes=15) and not _overlaps(cursor, end, busy):
                    candidates.append({
                        "location": location,
                        "cabinet_id": cabinet_id,
                        "doctor": doctor_name,
                        "date": cursor.strftime("%Y-%m-%d"),
                        "time_start": cursor.strftime("%H:%M"),
                        "time_end": end.strftime("%H:%M"),
                        "label": f"{_day_label(cursor, lang)} {cursor.strftime('%H:%M')} — {doctor_name}",
                    })
                cursor += timedelta(minutes=30)

    candidates.sort(key=lambda x: (x["date"], x["time_start"], x["doctor"]))
    return candidates[:MAX_SLOTS]


async def get_patient_slots(location: str, lang: str = "uk", duration_min: int = DEFAULT_DURATION_MIN) -> Dict[str, Any]:
    cfg = LOCATIONS.get(location)
    if not cfg:
        return {"source": "unknown", "slots": []}
    if not cfg.get("live"):
        return {"source": "admin", "slots": []}
    try:
        slots = await get_live_slots(location, lang, duration_min)
        return {"source": "cliniccards", "slots": slots}
    except ClinicCardsError as exc:
        return {"source": "error", "slots": [], "error": str(exc)[:160]}
    except Exception as exc:
        return {"source": "error", "slots": [], "error": f"{type(exc).__name__}: {str(exc)[:120]}"}

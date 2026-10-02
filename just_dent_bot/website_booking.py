"""Website callback requests, delivered only to the clinic owner."""
import asyncio
import hashlib
import json
import re
import time
from collections import OrderedDict
from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

SITE_ORIGIN = "https://just-dent-zakarpattia-2026.onrender.com"
OWNER_CHAT_ID = 538006747  # Owner explicitly selected for ALL website requests.
CLINICS = {
    "tseholnianska": "Ужгород — Цегольнянська 6В",
    "zankovetskoi": "Ужгород — Заньковецької 38",
    "richka": "Річка — 137А",
}


def validate(data):
    if not isinstance(data, dict):
        raise ValueError("Некоректна заявка.")
    if data.get("website"):
        raise ValueError("Не вдалося надіслати форму.")
    def text(key, maximum):
        value = data.get(key, "")
        if not isinstance(value, str) or len(value) > maximum:
            raise ValueError("Перевірте дані форми.")
        return " ".join(value.split())
    request_id = str(UUID(text("request_id", 40)))
    name = text("name", 100)
    if len(name) < 2:
        raise ValueError("Вкажіть ім’я.")
    raw_phone = text("phone", 40)
    if not re.fullmatch(r"\+?[0-9 ()\-]+", raw_phone):
        raise ValueError("Перевірте номер телефону.")
    phone = re.sub(r"\D", "", raw_phone)
    if not 10 <= len(phone) <= 15:
        raise ValueError("Вкажіть повний номер телефону.")
    clinic = text("clinic", 30)
    if clinic not in CLINICS:
        raise ValueError("Оберіть клініку.")
    date, slot = text("date", 10), text("time", 5)
    if date:
        chosen = datetime.strptime(date, "%Y-%m-%d").date()
        if chosen < datetime.now(ZoneInfo("Europe/Kyiv")).date():
            raise ValueError("Оберіть сьогоднішню або майбутню дату.")
    if slot:
        if not date or not re.fullmatch(r"(?:09|1[0-8]):(?:00|30)", slot):
            raise ValueError("Оберіть дату та час із запропонованого списку.")
    return {"request_id": request_id, "name": name, "phone": ("+" if raw_phone.startswith("+") else "") + phone, "clinic": clinic, "date": date, "time": slot}


def register(app, telegram, configured):
    app.add_middleware(CORSMiddleware, allow_origins=[SITE_ORIGIN], allow_methods=["POST", "GET"], allow_headers=["Content-Type"], allow_credentials=False)
    receipts, attempts = OrderedDict(), OrderedDict()
    lock = asyncio.Lock()

    @app.get("/website-booking/health")
    async def website_health():
        return {"ok": bool(configured()), "service": "website-booking", "version": 1}

    @app.post("/website-booking")
    async def website_booking(request: Request):
        if request.headers.get("origin") != SITE_ORIGIN:
            raise HTTPException(403, "Недозволене джерело заявки.")
        if request.headers.get("content-type", "").split(";")[0].strip() != "application/json":
            raise HTTPException(415, "Потрібен формат JSON.")
        raw = bytearray()
        async for chunk in request.stream():
            raw.extend(chunk)
            if len(raw) > 4096:
                raise HTTPException(413, "Заявка завелика.")
        try:
            data = validate(json.loads(raw))
        except (ValueError, TypeError, UnicodeError):
            raise HTTPException(422, "Перевірте ім’я, телефон, клініку та бажану дату/час.") from None
        if not configured():
            raise HTTPException(503, "Зараз форму недоступно. Напишіть нам у Telegram.")
        rid = data["request_id"]
        digest = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
        phone_key = hashlib.sha256(data["phone"].lstrip("+").encode()).hexdigest()
        # Process-local anti-spam and retry protection; bounded and contains no contact details.
        now = time.monotonic()
        async with lock:
            for cache, ttl in ((receipts, 3600), (attempts, 600)):
                while cache and (len(cache) > 2000 or next(iter(cache.values()))[0] < now - ttl):
                    cache.popitem(last=False)
            previous = receipts.get(rid)
            if previous:
                if previous[1] != digest:
                    raise HTTPException(409, "Цей номер заявки вже використано з іншими даними.")
                if previous[2] == "sent":
                    return {"ok": True, "request_id": rid}
                raise HTTPException(409, "Заявка вже надсилається або її статус перевіряється. Не дублюйте її; зв’яжіться з нами у Telegram.")
            recent = attempts.get(phone_key, (now, 0))
            if recent[1] >= 3 and now - recent[0] < 600:
                raise HTTPException(429, "Забагато спроб. Спробуйте пізніше або напишіть у Telegram.")
            if sum(1 for t, _, _ in receipts.values() if t > now - 60) >= 30:
                raise HTTPException(429, "Забагато звернень. Спробуйте за хвилину.")
            attempts[phone_key] = (now, recent[1] + 1)
            attempts.move_to_end(phone_key)
            receipts[rid] = (now, digest, "pending")
        desired = (data["date"] + (" о " + data["time"] if data["time"] else ", час узгодити")) if data["date"] else "узгодити телефоном"
        text = (
            "📩 НОВА ЗАЯВКА ІЗ САЙТУ • JUST DENT\n\n"
            f"👤 {data['name']}\n📞 {data['phone']}\n"
            f"📍 {CLINICS[data['clinic']]}\n🕒 Бажано: {desired}\n\n"
            "Це заявка, а не підтверджений запис. Зв’яжіться з пацієнтом для узгодження.\n"
            f"Номер заявки: {rid}"
        )
        try:
            result = await telegram("sendMessage", {"chat_id": OWNER_CHAT_ID, "text": text})
            if not isinstance(result, dict) or result.get("ok") is not True:
                raise RuntimeError("Delivery not confirmed")
        except Exception:
            # No token, patient data or upstream exception is written to logs.
            receipts[rid] = (now, digest, "uncertain")
            raise HTTPException(502, "Не вдалося підтвердити доставку. Не надсилайте повторно — напишіть нам у Telegram.") from None
        receipts[rid] = (now, digest, "sent")
        return {"ok": True, "request_id": rid}

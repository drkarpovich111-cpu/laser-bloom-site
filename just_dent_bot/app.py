import os
import secrets
from typing import Dict, Any

import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import PlainTextResponse

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
PUBLIC_URL = os.getenv("PUBLIC_URL", "").rstrip("/")
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID", "")

TG_API = f"https://api.telegram.org/bot{BOT_TOKEN}" if BOT_TOKEN else ""
app = FastAPI(title="Just Dent Telegram")
STATE: Dict[int, Dict[str, Any]] = {}

TEST_SLOTS = {
    "Ужгород": ["Сьогодні 18:30", "Завтра 10:20", "Завтра 15:40", "Завтра 17:10"],
    "Міжгір’я": ["П’ятниця 11:00", "П’ятниця 14:30", "Субота 10:00"],
}


def st(chat_id: int):
    return STATE.setdefault(chat_id, {"step": "start", "city": None, "slot": None, "name": None, "phone": None, "concern": ""})


async def tg(method: str, payload: dict):
    if not BOT_TOKEN:
        raise RuntimeError("BOT_TOKEN is not configured")
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(f"{TG_API}/{method}", json=payload)
        r.raise_for_status()
        return r.json()


def kb(rows):
    return {"inline_keyboard": [[{"text": t, "callback_data": d} for t, d in row] for row in rows]}


async def send(chat_id: int, text: str, keyboard=None):
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    if keyboard:
        payload["reply_markup"] = keyboard
    await tg("sendMessage", payload)


def lower(s: str) -> str:
    return (s or "").lower().replace("ё", "е")


def is_emergency(text: str) -> bool:
    s = lower(text)
    red = ["не можу дихати", "важко дихати", "не можу ковтати", "важко ковтати", "набряк шиї", "сильно кровить", "кров не зупиняється", "38.5", "38,5", "39", "втрачаю свідомість"]
    return any(x in s for x in red)


def is_prosth(text: str) -> bool:
    s = lower(text)
    return any(x in s for x in ["корон", "вінір", "відкол", "передній зуб", "ортопед", "протез"])


def is_ortho(text: str) -> bool:
    s = lower(text)
    return any(x in s for x in ["брекет", "прикус", "ортодонт", "елайнер"])


def is_booking(text: str) -> bool:
    s = lower(text)
    return any(x in s for x in ["запис", "прийом", "вільн", "хочу до", "можна завтра", "лікар"])


def valid_phone(text: str) -> bool:
    digits = "".join(ch for ch in text if ch.isdigit())
    return (digits.startswith("38") and len(digits) == 12) or (digits.startswith("0") and len(digits) == 10)


async def start_flow(chat_id: int):
    STATE[chat_id] = {"step": "start", "city": None, "slot": None, "name": None, "phone": None, "concern": ""}
    await send(chat_id, "Вітаю 👋\nЯ онлайн-адміністратор <b>Just Dent</b>.\n\nДопоможу записатися, підібрати напрям лікування або зорієнтувати по послугах.", kb([
        [("🦷 Записатися", "book"), ("💰 Ціни", "price")],
        [("😣 Болить зуб", "pain"), ("✨ Коронки / вініри", "prosthetics")],
    ]))


async def ask_city(chat_id: int):
    st(chat_id)["step"] = "ask_city"
    await send(chat_id, "Яка клініка вам зручніша?", kb([[("Ужгород", "city:Ужгород"), ("Міжгір’я", "city:Міжгір’я")]]))


async def show_slots(chat_id: int):
    city = st(chat_id).get("city") or "Ужгород"
    st(chat_id)["step"] = "choose_slot"
    rows = [[(slot, f"slot:{i}")] for i, slot in enumerate(TEST_SLOTS[city])]
    await send(chat_id, f"Найближчі вільні години в <b>{city}</b>:\n\nЗараз це <b>тестовий розклад</b>. Після підключення Cliniccards тут будуть живі вільні слоти.", kb(rows))


async def urgent(chat_id: int, text: str):
    st(chat_id)["step"] = "handoff"
    await send(chat_id, "🔴 За описом це потребує <b>швидкої оцінки лікаря</b>.\n\nЯкщо утруднене дихання або ковтання, швидко наростає набряк, є сильна кровотеча або різко погіршується стан — потрібна невідкладна медична допомога.\n\nВаше звернення позначено як термінове.")
    if ADMIN_CHAT_ID:
        try:
            await send(int(ADMIN_CHAT_ID), f"🔴 <b>Термінове звернення</b>\nChat ID: {chat_id}\nТекст: {text}")
        except Exception:
            pass


async def handle_text(chat_id: int, text: str):
    s = st(chat_id)
    if text == "/start":
        await start_flow(chat_id); return
    if is_emergency(text):
        await urgent(chat_id, text); return

    if s.get("step") == "ask_name":
        s["name"] = text.strip(); s["step"] = "ask_phone"
        await send(chat_id, f"Дякую, <b>{s['name'].split()[0]}</b>. Напишіть номер телефону у форматі 0XX XXX XX XX.")
        return

    if s.get("step") == "ask_phone":
        if not valid_phone(text):
            await send(chat_id, "Схоже, номер введено не повністю. Напишіть, будь ласка, 0XX XXX XX XX."); return
        s["phone"] = text.strip(); s["step"] = "done"
        direction = "ортопедія / естетика" if is_prosth(s.get("concern", "")) else "ортодонтія" if is_ortho(s.get("concern", "")) else "терапія"
        await send(chat_id, "✅ <b>Тестовий запис створено</b>\n\n" +
                   f"Пацієнт: {s.get('name')}\nКлініка: {s.get('city')}\nЧас: {s.get('slot')}\nНапрям: {direction}\nТелефон: {s.get('phone')}\n\n" +
                   "У бойовій версії на цьому кроці візит автоматично створиться в Cliniccards.",
                   kb([[("🔄 Перенести", "reschedule"), ("🏠 На початок", "home")]]))
        return

    s["concern"] = text
    if is_prosth(text):
        await send(chat_id, "Для коронок і вінірів остаточна вартість залежить від матеріалу та клінічної ситуації. Можу одразу знайти найближчий час до ортопеда.", kb([[("📅 Записатися", "book"), ("🏠 На початок", "home")]])); return
    if is_booking(text) or is_ortho(text) or "бол" in lower(text):
        await ask_city(chat_id); return

    await send(chat_id, "Можу допомогти із записом, вибором напрямку, цінами або передати звернення адміністратору.", kb([
        [("🦷 Записатися", "book"), ("💰 Ціни", "price")],
        [("😣 Болить зуб", "pain")],
    ]))


async def handle_callback(chat_id: int, data: str, callback_id: str):
    try:
        await tg("answerCallbackQuery", {"callback_query_id": callback_id})
    except Exception:
        pass
    s = st(chat_id)
    if data == "home": await start_flow(chat_id); return
    if data == "book": await ask_city(chat_id); return
    if data == "price": await send(chat_id, "Напишіть назву послуги, яка вас цікавить."); return
    if data == "pain":
        s["concern"] = "болить зуб"
        await send(chat_id, "Якщо є сильний набряк, температура, утруднене ковтання або дихання — напишіть це повідомленням.")
        await ask_city(chat_id); return
    if data == "prosthetics":
        s["concern"] = "коронки / вініри"; await ask_city(chat_id); return
    if data.startswith("city:"):
        s["city"] = data.split(":", 1)[1]; await show_slots(chat_id); return
    if data.startswith("slot:"):
        idx = int(data.split(":", 1)[1]); city = s.get("city") or "Ужгород"; s["slot"] = TEST_SLOTS[city][idx]; s["step"] = "ask_name"
        await send(chat_id, f"Резервую <b>{s['slot']}</b>.\n\nНапишіть ваше ім’я та прізвище."); return
    if data == "reschedule": await show_slots(chat_id); return


@app.get("/")
async def health():
    return PlainTextResponse("Just Dent Telegram is running")


@app.post("/telegram")
async def telegram_webhook(request: Request):
    if WEBHOOK_SECRET:
        incoming = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if not secrets.compare_digest(incoming, WEBHOOK_SECRET):
            raise HTTPException(status_code=403, detail="Invalid webhook secret")
    update = await request.json()
    if "message" in update and update["message"].get("text"):
        await handle_text(update["message"]["chat"]["id"], update["message"]["text"].strip())
    elif "callback_query" in update:
        cq = update["callback_query"]
        await handle_callback(cq["message"]["chat"]["id"], cq.get("data", ""), cq["id"])
    return {"ok": True}


@app.on_event("startup")
async def startup():
    if BOT_TOKEN and PUBLIC_URL:
        payload = {"url": f"{PUBLIC_URL}/telegram", "drop_pending_updates": True, "allowed_updates": ["message", "callback_query"]}
        if WEBHOOK_SECRET:
            payload["secret_token"] = WEBHOOK_SECRET
        try:
            await tg("setWebhook", payload)
        except Exception as e:
            print("Webhook setup failed:", repr(e))

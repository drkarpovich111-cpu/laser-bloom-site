import os
import re
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

# Тимчасові тестові слоти. У бойовій версії їх замінить живий розклад Cliniccards.
# Правило Just Dent: пацієнту показуємо тільки часи на :00 або :30.
TEST_SLOTS = {
    "Ужгород": ["Сьогодні 18:30", "Завтра 10:30", "Завтра 15:30", "Завтра 17:00"],
    "Міжгір’я": ["П’ятниця 11:00", "П’ятниця 14:30", "Субота 10:00"],
}


def st(chat_id: int):
    return STATE.setdefault(
        chat_id,
        {"step": "start", "city": None, "slot": None, "name": None, "phone": None, "concern": ""},
    )


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


async def edit(chat_id: int, message_id: int, text: str, keyboard=None):
    payload = {
        "chat_id": chat_id,
        "message_id": message_id,
        "text": text,
        "parse_mode": "HTML",
    }
    if keyboard:
        payload["reply_markup"] = keyboard
    try:
        await tg("editMessageText", payload)
    except Exception:
        await send(chat_id, text, keyboard)


def lower(s: str) -> str:
    return (s or "").lower().replace("ё", "е")


def is_allowed_slot(slot_text: str) -> bool:
    match = re.search(r"\b(\d{1,2}):(\d{2})\b", slot_text or "")
    if not match:
        return False
    return int(match.group(2)) in (0, 30)


def is_emergency(text: str) -> bool:
    s = lower(text)
    red = [
        "не можу дихати",
        "важко дихати",
        "не можу ковтати",
        "важко ковтати",
        "набряк шиї",
        "сильно кровить",
        "кров не зупиняється",
        "38.5",
        "38,5",
        "39",
        "втрачаю свідомість",
    ]
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


def main_keyboard():
    return kb([
        [("📅 Записатися на прийом", "book")],
        [("💳 Дізнатися ціну", "price"), ("🆘 Болить зуб", "pain")],
        [("✨ Коронки та вініри", "prosthetics")],
    ])


def main_text():
    return (
        "🦷 <b>JUST DENT</b>\n"
        "<i>Стоматологія для всієї сім’ї</i>\n\n"
        "Вітаємо 👋\n"
        "Я онлайн-адміністратор клініки. Допоможу швидко зорієнтуватися та залишити заявку на прийом.\n\n"
        "<b>Оберіть, чим можемо допомогти:</b>"
    )


async def notify_admin_booking(patient_chat_id: int, state: Dict[str, Any], direction: str):
    if not ADMIN_CHAT_ID:
        print("ADMIN_CHAT_ID is not configured; booking notification skipped")
        return

    concern = state.get("concern") or "не вказано"
    text = (
        "🟢 <b>НОВА ЗАЯВКА • JUST DENT</b>\n\n"
        f"👤 <b>{state.get('name') or 'не вказано'}</b>\n"
        f"📞 <code>{state.get('phone') or 'не вказано'}</code>\n"
        f"📍 {state.get('city') or 'не вказано'}\n"
        f"🕒 <b>{state.get('slot') or 'не вказано'}</b>\n"
        f"🦷 {direction}\n"
        f"💬 {concern}\n\n"
        f"ID пацієнта: <code>{patient_chat_id}</code>"
    )
    try:
        await send(int(ADMIN_CHAT_ID), text)
    except Exception as e:
        print("Failed to send admin booking notification:", repr(e))


async def start_flow(chat_id: int, message_id: int | None = None):
    STATE[chat_id] = {
        "step": "start",
        "city": None,
        "slot": None,
        "name": None,
        "phone": None,
        "concern": "",
    }
    if message_id:
        await edit(chat_id, message_id, main_text(), main_keyboard())
    else:
        await send(chat_id, main_text(), main_keyboard())


async def ask_city(chat_id: int, message_id: int | None = None, intro: str | None = None):
    st(chat_id)["step"] = "ask_city"
    text = "📍 <b>Оберіть клініку</b>\n\n"
    if intro:
        text += f"{intro}\n\n"
    text += "Де вам зручніше прийти на прийом?"
    keyboard = kb([
        [("🏙 Ужгород", "city:Ужгород")],
        [("⛰ Міжгір’я", "city:Міжгір’я")],
        [("🏠 Головне меню", "home")],
    ])
    if message_id:
        await edit(chat_id, message_id, text, keyboard)
    else:
        await send(chat_id, text, keyboard)


async def show_slots(chat_id: int, message_id: int | None = None):
    city = st(chat_id).get("city") or "Ужгород"
    st(chat_id)["step"] = "choose_slot"
    allowed_slots = [slot for slot in TEST_SLOTS[city] if is_allowed_slot(slot)]
    st(chat_id)["visible_slots"] = allowed_slots

    rows = [[(f"🕒 {slot}", f"slot:{i}")] for i, slot in enumerate(allowed_slots)]
    rows.append([("⬅️ Інша клініка", "book"), ("🏠 Меню", "home")])

    text = (
        "🗓 <b>Оберіть зручний час</b>\n"
        f"📍 {city}\n\n"
        "Доступні найближчі варіанти:\n\n"
        "<i>Час для запису показується тільки на :00 або :30.</i>"
    )
    if message_id:
        await edit(chat_id, message_id, text, kb(rows))
    else:
        await send(chat_id, text, kb(rows))


async def urgent(chat_id: int, text: str):
    st(chat_id)["step"] = "handoff"
    await send(
        chat_id,
        "🚨 <b>Потрібна швидка оцінка лікаря</b>\n\n"
        "Якщо утруднене дихання або ковтання, швидко наростає набряк, є сильна кровотеча "
        "або різко погіршується стан — потрібна невідкладна медична допомога.\n\n"
        "Ваше звернення позначено як термінове та передано адміністратору.",
        kb([[("🏠 Головне меню", "home")]]),
    )
    if ADMIN_CHAT_ID:
        try:
            await send(
                int(ADMIN_CHAT_ID),
                f"🚨 <b>ТЕРМІНОВЕ ЗВЕРНЕННЯ • JUST DENT</b>\n\n"
                f"ID пацієнта: <code>{chat_id}</code>\n"
                f"Повідомлення: {text}",
            )
        except Exception as e:
            print("Failed to send urgent admin notification:", repr(e))


async def handle_text(chat_id: int, text: str):
    if text == "/myid":
        await send(chat_id, f"Ваш Telegram ID: <code>{chat_id}</code>")
        return

    s = st(chat_id)
    if text == "/start":
        await start_flow(chat_id)
        return

    if is_emergency(text):
        await urgent(chat_id, text)
        return

    if s.get("step") == "ask_name":
        name = text.strip()
        if len(name) < 2:
            await send(chat_id, "👤 Напишіть, будь ласка, ваше ім’я та прізвище.")
            return
        s["name"] = name
        s["step"] = "ask_phone"
        first_name = name.split()[0]
        await send(
            chat_id,
            "📞 <b>Номер телефону</b>\n\n"
            f"Дякую, <b>{first_name}</b> 👌\n"
            "Надішліть номер, за яким адміністратор зможе з вами зв’язатися.\n\n"
            "Наприклад: <code>097 123 45 67</code>",
        )
        return

    if s.get("step") == "ask_phone":
        if not valid_phone(text):
            await send(
                chat_id,
                "⚠️ Номер виглядає неповним.\n\n"
                "Введіть український номер у форматі:\n"
                "<code>097 123 45 67</code>",
            )
            return

        s["phone"] = text.strip()
        s["step"] = "done"
        direction = (
            "ортопедія / естетика"
            if is_prosth(s.get("concern", ""))
            else "ортодонтія"
            if is_ortho(s.get("concern", ""))
            else "терапія"
        )

        await notify_admin_booking(chat_id, s, direction)

        await send(
            chat_id,
            "✅ <b>ЗАЯВКУ ОТРИМАНО</b>\n\n"
            f"👤 {s.get('name')}\n"
            f"📍 {s.get('city')}\n"
            f"🕒 <b>{s.get('slot')}</b>\n"
            f"🦷 {direction}\n"
            f"📞 {s.get('phone')}\n\n"
            "Адміністратор Just Dent перевірить час і зв’яжеться з вами для підтвердження візиту. 🤍",
            kb([
                [("🔄 Змінити час", "reschedule")],
                [("🏠 Головне меню", "home")],
            ]),
        )
        return

    s["concern"] = text
    if is_prosth(text):
        await send(
            chat_id,
            "✨ <b>Коронки та вініри</b>\n\n"
            "Точна вартість залежить від матеріалу та клінічної ситуації. "
            "Найкраще почати з консультації ортопеда.\n\n"
            "Можу одразу показати найближчий час.",
            kb([[("📅 Обрати час", "book")], [("🏠 Головне меню", "home")]]),
        )
        return

    if is_booking(text) or is_ortho(text) or "бол" in lower(text):
        await ask_city(chat_id)
        return

    await send(
        chat_id,
        "🙂 Я допоможу швидше, якщо оберете потрібну дію нижче:",
        main_keyboard(),
    )


async def handle_callback(chat_id: int, message_id: int, data: str, callback_id: str):
    try:
        await tg("answerCallbackQuery", {"callback_query_id": callback_id})
    except Exception:
        pass

    s = st(chat_id)

    if data == "home":
        await start_flow(chat_id, message_id)
        return

    if data == "book":
        await ask_city(chat_id, message_id)
        return

    if data == "price":
        s["step"] = "price"
        await edit(
            chat_id,
            message_id,
            "💳 <b>Вартість послуг</b>\n\n"
            "Напишіть назву послуги, яка вас цікавить — наприклад: пломба, чистка, коронка, імплантація.\n\n"
            "Я зорієнтую або передам питання адміністратору.",
            kb([[("🏠 Головне меню", "home")]]),
        )
        return

    if data == "pain":
        s["concern"] = "болить зуб"
        await ask_city(
            chat_id,
            message_id,
            "😣 Якщо є сильний набряк, висока температура, утруднене ковтання або дихання — напишіть це повідомленням.",
        )
        return

    if data == "prosthetics":
        s["concern"] = "коронки / вініри"
        await ask_city(chat_id, message_id, "✨ Підберемо найближчий час для консультації ортопеда.")
        return

    if data.startswith("city:"):
        s["city"] = data.split(":", 1)[1]
        await show_slots(chat_id, message_id)
        return

    if data.startswith("slot:"):
        idx = int(data.split(":", 1)[1])
        visible_slots = s.get("visible_slots") or []
        if idx < 0 or idx >= len(visible_slots):
            await edit(
                chat_id,
                message_id,
                "⚠️ Цей час уже недоступний. Оберіть інший варіант.",
                kb([[("🔄 Оновити час", "reschedule")], [("🏠 Меню", "home")]]),
            )
            return

        s["slot"] = visible_slots[idx]
        s["step"] = "ask_name"
        await edit(
            chat_id,
            message_id,
            "👌 <b>Час обрано</b>\n\n"
            f"🕒 <b>{s['slot']}</b>\n"
            f"📍 {s.get('city')}\n\n"
            "Залишилося зовсім трохи.\n"
            "👤 <b>Напишіть ваше ім’я та прізвище:</b>",
            kb([[("🔄 Інший час", "reschedule")], [("🏠 Меню", "home")]]),
        )
        return

    if data == "reschedule":
        await show_slots(chat_id, message_id)
        return


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
        await handle_callback(
            cq["message"]["chat"]["id"],
            cq["message"]["message_id"],
            cq.get("data", ""),
            cq["id"],
        )
    return {"ok": True}


@app.on_event("startup")
async def startup():
    if BOT_TOKEN and PUBLIC_URL:
        payload = {
            "url": f"{PUBLIC_URL}/telegram",
            "drop_pending_updates": True,
            "allowed_updates": ["message", "callback_query"],
        }
        if WEBHOOK_SECRET:
            payload["secret_token"] = WEBHOOK_SECRET
        try:
            await tg("setWebhook", payload)
        except Exception as e:
            print("Webhook setup failed:", repr(e))

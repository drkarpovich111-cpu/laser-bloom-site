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

LANG_NAMES = {"uk": "Українська", "sk": "Slovenčina", "en": "English"}


def st(chat_id: int):
    return STATE.setdefault(
        chat_id,
        {
            "step": "start",
            "city": None,
            "slot": None,
            "name": None,
            "phone": None,
            "concern": "",
            "lang": None,
        },
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


def language_from_telegram(code: str | None) -> str | None:
    code = (code or "").lower().split("-")[0]
    if code in ("uk", "sk", "en"):
        return code
    return None


def language_from_text(text: str) -> str | None:
    s = lower(text)
    if re.search(r"[іїєґ]", s) or re.search(r"[а-я]", s):
        return "uk"

    slovak_markers = [
        "prosím", "ďakujem", "zub", "zubov", "bolí", "bolest", "objedna", "termín",
        "chcem", "môžem", "koľko", "cena", "korunka", "fazeta", "ošetrenie", "lekár",
        "dobrý", "potrebujem", "mám", "opuch", "krvácanie",
    ]
    if any(x in s for x in slovak_markers) or re.search(r"[áäčďéíĺľňóôŕšťúýž]", s):
        return "sk"

    english_markers = [
        "hello", "hi", "tooth", "pain", "appointment", "book", "price", "crown", "veneer",
        "dentist", "doctor", "swelling", "bleeding", "need", "please", "tomorrow",
    ]
    if any(re.search(rf"\b{re.escape(x)}\b", s) for x in english_markers):
        return "en"
    return None


def get_lang(chat_id: int) -> str:
    return st(chat_id).get("lang") or "uk"


def tr(lang: str, uk: str, sk: str, en: str) -> str:
    if lang == "sk":
        return sk
    if lang == "en":
        return en
    return uk


def city_label(city: str, lang: str) -> str:
    labels = {
        "Ужгород": {"uk": "Ужгород", "sk": "Užhorod", "en": "Uzhhorod"},
        "Міжгір’я": {"uk": "Міжгір’я", "sk": "Mižhiria", "en": "Mizhhiria"},
    }
    return labels.get(city, {}).get(lang, city)


def slot_label(slot: str, lang: str) -> str:
    if lang == "sk":
        return (
            slot.replace("Сьогодні", "Dnes")
            .replace("Завтра", "Zajtra")
            .replace("П’ятниця", "Piatok")
            .replace("Субота", "Sobota")
        )
    if lang == "en":
        return (
            slot.replace("Сьогодні", "Today")
            .replace("Завтра", "Tomorrow")
            .replace("П’ятниця", "Friday")
            .replace("Субота", "Saturday")
        )
    return slot


def is_allowed_slot(slot_text: str) -> bool:
    match = re.search(r"\b(\d{1,2}):(\d{2})\b", slot_text or "")
    if not match:
        return False
    return int(match.group(2)) in (0, 30)


def is_emergency(text: str) -> bool:
    s = lower(text)
    red = [
        "не можу дихати", "важко дихати", "не можу ковтати", "важко ковтати", "набряк шиї",
        "сильно кровить", "кров не зупиняється", "втрачаю свідомість", "38.5", "38,5", "39",
        "nemôžem dýchať", "ťažko sa mi dýcha", "nemôžem prehĺtať", "silné krvácanie",
        "krvácanie sa nezastaví", "opuch krku", "strácam vedomie",
        "can't breathe", "cannot breathe", "difficulty breathing", "can't swallow", "cannot swallow",
        "heavy bleeding", "bleeding won't stop", "neck swelling", "fainting",
    ]
    return any(x in s for x in red)


def is_prosth(text: str) -> bool:
    s = lower(text)
    return any(x in s for x in [
        "корон", "вінір", "відкол", "передній зуб", "ортопед", "протез",
        "korunk", "fazet", "protéz", "odštiep", "predný zub",
        "crown", "veneer", "prosthetic", "chipped tooth", "front tooth",
    ])


def is_ortho(text: str) -> bool:
    s = lower(text)
    return any(x in s for x in [
        "брекет", "прикус", "ортодонт", "елайнер",
        "strojček", "zhryz", "ortodont", "aligner",
        "braces", "bite", "orthodont",
    ])


def is_booking(text: str) -> bool:
    s = lower(text)
    return any(x in s for x in [
        "запис", "прийом", "вільн", "хочу до", "можна завтра", "лікар",
        "objedna", "termín", "voľn", "chcem k", "zajtra", "lekár",
        "appointment", "book", "available", "tomorrow", "doctor", "dentist",
    ])


def valid_phone(text: str) -> bool:
    digits = "".join(ch for ch in text if ch.isdigit())
    return 9 <= len(digits) <= 15


def direction_key(concern: str) -> str:
    if is_prosth(concern):
        return "prosthetics"
    if is_ortho(concern):
        return "orthodontics"
    return "therapy"


def direction_label(key: str, lang: str) -> str:
    labels = {
        "prosthetics": {"uk": "ортопедія / естетика", "sk": "protetika / estetika", "en": "prosthetics / aesthetics"},
        "orthodontics": {"uk": "ортодонтія", "sk": "ortodoncia", "en": "orthodontics"},
        "therapy": {"uk": "терапія", "sk": "terapia", "en": "general dentistry"},
    }
    return labels[key][lang]


def language_keyboard():
    return kb([
        [("🇺🇦 Українська", "lang:uk")],
        [("🇸🇰 Slovenčina", "lang:sk")],
        [("🇬🇧 English", "lang:en")],
    ])


async def ask_language(chat_id: int, message_id: int | None = None):
    text = "🌐 <b>Оберіть мову • Vyberte jazyk • Choose language</b>"
    if message_id:
        await edit(chat_id, message_id, text, language_keyboard())
    else:
        await send(chat_id, text, language_keyboard())


def main_keyboard(lang: str):
    if lang == "sk":
        return kb([
            [("📅 Objednať sa", "book")],
            [("💳 Zistiť cenu", "price"), ("🆘 Bolí ma zub", "pain")],
            [("✨ Korunky a fazety", "prosthetics")],
            [("🌐 Jazyk", "langmenu")],
        ])
    if lang == "en":
        return kb([
            [("📅 Book an appointment", "book")],
            [("💳 Check prices", "price"), ("🆘 Tooth pain", "pain")],
            [("✨ Crowns & veneers", "prosthetics")],
            [("🌐 Language", "langmenu")],
        ])
    return kb([
        [("📅 Записатися на прийом", "book")],
        [("💳 Дізнатися ціну", "price"), ("🆘 Болить зуб", "pain")],
        [("✨ Коронки та вініри", "prosthetics")],
        [("🌐 Мова", "langmenu")],
    ])


def main_text(lang: str):
    if lang == "sk":
        return (
            "🦷 <b>JUST DENT</b>\n"
            "<i>Stomatológia pre celú rodinu</i>\n\n"
            "Vitajte 👋 Som online administrátor kliniky.\n\n"
            "1️⃣ <b>Opíšte svoj problém vlastnými slovami</b> — jednoducho napíšte správu do chatu.\n"
            "Napríklad: <i>„Bolí ma zub vpravo dole už dva dni.“</i>\n\n"
            "2️⃣ Alebo si vyberte jednu z možností nižšie:"
        )
    if lang == "en":
        return (
            "🦷 <b>JUST DENT</b>\n"
            "<i>Dentistry for the whole family</i>\n\n"
            "Welcome 👋 I'm the clinic's online administrator.\n\n"
            "1️⃣ <b>Describe your problem in your own words</b> — just type a message in the chat.\n"
            "For example: <i>“My lower right tooth has been hurting for two days.”</i>\n\n"
            "2️⃣ Or choose one of the options below:"
        )
    return (
        "🦷 <b>JUST DENT</b>\n"
        "<i>Стоматологія для всієї сім’ї</i>\n\n"
        "Вітаємо 👋 Я онлайн-адміністратор клініки.\n\n"
        "1️⃣ <b>Опишіть свою проблему своїми словами</b> — просто напишіть повідомлення в чат.\n"
        "Наприклад: <i>«Другий день болить зуб справа внизу.»</i>\n\n"
        "2️⃣ Або оберіть один із варіантів нижче:"
    )


async def notify_admin_booking(patient_chat_id: int, state: Dict[str, Any], direction: str):
    if not ADMIN_CHAT_ID:
        print("ADMIN_CHAT_ID is not configured; booking notification skipped")
        return

    concern = state.get("concern") or "не вказано"
    lang = state.get("lang") or "uk"
    text = (
        "🟢 <b>НОВА ЗАЯВКА • JUST DENT</b>\n\n"
        f"👤 <b>{state.get('name') or 'не вказано'}</b>\n"
        f"📞 <code>{state.get('phone') or 'не вказано'}</code>\n"
        f"📍 {state.get('city') or 'не вказано'}\n"
        f"🕒 <b>{state.get('slot') or 'не вказано'}</b>\n"
        f"🦷 {direction}\n"
        f"🌐 {LANG_NAMES.get(lang, lang)}\n"
        f"💬 {concern}\n\n"
        f"ID пацієнта: <code>{patient_chat_id}</code>"
    )
    try:
        await send(int(ADMIN_CHAT_ID), text)
    except Exception as e:
        print("Failed to send admin booking notification:", repr(e))


async def start_flow(chat_id: int, message_id: int | None = None, lang: str | None = None):
    current_lang = lang or st(chat_id).get("lang") or "uk"
    STATE[chat_id] = {
        "step": "start",
        "city": None,
        "slot": None,
        "name": None,
        "phone": None,
        "concern": "",
        "lang": current_lang,
    }
    if message_id:
        await edit(chat_id, message_id, main_text(current_lang), main_keyboard(current_lang))
    else:
        await send(chat_id, main_text(current_lang), main_keyboard(current_lang))


async def ask_city(chat_id: int, message_id: int | None = None, intro: str | None = None):
    s = st(chat_id)
    lang = get_lang(chat_id)
    s["step"] = "ask_city"

    title = tr(lang, "📍 <b>Оберіть клініку</b>", "📍 <b>Vyberte kliniku</b>", "📍 <b>Choose a clinic</b>")
    question = tr(lang, "Де вам зручніше прийти на прийом?", "Ktorá klinika vám viac vyhovuje?", "Which clinic is more convenient for you?")
    text = f"{title}\n\n"
    if intro:
        text += f"{intro}\n\n"
    text += question

    keyboard = kb([
        [(f"🏙 {city_label('Ужгород', lang)}", "city:Ужгород")],
        [(f"⛰ {city_label('Міжгір’я', lang)}", "city:Міжгір’я")],
        [(tr(lang, "🏠 Головне меню", "🏠 Hlavné menu", "🏠 Main menu"), "home")],
    ])
    if message_id:
        await edit(chat_id, message_id, text, keyboard)
    else:
        await send(chat_id, text, keyboard)


async def show_slots(chat_id: int, message_id: int | None = None):
    s = st(chat_id)
    lang = get_lang(chat_id)
    city = s.get("city") or "Ужгород"
    s["step"] = "choose_slot"
    allowed_slots = [slot for slot in TEST_SLOTS[city] if is_allowed_slot(slot)]
    s["visible_slots"] = allowed_slots

    rows = [[(f"🕒 {slot_label(slot, lang)}", f"slot:{i}")] for i, slot in enumerate(allowed_slots)]
    rows.append([
        (tr(lang, "⬅️ Інша клініка", "⬅️ Iná klinika", "⬅️ Other clinic"), "book"),
        (tr(lang, "🏠 Меню", "🏠 Menu", "🏠 Menu"), "home"),
    ])

    text = tr(
        lang,
        f"🗓 <b>Оберіть зручний час</b>\n📍 {city_label(city, lang)}\n\nДоступні найближчі варіанти:\n\n<i>Час для запису показується тільки на :00 або :30.</i>",
        f"🗓 <b>Vyberte si vhodný čas</b>\n📍 {city_label(city, lang)}\n\nNajbližšie dostupné termíny:\n\n<i>Termíny zobrazujeme iba na :00 alebo :30.</i>",
        f"🗓 <b>Choose a convenient time</b>\n📍 {city_label(city, lang)}\n\nNearest available times:\n\n<i>Appointments are shown only on :00 or :30.</i>",
    )
    if message_id:
        await edit(chat_id, message_id, text, kb(rows))
    else:
        await send(chat_id, text, kb(rows))


async def urgent(chat_id: int, text: str):
    s = st(chat_id)
    lang = get_lang(chat_id)
    s["step"] = "handoff"
    patient_text = tr(
        lang,
        "🚨 <b>Потрібна швидка оцінка лікаря</b>\n\nЯкщо утруднене дихання або ковтання, швидко наростає набряк, є сильна кровотеча або різко погіршується стан — потрібна невідкладна медична допомога.\n\nВаше звернення позначено як термінове та передано адміністратору.",
        "🚨 <b>Je potrebné rýchle posúdenie lekárom</b>\n\nAk máte ťažkosti s dýchaním alebo prehĺtaním, rýchlo sa zväčšujúci opuch, silné krvácanie alebo sa váš stav prudko zhoršuje, vyhľadajte neodkladnú zdravotnú pomoc.\n\nVaša správa bola označená ako urgentná a odoslaná administrátorovi.",
        "🚨 <b>You need prompt medical assessment</b>\n\nIf you have difficulty breathing or swallowing, rapidly increasing swelling, heavy bleeding, or a sudden deterioration, seek emergency medical care.\n\nYour message has been marked urgent and sent to the administrator.",
    )
    await send(chat_id, patient_text, kb([[(tr(lang, "🏠 Головне меню", "🏠 Hlavné menu", "🏠 Main menu"), "home")]]))

    if ADMIN_CHAT_ID:
        try:
            await send(
                int(ADMIN_CHAT_ID),
                f"🚨 <b>ТЕРМІНОВЕ ЗВЕРНЕННЯ • JUST DENT</b>\n\n"
                f"🌐 {LANG_NAMES.get(lang, lang)}\n"
                f"ID пацієнта: <code>{chat_id}</code>\n"
                f"Повідомлення: {text}",
            )
        except Exception as e:
            print("Failed to send urgent admin notification:", repr(e))


async def handle_text(chat_id: int, text: str, telegram_lang: str | None = None):
    s = st(chat_id)

    if text == "/myid":
        await send(chat_id, f"Ваш Telegram ID: <code>{chat_id}</code>")
        return

    if text == "/start":
        detected = language_from_telegram(telegram_lang)
        if detected:
            s["lang"] = detected
            await start_flow(chat_id, lang=detected)
        else:
            s["lang"] = None
            await ask_language(chat_id)
        return

    # Якщо мова ще не визначена, пробуємо визначити її за першим повідомленням.
    if not s.get("lang"):
        detected = language_from_text(text) or language_from_telegram(telegram_lang)
        if detected:
            s["lang"] = detected
        else:
            await ask_language(chat_id)
            return

    lang = get_lang(chat_id)

    if is_emergency(text):
        s["concern"] = text
        await urgent(chat_id, text)
        return

    if s.get("step") == "ask_name":
        name = text.strip()
        if len(name) < 2:
            await send(chat_id, tr(lang, "👤 Напишіть, будь ласка, ваше ім’я та прізвище.", "👤 Napíšte, prosím, svoje meno a priezvisko.", "👤 Please enter your first and last name."))
            return
        s["name"] = name
        s["step"] = "ask_phone"
        first_name = name.split()[0]
        phone_text = tr(
            lang,
            f"📞 <b>Номер телефону</b>\n\nДякую, <b>{first_name}</b> 👌\nНадішліть номер, за яким адміністратор зможе з вами зв’язатися.\n\nНаприклад: <code>097 123 45 67</code>",
            f"📞 <b>Telefónne číslo</b>\n\nĎakujem, <b>{first_name}</b> 👌\nPošlite číslo, na ktorom vás môže administrátor kontaktovať.\n\nNapríklad: <code>+421 9XX XXX XXX</code>",
            f"📞 <b>Phone number</b>\n\nThank you, <b>{first_name}</b> 👌\nSend the number where our administrator can reach you.\n\nFor example: <code>+421 9XX XXX XXX</code>",
        )
        await send(chat_id, phone_text)
        return

    if s.get("step") == "ask_phone":
        if not valid_phone(text):
            await send(
                chat_id,
                tr(
                    lang,
                    "⚠️ Номер виглядає неповним.\n\nВведіть номер телефону, наприклад: <code>097 123 45 67</code>.",
                    "⚠️ Číslo vyzerá neúplne.\n\nZadajte telefónne číslo, napríklad: <code>+421 9XX XXX XXX</code>.",
                    "⚠️ The number looks incomplete.\n\nEnter a phone number, for example: <code>+421 9XX XXX XXX</code>.",
                ),
            )
            return

        s["phone"] = text.strip()
        s["step"] = "done"
        dkey = direction_key(s.get("concern", ""))
        admin_direction = direction_label(dkey, "uk")
        user_direction = direction_label(dkey, lang)

        await notify_admin_booking(chat_id, s, admin_direction)

        confirmation = tr(
            lang,
            "✅ <b>ЗАЯВКУ ОТРИМАНО</b>",
            "✅ <b>ŽIADOSŤ SME PRIJALI</b>",
            "✅ <b>REQUEST RECEIVED</b>",
        )
        followup = tr(
            lang,
            "Адміністратор Just Dent перевірить час і зв’яжеться з вами для підтвердження візиту. 🤍",
            "Administrátor Just Dent skontroluje termín a kontaktuje vás, aby návštevu potvrdil. 🤍",
            "A Just Dent administrator will check the time and contact you to confirm the visit. 🤍",
        )
        await send(
            chat_id,
            f"{confirmation}\n\n"
            f"👤 {s.get('name')}\n"
            f"📍 {city_label(s.get('city') or '', lang)}\n"
            f"🕒 <b>{slot_label(s.get('slot') or '', lang)}</b>\n"
            f"🦷 {user_direction}\n"
            f"📞 {s.get('phone')}\n\n"
            f"{followup}",
            kb([
                [(tr(lang, "🔄 Змінити час", "🔄 Zmeniť čas", "🔄 Change time"), "reschedule")],
                [(tr(lang, "🏠 Головне меню", "🏠 Hlavné menu", "🏠 Main menu"), "home")],
            ]),
        )
        return

    # Будь-який звичайний текст сприймаємо як опис проблеми, а не змушуємо користувача тиснути кнопки.
    s["concern"] = text.strip()

    if is_prosth(text):
        await send(
            chat_id,
            tr(
                lang,
                "✨ <b>Коронки та вініри</b>\n\nТочна вартість залежить від матеріалу та клінічної ситуації. Найкраще почати з консультації ортопеда.\n\nМожу одразу показати найближчий час.",
                "✨ <b>Korunky a fazety</b>\n\nPresná cena závisí od materiálu a klinickej situácie. Najlepšie je začať konzultáciou s protetikom.\n\nMôžem vám hneď ukázať najbližšie termíny.",
                "✨ <b>Crowns & veneers</b>\n\nThe exact price depends on the material and clinical situation. The best first step is a consultation with a prosthodontist.\n\nI can show you the nearest available times now.",
            ),
            kb([
                [(tr(lang, "📅 Обрати час", "📅 Vybrať termín", "📅 Choose a time"), "book")],
                [(tr(lang, "🏠 Головне меню", "🏠 Hlavné menu", "🏠 Main menu"), "home")],
            ]),
        )
        return

    intro = tr(
        lang,
        "💬 Дякую, опис проблеми збережено. Тепер оберіть клініку — підберемо найближчий час.",
        "💬 Ďakujem, váš opis problému som uložil. Teraz vyberte kliniku a nájdeme najbližší termín.",
        "💬 Thank you, I've saved your description. Now choose a clinic and we'll find the nearest available time.",
    )
    await ask_city(chat_id, intro=intro)


async def handle_callback(chat_id: int, message_id: int, data: str, callback_id: str, telegram_lang: str | None = None):
    try:
        await tg("answerCallbackQuery", {"callback_query_id": callback_id})
    except Exception:
        pass

    s = st(chat_id)

    if data.startswith("lang:"):
        lang = data.split(":", 1)[1]
        if lang not in ("uk", "sk", "en"):
            lang = "uk"
        s["lang"] = lang
        await start_flow(chat_id, message_id, lang)
        return

    if data == "langmenu":
        await ask_language(chat_id, message_id)
        return

    if not s.get("lang"):
        s["lang"] = language_from_telegram(telegram_lang) or "uk"
    lang = get_lang(chat_id)

    if data == "home":
        await start_flow(chat_id, message_id, lang)
        return

    if data == "book":
        await ask_city(chat_id, message_id)
        return

    if data == "price":
        s["step"] = "price"
        await edit(
            chat_id,
            message_id,
            tr(
                lang,
                "💳 <b>Вартість послуг</b>\n\nНапишіть назву послуги або опишіть, що вас турбує — наприклад: пломба, чистка, коронка, імплантація.\n\nМожете писати звичайними словами.",
                "💳 <b>Ceny služieb</b>\n\nNapíšte názov služby alebo opíšte, čo vás trápi — napríklad výplň, dentálna hygiena, korunka alebo implantát.\n\nPokojne píšte vlastnými slovami.",
                "💳 <b>Service prices</b>\n\nType the service name or describe what you need — for example a filling, cleaning, crown, or implant.\n\nYou can write in your own words.",
            ),
            kb([[(tr(lang, "🏠 Головне меню", "🏠 Hlavné menu", "🏠 Main menu"), "home")]]),
        )
        return

    if data == "pain":
        s["concern"] = tr(lang, "болить зуб", "bolí ma zub", "tooth pain")
        intro = tr(
            lang,
            "😣 Якщо є сильний набряк, висока температура, утруднене ковтання або дихання — напишіть це повідомленням.",
            "😣 Ak máte silný opuch, vysokú teplotu alebo ťažkosti s prehĺtaním či dýchaním, napíšte nám to do správy.",
            "😣 If you have severe swelling, high fever, or difficulty swallowing or breathing, please type that in a message.",
        )
        await ask_city(chat_id, message_id, intro)
        return

    if data == "prosthetics":
        s["concern"] = tr(lang, "коронки / вініри", "korunky / fazety", "crowns / veneers")
        intro = tr(
            lang,
            "✨ Підберемо найближчий час для консультації ортопеда.",
            "✨ Nájdeme vám najbližší termín na konzultáciu s protetikom.",
            "✨ We'll find the nearest consultation time with a prosthodontist.",
        )
        await ask_city(chat_id, message_id, intro)
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
                tr(lang, "⚠️ Цей час уже недоступний. Оберіть інший варіант.", "⚠️ Tento termín už nie je dostupný. Vyberte si iný.", "⚠️ This time is no longer available. Please choose another."),
                kb([
                    [(tr(lang, "🔄 Оновити час", "🔄 Obnoviť termíny", "🔄 Refresh times"), "reschedule")],
                    [(tr(lang, "🏠 Меню", "🏠 Menu", "🏠 Menu"), "home")],
                ]),
            )
            return

        s["slot"] = visible_slots[idx]
        s["step"] = "ask_name"
        selected = slot_label(s["slot"], lang)
        city = city_label(s.get("city") or "", lang)
        await edit(
            chat_id,
            message_id,
            tr(
                lang,
                f"👌 <b>Час обрано</b>\n\n🕒 <b>{selected}</b>\n📍 {city}\n\nЗалишилося зовсім трохи.\n👤 <b>Напишіть ваше ім’я та прізвище:</b>",
                f"👌 <b>Termín je vybraný</b>\n\n🕒 <b>{selected}</b>\n📍 {city}\n\nUž len pár údajov.\n👤 <b>Napíšte svoje meno a priezvisko:</b>",
                f"👌 <b>Time selected</b>\n\n🕒 <b>{selected}</b>\n📍 {city}\n\nJust a little more information.\n👤 <b>Enter your first and last name:</b>",
            ),
            kb([
                [(tr(lang, "🔄 Інший час", "🔄 Iný termín", "🔄 Different time"), "reschedule")],
                [(tr(lang, "🏠 Меню", "🏠 Menu", "🏠 Menu"), "home")],
            ]),
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
        message = update["message"]
        await handle_text(
            message["chat"]["id"],
            message["text"].strip(),
            message.get("from", {}).get("language_code"),
        )
    elif "callback_query" in update:
        cq = update["callback_query"]
        await handle_callback(
            cq["message"]["chat"]["id"],
            cq["message"]["message_id"],
            cq.get("data", ""),
            cq["id"],
            cq.get("from", {}).get("language_code"),
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

# Just Dent package bootstrap.
# Keep startup diagnostics minimal: never log API keys or patient data.
try:
    from .cliniccards import configured, configured_env_name, request_sync

    if configured():
        staff = request_sync("GET", "staff")
        staff_count = len(staff) if isinstance(staff, list) else 0
        print(
            f"ClinicCards: connected via {configured_env_name()} (staff_count={staff_count})",
            flush=True,
        )
    else:
        print("ClinicCards: API key is not configured", flush=True)
except Exception as exc:
    print(f"ClinicCards connection check failed: {type(exc).__name__}: {str(exc)[:160]}", flush=True)


# Patch the existing Telegram flow with live ClinicCards slot lookup without
# duplicating the full bot application. handle_callback resolves these globals
# at runtime, so replacing ask_city/show_slots here is enough.
try:
    from . import app as _bot
    from .live_booking import get_patient_slots

    async def _live_ask_city(chat_id: int, message_id: int | None = None, intro: str | None = None):
        s = _bot.st(chat_id)
        lang = _bot.get_lang(chat_id)
        s["step"] = "ask_city"

        title = _bot.tr(
            lang,
            "📍 <b>Оберіть клініку</b>",
            "📍 <b>Vyberte kliniku</b>",
            "📍 <b>Choose a clinic</b>",
        )
        question = _bot.tr(
            lang,
            "Де вам зручніше прийти на прийом?",
            "Ktorá klinika vám viac vyhovuje?",
            "Which clinic is more convenient for you?",
        )
        text = f"{title}\n\n"
        if intro:
            text += f"{intro}\n\n"
        text += question

        keyboard = _bot.kb([
            [("🏙 Цегольнянська 6В", "city:Цегольнянська 6В")],
            [("🏙 Заньковецької 38", "city:Заньковецької 38")],
            [("⛰ Річка 137А", "city:Річка 137А")],
            [(_bot.tr(lang, "🏠 Головне меню", "🏠 Hlavné menu", "🏠 Main menu"), "home")],
        ])

        if message_id:
            await _bot.edit(chat_id, message_id, text, keyboard)
        else:
            await _bot.send(chat_id, text, keyboard)

    async def _live_show_slots(chat_id: int, message_id: int | None = None):
        s = _bot.st(chat_id)
        lang = _bot.get_lang(chat_id)
        location = s.get("city") or "Цегольнянська 6В"
        s["step"] = "choose_slot"

        # Primary consultation = 30 minutes. The availability engine checks the
        # whole interval and allows only :00/:30 starts AND ends.
        result = await get_patient_slots(location, lang, duration_min=30)
        slots = result.get("slots") or []
        source = result.get("source")

        if source == "cliniccards" and slots:
            visible_slots = [slot["label"] for slot in slots]
            s["visible_slots"] = visible_slots
            s["live_slot_meta"] = slots

            rows = [[(f"🕒 {slot['label']}", f"slot:{i}")] for i, slot in enumerate(slots)]
            rows.append([
                (_bot.tr(lang, "⬅️ Інша клініка", "⬅️ Iná klinika", "⬅️ Other clinic"), "book"),
                (_bot.tr(lang, "🏠 Меню", "🏠 Menu", "🏠 Menu"), "home"),
            ])

            text = _bot.tr(
                lang,
                f"🗓 <b>Реальні вільні години</b>\n📍 {location}\n\n"
                "Ці варіанти перевірені за поточним розкладом ClinicCards.\n"
                "<i>Показуємо тільки записи, де і початок, і кінець припадають на :00 або :30.</i>",
                f"🗓 <b>Aktuálne voľné termíny</b>\n📍 {location}\n\n"
                "Tieto termíny sú overené podľa aktuálneho rozvrhu ClinicCards.\n"
                "<i>Zobrazujeme iba termíny, ktoré začínajú aj končia na :00 alebo :30.</i>",
                f"🗓 <b>Live available times</b>\n📍 {location}\n\n"
                "These options are checked against the current ClinicCards schedule.\n"
                "<i>Only appointments starting and ending on :00 or :30 are shown.</i>",
            )
            keyboard = _bot.kb(rows)
        else:
            # Do not show invented times when this branch cannot be mapped
            # reliably or when ClinicCards has no confirmed free gaps.
            request_label = _bot.tr(
                lang,
                "Адміністратор підбере найближчий час",
                "Administrátor nájde najbližší termín",
                "Administrator will find the nearest time",
            )
            s["visible_slots"] = [request_label]
            s["live_slot_meta"] = []

            if source == "admin":
                reason = _bot.tr(
                    lang,
                    "Для цієї локації залиште заявку — адміністратор перевірить живий розклад і запропонує час.",
                    "Pre túto pobočku nechajte žiadosť — administrátor skontroluje aktuálny rozvrh a ponúkne termín.",
                    "For this location, leave a request and the administrator will check the live schedule and offer a time.",
                )
            elif source == "cliniccards":
                reason = _bot.tr(
                    lang,
                    "У найближчому розкладі немає підтверджених вільних 30-хвилинних вікон. Залиште заявку — адміністратор перевірить додаткові варіанти.",
                    "V najbližšom rozvrhu nie sú potvrdené voľné 30-minútové termíny. Nechajte žiadosť a administrátor preverí ďalšie možnosti.",
                    "There are no confirmed free 30-minute slots in the near schedule. Leave a request and the administrator will check additional options.",
                )
            else:
                reason = _bot.tr(
                    lang,
                    "ClinicCards зараз не вдалося перевірити. Ми не показуватимемо випадковий час — адміністратор підбере його вручну.",
                    "ClinicCards sa teraz nepodarilo skontrolovať. Nebudeme zobrazovať náhodný čas — administrátor ho vyberie ručne.",
                    "ClinicCards could not be checked right now. We won't show a made-up time — the administrator will choose it manually.",
                )

            text = _bot.tr(
                lang,
                f"📍 <b>{location}</b>\n\n{reason}",
                f"📍 <b>{location}</b>\n\n{reason}",
                f"📍 <b>{location}</b>\n\n{reason}",
            )
            keyboard = _bot.kb([
                [(_bot.tr(lang, "📩 Залишити заявку", "📩 Nechať žiadosť", "📩 Leave a request"), "slot:0")],
                [(_bot.tr(lang, "⬅️ Інша клініка", "⬅️ Iná klinika", "⬅️ Other clinic"), "book")],
                [(_bot.tr(lang, "🏠 Головне меню", "🏠 Hlavné menu", "🏠 Main menu"), "home")],
            ])

        if message_id:
            await _bot.edit(chat_id, message_id, text, keyboard)
        else:
            await _bot.send(chat_id, text, keyboard)

    _bot.ask_city = _live_ask_city
    _bot.show_slots = _live_show_slots
    print("Just Dent live ClinicCards slot flow: enabled", flush=True)
except Exception as exc:
    print(f"Live ClinicCards slot patch failed: {type(exc).__name__}: {str(exc)[:180]}", flush=True)

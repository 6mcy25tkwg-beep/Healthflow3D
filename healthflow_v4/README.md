# HealthFlow v3 (standalone)

Independent from the original project: own database (`healthflow_v3.db`,
created empty on first run), own session cookie, default port 5003.

## Run
    python -m venv venv
    venv\Scripts\activate          (Windows)  |  source venv/bin/activate (Mac/Linux)
    python -m pip install -r requirements.txt
    python app.py
Open http://127.0.0.1:5003

## Features
- BMI, water, sleep, daily habits, weekly charts, Japanese / English
- 3D lucky-cat celebration (with meow + voice) for:
  water goal, sleep goal, completing a habit, completing ALL habits
- Notable calendar: click any day to add notes, timed activities, tick habits
  (browse any month with the arrows)

## Cat celebration rules
- Plays the moment you reach the goal (8 glasses of water / 7 hours of sleep).
- If you come back later the same day it does NOT disappear: it plays once
  per day when you return, and a 🐱 button on the Water / Sleep card replays it.
- Preview any time: /dashboard?preview=water | sleep | habit | habit_all

## Settings (environment variables)
- WATER_GOAL (default 8), SLEEP_GOAL (default 7)
- SECRET_KEY, DATABASE_PATH, PORT, FLASK_DEBUG=1 (dev only)
- Quick test: `WATER_GOAL=1 python app.py` (Windows Git Bash works too)

## Changes vs the uploaded healthflow3d
- New sleep goal + sleep cat; goal bar on the Sleep card
- Celebration no longer disappears (once per day on return + replay buttons)
- Sleep per day is the TOTAL of entries (was latest / average)
- Login lasts 30 days; secret key persists; debug off by default
- Separate DB / cookie / port so it never touches the old project

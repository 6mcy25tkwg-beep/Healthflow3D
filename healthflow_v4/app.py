
import os
import re
import sqlite3
import calendar
from datetime import date, datetime, timedelta
from functools import wraps

from flask import (
    Flask, render_template, request, redirect,
    url_for, session, flash, jsonify, get_flashed_messages
)
from werkzeug.security import (
    generate_password_hash, check_password_hash
)

app = Flask(__name__)
def load_secret_key():
    """SECRET_KEY env var, else create one once and reuse it so
    login sessions survive server restarts."""
    env_key = os.environ.get("SECRET_KEY")
    if env_key:
        return env_key
    key_file = os.path.join(app.root_path, ".secret_key")
    if os.path.exists(key_file):
        with open(key_file) as f:
            return f.read().strip()
    key = os.urandom(32).hex()
    with open(key_file, "w") as f:
        f.write(key)
    return key


app.config["SECRET_KEY"] = load_secret_key()
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)
app.config["SESSION_COOKIE_NAME"] = "healthflow_v3_session"
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

DB = os.environ.get(
    "DATABASE_PATH",
    os.path.join(app.root_path, "healthflow_v3.db")
)

# Daily goals that trigger the cat celebration
# (change here, or with environment variables)
WATER_GOAL = int(os.environ.get("WATER_GOAL", 8))        # glasses
SLEEP_GOAL = float(os.environ.get("SLEEP_GOAL", 7))      # hours

# BMI levels (WHO adult cut-offs)
BMI_LEVEL_EN = {
    "under": "Underweight",
    "normal": "Normal",
    "over": "Overweight",
    "obese": "Obese",
    "child": "BMI-for-age needed"
}


def bmi_level(bmi, age=None):
    """Return under / normal / over / obese, or child for ages under 20.

    Adult cut-offs do not apply to children and teenagers, who need
    age- and sex-specific BMI-for-age charts.
    """
    if age is not None and age < 20:
        return "child"

    if bmi < 18.5:
        return "under"
    if bmi < 25:
        return "normal"
    if bmi < 30:
        return "over"
    return "obese"


app.add_template_global(bmi_level, "bmi_level")
app.add_template_global(BMI_LEVEL_EN, "BMI_LEVEL_EN")


def db_connection():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with db_connection() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            age INTEGER NOT NULL,
            height REAL NOT NULL,
            weight REAL NOT NULL,
            bmi REAL NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS water (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            glasses INTEGER NOT NULL,
            entry_date TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS sleep (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            hours REAL NOT NULL,
            entry_date TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS habits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS habit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            habit_id INTEGER NOT NULL,
            entry_date TEXT NOT NULL,
            UNIQUE(user_id, habit_id, entry_date),
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(habit_id) REFERENCES habits(id)
        );

        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            entry_date TEXT NOT NULL,
            content TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            entry_date TEXT NOT NULL,
            title TEXT NOT NULL,
            start_time TEXT NOT NULL DEFAULT '',
            done INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        """)


def login_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return func(*args, **kwargs)
    return wrapper


def valid_date(value):
    parsed = date.fromisoformat(value)
    if parsed > date.today():
        raise ValueError("Future dates are not allowed")
    return parsed.isoformat()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        if not 3 <= len(username) <= 50 or len(password) < 8:
            flash("Username: 3–50 characters. Password: at least 8.")
            return redirect(url_for("register"))

        try:
            with db_connection() as conn:
                conn.execute(
                    "INSERT INTO users(username,password) VALUES(?,?)",
                    (username, generate_password_hash(password))
                )
            flash("Account created. Please log in.")
            return redirect(url_for("login"))
        except sqlite3.IntegrityError:
            flash("Username already exists.")

    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        with db_connection() as conn:
            user = conn.execute(
                "SELECT * FROM users WHERE username=?",
                (username,)
            ).fetchone()

        if user and check_password_hash(user["password"], password):
            session.clear()
            session.permanent = True
            session["user_id"] = user["id"]
            session["username"] = user["username"]
            return redirect(url_for("dashboard"))

        flash("Invalid username or password.")

    return render_template("login.html")


@app.route("/logout", methods=["POST"])
@login_required
def logout():
    session.clear()
    return redirect(url_for("index"))


@app.route("/save/<kind>", methods=["POST"])
@login_required
def save(kind):
    user_id = session["user_id"]
    today = date.today().isoformat()
    celebrate = None
    ok = True

    try:
        with db_connection() as conn:
            if kind == "bmi":
                age = int(request.form["age"])
                height = float(request.form["height"])
                weight = float(request.form["weight"])

                if not (2 <= age <= 120 and
                        50 <= height <= 250 and
                        5 <= weight <= 400):
                    raise ValueError("Invalid measurement")

                bmi = round(weight / ((height / 100) ** 2), 1)

                conn.execute("""
                    INSERT INTO records
                    (user_id,age,height,weight,bmi,created_at)
                    VALUES(?,?,?,?,?,?)
                """, (
                    user_id, age, height, weight, bmi,
                    datetime.now().strftime("%Y-%m-%d %H:%M")
                ))

            elif kind == "water":
                glasses = int(request.form["glasses"])
                entry_date = valid_date(request.form["entry_date"])

                if not 1 <= glasses <= 30:
                    raise ValueError("Invalid water entry")

                conn.execute("""
                    INSERT INTO water(user_id,glasses,entry_date)
                    VALUES(?,?,?)
                """, (user_id, glasses, entry_date))

                if entry_date == today:
                    total = conn.execute("""
                        SELECT COALESCE(SUM(glasses), 0) FROM water
                        WHERE user_id=? AND entry_date=?
                    """, (user_id, today)).fetchone()[0]

                    # Celebrate only the moment the goal is first reached
                    if total - glasses < WATER_GOAL <= total:
                        celebrate = {"type": "water", "goal": WATER_GOAL}

            elif kind == "sleep":
                hours = float(request.form["hours"])
                entry_date = valid_date(request.form["entry_date"])

                if not 0 <= hours <= 24:
                    raise ValueError("Invalid sleep entry")

                conn.execute("""
                    INSERT INTO sleep(user_id,hours,entry_date)
                    VALUES(?,?,?)
                """, (user_id, hours, entry_date))

                if entry_date == today:
                    total = conn.execute("""
                        SELECT COALESCE(SUM(hours), 0) FROM sleep
                        WHERE user_id=? AND entry_date=?
                    """, (user_id, today)).fetchone()[0]

                    if total - hours < SLEEP_GOAL <= total:
                        celebrate = {"type": "sleep", "goal": SLEEP_GOAL}

            elif kind == "habit":
                title = request.form.get("title", "").strip()

                if not 1 <= len(title) <= 80:
                    raise ValueError("Invalid habit name")

                conn.execute("""
                    INSERT INTO habits(user_id,title)
                    VALUES(?,?)
                """, (user_id, title))

            elif kind == "habit_done":
                habit_id = int(request.form["habit_id"])
                entry_date = valid_date(request.form["entry_date"])

                habit = conn.execute("""
                    SELECT id FROM habits
                    WHERE id=? AND user_id=?
                """, (habit_id, user_id)).fetchone()

                if not habit:
                    raise ValueError("Habit not found")

                existing = conn.execute("""
                    SELECT id FROM habit_logs
                    WHERE user_id=? AND habit_id=? AND entry_date=?
                """, (user_id, habit_id, entry_date)).fetchone()

                if existing:
                    conn.execute(
                        "DELETE FROM habit_logs WHERE id=?",
                        (existing["id"],)
                    )
                else:
                    conn.execute("""
                        INSERT INTO habit_logs
                        (user_id,habit_id,entry_date)
                        VALUES(?,?,?)
                    """, (user_id, habit_id, entry_date))

                    if entry_date == today:
                        total_habits = conn.execute(
                            "SELECT COUNT(*) FROM habits WHERE user_id=?",
                            (user_id,)
                        ).fetchone()[0]

                        done_count = conn.execute("""
                            SELECT COUNT(*) FROM habit_logs
                            WHERE user_id=? AND entry_date=?
                        """, (user_id, today)).fetchone()[0]

                        celebrate = {
                            "type": "habit",
                            "all": total_habits > 0 and done_count >= total_habits
                        }

            else:
                flash("Unknown action.")
                return redirect(url_for("dashboard"))

        flash("Saved successfully.")

    except (ValueError, KeyError, OverflowError, sqlite3.Error):
        ok = False
        flash("Please check the information and try again.")

    # The dashboard JavaScript sends this header so it can play the
    # celebration without a page reload
    requested_with = request.headers.get("X-Requested-With")

    if requested_with in ("fetch", "fetch-quiet"):
        if requested_with == "fetch-quiet":
            get_flashed_messages()  # used by the calendar panel: no flash later

        return jsonify(ok=ok, celebrate=celebrate)

    return redirect(url_for("dashboard"))


@app.route("/delete/<kind>/<int:item_id>", methods=["POST"])
@login_required
def delete(kind, item_id):
    tables = {
        "bmi": "records",
        "water": "water",
        "sleep": "sleep",
        "habit": "habits"
    }

    table = tables.get(kind)

    if table:
        with db_connection() as conn:
            if kind == "habit":
                conn.execute("""
                    DELETE FROM habit_logs
                    WHERE habit_id=? AND user_id=?
                """, (item_id, session["user_id"]))

            conn.execute(
                f"DELETE FROM {table} WHERE id=? AND user_id=?",
                (item_id, session["user_id"])
            )

    return redirect(url_for("dashboard"))


# ------------------------------------------------------------
# Calendar day API (notes, activities, habits for one date)
# ------------------------------------------------------------

TIME_PATTERN = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def parse_day(value):
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        return None

    if not 2000 <= parsed.year <= 2100:
        return None

    return parsed.isoformat()


def day_payload(conn, user_id, day):
    notes = conn.execute(
        "SELECT id, content FROM notes "
        "WHERE user_id=? AND entry_date=? ORDER BY id",
        (user_id, day)
    ).fetchall()

    activities = conn.execute("""
        SELECT id, title, start_time, done FROM activities
        WHERE user_id=? AND entry_date=?
        ORDER BY CASE WHEN start_time='' THEN 1 ELSE 0 END, start_time, id
    """, (user_id, day)).fetchall()

    habits = conn.execute("""
        SELECT h.id, h.title,
               (SELECT COUNT(*) FROM habit_logs l
                WHERE l.habit_id=h.id AND l.user_id=h.user_id
                  AND l.entry_date=?) AS done
        FROM habits h
        WHERE h.user_id=?
        ORDER BY h.id
    """, (day, user_id)).fetchall()

    water = conn.execute(
        "SELECT COALESCE(SUM(glasses), 0) FROM water "
        "WHERE user_id=? AND entry_date=?",
        (user_id, day)
    ).fetchone()[0]

    sleep_total = conn.execute(
        "SELECT SUM(hours) FROM sleep WHERE user_id=? AND entry_date=?",
        (user_id, day)
    ).fetchone()[0]

    record_count = conn.execute(
        "SELECT COUNT(*) FROM records "
        "WHERE user_id=? AND substr(created_at,1,10)=?",
        (user_id, day)
    ).fetchone()[0]

    habit_items = [
        {"id": h["id"], "title": h["title"], "done": bool(h["done"])}
        for h in habits
    ]

    return {
        "date": day,
        "water": water,
        "sleep": round(sleep_total, 1) if sleep_total is not None else None,
        "habits": habit_items,
        "activities": [
            {
                "id": a["id"],
                "title": a["title"],
                "time": a["start_time"],
                "done": bool(a["done"])
            }
            for a in activities
        ],
        "notes": [{"id": n["id"], "content": n["content"]} for n in notes],
        "marks": {
            "log": bool(
                water > 0 or sleep_total is not None or record_count > 0
                or any(h["done"] for h in habit_items)
            ),
            "note": bool(notes),
            "act": bool(activities)
        }
    }


@app.route("/api/day/<day>")
@login_required
def api_day(day):
    day = parse_day(day)

    if not day:
        return jsonify(error="Invalid date"), 400

    with db_connection() as conn:
        return jsonify(day_payload(conn, session["user_id"], day))


@app.route("/api/day/<day>/note", methods=["POST"])
@login_required
def api_add_note(day):
    day = parse_day(day)
    body = request.get_json(silent=True) or {}
    content = str(body.get("content", "")).strip()

    if not day or not 1 <= len(content) <= 500:
        return jsonify(error="Invalid note"), 400

    user_id = session["user_id"]

    with db_connection() as conn:
        count = conn.execute(
            "SELECT COUNT(*) FROM notes WHERE user_id=? AND entry_date=?",
            (user_id, day)
        ).fetchone()[0]

        if count >= 20:
            return jsonify(error="Too many notes for this day"), 400

        conn.execute(
            "INSERT INTO notes(user_id,entry_date,content) VALUES(?,?,?)",
            (user_id, day, content)
        )

        return jsonify(day_payload(conn, user_id, day))


@app.route("/api/note/<int:note_id>/delete", methods=["POST"])
@login_required
def api_delete_note(note_id):
    user_id = session["user_id"]

    with db_connection() as conn:
        row = conn.execute(
            "SELECT entry_date FROM notes WHERE id=? AND user_id=?",
            (note_id, user_id)
        ).fetchone()

        if not row:
            return jsonify(error="Not found"), 404

        conn.execute(
            "DELETE FROM notes WHERE id=? AND user_id=?",
            (note_id, user_id)
        )

        return jsonify(day_payload(conn, user_id, row["entry_date"]))


@app.route("/api/day/<day>/activity", methods=["POST"])
@login_required
def api_add_activity(day):
    day = parse_day(day)
    body = request.get_json(silent=True) or {}
    title = str(body.get("title", "")).strip()
    start_time = str(body.get("time", "")).strip()

    valid_time = start_time == "" or TIME_PATTERN.match(start_time)

    if not day or not 1 <= len(title) <= 80 or not valid_time:
        return jsonify(error="Invalid activity"), 400

    user_id = session["user_id"]

    with db_connection() as conn:
        count = conn.execute(
            "SELECT COUNT(*) FROM activities WHERE user_id=? AND entry_date=?",
            (user_id, day)
        ).fetchone()[0]

        if count >= 30:
            return jsonify(error="Too many activities for this day"), 400

        conn.execute(
            "INSERT INTO activities(user_id,entry_date,title,start_time) "
            "VALUES(?,?,?,?)",
            (user_id, day, title, start_time)
        )

        return jsonify(day_payload(conn, user_id, day))


@app.route("/api/activity/<int:activity_id>/toggle", methods=["POST"])
@login_required
def api_toggle_activity(activity_id):
    user_id = session["user_id"]

    with db_connection() as conn:
        row = conn.execute(
            "SELECT entry_date FROM activities WHERE id=? AND user_id=?",
            (activity_id, user_id)
        ).fetchone()

        if not row:
            return jsonify(error="Not found"), 404

        conn.execute(
            "UPDATE activities SET done = 1 - done WHERE id=? AND user_id=?",
            (activity_id, user_id)
        )

        return jsonify(day_payload(conn, user_id, row["entry_date"]))


@app.route("/api/activity/<int:activity_id>/delete", methods=["POST"])
@login_required
def api_delete_activity(activity_id):
    user_id = session["user_id"]

    with db_connection() as conn:
        row = conn.execute(
            "SELECT entry_date FROM activities WHERE id=? AND user_id=?",
            (activity_id, user_id)
        ).fetchone()

        if not row:
            return jsonify(error="Not found"), 404

        conn.execute(
            "DELETE FROM activities WHERE id=? AND user_id=?",
            (activity_id, user_id)
        )

        return jsonify(day_payload(conn, user_id, row["entry_date"]))


@app.route("/dashboard")
@login_required
def dashboard():
    user_id = session["user_id"]
    today = date.today()
    today_str = today.isoformat()
    week_start = today - timedelta(days=6)

    with db_connection() as conn:
        records = conn.execute("""
            SELECT * FROM records WHERE user_id=?
            ORDER BY id DESC LIMIT 30
        """, (user_id,)).fetchall()

        water = conn.execute("""
            SELECT * FROM water WHERE user_id=?
            ORDER BY entry_date DESC,id DESC LIMIT 50
        """, (user_id,)).fetchall()

        sleep = conn.execute("""
            SELECT * FROM sleep WHERE user_id=?
            ORDER BY entry_date DESC,id DESC LIMIT 50
        """, (user_id,)).fetchall()

        habits = conn.execute("""
            SELECT * FROM habits WHERE user_id=?
            ORDER BY id DESC
        """, (user_id,)).fetchall()

        habit_logs = conn.execute("""
            SELECT * FROM habit_logs WHERE user_id=?
        """, (user_id,)).fetchall()

        water_week = conn.execute("""
            SELECT entry_date,SUM(glasses) AS total
            FROM water
            WHERE user_id=? AND entry_date BETWEEN ? AND ?
            GROUP BY entry_date
        """, (user_id, week_start.isoformat(), today_str)).fetchall()

        sleep_week = conn.execute("""
            SELECT entry_date,SUM(hours) AS total
            FROM sleep
            WHERE user_id=? AND entry_date BETWEEN ? AND ?
            GROUP BY entry_date
        """, (user_id, week_start.isoformat(), today_str)).fetchall()

    done_today = {
        log["habit_id"] for log in habit_logs
        if log["entry_date"] == today_str
    }

    water_today = sum(
        row["glasses"] for row in water
        if row["entry_date"] == today_str
    )

    sleep_entries_today = [
        row["hours"] for row in sleep
        if row["entry_date"] == today_str
    ]
    sleep_today = (
        round(sum(sleep_entries_today), 1) if sleep_entries_today else None
    )

    dates = [
        (week_start + timedelta(days=i)).isoformat()
        for i in range(7)
    ]

    water_map = {
        row["entry_date"]: row["total"]
        for row in water_week
    }

    sleep_map = {
        row["entry_date"]: row["total"]
        for row in sleep_week
    }

    weekly = {
        "labels": dates,
        "water": [water_map.get(day, 0) for day in dates],
        "sleep": [round(sleep_map.get(day, 0), 1) for day in dates],
        "habit_count": sum(
            1 for log in habit_logs
            if week_start.isoformat() <= log["entry_date"] <= today_str
        )
    }

    # Calendar: any month (?month=YYYY-MM), Monday first
    month_arg = request.args.get("month", "")

    try:
        year_text, month_text = month_arg.split("-")
        view_first = date(int(year_text), int(month_text), 1)

        if not 2000 <= view_first.year <= 2100:
            raise ValueError("Year out of range")
    except ValueError:
        view_first = today.replace(day=1)

    cal = calendar.Calendar(firstweekday=0)
    month_weeks = cal.monthdatescalendar(view_first.year, view_first.month)
    range_start = month_weeks[0][0].isoformat()
    range_end = month_weeks[-1][-1].isoformat()

    def dates_between(conn, sql):
        rows = conn.execute(sql, (user_id, range_start, range_end)).fetchall()
        return {row[0] for row in rows}

    with db_connection() as conn:
        log_dates = (
            dates_between(conn,
                "SELECT DISTINCT entry_date FROM water "
                "WHERE user_id=? AND entry_date BETWEEN ? AND ?")
            | dates_between(conn,
                "SELECT DISTINCT entry_date FROM sleep "
                "WHERE user_id=? AND entry_date BETWEEN ? AND ?")
            | dates_between(conn,
                "SELECT DISTINCT entry_date FROM habit_logs "
                "WHERE user_id=? AND entry_date BETWEEN ? AND ?")
            | dates_between(conn,
                "SELECT DISTINCT substr(created_at,1,10) FROM records "
                "WHERE user_id=? AND substr(created_at,1,10) BETWEEN ? AND ?")
        )

        note_dates = dates_between(conn,
            "SELECT DISTINCT entry_date FROM notes "
            "WHERE user_id=? AND entry_date BETWEEN ? AND ?")

        activity_dates = dates_between(conn,
            "SELECT DISTINCT entry_date FROM activities "
            "WHERE user_id=? AND entry_date BETWEEN ? AND ?")

    calendar_weeks = [
        [
            {
                "day": day.day,
                "date": day.isoformat(),
                "current_month": day.month == view_first.month,
                "log": day.isoformat() in log_dates,
                "note": day.isoformat() in note_dates,
                "act": day.isoformat() in activity_dates,
                "today": day == today
            }
            for day in week
        ]
        for week in month_weeks
    ]

    prev_month = (view_first - timedelta(days=1)).strftime("%Y-%m")
    next_month = (
        (view_first + timedelta(days=32)).replace(day=1).strftime("%Y-%m")
    )

    chart_records = list(reversed(records))

    bmi_chart = {
        "labels": [r["created_at"] for r in chart_records],
        "values": [r["bmi"] for r in chart_records]
    }

    # BMI level for the newest measurement
    level_info = None

    if records:
        newest = records[0]
        height_m = newest["height"] / 100
        bmi_value = newest["bmi"]

        level_info = {
            "key": bmi_level(bmi_value, newest["age"]),
            "bmi": bmi_value,
            "adult": newest["age"] >= 20,
            # position on the 15 to 40 scale bar, in percent
            "marker": round((min(max(bmi_value, 15), 40) - 15) / 25 * 100, 1),
            # weight range that gives BMI 18.5 to 24.9 at this height
            "low": round(18.5 * height_m ** 2, 1),
            "high": round(24.9 * height_m ** 2, 1)
        }

    preview = request.args.get("preview")
    if preview not in ("water", "sleep", "habit", "habit_all"):
        preview = None

    return render_template(
        "dashboard.html",
        water_goal=WATER_GOAL,
        level_info=level_info,
        preview=preview,
        today=today_str,
        latest=records[0] if records else None,
        records=records,
        water=water[:10],
        sleep=sleep[:10],
        habits=habits,
        done_today=done_today,
        water_today=water_today,
        sleep_today=sleep_today,
        sleep_goal=SLEEP_GOAL,
        sleep_goal_label=f"{SLEEP_GOAL:g}",
        weekly=weekly,
        bmi_chart=bmi_chart,
        calendar_weeks=calendar_weeks,
        month_label=view_first.strftime("%B %Y"),
        cal_year=view_first.year,
        cal_month=view_first.month,
        prev_month=prev_month,
        next_month=next_month,
        is_current_month=(view_first == today.replace(day=1))
    )


init_db()

if __name__ == "__main__":
    app.run(
        debug=os.environ.get("FLASK_DEBUG") == "1",
        port=int(os.environ.get("PORT", 5003))
    )

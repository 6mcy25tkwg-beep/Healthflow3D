// ====================================
// Interactive calendar
//  - Tap a date to open a panel for that day
//  - Add notes, activities (with optional time) and habits
//  - Tick habits for that date (celebrates too!)
// ====================================

(function () {
    "use strict";

    const panel = document.getElementById("dayPanel");
    const backdrop = document.getElementById("dayBackdrop");
    const grid = document.querySelector(".calendar-grid");

    if (!panel || !grid) return;

    const $ = id => document.getElementById(id);
    const todayStr = panel.dataset.today;

    let currentDate = null;
    let data = null;
    let dirty = false;      // something changed that the page stats show
    let lastCell = null;


    // ------------------------------------
    // Helpers
    // ------------------------------------

    function lang() {
        return localStorage.getItem("healthLanguage") === "en" ? "en" : "ja";
    }

    function locale() {
        return lang() === "ja" ? "ja-JP" : "en-US";
    }

    function t(key) {
        const all = typeof translations !== "undefined" ? translations : {};
        return (all[lang()] && all[lang()][key]) ||
               (all.en && all.en[key]) || key;
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    async function request(method, url, body) {
        const options = {
            method: method,
            headers: { "X-Requested-With": "fetch-quiet" },
            credentials: "same-origin"
        };

        if (body instanceof FormData) {
            options.body = body;
        } else if (body) {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(body);
        }

        const res = await fetch(url, options);
        if (!res.ok) throw new Error("HTTP " + res.status);

        return res.json(); // throws if the server sent a login page
    }

    function showError(show) {
        $("dayError").hidden = show === false;
    }

    function formatDate(iso) {
        const d = new Date(iso + "T00:00:00");

        return new Intl.DateTimeFormat(locale(), {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long"
        }).format(d);
    }


    // ------------------------------------
    // Month label and placeholders follow the language
    // ------------------------------------

    function refreshMonthLabel() {
        const label = $("monthLabel");
        if (!label) return;

        const d = new Date(Number(label.dataset.year), Number(label.dataset.month) - 1, 1);

        label.textContent = new Intl.DateTimeFormat(locale(), {
            year: "numeric",
            month: "long"
        }).format(d);
    }

    function applyPlaceholders() {
        $("dayHabitInput").placeholder = t("habitHint");
        $("dayActivityInput").placeholder = t("activityHint");
        $("dayNoteInput").placeholder = t("noteHint");
    }

    const baseSetLanguage = window.setLanguage;

    if (typeof baseSetLanguage === "function") {
        window.setLanguage = function (l) {
            baseSetLanguage(l);
            refreshMonthLabel();
            applyPlaceholders();
            if (!panel.hidden && data) render();
        };
    }

    refreshMonthLabel();
    applyPlaceholders();


    // ------------------------------------
    // Rendering
    // ------------------------------------

    function updateCell(date, marks) {
        const cell = grid.querySelector('[data-date="' + date + '"]');
        if (!cell) return;

        let dots = cell.querySelector(".day-dots");

        if (!dots) {
            dots = el("span", "day-dots");
            cell.appendChild(dots);
        }

        dots.textContent = "";

        ["log", "note", "act"].forEach(kind => {
            if (marks[kind]) dots.appendChild(el("span", "day-dot dot-" + kind));
        });

        cell.classList.toggle("has-activity", !!marks.log);
    }

    function emptyNote(key) {
        return el("p", "small-note", t(key));
    }

    function render() {
        $("dayTitle").textContent = formatDate(data.date);

        // Summary chips
        const summary = $("daySummary");
        summary.textContent = "";
        summary.appendChild(el("span", "chip",
            t("waterShort") + ": " + data.water + " " + t("glassesUnit")));
        summary.appendChild(el("span", "chip",
            t("sleepShort") + ": " + (data.sleep === null ? "--" : data.sleep + " h")));

        // Habits
        const habitBox = $("dayHabits");
        habitBox.textContent = "";

        const isFuture = data.date > todayStr;

        if (data.habits.length === 0) {
            habitBox.appendChild(emptyNote("noHabits"));
        }

        data.habits.forEach(habit => {
            const row = el("div", "habit-row");

            const check = el("button", "habit-check" + (habit.done ? " checked" : ""),
                habit.done ? "✓" : "○");
            check.type = "button";
            check.disabled = isFuture;
            check.setAttribute("aria-label", habit.title);
            check.addEventListener("click", () => toggleHabit(habit));

            row.appendChild(check);
            row.appendChild(el("span", "", habit.title));
            habitBox.appendChild(row);
        });

        if (isFuture && data.habits.length) {
            habitBox.appendChild(emptyNote("futureHabit"));
        }

        // Activities
        const actBox = $("dayActivities");
        actBox.textContent = "";

        if (data.activities.length === 0) {
            actBox.appendChild(emptyNote("noActivities"));
        }

        data.activities.forEach(act => {
            const row = el("div", "habit-row activity-row" + (act.done ? " is-done" : ""));

            const check = el("button", "habit-check" + (act.done ? " checked" : ""),
                act.done ? "✓" : "○");
            check.type = "button";
            check.setAttribute("aria-label", act.title);
            check.addEventListener("click", () => act_action("toggle", act.id));

            const label = el("span", "activity-title");
            if (act.time) label.appendChild(el("b", "activity-time", act.time));
            label.appendChild(document.createTextNode(act.title));

            const del = el("button", "delete-btn", "×");
            del.type = "button";
            del.setAttribute("aria-label", "Delete");
            del.addEventListener("click", () => act_action("delete", act.id));

            row.appendChild(check);
            row.appendChild(label);
            row.appendChild(del);
            actBox.appendChild(row);
        });

        // Notes
        const noteBox = $("dayNotes");
        noteBox.textContent = "";

        if (data.notes.length === 0) {
            noteBox.appendChild(emptyNote("noNotes"));
        }

        data.notes.forEach(note => {
            const card = el("div", "note-card");
            card.appendChild(el("p", "", note.content));

            const del = el("button", "delete-btn", "×");
            del.type = "button";
            del.setAttribute("aria-label", "Delete");
            del.addEventListener("click", () => note_delete(note.id));

            card.appendChild(del);
            noteBox.appendChild(card);
        });

        updateCell(data.date, data.marks);
    }


    // ------------------------------------
    // Open / close
    // ------------------------------------

    function openDay(date, cell) {
        currentDate = date;
        lastCell = cell;
        data = null;
        showError(false);

        $("dayTitle").textContent = formatDate(date);
        ["dayHabits", "dayActivities", "dayNotes", "daySummary"].forEach(id => {
            $(id).textContent = "";
        });

        panel.hidden = false;
        backdrop.hidden = false;
        document.body.classList.add("no-scroll");
        $("dayClose").focus();

        load(date).catch(() => showError(true));
    }

    function closePanel() {
        if (panel.hidden) return;

        panel.hidden = true;
        backdrop.hidden = true;
        document.body.classList.remove("no-scroll");

        if (dirty) {
            // Habit changes affect the stat cards, so refresh the page
            location.hash = "calendar";
            location.reload();
            return;
        }

        if (lastCell) lastCell.focus();
    }

    async function load(date) {
        const payload = await request("GET", "/api/day/" + date);

        if (date === currentDate) {
            data = payload;
            render();
        }
    }

    grid.addEventListener("click", e => {
        const cell = e.target.closest(".calendar-day");
        if (cell) openDay(cell.dataset.date, cell);
    });

    $("dayClose").addEventListener("click", closePanel);
    backdrop.addEventListener("click", closePanel);

    document.addEventListener("keydown", e => {
        const celebrating = document.querySelector(".celebrate-overlay");
        if (e.key === "Escape" && !panel.hidden && !celebrating) closePanel();
    });


    // ------------------------------------
    // Actions
    // ------------------------------------

    async function toggleHabit(habit) {
        if (currentDate > todayStr) return;

        if (window.Celebrate) window.Celebrate.prime(); // allow sound

        try {
            showError(false);

            const form = new FormData();
            form.append("habit_id", habit.id);
            form.append("entry_date", currentDate);

            const result = await request("POST", "/save/habit_done", form);
            if (!result.ok) throw new Error("save failed");

            dirty = true;
            await load(currentDate);

            if (result.celebrate && window.Celebrate) {
                const c = result.celebrate;
                const type = c.type === "habit" && c.all ? "habit_all" : c.type;

                window.Celebrate.show(type, {
                    reload: false,
                    goal: window.celebrateGoal
                });
            }
        } catch (err) {
            showError(true);
        }
    }

    async function act_action(kind, id) {
        try {
            showError(false);
            data = await request("POST", "/api/activity/" + id + "/" + kind);
            render();
        } catch (err) {
            showError(true);
        }
    }

    async function note_delete(id) {
        try {
            showError(false);
            data = await request("POST", "/api/note/" + id + "/delete");
            render();
        } catch (err) {
            showError(true);
        }
    }

    $("dayHabitForm").addEventListener("submit", async e => {
        e.preventDefault();

        const input = $("dayHabitInput");
        const title = input.value.trim();
        if (!title) return;

        try {
            showError(false);

            const form = new FormData();
            form.append("title", title);

            const result = await request("POST", "/save/habit", form);
            if (!result.ok) throw new Error("save failed");

            input.value = "";
            dirty = true;
            await load(currentDate);
        } catch (err) {
            showError(true);
        }
    });

    $("dayActivityForm").addEventListener("submit", async e => {
        e.preventDefault();

        const input = $("dayActivityInput");
        const title = input.value.trim();
        if (!title) return;

        try {
            showError(false);

            data = await request("POST", "/api/day/" + currentDate + "/activity", {
                title: title,
                time: $("dayActivityTime").value
            });

            input.value = "";
            $("dayActivityTime").value = "";
            render();
        } catch (err) {
            showError(true);
        }
    });

    $("dayNoteForm").addEventListener("submit", async e => {
        e.preventDefault();

        const input = $("dayNoteInput");
        const content = input.value.trim();
        if (!content) return;

        try {
            showError(false);

            data = await request("POST", "/api/day/" + currentDate + "/note", {
                content: content
            });

            input.value = "";
            render();
        } catch (err) {
            showError(true);
        }
    });
})();

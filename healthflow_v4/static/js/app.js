
// ====================================
// Japanese / English Translations
// ====================================

const translations = {
    en: {
        dashboard: "Dashboard",
        login: "Login",
        logout: "Logout",
        register: "Register",
        username: "Username",
        password: "Password",

        heroTitle: "Your Health, Your Journey.",
        heroDesc: "Manage your wellness habits, measurements and daily records in one place.",
        getStarted: "Get Started →",
        bmiDesc: "Save and review BMI measurements.",
        habitsDesc: "Track sleep, water and everyday habits.",
        reportsDesc: "View your weekly records and charts.",
        loginDesc: "Welcome back to HealthFlow.",
        registerDesc: "Create your personal account.",

        hello: "Hello",
        dashboardDesc: "Your daily health and wellness overview.",
        latestBMI: "Latest BMI",
        referenceOnly: "Reference only",
        waterToday: "Water recorded today",
        sleepToday: "Sleep recorded today",
        habitsToday: "Habits completed today",
        glasses: "Glasses",
        hours: "Hours",
        completed: "Completed",

        bmiHistory: "BMI History",
        waterTracker: "Water Tracker",
        sleepTracker: "Sleep Tracker",
        date: "Date",
        age: "Age",
        height: "Height (cm)",
        weight: "Weight (kg)",
        sleepHours: "Sleep Hours",
        saveWater: "Save Water",
        waterGoal: "Daily goal",
        sleepGoal: "Daily goal",
        saveSleep: "Save Sleep",

        weeklyReport: "Weekly Health Report",
        waterEntries: "Water recorded",
        averageSleep: "Average recorded sleep",
        habitCompletions: "Habit completions",

        activityCalendar: "Activity Calendar",
        calendarNote: "Tap a date to add notes, activities and habits. Green: records, yellow: notes, purple: activities.",
        mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
        todayBtn: "Today",
        dayHabits: "Habits",
        dayActivities: "Activities",
        dayNotes: "Notes",
        habitsRepeat: "Habits repeat every day.",
        addNote: "Add note",
        addActivity: "Add activity",
        noteHint: "Write a note for this day",
        activityHint: "e.g. Soccer practice",
        habitHint: "e.g. Read for 20 minutes",
        noNotes: "No notes yet.",
        noActivities: "No activities yet.",
        futureHabit: "Habits can be checked for today or past days only.",
        saveError: "Could not save. Please try again.",
        waterShort: "Water",
        sleepShort: "Sleep",
        glassesUnit: "glasses",
        measurementHistory: "Measurement History",
        noRecords: "No records yet.",
        delete: "Delete",

        bmiCalculator: "BMI Calculator",
        calculatorDesc: "Record a new BMI measurement.",
        calculate: "Calculate & Save",
        bmiLevel: "BMI Level",
        levelCol: "Level",
        lv_under: "Underweight",
        lv_normal: "Normal",
        lv_over: "Overweight",
        lv_obese: "Obese",
        lv_child: "BMI-for-age needed",
        rng_under: "Below 18.5",
        rng_normal: "18.5 – 24.9",
        rng_over: "25.0 – 29.9",
        rng_obese: "30.0 and above",
        healthyRange: "Normal range for your height",
        levelEmpty: "Save a measurement with the BMI calculator to see your level.",
        levelChild: "Adult levels do not apply under age 20. Ask a doctor or school nurse for a BMI-for-age check.",
        levelNote: "Based on WHO adult categories. Japan's guideline calls BMI 25 and above \"obesity\". BMI is a reference only, not a diagnosis.",
        bmiDisclaimer: "BMI is not a diagnosis. Under age 20, age- and sex-specific BMI-for-age assessment is needed.",

        habitPlanner: "Daily Habit Planner",
        newHabit: "New Habit",
        addHabit: "Add Habit",
        noHabits: "Add your first daily habit.",

        foodAdvice: "Food Advice",
        foodIntro: "Simple ideas for balanced everyday meals.",
        breakfast: "Breakfast",
        lunch: "Lunch",
        dinner: "Dinner",
        breakfastTip: "Rice or toast, egg or tofu, and fruit.",
        lunchTip: "Rice, fish or beans, and vegetables.",
        dinnerTip: "A varied meal with grains, protein and vegetables.",
        foodNote: "General meal ideas only, not personalized medical advice."
    },

    ja: {
        dashboard: "ダッシュボード",
        login: "ログイン",
        logout: "ログアウト",
        register: "新規登録",
        username: "ユーザー名",
        password: "パスワード",

        heroTitle: "あなたの健康、あなたのペースで。",
        heroDesc: "毎日の生活習慣や測定記録をまとめて管理できます。",
        getStarted: "はじめる →",
        bmiDesc: "BMIの測定記録を保存・確認できます。",
        habitsDesc: "睡眠・水分・毎日の習慣を記録できます。",
        reportsDesc: "週間レポートとグラフを確認できます。",
        loginDesc: "HealthFlowへようこそ。",
        registerDesc: "アカウントを作成しましょう。",

        hello: "こんにちは",
        dashboardDesc: "毎日の健康管理を確認しましょう。",
        latestBMI: "最新のBMI",
        referenceOnly: "参考値",
        waterToday: "今日の水分記録",
        sleepToday: "今日の睡眠記録",
        habitsToday: "今日の習慣達成数",
        glasses: "杯",
        hours: "時間",
        completed: "達成",

        bmiHistory: "BMIの推移",
        waterTracker: "水分記録",
        sleepTracker: "睡眠記録",
        date: "日付",
        age: "年齢",
        height: "身長 (cm)",
        weight: "体重 (kg)",
        sleepHours: "睡眠時間",
        saveWater: "水分を記録",
        waterGoal: "1日の目標",
        sleepGoal: "1日の目標",
        saveSleep: "睡眠を記録",

        weeklyReport: "週間健康レポート",
        waterEntries: "記録した水分量",
        averageSleep: "記録した平均睡眠時間",
        habitCompletions: "習慣の達成回数",

        activityCalendar: "活動カレンダー",
        calendarNote: "日付をタップしてメモ・活動・習慣を追加できます。緑：記録、黄：メモ、紫：活動。",
        mon: "月", tue: "火", wed: "水", thu: "木", fri: "金", sat: "土", sun: "日",
        todayBtn: "今日",
        dayHabits: "習慣",
        dayActivities: "活動・予定",
        dayNotes: "メモ",
        habitsRepeat: "習慣は毎日繰り返されます。",
        addNote: "メモを追加",
        addActivity: "活動を追加",
        noteHint: "この日のメモを書く",
        activityHint: "例：サッカーの練習",
        habitHint: "例：20分読書する",
        noNotes: "まだメモがありません。",
        noActivities: "まだ活動がありません。",
        futureHabit: "習慣のチェックは今日か過去の日付のみ可能です。",
        saveError: "保存できませんでした。もう一度お試しください。",
        waterShort: "水分",
        sleepShort: "睡眠",
        glassesUnit: "杯",
        measurementHistory: "測定履歴",
        noRecords: "まだ記録がありません。",
        delete: "削除",

        bmiCalculator: "BMI計算",
        calculatorDesc: "新しい測定記録を追加します。",
        calculate: "計算して保存",
        bmiLevel: "BMIの判定",
        levelCol: "判定",
        lv_under: "低体重（やせ）",
        lv_normal: "普通体重",
        lv_over: "過体重（太りぎみ）",
        lv_obese: "肥満",
        lv_child: "年齢別BMIが必要",
        rng_under: "18.5未満",
        rng_normal: "18.5〜24.9",
        rng_over: "25.0〜29.9",
        rng_obese: "30.0以上",
        healthyRange: "あなたの身長の標準体重の範囲",
        levelEmpty: "BMI計算で測定を保存すると、判定が表示されます。",
        levelChild: "20歳未満には成人の判定は当てはまりません。年齢別のBMI評価は医師や保健の先生に相談してください。",
        levelNote: "WHOの成人基準に基づく目安です。日本肥満学会ではBMI 25以上を「肥満」と判定します。診断ではありません。",
        bmiDisclaimer: "BMIだけで健康状態を診断することはできません。20歳未満の場合は、年齢や性別に応じたBMI評価が必要です。",

        habitPlanner: "毎日の習慣プランナー",
        newHabit: "新しい習慣",
        addHabit: "習慣を追加",
        noHabits: "最初の習慣を追加しましょう。",

        foodAdvice: "食事アドバイス",
        foodIntro: "毎日のバランスのよい食事のヒント。",
        breakfast: "朝食",
        lunch: "昼食",
        dinner: "夕食",
        breakfastTip: "ご飯やパン、卵や豆腐、果物など。",
        lunchTip: "ご飯、魚や豆類、野菜など。",
        dinnerTip: "主食・たんぱく質・野菜を組み合わせた食事。",
        foodNote: "一般的な食事のヒントであり、個別の医療アドバイスではありません。"
    }
};


// ====================================
// Language Switch
// ====================================

function setLanguage(lang) {
    const dictionary = translations[lang];

    if (!dictionary) return;

    localStorage.setItem("healthLanguage", lang);
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach(element => {
        const key = element.dataset.i18n;

        if (dictionary[key] !== undefined) {
            element.textContent = dictionary[key];
        }
    });

    document.querySelectorAll(".lang-btn").forEach(button => {
        const buttonLang =
            button.textContent.trim() === "日本語" ? "ja" : "en";

        button.classList.toggle("active", buttonLang === lang);
    });
}


// ====================================
// Chart Helper
// ====================================

function makeChart(canvasId, type, labels, values, label, color) {
    const canvas = document.getElementById(canvasId);

    if (!canvas || typeof Chart === "undefined") return;

    Chart.defaults.font.family = '"Zen Maru Gothic", sans-serif';
    Chart.defaults.color = "#6d8580";

    new Chart(canvas, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: values,
                borderColor: color,
                backgroundColor: color + "33",
                borderWidth: 3,
                borderRadius: 7,
                tension: 0.35,
                fill: type === "line",
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    beginAtZero: type === "bar",
                    grid: { color: "#e3ece7" }
                }
            }
        }
    });
}


// ====================================
// Dashboard Charts
// ====================================

function loadDashboardCharts() {
    if (!window.healthData) return;

    const bmi = window.healthData.bmi;
    const weekly = window.healthData.weekly;

    makeChart(
        "bmiChart",
        "line",
        bmi.labels,
        bmi.values,
        "BMI",
        "#1c8f7e"
    );

    makeChart(
        "waterChart",
        "bar",
        weekly.labels,
        weekly.water,
        "Water (glasses)",
        "#4a9de0"
    );

    makeChart(
        "sleepChart",
        "line",
        weekly.labels,
        weekly.sleep,
        "Sleep (hours)",
        "#6c63e0"
    );

    // Weekly Water Total
    const waterTotal = weekly.water.reduce(
        (sum, value) => sum + value, 0
    );

    const waterElement = document.getElementById("weeklyWater");

    if (waterElement) {
        waterElement.textContent = waterTotal + " glasses";
    }

    // Average recorded sleep
    const recordedSleep = weekly.sleep.filter(value => value > 0);

    const sleepElement = document.getElementById("weeklySleep");

    if (sleepElement) {
        if (recordedSleep.length > 0) {
            const total = recordedSleep.reduce(
                (sum, value) => sum + value, 0
            );

            sleepElement.textContent =
                (total / recordedSleep.length).toFixed(1) + " h";
        } else {
            sleepElement.textContent = "--";
        }
    }
}


// ====================================
// Start
// ====================================

document.addEventListener("DOMContentLoaded", () => {
    const language =
        localStorage.getItem("healthLanguage") || "ja";

    setLanguage(language);
    loadDashboardCharts();
});

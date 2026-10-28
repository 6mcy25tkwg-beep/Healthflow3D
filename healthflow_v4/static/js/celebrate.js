// ====================================
// Celebration: full-screen 3D lucky cat
//  - Triggered when a habit is completed or the
//    daily water goal is reached
//  - Plays a meow + fanfare and says
//    congratulations in Japanese and English
// ====================================

(function () {
    "use strict";

    const reduceMotion =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ------------------------------------
    // Text and voice lines
    // ------------------------------------

    function messages(type, goal) {
        const g = goal || 8;

        const table = {
            water: {
                ja: { title: "目標達成！おめでとう！", sub: "今日の水分 " + g + "杯を達成しました" },
                en: { title: "Goal reached! Congratulations!", sub: "You drank " + g + " glasses today" },
                say: {
                    ja: "おめでとうございます！今日の水分の目標を達成しました！",
                    en: "Congratulations! You reached your water goal today!"
                },
                colors: [0x4a9de0, 0x2fb5a2, 0xffffff, 0x6c63e0, 0xffc65a]
            },
            sleep: {
                ja: { title: "睡眠目標達成！おめでとう！", sub: "今日の睡眠 " + g + "時間を達成しました" },
                en: { title: "Sleep goal reached! Congratulations!", sub: "You slept " + g + " hours today" },
                say: {
                    ja: "おめでとうございます！今日の睡眠の目標を達成しました！",
                    en: "Congratulations! You reached your sleep goal today!"
                },
                colors: [0x6c63e0, 0x4a9de0, 0xffe08a, 0xffffff, 0x2fb5a2]
            },
            habit: {
                ja: { title: "おめでとう！", sub: "習慣を達成しました" },
                en: { title: "Congratulations!", sub: "Habit completed" },
                say: {
                    ja: "おめでとうございます！習慣を達成しました！",
                    en: "Congratulations! You completed a habit!"
                },
                colors: [0xffc65a, 0x2fb5a2, 0xff9fb2, 0x6c63e0, 0xffffff]
            },
            habit_all: {
                ja: { title: "すごい！全部達成！", sub: "今日の習慣をすべて完了しました" },
                en: { title: "Amazing! All habits done!", sub: "You finished every habit today" },
                say: {
                    ja: "おめでとうございます！今日の習慣をすべて達成しました！すごいです！",
                    en: "Congratulations! You completed all your habits today! Amazing!"
                },
                colors: [0xffc65a, 0xff9fb2, 0x2fb5a2, 0x6c63e0, 0xffffff]
            }
        };

        return table[type] || table.habit;
    }

    function currentLang() {
        return localStorage.getItem("healthLanguage") === "en" ? "en" : "ja";
    }


    // ------------------------------------
    // Sound (Web Audio meow + fanfare, speech for voice)
    // ------------------------------------

    let audioCtx = null;

    function getAudio() {
        if (!audioCtx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) audioCtx = new AC();
        }
        return audioCtx;
    }

    // Called inside the click handler so browsers allow sound later
    function prime() {
        try {
            const c = getAudio();
            if (c && c.state === "suspended") c.resume();
        } catch (e) { /* ignore */ }

        try {
            if ("speechSynthesis" in window) {
                const u = new SpeechSynthesisUtterance(" ");
                u.volume = 0;
                window.speechSynthesis.speak(u);
            }
        } catch (e) { /* ignore */ }
    }

    function playMeow(c, at) {
        const osc = c.createOscillator();
        const filter = c.createBiquadFilter();
        const gain = c.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(520, at);
        osc.frequency.linearRampToValueAtTime(900, at + 0.18);
        osc.frequency.linearRampToValueAtTime(470, at + 0.55);

        filter.type = "bandpass";
        filter.Q.value = 4;
        filter.frequency.setValueAtTime(900, at);
        filter.frequency.linearRampToValueAtTime(1800, at + 0.2);
        filter.frequency.linearRampToValueAtTime(800, at + 0.55);

        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.4, at + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(c.destination);
        osc.start(at);
        osc.stop(at + 0.65);
    }

    function tone(c, freq, at, length, volume) {
        const osc = c.createOscillator();
        const gain = c.createGain();

        osc.type = "triangle";
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(volume, at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + length);

        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(at);
        osc.stop(at + length + 0.05);
    }

    function playFanfare(c, at) {
        [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => {
            tone(c, f, at + i * 0.13, 0.22, 0.22);
        });

        // Final chord
        [523.25, 659.25, 783.99, 1046.5].forEach(f => {
            tone(c, f, at + 0.85, 0.9, 0.16);
        });
    }

    function pickVoice(lang) {
        const voices = window.speechSynthesis.getVoices();
        const exact = voices.find(v => v.lang.replace("_", "-") === lang);
        return exact ||
            voices.find(v => v.lang.toLowerCase().startsWith(lang.slice(0, 2)));
    }

    function speak(say) {
        if (!("speechSynthesis" in window)) return;

        const first = currentLang();
        const order = first === "ja" ? ["ja", "en"] : ["en", "ja"];

        window.speechSynthesis.cancel();

        setTimeout(() => {
            order.forEach(l => {
                const u = new SpeechSynthesisUtterance(say[l]);
                u.lang = l === "ja" ? "ja-JP" : "en-US";
                u.pitch = 1.25;
                u.rate = 1;
                u.volume = 1;

                const voice = pickVoice(u.lang);
                if (voice) u.voice = voice;

                window.speechSynthesis.speak(u);
            });
        }, 60);
    }

    // Returns true if the browser allowed audio to start
    function playSound(say) {
        const c = getAudio();
        let allowed = false;

        if (c) {
            if (c.state === "suspended") c.resume();
            const at = c.currentTime + 0.05;
            playMeow(c, at);
            playFanfare(c, at + 0.15);
            allowed = c.state === "running";
        }

        setTimeout(() => speak(say), 900);
        return allowed;
    }


    // ------------------------------------
    // 3D lucky cat
    // ------------------------------------

    function buildCat() {
        const fur = new THREE.MeshStandardMaterial({ color: 0xfff6ea, roughness: 0.55 });
        const patch = new THREE.MeshStandardMaterial({ color: 0xf3a35a, roughness: 0.6 });
        const pink = new THREE.MeshStandardMaterial({ color: 0xff9fb2, roughness: 0.5 });
        const dark = new THREE.MeshStandardMaterial({ color: 0x2b2320, roughness: 0.4 });
        const red = new THREE.MeshStandardMaterial({ color: 0xe5484d, roughness: 0.4 });
        const gold = new THREE.MeshStandardMaterial({ color: 0xffc65a, metalness: 0.6, roughness: 0.25 });

        const root = new THREE.Group();
        const cat = new THREE.Group();
        root.add(cat);

        function mesh(geo, mat, x, y, z) {
            const m = new THREE.Mesh(geo, mat);
            m.position.set(x || 0, y || 0, z || 0);
            return m;
        }

        // Body
        const body = mesh(new THREE.SphereGeometry(1, 40, 32), fur, 0, -0.75, 0);
        body.scale.set(1, 1.1, 0.9);
        cat.add(body);

        const backPatch = mesh(new THREE.SphereGeometry(0.55, 24, 20), patch, 0.55, -0.55, -0.45);
        backPatch.scale.set(1, 1.1, 0.5);
        cat.add(backPatch);

        // Feet
        [-0.45, 0.45].forEach(x => {
            const foot = mesh(new THREE.SphereGeometry(0.34, 20, 16), fur, x, -1.72, 0.55);
            foot.scale.set(1.1, 0.6, 1.3);
            cat.add(foot);
        });

        // Head
        const head = new THREE.Group();
        head.position.set(0, 0.95, 0);
        cat.add(head);

        const skull = mesh(new THREE.SphereGeometry(0.95, 40, 32), fur);
        skull.scale.set(1.15, 0.98, 1);
        head.add(skull);

        const headPatch = mesh(new THREE.SphereGeometry(0.42, 24, 20), patch, -0.5, 0.52, 0.5);
        headPatch.scale.set(1, 1, 0.45);
        head.add(headPatch);

        // Ears
        [[-1, 0.35], [1, -0.35]].forEach(pair => {
            const side = pair[0];
            const ear = mesh(new THREE.ConeGeometry(0.34, 0.62, 4), fur, side * 0.68, 0.78, 0);
            ear.rotation.z = pair[1];
            head.add(ear);

            const inner = mesh(new THREE.ConeGeometry(0.2, 0.4, 4), pink, side * 0.68, 0.74, 0.1);
            inner.rotation.z = pair[1];
            head.add(inner);
        });

        // Happy closed eyes
        [-0.38, 0.38].forEach(x => {
            const eye = mesh(new THREE.TorusGeometry(0.13, 0.032, 8, 20, Math.PI), dark, x, 0.1, 0.9);
            head.add(eye);
        });

        // Cheeks
        [-0.62, 0.62].forEach(x => {
            const cheek = mesh(new THREE.SphereGeometry(0.15, 16, 12), pink, x, -0.12, 0.74);
            cheek.scale.set(1.2, 0.8, 0.5);
            head.add(cheek);
        });

        // Nose and mouth
        const nose = mesh(new THREE.SphereGeometry(0.07, 16, 12), pink, 0, -0.08, 0.95);
        nose.scale.set(1.2, 0.8, 0.8);
        head.add(nose);

        [-0.075, 0.075].forEach(x => {
            const mouth = mesh(new THREE.TorusGeometry(0.075, 0.018, 8, 16, Math.PI), dark, x, -0.17, 0.93);
            mouth.rotation.z = Math.PI;
            head.add(mouth);
        });

        // Whiskers
        [-1, 1].forEach(side => {
            [-0.2, 0, 0.2].forEach(angle => {
                const w = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 6), dark, side * 1.0, -0.14 + angle * 0.35, 0.7);
                w.rotation.z = Math.PI / 2 + side * angle;
                w.rotation.y = side * -0.25;
                head.add(w);
            });
        });

        // Collar and bell
        const collar = mesh(new THREE.TorusGeometry(0.74, 0.09, 12, 40), red, 0, 0.08, 0);
        collar.rotation.x = Math.PI / 2;
        cat.add(collar);
        cat.add(mesh(new THREE.SphereGeometry(0.13, 16, 16), gold, 0, -0.02, 0.76));

        // Arms (banzai!)
        const arms = [];
        [-1, 1].forEach(side => {
            const pivot = new THREE.Group();
            pivot.position.set(side * 0.8, -0.1, 0.25);

            const arm = mesh(new THREE.CapsuleGeometry(0.22, 0.55, 8, 16), fur, 0, 0.4, 0);
            pivot.add(arm);
            pivot.add(mesh(new THREE.SphereGeometry(0.11, 12, 12), pink, 0, 0.78, 0.17));

            cat.add(pivot);
            arms.push({ pivot: pivot, side: side });
        });

        // Tail
        const tail = new THREE.Group();
        tail.position.set(0.8, -1.3, -0.3);

        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0.7, 0.3, -0.1),
            new THREE.Vector3(1.0, 1.0, -0.1),
            new THREE.Vector3(0.7, 1.6, 0)
        ]);
        tail.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.13, 12, false), fur));
        tail.add(mesh(new THREE.SphereGeometry(0.13, 12, 12), patch, 0.7, 1.6, 0));
        cat.add(tail);

        function update(t) {
            const hop = Math.abs(Math.sin(t * 4.5));

            cat.position.y = hop * 0.42;
            cat.scale.set(1 + (0.5 - hop) * 0.05, 1 - (0.5 - hop) * 0.05, 1);

            head.rotation.z = Math.sin(t * 3) * 0.12;
            tail.rotation.z = Math.sin(t * 6) * 0.35;

            arms.forEach((a, i) => {
                const wave = Math.sin(t * 9 + i * Math.PI) * 0.35;
                a.pivot.rotation.z = a.side * -1 * (1.0 + wave);
            });
        }

        return { root: root, update: update };
    }

    function buildConfetti(scene, colors) {
        const count = 170;
        const geo = new THREE.BoxGeometry(0.14, 0.22, 0.02);
        const mesh = new THREE.InstancedMesh(
            geo,
            new THREE.MeshBasicMaterial({ color: 0xffffff }),
            count
        );

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        const p = [];

        function spawn(item, burst) {
            if (burst) {
                item.x = (Math.random() - 0.5) * 0.6;
                item.y = 0.2;
                item.z = (Math.random() - 0.5) * 0.6;
                const a = Math.random() * Math.PI * 2;
                const s = 3 + Math.random() * 5;
                item.vx = Math.cos(a) * s;
                item.vy = 4 + Math.random() * 6;
                item.vz = Math.sin(a) * s * 0.4;
            } else {
                item.x = (Math.random() - 0.5) * 12;
                item.y = 5 + Math.random() * 3;
                item.z = (Math.random() - 0.5) * 4;
                item.vx = (Math.random() - 0.5) * 0.8;
                item.vy = -0.5 - Math.random();
                item.vz = 0;
            }
        }

        for (let i = 0; i < count; i++) {
            const item = {
                rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6,
                sx: (Math.random() - 0.5) * 8, sy: (Math.random() - 0.5) * 8
            };
            spawn(item, true);
            p.push(item);

            color.setHex(colors[i % colors.length]);
            mesh.setColorAt(i, color);
        }

        mesh.instanceColor.needsUpdate = true;
        scene.add(mesh);

        function update(dt, still) {
            p.forEach((it, i) => {
                if (!still) {
                    it.vy -= 7 * dt;
                    it.vx *= 1 - 0.6 * dt;
                    it.x += it.vx * dt;
                    it.y += it.vy * dt;
                    it.z += it.vz * dt;
                    it.rx += it.sx * dt;
                    it.ry += it.sy * dt;

                    if (it.y < -5) spawn(it, false);
                    if (it.vy < -3) it.vy = -3; // flutter down slowly
                }

                dummy.position.set(it.x, it.y, it.z);
                dummy.rotation.set(it.rx, it.ry, it.rz);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
            });
            mesh.instanceMatrix.needsUpdate = true;
        }

        return { update: update };
    }

    function buildRays(scene) {
        const group = new THREE.Group();
        group.position.z = -2.5;

        for (let i = 0; i < 12; i++) {
            const ray = new THREE.Mesh(
                new THREE.PlaneGeometry(0.7, 16),
                new THREE.MeshBasicMaterial({
                    color: 0xffe9a8,
                    transparent: true,
                    opacity: 0.1,
                    depthWrite: false
                })
            );
            ray.rotation.z = (i * Math.PI) / 12;
            group.add(ray);
        }

        scene.add(group);
        return group;
    }


    // ------------------------------------
    // Overlay
    // ------------------------------------

    let overlay = null;
    let rafId = 0;
    let renderer = null;
    let closeTimer = 0;
    let shouldReload = true;
    let skipQueue = false;
    const pending = [];

    function close() {
        if (!overlay) return;

        cancelAnimationFrame(rafId);
        clearTimeout(closeTimer);

        if (renderer) {
            renderer.dispose();
            renderer = null;
        }

        if ("speechSynthesis" in window) window.speechSynthesis.cancel();

        overlay.remove();
        overlay = null;
        document.removeEventListener("keydown", onKey);

        if (shouldReload) {
            location.reload();
        } else if (!skipQueue && pending.length) {
            const next = pending.shift();
            setTimeout(() => show(next.type, next.opts), 300);
        }
    }

    function onKey(e) {
        if (e.key === "Escape") close();
    }

    function show(type, opts) {
        opts = opts || {};
        if (overlay) {
            shouldReload = false;
            skipQueue = true;
            close();
            skipQueue = false;
        }
        shouldReload = opts.reload !== false;

        const msg = messages(type, opts.goal);
        const lang = currentLang();
        const other = lang === "ja" ? "en" : "ja";

        overlay = document.createElement("div");
        overlay.className = "celebrate-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-live", "polite");
        overlay.innerHTML =
            '<canvas class="celebrate-canvas"></canvas>' +
            '<button type="button" class="celebrate-close" aria-label="Close">×</button>' +
            '<div class="celebrate-text">' +
                '<h2></h2><p></p><small></small>' +
                '<button type="button" class="celebrate-sound" hidden>' +
                    '🔊 音を鳴らす / Play sound</button>' +
            '</div>';

        overlay.querySelector("h2").textContent = msg[lang].title;
        overlay.querySelector("p").textContent = msg[lang].sub;
        overlay.querySelector("small").textContent =
            msg[other].title + "  " + msg[other].sub;

        document.body.appendChild(overlay);
        document.addEventListener("keydown", onKey);

        overlay.querySelector(".celebrate-close").addEventListener("click", close);
        overlay.addEventListener("click", e => {
            if (e.target === overlay || e.target.tagName === "CANVAS") close();
        });

        // Sound (with a tap-to-play fallback if the browser blocks it)
        const soundBtn = overlay.querySelector(".celebrate-sound");
        const allowed = playSound(msg.say);

        setTimeout(() => {
            const c = getAudio();
            if (!allowed && (!c || c.state !== "running")) {
                soundBtn.hidden = false;
            }
        }, 200);

        soundBtn.addEventListener("click", e => {
            e.stopPropagation();
            playSound(msg.say);
            soundBtn.hidden = true;
        });

        // 3D scene (falls back to an emoji if three.js did not load)
        if (typeof THREE === "undefined") {
            overlay.querySelector("canvas").remove();
            const emoji = document.createElement("div");
            emoji.className = "celebrate-emoji";
            emoji.textContent = "🐱";
            overlay.prepend(emoji);
        } else {
            startScene(overlay.querySelector("canvas"), msg.colors);
        }

        closeTimer = setTimeout(close, 11000);
    }

    function startScene(canvas, colors) {
        try {
            renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        } catch (err) {
            canvas.remove();
            return;
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        camera.position.set(0, 0.3, 9);
        camera.lookAt(0, 0.1, 0);

        scene.add(new THREE.AmbientLight(0xffffff, 1.0));

        const key = new THREE.DirectionalLight(0xffffff, 1.4);
        key.position.set(3, 5, 6);
        scene.add(key);

        const warm = new THREE.PointLight(0xffc65a, 18, 25);
        warm.position.set(-4, 2, 4);
        scene.add(warm);

        const cool = new THREE.PointLight(0x6c63e0, 14, 25);
        cool.position.set(4, -2, 3);
        scene.add(cool);

        const rays = buildRays(scene);
        const cat = buildCat();
        cat.root.position.y = 0.35;
        scene.add(cat.root);

        const confetti = buildConfetti(scene, colors);

        function resize() {
            const w = window.innerWidth;
            const h = window.innerHeight;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }

        resize();
        window.addEventListener("resize", resize);

        function easeOutBack(x) {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
        }

        const start = performance.now();
        let last = start;

        function frame(now) {
            if (!renderer) return;

            const t = (now - start) / 1000;
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;

            const fit = Math.min(1, Math.max(0.6, camera.aspect * 1.5));
            const pop = easeOutBack(Math.min(t / 0.9, 1));
            cat.root.scale.setScalar(fit * Math.max(pop, 0.001));

            cat.update(reduceMotion ? 0.2 : t);
            confetti.update(dt, reduceMotion);
            rays.rotation.z += reduceMotion ? 0 : dt * 0.15;

            renderer.render(scene, camera);
            rafId = requestAnimationFrame(frame);
        }

        rafId = requestAnimationFrame(frame);
    }


    // ------------------------------------
    // Wire up the dashboard forms
    // ------------------------------------

    function wireForms() {
        const selector =
            'form[action$="/save/water"], form[action$="/save/sleep"], ' +
            'form[action$="/save/habit_done"]';

        document.querySelectorAll(selector).forEach(form => {
            form.addEventListener("submit", async e => {
                e.preventDefault();
                prime(); // click is still fresh: allow sound later

                form.querySelectorAll("button").forEach(b => { b.disabled = true; });

                try {
                    const res = await fetch(form.action, {
                        method: "POST",
                        body: new FormData(form),
                        headers: { "X-Requested-With": "fetch" },
                        credentials: "same-origin"
                    });

                    let data = null;
                    try { data = await res.json(); } catch (err) { /* not JSON */ }

                    if (data && data.celebrate) {
                        const c = data.celebrate;
                        const type = c.type === "habit" && c.all ? "habit_all" : c.type;
                        markSeen(type);
                        show(type, { goal: c.goal });
                    } else {
                        location.reload();
                    }
                } catch (err) {
                    form.submit(); // plain submit if fetch failed
                }
            });
        });
    }

    // ------------------------------------
    // Goal state: celebrate once per day when you come back,
    // and let the 🐱 buttons replay it any time
    // ------------------------------------

    const state = window.celebrateState || null;

    function seenKey(type) {
        return "hf_cat_" + state.user + "_" + type + "_" + state.today;
    }

    function wasSeen(type) {
        try { return localStorage.getItem(seenKey(type)) === "1"; }
        catch (e) { return false; }
    }

    function markSeen(type) {
        if (!state || !state[type]) return;
        try { localStorage.setItem(seenKey(type), "1"); } catch (e) { /* ignore */ }
    }

    function wireGoalState() {
        if (!state) return;

        const jobs = [];

        ["water", "sleep"].forEach(type => {
            if (!state[type].done) return;

            const btn = document.querySelector('.cat-replay[data-type="' + type + '"]');
            if (btn) {
                btn.hidden = false;
                btn.addEventListener("click", () => {
                    prime();
                    show(type, { reload: false, goal: state[type].goal });
                });
            }

            if (!wasSeen(type) && !window.celebratePreview) {
                markSeen(type);
                jobs.push({ type: type, opts: { reload: false, goal: state[type].goal } });
            }
        });

        // Play the first now; any others wait in line until it is closed
        if (jobs.length) {
            const first = jobs.shift();
            jobs.forEach(j => pending.push(j));
            setTimeout(() => show(first.type, first.opts), 600);
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        wireForms();
        wireGoalState();

        // Preview: /dashboard?preview=water | habit | habit_all
        if (window.celebratePreview) {
            setTimeout(() => {
                show(window.celebratePreview, {
                    reload: false,
                    goal: window.celebrateGoal
                });
            }, 400);
        }
    });

    window.Celebrate = { show: show, prime: prime };
})();

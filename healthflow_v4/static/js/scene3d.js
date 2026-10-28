// ====================================
// HealthFlow 3D
//  - Home page: big morphing orb with 3 orbiting rings
//    (water / sleep / habits)
//  - Other pages: soft floating shapes behind the content
//  - Dashboard: stat cards tilt toward the mouse
// ====================================

(function () {
    "use strict";

    const reduceMotion =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const COLORS = {
        aqua: 0x2fb5a2,
        iris: 0x6c63e0,
        sun: 0xffc65a,
        sky: 0x4a9de0,
        pine: 0x1c5a50
    };

    const pointer = { x: 0, y: 0 };

    window.addEventListener("pointermove", e => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    });

    function makeRenderer(canvas) {
        try {
            const renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: true,
                alpha: true
            });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            return renderer;
        } catch (err) {
            return null; // WebGL unavailable: page still works without 3D
        }
    }

    function sizeOf(canvas) {
        const box = canvas.parentElement && canvas.id !== "ambientScene"
            ? canvas.parentElement.getBoundingClientRect()
            : { width: window.innerWidth, height: window.innerHeight };

        return {
            w: Math.max(1, Math.floor(box.width)),
            h: Math.max(1, Math.floor(box.height))
        };
    }

    // Run a render function every frame, but only while the tab is visible
    function loop(renderFrame) {
        let running = true;
        let last = performance.now();

        function tick(now) {
            if (!running) return;
            renderFrame((now - last) / 1000, now / 1000);
            last = now;
            requestAnimationFrame(tick);
        }

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                running = false;
            } else if (!running) {
                running = true;
                last = performance.now();
                requestAnimationFrame(tick);
            }
        });

        requestAnimationFrame(tick);
    }


    // ------------------------------------
    // Home page hero orb
    // ------------------------------------

    function initHero(container) {
        const canvas = container.querySelector("canvas");
        const renderer = makeRenderer(canvas);
        if (!renderer) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.z = 8.5;

        scene.add(new THREE.AmbientLight(0xffffff, 0.85));

        const key = new THREE.DirectionalLight(0xffffff, 1.2);
        key.position.set(3, 4, 5);
        scene.add(key);

        const aquaLight = new THREE.PointLight(COLORS.aqua, 14, 20);
        aquaLight.position.set(-4, -2, 3);
        scene.add(aquaLight);

        const irisLight = new THREE.PointLight(COLORS.iris, 14, 20);
        irisLight.position.set(4, -3, -1);
        scene.add(irisLight);

        const group = new THREE.Group();
        scene.add(group);

        // Core orb (vertices are displaced each frame)
        const geometry = new THREE.IcosahedronGeometry(1.55, 16);
        const base = geometry.attributes.position.array.slice();
        const count = geometry.attributes.position.count;
        const positions = geometry.attributes.position;
        const normals = geometry.attributes.normal;

        const colorArray = new Float32Array(count * 3);
        const cA = new THREE.Color(COLORS.aqua);
        const cB = new THREE.Color(COLORS.iris);
        const cC = new THREE.Color(COLORS.sun);
        const tmp = new THREE.Color();

        for (let i = 0; i < count; i++) {
            const y = base[i * 3 + 1] / 1.55;      // -1 .. 1
            const t = (y + 1) / 2;                  //  0 .. 1
            if (t < 0.5) {
                tmp.copy(cA).lerp(cB, t * 2);
            } else {
                tmp.copy(cB).lerp(cC, (t - 0.5) * 2);
            }
            colorArray.set([tmp.r, tmp.g, tmp.b], i * 3);
        }

        geometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));

        const orb = new THREE.Mesh(
            geometry,
            new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.32,
                metalness: 0.08
            })
        );
        group.add(orb);

        // Fine wire shell
        const shell = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.95, 2),
            new THREE.MeshBasicMaterial({
                color: COLORS.pine,
                wireframe: true,
                transparent: true,
                opacity: 0.16
            })
        );
        group.add(shell);

        // Three rings, each with a satellite: water, sleep, habits
        const ringSpecs = [
            { radius: 2.55, tilt: [1.15, 0.2, 0], color: COLORS.sky,  speed: 0.55, size: 0.17 },
            { radius: 3.0,  tilt: [0.35, 0.9, 0.4], color: COLORS.iris, speed: -0.38, size: 0.2 },
            { radius: 3.45, tilt: [-0.7, -0.4, 1.0], color: COLORS.sun, speed: 0.27, size: 0.16 }
        ];

        const rings = ringSpecs.map(spec => {
            const pivot = new THREE.Group();
            pivot.rotation.set(spec.tilt[0], spec.tilt[1], spec.tilt[2]);

            pivot.add(new THREE.Mesh(
                new THREE.TorusGeometry(spec.radius, 0.012, 8, 128),
                new THREE.MeshBasicMaterial({
                    color: spec.color,
                    transparent: true,
                    opacity: 0.55
                })
            ));

            const satellite = new THREE.Mesh(
                new THREE.SphereGeometry(spec.size, 24, 24),
                new THREE.MeshStandardMaterial({
                    color: spec.color,
                    roughness: 0.25
                })
            );
            pivot.add(satellite);
            group.add(pivot);

            return { spec, satellite, angle: Math.random() * Math.PI * 2 };
        });

        function resize() {
            const s = sizeOf(canvas);
            renderer.setSize(s.w, s.h, false);
            camera.aspect = s.w / s.h;
            camera.updateProjectionMatrix();
        }

        resize();
        new ResizeObserver(resize).observe(container);

        const target = { x: 0, y: 0 };

        function draw(dt, t) {
            // Morph the orb surface
            for (let i = 0; i < count; i++) {
                const bx = base[i * 3];
                const by = base[i * 3 + 1];
                const bz = base[i * 3 + 2];

                const n =
                    (Math.sin(bx * 1.7 + t * 0.9) +
                     Math.sin(by * 2.1 - t * 0.7) +
                     Math.sin(bz * 1.9 + t * 0.5)) / 3;

                const k = 1 + n * 0.14;

                positions.setXYZ(i, bx * k, by * k, bz * k);

                // Cheap normals: a sphere's normal points away from the centre
                const len = Math.hypot(bx, by, bz) || 1;
                normals.setXYZ(i, bx / len, by / len, bz / len);
            }
            positions.needsUpdate = true;
            normals.needsUpdate = true;

            // Satellites
            rings.forEach(r => {
                r.angle += dt * r.spec.speed;
                r.satellite.position.set(
                    Math.cos(r.angle) * r.spec.radius,
                    Math.sin(r.angle) * r.spec.radius,
                    0
                );
            });

            // Ease toward the pointer
            target.x = pointer.y * 0.45;
            target.y = pointer.x * 0.7 + t * 0.18;
            group.rotation.x += (target.x - group.rotation.x) * 0.05;
            group.rotation.y += (target.y - group.rotation.y) * 0.05;

            shell.rotation.y -= dt * 0.15;

            renderer.render(scene, camera);
        }

        if (reduceMotion) {
            draw(0, 1);           // one still frame
            window.addEventListener("resize", () => draw(0, 1));
        } else {
            loop(draw);
        }
    }


    // ------------------------------------
    // Soft floating shapes (all other pages)
    // ------------------------------------

    function initAmbient(canvas) {
        const renderer = makeRenderer(canvas);
        if (!renderer) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.z = 10;

        scene.add(new THREE.AmbientLight(0xffffff, 1.0));
        const light = new THREE.DirectionalLight(0xffffff, 0.9);
        light.position.set(2, 4, 5);
        scene.add(light);

        const palette = [COLORS.aqua, COLORS.iris, COLORS.sun, COLORS.sky];

        const geometries = [
            new THREE.OctahedronGeometry(0.5),
            new THREE.IcosahedronGeometry(0.45, 0),
            new THREE.TorusGeometry(0.4, 0.14, 12, 32),
            new THREE.SphereGeometry(0.35, 20, 20)
        ];

        const shapes = [];
        const total = window.innerWidth < 700 ? 12 : 24;

        for (let i = 0; i < total; i++) {
            const mesh = new THREE.Mesh(
                geometries[i % geometries.length],
                new THREE.MeshStandardMaterial({
                    color: palette[i % palette.length],
                    roughness: 0.4,
                    transparent: true,
                    opacity: 0.38
                })
            );

            mesh.position.set(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 12,
                -Math.random() * 7
            );

            const scale = 0.6 + Math.random() * 1.2;
            mesh.scale.setScalar(scale);

            scene.add(mesh);

            shapes.push({
                mesh: mesh,
                baseY: mesh.position.y,
                spin: (Math.random() - 0.5) * 0.5,
                bob: 0.3 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2
            });
        }

        function resize() {
            const s = sizeOf(canvas);
            renderer.setSize(s.w, s.h, false);
            camera.aspect = s.w / s.h;
            camera.updateProjectionMatrix();
        }

        resize();
        window.addEventListener("resize", resize);

        function draw(dt, t) {
            shapes.forEach(s => {
                s.mesh.rotation.x += dt * s.spin;
                s.mesh.rotation.y += dt * s.spin * 1.3;
                s.mesh.position.y = s.baseY + Math.sin(t * s.bob + s.phase) * 0.35;
            });

            // Gentle parallax from scroll and pointer
            const scrollShift = window.scrollY * 0.0025;
            camera.position.x += (pointer.x * 0.6 - camera.position.x) * 0.04;
            camera.position.y += ((-pointer.y * 0.4 - scrollShift) - camera.position.y) * 0.04;

            renderer.render(scene, camera);
        }

        if (reduceMotion) {
            draw(0, 1);
            window.addEventListener("resize", () => draw(0, 1));
        } else {
            loop(draw);
        }
    }


    // ------------------------------------
    // Tilt cards (dashboard)
    // ------------------------------------

    function initTilt() {
        if (reduceMotion) return;

        document.querySelectorAll(".stat-card, .calculator-card").forEach(card => {
            card.addEventListener("pointermove", e => {
                if (e.pointerType !== "mouse") return;

                const box = card.getBoundingClientRect();
                const px = (e.clientX - box.left) / box.width - 0.5;
                const py = (e.clientY - box.top) / box.height - 0.5;

                card.style.transform =
                    "perspective(900px) rotateX(" + (-py * 12).toFixed(2) + "deg) " +
                    "rotateY(" + (px * 14).toFixed(2) + "deg) translateZ(8px)";
            });

            card.addEventListener("pointerleave", () => {
                card.style.transform = "";
            });
        });
    }


    // ------------------------------------
    // Start
    // ------------------------------------

    document.addEventListener("DOMContentLoaded", () => {
        initTilt();

        if (typeof THREE === "undefined") return; // CDN blocked: skip 3D

        const hero = document.getElementById("heroScene");
        const ambient = document.getElementById("ambientScene");

        if (hero) {
            if (ambient) ambient.remove();
            initHero(hero);
        } else if (ambient) {
            initAmbient(ambient);
        }
    });
})();

/* ============================================================
   PORTUGAL DESIGN LAB — hero scene
   canvas orbital system · parallax field · cursor lighting
   ============================================================ */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;

  /* ---------- shared pointer state (lerped for cinematic lag) ---------- */

  const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
  const eased = { x: pointer.x, y: pointer.y };

  addEventListener("pointermove", (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  }, { passive: true });

  /* ---------- cursor-reactive light ---------- */

  const light = document.getElementById("cursorLight");

  /* ---------- canvas: core glow, orbital nodes, trails, particles ---------- */

  const canvas = document.getElementById("scene");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  let coreX = 0, coreY = 0;

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    coreX = W / 2;
    coreY = H * 0.44;
  }
  resize();
  addEventListener("resize", resize, { passive: true });

  /* Orbital nodes: points on tilted ellipses around the core.
     Projected with a fake z so they scale/fade as they pass behind. */

  const RINGS = [
    { rx: 0.30, ry: 0.105, tilt: -0.18, speed: 0.00022, count: 7 },
    { rx: 0.42, ry: 0.150, tilt: 0.12, speed: -0.00015, count: 9 },
    { rx: 0.56, ry: 0.205, tilt: -0.06, speed: 0.0001, count: 11 },
  ];

  const nodes = [];
  RINGS.forEach((ring, ri) => {
    for (let i = 0; i < ring.count; i++) {
      nodes.push({
        ring,
        ri,
        phase: (i / ring.count) * Math.PI * 2 + ri * 0.7,
        size: 1.2 + Math.random() * 1.8,
        gold: Math.random() < 0.3,
      });
    }
  });

  function projectNode(n, t) {
    const a = n.phase + t * n.ring.speed * 1000;
    const minDim = Math.min(W, H);
    const ex = Math.cos(a) * n.ring.rx * minDim * 1.6;
    const ey = Math.sin(a) * n.ring.ry * minDim * 1.6;
    // tilt the ellipse
    const x = ex * Math.cos(n.ring.tilt) - ey * Math.sin(n.ring.tilt);
    const y = ex * Math.sin(n.ring.tilt) + ey * Math.cos(n.ring.tilt);
    // pseudo-depth from the un-tilted vertical: top of ellipse = behind
    const z = (Math.sin(a) + 1) / 2; // 0 behind … 1 in front
    // parallax: rings shift slightly with the cursor
    const px = (eased.x - W / 2) * 0.012 * (n.ri + 1);
    const py = (eased.y - H / 2) * 0.012 * (n.ri + 1);
    return {
      x: coreX + x + px,
      y: coreY + y + py,
      z,
      scale: 0.55 + z * 0.75,
    };
  }

  /* Ambient particles with depth-of-field: deeper = blurrier, slower */

  const PARTICLE_COUNT = isCoarse ? 42 : 110;
  const particles = Array.from({ length: PARTICLE_COUNT }, () => spawnParticle(true));

  function spawnParticle(anywhere) {
    const depth = Math.random();
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : H + 10,
      depth,
      r: 0.6 + depth * 1.8,
      vy: -(0.06 + depth * 0.22),
      vx: (Math.random() - 0.5) * 0.08,
      tw: Math.random() * Math.PI * 2,
      gold: Math.random() < 0.22,
    };
  }

  /* Shooting light-trails: occasionally a streak travels between two nodes */

  const trails = [];
  function maybeSpawnTrail(t) {
    if (trails.length < 3 && Math.random() < 0.012) {
      const a = nodes[(Math.random() * nodes.length) | 0];
      let b = nodes[(Math.random() * nodes.length) | 0];
      if (a === b) b = nodes[(nodes.indexOf(a) + 5) % nodes.length];
      trails.push({ a, b, born: t, life: 1600 + Math.random() * 1200 });
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const minDim = Math.min(W, H);

    /* eased pointer */
    eased.x += (pointer.x - eased.x) * 0.06;
    eased.y += (pointer.y - eased.y) * 0.06;

    /* — core: layered radial bloom that leans toward the cursor — */
    const leanX = (eased.x - W / 2) * 0.03;
    const leanY = (eased.y - H / 2) * 0.03;
    const breathe = 1 + Math.sin(t * 0.0008) * 0.06;
    const cR = minDim * 0.16 * breathe;

    const core = ctx.createRadialGradient(
      coreX + leanX, coreY + leanY, 0,
      coreX + leanX, coreY + leanY, cR
    );
    core.addColorStop(0, "rgba(255, 248, 230, 0.85)");
    core.addColorStop(0.18, "rgba(243, 224, 171, 0.5)");
    core.addColorStop(0.5, "rgba(180, 160, 120, 0.12)");
    core.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(coreX + leanX, coreY + leanY, cR, 0, Math.PI * 2);
    ctx.fill();

    /* — project all nodes once per frame — */
    const proj = nodes.map((n) => ({ n, p: projectNode(n, t) }));

    /* — constellation: faint lines between nodes that drift close — */
    ctx.lineWidth = 0.6;
    for (let i = 0; i < proj.length; i++) {
      for (let j = i + 1; j < proj.length; j++) {
        const A = proj[i].p, B = proj[j].p;
        const dx = A.x - B.x, dy = A.y - B.y;
        const dist = Math.hypot(dx, dy);
        const max = minDim * 0.16;
        if (dist < max) {
          const alpha = (1 - dist / max) * 0.16 * Math.min(A.z, B.z);
          ctx.strokeStyle = `rgba(201, 206, 216, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(A.x, A.y);
          ctx.lineTo(B.x, B.y);
          ctx.stroke();
        }
      }
    }

    /* — light trails between ideas — */
    maybeSpawnTrail(t);
    for (let i = trails.length - 1; i >= 0; i--) {
      const tr = trails[i];
      const prog = (t - tr.born) / tr.life;
      if (prog >= 1) { trails.splice(i, 1); continue; }
      const A = projectNode(tr.a, t), B = projectNode(tr.b, t);
      const head = Math.min(prog * 1.25, 1);
      const tail = Math.max(head - 0.3, 0);
      const hx = A.x + (B.x - A.x) * head, hy = A.y + (B.y - A.y) * head;
      const tx = A.x + (B.x - A.x) * tail, ty = A.y + (B.y - A.y) * tail;
      const fade = Math.sin(Math.min(prog, 1) * Math.PI);
      const grad = ctx.createLinearGradient(tx, ty, hx, hy);
      grad.addColorStop(0, "rgba(233, 201, 124, 0)");
      grad.addColorStop(1, `rgba(243, 224, 171, ${0.8 * fade})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      /* glowing head */
      ctx.fillStyle = `rgba(255, 246, 220, ${0.9 * fade})`;
      ctx.beginPath();
      ctx.arc(hx, hy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    /* — orbital nodes (drawn back-to-front) — */
    proj.sort((a, b) => a.p.z - b.p.z);
    for (const { n, p } of proj) {
      const r = n.size * p.scale;
      const alpha = 0.25 + p.z * 0.65;
      if (n.gold) {
        ctx.fillStyle = `rgba(233, 201, 124, ${alpha})`;
        ctx.shadowColor = "rgba(233, 201, 124, 0.8)";
        ctx.shadowBlur = 8 * p.z;
      } else {
        ctx.fillStyle = `rgba(214, 220, 232, ${alpha})`;
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    /* — ambient particles with DoF — */
    for (let i = 0; i < particles.length; i++) {
      const pt = particles[i];
      pt.y += pt.vy;
      pt.x += pt.vx + Math.sin(t * 0.0006 + pt.tw) * 0.12;
      if (pt.y < -12 || pt.x < -12 || pt.x > W + 12) particles[i] = spawnParticle(false);
      const twinkle = 0.5 + Math.sin(t * 0.002 + pt.tw) * 0.5;
      const a = (0.06 + pt.depth * 0.2) * twinkle;
      ctx.fillStyle = pt.gold
        ? `rgba(233, 201, 124, ${a})`
        : `rgba(200, 208, 224, ${a})`;
      /* shallow depth: near particles render as soft discs */
      const blur = (1 - pt.depth) * 3;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r + blur * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---------- DOM parallax: cards float + follow cursor by depth ---------- */

  const floaters = [...document.querySelectorAll(".artifact, .datacard")];

  /* the entrance animation owns `transform` while it runs (and while its
     fill persists) — release it once done so the parallax loop takes over */
  floaters.forEach((el) => {
    el.addEventListener("animationend", () => el.classList.add("is-settled"), { once: true });
  });
  const cinema = document.getElementById("cinema");
  const core = document.getElementById("core");

  function animateDom(t) {
    const nx = (eased.x / W) - 0.5; // -0.5 … 0.5
    const ny = (eased.y / H) - 0.5;

    for (let i = 0; i < floaters.length; i++) {
      const el = floaters[i];
      const depth = parseFloat(el.dataset.depth) || 1;
      const fy = Math.sin(t * 0.0005 + i * 1.7) * 9 * depth;   // idle bob
      const fx = Math.cos(t * 0.0004 + i * 2.3) * 6 * depth;
      const px = -nx * 46 * depth;                              // cursor parallax
      const py = -ny * 30 * depth;
      el.style.transform =
        `translate3d(${(fx + px).toFixed(2)}px, ${(fy + py).toFixed(2)}px, 0) rotate(var(--r, 0deg))`;
    }

    /* the core leans gently toward the viewer's attention */
    core.style.transform = `translate3d(${nx * 22}px, ${ny * 16}px, 0)`;
  }

  /* ---------- magnetic buttons ---------- */

  if (!isCoarse && !reduceMotion) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      let raf = null;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.transform = `translate(${mx * 0.22}px, ${my * 0.3}px)`;
        });
      });
      el.addEventListener("pointerleave", () => {
        cancelAnimationFrame(raf);
        el.style.transform = "";
      });
    });
  }

  /* ---------- scroll: hero recedes, trust reveals ---------- */

  const hero = document.getElementById("hero");

  function onScroll() {
    const y = Math.min(scrollY, innerHeight);
    const p = y / innerHeight;
    cinema.style.opacity = String(1 - p * 0.6);
    cinema.style.filter = p > 0.02 ? `blur(${p * 6}px)` : "";
    hero.style.transform = `translateY(${y * 0.18}px)`;
  }
  addEventListener("scroll", onScroll, { passive: true });

  const observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-visible")),
    { threshold: 0.2 }
  );
  document.querySelectorAll(".reveal-on-scroll").forEach((el) => observer.observe(el));

  /* ---------- main loop ---------- */

  let running = !reduceMotion;

  function frame(t) {
    if (!running) return;
    draw(t);
    animateDom(t);
    light.style.transform = `translate(${eased.x - light.offsetWidth / 2}px, ${eased.y - light.offsetHeight / 2}px)`;
    requestAnimationFrame(frame);
  }

  if (running) {
    requestAnimationFrame(frame);
  } else {
    /* reduced motion: render one calm static frame */
    draw(0);
    document.querySelectorAll(".reveal").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.filter = "none";
    });
  }

  /* pause the loop when the tab is hidden */
  document.addEventListener("visibilitychange", () => {
    if (reduceMotion) return;
    if (document.hidden) {
      running = false;
    } else if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  });
})();

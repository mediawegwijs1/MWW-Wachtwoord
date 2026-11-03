(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const MWW = window.MWW;

  const MOUTHS = {
    neutral: "M38 60 Q50 60 62 60",
    hmm: "M38 62 Q50 57 62 61",
    happy: "M36 56 Q50 70 64 56",
    wow: "M30 52 Q50 80 70 52",
    sad: "M38 65 Q50 54 62 65",
  };

  const startScreen = $("start-screen");
  const game = $("game");
  const lock = $("lock");
  const mouth = $("mouth");
  const pupils = Array.from(document.querySelectorAll(".lock-face .pupil"));
  const wheelsEl = $("wheels");
  const openBtn = $("open-btn");
  const numpad = $("numpad");
  const toast = $("toast");
  const timerEl = $("timer");
  const timeLeftEl = $("time-left");
  const attemptsEl = $("attempts");
  const historyList = $("history-list");
  const historyEmpty = $("history-empty");
  const overlay = $("overlay");

  const state = {
    code: [],
    seconds: 120,
    endTime: 0,
    startTime: 0,
    timerId: 0,
    lastShown: -1,
    playing: false,
    attempts: 0,
    tried: new Set(),
    knowledge: Array(10).fill(""),
    active: 0,
  };

  const mod10 = (n) => ((n % 10) + 10) % 10;
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ---------- Wieltjes ----------
  // Elke strook bevat 0 t/m 9 drie keer, zodat 9 naar 0 soepel doordraait.
  const wheels = [];

  function buildWheels() {
    for (let i = 0; i < 4; i++) {
      const col = document.createElement("div");
      col.className = "wheel-col";

      const up = document.createElement("button");
      up.type = "button";
      up.className = "wheel-arrow";
      up.textContent = "▲";
      up.setAttribute("aria-label", `Wieltje ${i + 1} omhoog`);

      const wheel = document.createElement("div");
      wheel.className = "wheel";
      wheel.tabIndex = 0;
      wheel.setAttribute("role", "spinbutton");
      wheel.setAttribute("aria-label", `Cijfer ${i + 1}`);
      wheel.setAttribute("aria-valuemin", "0");
      wheel.setAttribute("aria-valuemax", "9");

      const strip = document.createElement("div");
      strip.className = "strip";
      const spans = [];
      for (let n = 0; n < 30; n++) {
        const s = document.createElement("span");
        s.textContent = String(n % 10);
        s.setAttribute("aria-hidden", "true");
        strip.append(s);
        spans.push(s);
      }
      wheel.append(strip);

      const down = document.createElement("button");
      down.type = "button";
      down.className = "wheel-arrow";
      down.textContent = "▼";
      down.setAttribute("aria-label", `Wieltje ${i + 1} omlaag`);

      col.append(up, wheel, down);
      wheelsEl.append(col);

      const w = { i, col, wheel, strip, spans, value: 0, pos: 10, timer: 0 };
      wheels.push(w);

      up.addEventListener("click", () => { setActive(i); rotate(i, 1); });
      down.addEventListener("click", () => { setActive(i); rotate(i, -1); });
      setupDrag(w);
      place(w, false);
    }
  }

  function place(w, animate) {
    const t = `translateY(calc(var(--cell) * ${-(w.pos - 1)}))`;
    if (animate) {
      w.strip.classList.add("animate");
      w.strip.style.transform = t;
    } else {
      w.strip.classList.remove("animate");
      w.strip.style.transform = t;
      void w.strip.offsetHeight;
    }
    w.spans.forEach((s, n) => s.classList.toggle("current", n === w.pos));
    w.wheel.setAttribute("aria-valuenow", String(w.value));
  }

  function normalize(w) {
    if (w.pos < 10 || w.pos > 19) {
      w.pos = 10 + w.value;
      place(w, false);
    }
  }

  function settleLater(w) {
    clearTimeout(w.timer);
    w.timer = setTimeout(() => normalize(w), 260);
  }

  function rotate(i, delta) {
    if (!state.playing) return;
    const w = wheels[i];
    normalize(w);
    w.pos += delta;
    w.value = mod10(w.value + delta);
    place(w, true);
    settleLater(w);
    changed(w);
  }

  function setValue(i, v, silent) {
    const w = wheels[i];
    normalize(w);
    if (w.value === v) { if (!silent) changed(w); return; }
    w.value = v;
    w.pos = 10 + v;
    place(w, true);
    if (!silent) changed(w);
  }

  function changed(w) {
    w.wheel.classList.remove("fb-green", "fb-orange", "fb-grey");
    MWW.play("click");
  }

  function setActive(i) {
    state.active = Math.max(0, Math.min(3, i));
    wheels.forEach((w) => w.col.classList.toggle("active", w.i === state.active));
    pupils.forEach((p) => { p.style.transform = `translate(${(state.active - 1.5) * 2.5}px, 1px)`; });
  }

  function setupDrag(w) {
    let lastY = 0;
    let acc = 0;
    let dragging = false;

    w.wheel.addEventListener("pointerdown", (e) => {
      setActive(w.i);
      dragging = true;
      lastY = e.clientY;
      acc = 0;
      w.wheel.setPointerCapture(e.pointerId);
    });
    w.wheel.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      acc += e.clientY - lastY;
      lastY = e.clientY;
      const step = (w.wheel.clientHeight / 3) * 0.7;
      while (acc <= -step) { rotate(w.i, 1); acc += step; }
      while (acc >= step) { rotate(w.i, -1); acc -= step; }
    });
    const end = () => { dragging = false; };
    w.wheel.addEventListener("pointerup", end);
    w.wheel.addEventListener("pointercancel", end);

    let wheelAcc = 0;
    w.wheel.addEventListener("wheel", (e) => {
      e.preventDefault();
      setActive(w.i);
      wheelAcc += e.deltaY;
      while (wheelAcc >= 40) { rotate(w.i, 1); wheelAcc -= 40; }
      while (wheelAcc <= -40) { rotate(w.i, -1); wheelAcc += 40; }
    }, { passive: false });

    w.wheel.addEventListener("focus", () => setActive(w.i));
  }

  function typeDigit(d) {
    if (!state.playing) return;
    setValue(state.active, d);
    if (state.active < 3) setActive(state.active + 1);
  }

  // ---------- Gezichtje ----------
  function setMood(mood) {
    lock.dataset.mood = mood;
    mouth.setAttribute("d", MOUTHS[mood] || MOUTHS.neutral);
  }

  // ---------- Raden ----------
  function score(guess) {
    const res = guess.map((d, i) => (d === state.code[i] ? "green" : ""));
    const used = new Set(guess.filter((d, i) => res[i] === "green"));
    return res.map((r, i) => {
      if (r) return r;
      const d = guess[i];
      if (state.code.includes(d) && !used.has(d)) {
        used.add(d);
        return "orange";
      }
      return "grey";
    });
  }

  function submit() {
    if (!state.playing) return;
    const guess = wheels.map((w) => w.value);
    const key = guess.join("");
    if (state.tried.has(key)) {
      say("Deze code heb je al geprobeerd! Kijk goed naar je pogingen. 🤔");
      lock.classList.remove("wrong");
      void lock.offsetWidth;
      lock.classList.add("wrong");
      return;
    }
    state.tried.add(key);
    state.attempts++;
    showAttempts();

    const colors = score(guess);
    addHistory(guess, colors);
    learn(guess, colors);

    wheels.forEach((w, i) => {
      w.wheel.classList.remove("fb-green", "fb-orange", "fb-grey", "flash");
      void w.wheel.offsetWidth;
      w.wheel.classList.add(`fb-${colors[i]}`, "flash");
    });

    const greens = colors.filter((c) => c === "green").length;
    const oranges = colors.filter((c) => c === "orange").length;

    if (greens === 4) {
      win();
      return;
    }

    MWW.play("wrong");
    lock.classList.remove("wrong");
    void lock.offsetWidth;
    lock.classList.add("wrong");

    if (greens === 3) { setMood("happy"); say("Bijna! Nog maar één cijfer! 🔥"); }
    else if (greens + oranges === 4) { setMood("happy"); say("Alle cijfers zitten erin! Nu nog de goede volgorde. 🧩"); }
    else if (greens + oranges === 0) { setMood("sad"); say("Geen enkel cijfer goed. Ook dat is handig om te weten! 🕵️"); }
    else { setMood("hmm"); say("Goed bezig! Kijk naar de kleuren. 👀"); }
    setActive(0);
  }

  function showAttempts() {
    attemptsEl.textContent = state.attempts;
    $("attempts-word").textContent = state.attempts === 1 ? "poging" : "pogingen";
  }

  function say(text) {
    toast.textContent = text;
  }

  function addHistory(guess, colors) {
    historyEmpty.hidden = true;
    const li = document.createElement("li");
    const num = document.createElement("span");
    num.className = "num";
    num.textContent = `#${state.attempts}`;
    const tiles = document.createElement("span");
    tiles.className = "tiles";
    const words = { green: "goede plek", orange: "andere plek", grey: "zit er niet in" };
    guess.forEach((d, i) => {
      const t = document.createElement("span");
      t.className = `tile ${colors[i]}`;
      t.textContent = String(d);
      t.title = words[colors[i]];
      tiles.append(t);
    });
    const sr = document.createElement("span");
    sr.className = "visually-hidden";
    sr.textContent = guess.map((d, i) => `${d} ${words[colors[i]]}`).join(", ");
    li.append(num, tiles, sr);
    historyList.prepend(li);
  }

  // Het cijfertoetsenbord onthoudt wat je al weet
  function learn(guess, colors) {
    const rank = { "": 0, grey: 1, orange: 2, green: 3 };
    guess.forEach((d, i) => {
      if (rank[colors[i]] > rank[state.knowledge[d]]) state.knowledge[d] = colors[i];
    });
    renderNumpad();
  }

  function renderNumpad() {
    numpad.querySelectorAll("[data-digit]").forEach((b) => {
      const k = state.knowledge[Number(b.dataset.digit)];
      b.classList.remove("k-green", "k-orange", "k-grey");
      if (k) b.classList.add(`k-${k}`);
    });
  }

  // ---------- Timer ----------
  function tick() {
    const left = Math.max(0, Math.ceil((state.endTime - performance.now()) / 1000));
    if (left !== state.lastShown) {
      state.lastShown = left;
      timeLeftEl.textContent = fmtTime(left);
      timerEl.classList.toggle("hurry", left <= 30);
      if (left <= 10 && left > 0) MWW.play("tick");
    }
    if (left === 0) lose();
  }

  function stopTimer() {
    clearInterval(state.timerId);
    state.timerId = 0;
  }

  // ---------- Einde ----------
  function showDialog({ emoji, title, text, stats, lesson }) {
    $("dialog-emoji").textContent = emoji;
    $("dialog-titel").textContent = title;
    $("dialog-text").textContent = text;
    const statsEl = $("dialog-stats");
    statsEl.textContent = "";
    stats.forEach((node) => statsEl.append(node));
    $("dialog-lesson").textContent = lesson;
    overlay.hidden = false;
    $("again-btn").focus();
  }

  function stat(label, value) {
    const d = document.createElement("div");
    d.className = "stat";
    const b = document.createElement("b");
    b.textContent = value;
    d.append(b, label);
    return d;
  }

  function win() {
    state.playing = false;
    stopTimer();
    const used = Math.round((performance.now() - state.startTime) / 1000);
    lock.classList.add("open");
    setMood("wow");
    say("Het slot is open! 🎉");
    MWW.play("win");
    MWW.confetti();
    setTimeout(() => {
      showDialog({
        emoji: "🎉",
        title: "Gekraakt!",
        text: "Super gedaan! Je hebt het fietsslot opengekregen.",
        stats: [stat("tijd", fmtTime(used)), stat(state.attempts === 1 ? "poging" : "pogingen", String(state.attempts))],
        lesson: "💡 Wist je dat? Een pincode van 4 cijfers heeft maar 10.000 mogelijkheden. De computer van een hacker probeert die allemaal in minder dan één seconde!",
      });
    }, 1100);
  }

  function lose() {
    if (!state.playing) return;
    state.playing = false;
    stopTimer();
    lock.classList.add("lost");
    setMood("sad");
    say("De tijd is op! ⏰");
    MWW.play("lose");
    state.code.forEach((d, i) => {
      setValue(i, d, true);
      wheels[i].wheel.classList.remove("fb-orange", "fb-grey");
      wheels[i].wheel.classList.add("fb-green");
    });

    const codeBox = document.createElement("div");
    codeBox.className = "tiles code-reveal";
    state.code.forEach((d) => {
      const t = document.createElement("span");
      t.className = "tile green";
      t.textContent = String(d);
      codeBox.append(t);
    });

    setTimeout(() => {
      showDialog({
        emoji: "⏰",
        title: "De tijd is op!",
        text: "Jammer! De geheime code was:",
        stats: [codeBox],
        lesson: "💡 Tip: probeer eerst 0123 en daarna 4567. Dan weet je snel welke cijfers in de code zitten!",
      });
    }, 900);
  }

  // ---------- Starten ----------
  function newCode() {
    const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    return digits.slice(0, 4);
  }

  function startGame(seconds) {
    stopTimer();
    state.seconds = seconds;
    state.code = newCode();
    state.attempts = 0;
    state.tried = new Set();
    state.knowledge = Array(10).fill("");
    state.lastShown = -1;

    overlay.hidden = true;
    startScreen.hidden = true;
    game.hidden = false;
    document.body.dataset.screen = "game";

    lock.classList.remove("open", "lost", "wrong");
    setMood("neutral");
    showAttempts();
    historyList.textContent = "";
    historyEmpty.hidden = false;
    renderNumpad();
    say("Draai aan de wieltjes of typ een code. Succes! 🍀");

    state.playing = true;
    wheels.forEach((w) => {
      w.wheel.classList.remove("fb-green", "fb-orange", "fb-grey");
      w.value = 0;
      w.pos = 10;
      place(w, false);
    });
    setActive(0);

    window.scrollTo({ top: 0 });
    state.startTime = performance.now();
    state.endTime = state.startTime + seconds * 1000;
    tick();
    state.timerId = setInterval(tick, 200);
  }

  function showStart() {
    stopTimer();
    state.playing = false;
    overlay.hidden = true;
    game.hidden = true;
    startScreen.hidden = false;
    document.body.dataset.screen = "start";
    window.scrollTo({ top: 0 });
  }

  // ---------- Events ----------
  document.querySelectorAll(".level").forEach((b) => {
    b.addEventListener("click", () => startGame(Number(b.dataset.seconds)));
  });

  openBtn.addEventListener("click", submit);

  numpad.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.digit) typeDigit(Number(b.dataset.digit));
    else if (b.dataset.action === "back") setActive(state.active - 1);
  });

  document.addEventListener("keydown", (e) => {
    if (!state.playing || !overlay.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) { typeDigit(Number(e.key)); e.preventDefault(); return; }
    switch (e.key) {
      case "Backspace":
      case "ArrowLeft": setActive(state.active - 1); e.preventDefault(); break;
      case "ArrowRight": setActive(state.active + 1); e.preventDefault(); break;
      case "ArrowUp": rotate(state.active, 1); e.preventDefault(); break;
      case "ArrowDown": rotate(state.active, -1); e.preventDefault(); break;
      case "Enter":
        if (e.target.closest && e.target.closest("button, a")) return;
        submit(); e.preventDefault(); break;
      default: break;
    }
  });

  $("again-btn").addEventListener("click", () => startGame(state.seconds));
  $("level-btn").addEventListener("click", showStart);

  window.addEventListener("pageshow", (e) => {
    if (e.persisted) showStart();
  });

  buildWheels();
  setActive(0);
})();

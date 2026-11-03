(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const MWW = window.MWW;
  const ABC = "abcdefghijklmnopqrstuvwxyz";
  const ROUNDS = [1, 2, 3];
  const BIG = 26 ** 12;
  const PER_SECOND = 1e10;

  const stages = {
    guess: $("stage-guess"),
    done: $("stage-done"),
    computer: $("stage-computer"),
    truth: $("stage-truth"),
  };
  const slotsEl = $("slots");
  const keyboard = $("keyboard");
  const msg = $("guess-msg");

  const state = {
    round: 0,
    secret: "",
    pos: 0,
    tries: 0,
    used: new Set(),
    start: 0,
    clockId: 0,
    results: [],
    playing: false,
  };

  const randomLetters = (n) => Array.from({ length: n }, () => ABC[Math.floor(Math.random() * 26)]).join("");
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const nl = (n) => Math.floor(n).toLocaleString("nl-NL");

  // ---------- Voortgang ----------
  function setStep(step) {
    document.querySelectorAll("#steps li").forEach((li) => {
      const s = Number(li.dataset.step);
      li.classList.toggle("done", s < step);
      li.classList.toggle("current", s === step);
      if (s === step) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });
  }

  function show(name) {
    Object.entries(stages).forEach(([k, el]) => { el.hidden = k !== name; });
  }

  function scrollToStage(el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: MWW.reduceMotion.matches ? "auto" : "smooth" });
  }

  // ---------- Toetsenbord ----------
  const keys = {};
  for (const ch of ABC) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = ch;
    b.dataset.letter = ch;
    b.setAttribute("aria-label", `Letter ${ch}`);
    keyboard.append(b);
    keys[ch] = b;
  }

  function resetKeyboard() {
    state.used.clear();
    Object.values(keys).forEach((b) => {
      b.classList.remove("used");
      b.removeAttribute("aria-disabled");
    });
  }

  // ---------- Rondes ----------
  function startRound(i) {
    state.round = i;
    const len = ROUNDS[i];
    state.secret = randomLetters(len);
    state.pos = 0;
    state.tries = 0;
    state.playing = true;
    resetKeyboard();

    $("round-title").textContent = `Ronde ${i + 1}: ${len} ${len === 1 ? "letter" : "letters"} 🔤`;
    $("round-sub").textContent = i === 0
      ? "Het wachtwoord bestaat uit kleine letters. Kies een letter. Is hij goed, dan wordt het vakje groen!"
      : "Raad de letters één voor één. Bij elke letter hoor je of hij goed is.";

    slotsEl.textContent = "";
    for (let n = 0; n < len; n++) {
      const s = document.createElement("span");
      s.className = "slot";
      s.textContent = "?";
      slotsEl.append(s);
    }
    markSlot();
    showTries();
    msg.textContent = "Welke letter zou het zijn? 🤔";

    clearInterval(state.clockId);
    state.start = performance.now();
    $("clock").textContent = "0:00";
    state.clockId = setInterval(() => {
      $("clock").textContent = fmtTime(Math.floor((performance.now() - state.start) / 1000));
    }, 250);

    setStep(i);
    show("guess");
  }

  function markSlot() {
    [...slotsEl.children].forEach((s, n) => s.classList.toggle("current", n === state.pos));
  }

  function showTries() {
    $("tries").textContent = state.tries;
    $("tries-word").textContent = state.tries === 1 ? "poging" : "pogingen";
  }

  function guess(ch) {
    if (!state.playing || state.used.has(ch)) return;
    state.tries++;
    showTries();
    const slot = slotsEl.children[state.pos];

    if (ch === state.secret[state.pos]) {
      slot.classList.remove("current", "wrong");
      slot.classList.add("good");
      slot.textContent = ch;
      slot.setAttribute("aria-label", `Letter ${state.pos + 1}: ${ch}`);
      MWW.play("good");
      state.pos++;
      if (state.pos === state.secret.length) {
        roundDone();
        return;
      }
      msg.textContent = `Ja! De ${ordinal(state.pos)} letter is een ${ch}! Nu de volgende. 💪`;
      resetKeyboard();
      markSlot();
    } else {
      state.used.add(ch);
      keys[ch].classList.add("used");
      keys[ch].setAttribute("aria-disabled", "true");
      slot.textContent = ch;
      slot.classList.remove("wrong");
      void slot.offsetWidth;
      slot.classList.add("wrong");
      MWW.play("click");
      msg.textContent = `Nee, geen ${ch}. Probeer een andere letter!`;
      clearTimeout(slot._t);
      slot._t = setTimeout(() => {
        if (!slot.classList.contains("good")) { slot.textContent = "?"; slot.classList.remove("wrong"); }
      }, 600);
    }
  }

  function ordinal(n) {
    return ["eerste", "tweede", "derde"][n - 1] || `${n}e`;
  }

  function roundDone() {
    state.playing = false;
    clearInterval(state.clockId);
    const secs = Math.max(1, Math.round((performance.now() - state.start) / 1000));
    state.results[state.round] = { tries: state.tries, secs };
    msg.textContent = "Gekraakt! 🎉";
    setStep(state.round + 0.5);
    MWW.play("win");
    MWW.confetti(60);

    const len = ROUNDS[state.round];
    const lessons = [
      "💡 Een wachtwoord van 1 letter heeft maar 26 mogelijkheden. Dat is zo geraden!",
      "💡 Met 2 letters zijn er al 26 × 26 = 676 mogelijke wachtwoorden. Maar omdat je bij elke letter hoorde of hij goed was, hoefde je er maar een paar te proberen.",
      "💡 Met 3 letters zijn er al 17.576 mogelijke wachtwoorden! Wat denk je: hoe lang duurt een wachtwoord van 12 tekens met hoofdletters, cijfers en leestekens?",
    ];

    setTimeout(() => {
      $("done-title").textContent = "Gekraakt!";
      const text = $("done-text");
      text.textContent = "Het wachtwoord was: ";
      const s = document.createElement("span");
      s.className = "secret";
      s.textContent = state.secret;
      text.append(s);

      const stats = $("done-stats");
      stats.textContent = "";
      stats.append(stat(state.tries === 1 ? "poging" : "pogingen", String(state.tries)), stat("tijd", fmtTime(secs)));
      $("done-lesson").textContent = lessons[state.round];
      $("next-round").textContent = state.round < ROUNDS.length - 1
        ? `Volgende: ${ROUNDS[state.round + 1]} letters 👉`
        : "Volgende: 12 tekens 😱";
      show("done");
      scrollToStage(stages.done);
      $("next-round").focus({ preventScroll: true });
    }, len === 1 ? 700 : 900);
  }

  function stat(label, value) {
    const d = document.createElement("div");
    d.className = "stat";
    const b = document.createElement("b");
    b.textContent = value;
    d.append(b, label);
    return d;
  }

  $("next-round").addEventListener("click", () => {
    if (state.round < ROUNDS.length - 1) {
      startRound(state.round + 1);
      scrollToStage(stages.guess);
    } else {
      startComputer();
    }
  });

  keyboard.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-letter]");
    if (b) guess(b.dataset.letter);
  });

  document.addEventListener("keydown", (e) => {
    if (!state.playing || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k.length === 1 && ABC.includes(k)) {
      guess(k);
      e.preventDefault();
    }
  });

  // ---------- De computer ----------
  const reelsEl = $("reels");
  const reels = [];
  for (let i = 0; i < 12; i++) {
    const r = document.createElement("span");
    r.className = "reel";
    r.textContent = "?";
    reelsEl.append(r);
    reels.push(r);
  }
  const cpuLog = $("cpu-log");
  let cpuRun = 0;

  function startComputer() {
    setStep(3);
    show("computer");
    reels.forEach((r) => { r.className = "reel"; r.textContent = "?"; });
    showGroup(-1);
    cpuLog.textContent = "";
    $("cpu-count").textContent = "0";
    $("cpu-status").textContent = "Klaar om te starten";
    $("cpu-start").disabled = false;
    $("cpu-start").hidden = false;
    $("cpu-result").hidden = true;
    scrollToStage(stages.computer);
  }

  function log(text, ok) {
    const li = document.createElement("li");
    li.textContent = text;
    if (ok) li.className = "ok";
    cpuLog.append(li);
    while (cpuLog.children.length > 5) cpuLog.firstChild.remove();
  }

  // Alle tekens die de computer probeert, in deze volgorde
  const GROUPS = [
    "abcdefghijklmnopqrstuvwxyz",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "0123456789",
    "!?@#$%&*+=",
  ];
  const ALL = GROUPS.join("");
  const groupOf = (ch) => GROUPS.findIndex((g) => g.includes(ch));
  const groupPills = [...document.querySelectorAll("#cpu-groups span")];

  function makeSecret() {
    // Minstens 1 teken uit elke groep, de rest vooral letters
    const pick = (g) => g[Math.floor(Math.random() * g.length)];
    const chars = [pick(GROUPS[0]), pick(GROUPS[1]), pick(GROUPS[2]), pick(GROUPS[3])];
    while (chars.length < 12) {
      const r = Math.random();
      chars.push(pick(r < 0.45 ? GROUPS[0] : r < 0.7 ? GROUPS[1] : r < 0.88 ? GROUPS[2] : GROUPS[3]));
    }
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
  }

  function showGroup(g) {
    groupPills.forEach((p, i) => p.classList.toggle("on", i === g));
  }

  $("cpu-start").addEventListener("click", () => {
    $("cpu-start").disabled = true;
    const run = ++cpuRun;
    const secret = makeSecret();
    let pos = 0;
    let idx = -1;
    let total = 0;
    let next = performance.now() + 300;
    let lastLog = 0;
    // Eerst rustig zodat je het ziet, daarna steeds sneller
    const stepMs = (p) => Math.max(5, 55 * Math.pow(0.78, p));

    $("cpu-status").textContent = "Bezig met kraken... ⚡";
    MWW.play("click");

    function frame(now) {
      if (run !== cpuRun) return;

      while (pos < 12 && now >= next) {
        idx++;
        total++;
        const ch = ALL[idx];
        if (ch === secret[pos]) {
          reels[pos].className = "reel locked";
          reels[pos].textContent = ch;
          log(`${secret.slice(0, pos + 1)}  ✔ plek ${pos + 1} gevonden!`, true);
          MWW.play("good");
          pos++;
          idx = -1;
          next += 350;
        } else {
          next += stepMs(pos);
        }
      }

      if (pos >= 12) {
        showGroup(-1);
        $("cpu-count").textContent = nl(total);
        $("cpu-status").textContent = "Gekraakt! ✔";
        cpuDone(secret, total);
        return;
      }

      if (idx >= 0) {
        const ch = ALL[idx];
        reels[pos].className = "reel trying";
        reels[pos].textContent = ch;
        showGroup(groupOf(ch));
        $("cpu-status").textContent = `Plek ${pos + 1} van 12 ⚡`;
        if (now - lastLog > 60) {
          lastLog = now;
          log(`${secret.slice(0, pos)}${ch}  ✘ fout`);
          MWW.play("click");
        }
      }
      for (let j = pos + 1; j < 12; j++) {
        reels[j].className = "reel spin";
        reels[j].textContent = "?";
      }
      $("cpu-count").textContent = nl(total);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });

  function cpuDone(secret, total) {
    MWW.play("win");
    MWW.confetti(80);
    $("cpu-start").hidden = true;
    const p = $("cpu-result-text");
    p.textContent = "";
    p.append(`De computer heeft het wachtwoord "${secret}" gekraakt met ${nl(total)} pogingen! 🤖`);

    const own = state.results.reduce((a, r) => a + (r ? r.secs : 0), 0);
    const note = document.createElement("span");
    note.className = "small";
    note.textContent = ` Jij was ${fmtTime(own)} bezig met 1, 2 en 3 letters. Wij hebben de computer hier expres langzaam gemaakt zodat je kunt zien wat hij doet. In het echt is hij in een flits klaar!`;
    p.append(document.createElement("br"), note);
    $("cpu-result").hidden = false;
    $("to-truth").focus({ preventScroll: true });
    $("cpu-result").scrollIntoView({ block: "nearest", behavior: MWW.reduceMotion.matches ? "auto" : "smooth" });
  }

  // ---------- Simulatie: zo werkt brute force ----------
  const demo = (() => {
    const CH = ALL; // a-z, A-Z, 0-9, leestekens: 72 tekens
    const BASE = CH.length;
    const LEN = 12;
    const HUMAN_STEPS = 4;
    const HUMAN_MS = 1300;
    const MAX_RATE = 1e10;

    const login = $("login");
    const boxesEl = $("pw-boxes");
    const btn = $("login-btn");
    const msgEl = $("login-msg");
    const cursor = $("cursor");
    const robot = $("robot");
    const countEl = $("demo-count");
    const speedEl = $("demo-speed");
    const captionEl = $("demo-caption");
    const pauseBtn = $("demo-pause");

    const boxes = [];
    for (let i = 0; i < LEN; i++) {
      const b = document.createElement("span");
      b.className = "pw-box";
      b.textContent = "a";
      boxesEl.append(b);
      boxes.push(b);
    }

    let d = null;
    let raf = 0;
    let started = false;

    function fresh() {
      return { running: false, last: 0, n: 0, acc: 0, phase: "human", ht: 0, mt: 0, step: -1, digits: Array(LEN).fill(0), rollUntil: Array(LEN).fill(0), flashUntil: 0, caption: "", lastN: -1 };
    }

    function rate() {
      if (d.phase === "human") return 1000 / HUMAN_MS;
      return Math.min(MAX_RATE, Math.pow(10, d.mt / 5));
    }

    function speedText(r) {
      if (r < 1.5) return "1 per seconde";
      if (r < 1000) return `${nl(r)} per seconde`;
      const words = [[1e9, "miljard"], [1e6, "miljoen"], [1e3, "duizend"]];
      const [v, w] = words.find(([v]) => r >= v);
      const x = r / v;
      return `${x < 10 ? x.toLocaleString("nl-NL", { maximumFractionDigits: 1 }) : nl(x)} ${w} per seconde`;
    }

    function caption(r) {
      if (d.phase === "human") return "✋ Zo zou jij het doen: één voor één.";
      if (r < 6) return "🖱️ Klik, fout. Klik, fout. Steeds sneller!";
      if (r < 300) return "🤖 Nu neemt de computer het over!";
      if (r < 1e5) return "⚡ Het laatste vakje gaat zo snel dat je het bijna niet meer kunt zien!";
      if (r < MAX_RATE) return "🚀 Nog sneller! Kijk hoe de vakjes links ook gaan draaien.";
      return "🐌 Volle snelheid: 10 miljard per seconde. En toch is hij nog lang niet klaar!";
    }

    function cursorTo(where) {
      let x;
      let y;
      if (where === "btn") {
        x = btn.offsetLeft + btn.offsetWidth * 0.55;
        y = btn.offsetTop + btn.offsetHeight * 0.45;
      } else {
        x = boxesEl.offsetLeft + boxesEl.offsetWidth * 0.7;
        y = boxesEl.offsetTop + boxesEl.offsetHeight * 0.6;
      }
      cursor.style.transform = `translate(${x}px, ${y}px)`;
    }

    function setFail(on, shake) {
      login.classList.toggle("fail", on);
      msgEl.textContent = on ? "❌ Fout wachtwoord" : "";
      if (on && shake) {
        login.classList.remove("fail-shake");
        void login.offsetWidth;
        login.classList.add("fail-shake");
      }
    }

    function press(on) {
      btn.classList.toggle("press", on);
      cursor.classList.toggle("click", on);
    }

    function render(now, r) {
      const n = Math.floor(d.n);
      let x = n;
      for (let k = LEN - 1; k >= 0; k--) {
        const digit = x % BASE;
        x = Math.floor(x / BASE);
        const box = boxes[k];
        const spinRate = r / Math.pow(BASE, LEN - 1 - k);
        const fast = spinRate > 12;
        if (digit !== d.digits[k]) {
          d.digits[k] = digit;
          box.textContent = CH[digit];
          if (k < LEN - 1 && !fast) d.rollUntil[k] = now + 400;
        }
        box.classList.toggle("blur", fast);
        box.classList.toggle("roll", !fast && now < d.rollUntil[k]);
      }
      countEl.textContent = nl(n);
      speedEl.textContent = speedText(r);
      const c = caption(r);
      if (c !== d.caption) { d.caption = c; captionEl.textContent = c; }
    }

    function frame(now) {
      if (!d.running) return;
      const dt = Math.min(0.1, (now - d.last) / 1000);
      d.last = now;

      if (d.phase === "human") {
        d.ht += dt * 1000;
        const step = Math.floor(d.ht / HUMAN_MS);
        const t = d.ht % HUMAN_MS;
        if (step !== d.step) {
          if (step > 0) d.n++;
          d.step = step;
          setFail(false);
          press(false);
          cursorTo("rest");
          d.pressed = d.failed = d.moved = false;
          if (step >= HUMAN_STEPS) {
            d.phase = "machine";
            d.mt = 0;
          }
        }
        if (d.phase === "human") {
          if (t > 150 && !d.moved) { d.moved = true; cursorTo("btn"); }
          if (t > 700 && !d.pressed) { d.pressed = true; press(true); MWW.play("click"); }
          if (t > 850 && !d.failed) { d.failed = true; press(false); setFail(true, true); }
        }
      } else {
        d.mt += dt;
        const r = rate();
        d.acc += r * dt;
        const before = Math.floor(d.n);
        d.n += Math.floor(d.acc);
        d.acc -= Math.floor(d.acc);
        const changed = Math.floor(d.n) !== before;

        if (r < 6) {
          cursorTo("btn");
          if (changed) { press(true); setFail(true, true); d.flashUntil = now + 140; MWW.play("click"); }
          else if (now > d.flashUntil) { press(false); setFail(false); }
        } else {
          press(false);
          cursor.classList.add("gone");
          robot.classList.add("on");
          if (r < 40) {
            if (changed) { setFail(true, false); d.flashUntil = now + 60; }
            else if (now > d.flashUntil) setFail(false);
          } else {
            setFail(true, false);
          }
        }
      }

      render(now, rate());
      raf = requestAnimationFrame(frame);
    }

    function reset() {
      cancelAnimationFrame(raf);
      d = fresh();
      cursor.classList.remove("gone", "click");
      robot.classList.remove("on");
      press(false);
      setFail(false);
      boxes.forEach((b) => { b.className = "pw-box"; b.textContent = CH[0]; });
      requestAnimationFrame(() => cursorTo("rest"));
      render(performance.now(), rate());
      pauseBtn.textContent = "⏸️ Pauze";
    }

    function play() {
      if (d.running) return;
      d.running = true;
      d.last = performance.now();
      pauseBtn.textContent = "⏸️ Pauze";
      raf = requestAnimationFrame(frame);
    }

    function pause() {
      d.running = false;
      cancelAnimationFrame(raf);
      pauseBtn.textContent = "▶️ Verder";
    }

    pauseBtn.addEventListener("click", () => (d.running ? pause() : play()));
    $("demo-restart").addEventListener("click", () => { reset(); play(); });

    // Vanzelf starten zodra de simulatie in beeld komt
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !started && !stages.truth.hidden) {
        started = true;
        play();
      }
    }, { threshold: 0.4 });
    io.observe($("demo"));

    reset();
    return {
      stop() { pause(); reset(); started = false; },
      arm() {
        const r = $("demo").getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) { started = true; play(); }
      },
    };
  })();

  // ---------- Zo zit het echt ----------
  let sim = { running: false, t0: 0, done: 0, raf: 0 };

  $("to-truth").addEventListener("click", () => {
    cpuRun++;
    setStep(4);
    show("truth");
    resetSim();
    demo.stop();
    scrollToStage(stages.truth);
    setTimeout(() => demo.arm(), 900);
    MWW.play("click");
  });

  function resetSim() {
    stopSim();
    sim.done = 0;
    renderSim(0);
    $("sim-btn").textContent = "▶️ Start de computer";
    $("sim-note").textContent = "";
  }

  function renderSim(count) {
    const shown = count > 1e7 && count < BIG ? count + Math.random() * 9999999 : count;
    $("sim-count").textContent = nl(shown);
    const pct = (count / BIG) * 100;
    $("sim-pct").textContent = pct.toLocaleString("nl-NL", { minimumFractionDigits: 6, maximumFractionDigits: 6 });
    $("sim-bar").style.width = `${pct}%`;
  }

  function simFrame(now) {
    if (!sim.running) return;
    const count = Math.min(BIG, sim.done + ((now - sim.t0) / 1000) * PER_SECOND);
    renderSim(count);
    const secs = (now - sim.t0) / 1000;
    if (secs > 3 && !$("sim-note").textContent) {
      $("sim-note").textContent = "Zie je hoe weinig de balk beweegt? Zo doorgaan duurt ongeveer 110 dagen! 🐌";
    }
    sim.raf = requestAnimationFrame(simFrame);
  }

  function stopSim() {
    if (sim.running) {
      sim.done = Math.min(BIG, sim.done + ((performance.now() - sim.t0) / 1000) * PER_SECOND);
    }
    sim.running = false;
    cancelAnimationFrame(sim.raf);
  }

  $("sim-btn").addEventListener("click", () => {
    if (sim.running) {
      stopSim();
      $("sim-btn").textContent = "▶️ Verder gaan";
      const days = (BIG - sim.done) / PER_SECOND / 86400;
      $("sim-note").textContent = `Gestopt. De computer is nog lang niet klaar: nog ongeveer ${Math.round(days)} dagen te gaan! 😅`;
    } else {
      sim.running = true;
      sim.t0 = performance.now();
      $("sim-btn").textContent = "⏸️ Stop de computer";
      if ($("sim-note").textContent.startsWith("Gestopt")) $("sim-note").textContent = "";
      MWW.play("click");
      sim.raf = requestAnimationFrame(simFrame);
    }
  });

  $("restart").addEventListener("click", () => {
    resetSim();
    demo.stop();
    state.results = [];
    startRound(0);
    window.scrollTo({ top: 0, behavior: MWW.reduceMotion.matches ? "auto" : "smooth" });
  });

  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      cpuRun++;
      resetSim();
      demo.stop();
      state.results = [];
      startRound(0);
    }
  });

  startRound(0);
})();

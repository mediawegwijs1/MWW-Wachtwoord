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
      "💡 Met 3 letters zijn er al 17.576 mogelijke wachtwoorden! Wat denk je: hoe lang duurt een wachtwoord van 12 letters?",
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
        : "Volgende: 12 letters 😱";
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

  $("cpu-start").addEventListener("click", () => {
    const btn = $("cpu-start");
    btn.disabled = true;
    const run = ++cpuRun;
    const secret = randomLetters(12);
    const perReel = MWW.reduceMotion.matches ? 60 : 560;
    const t0 = performance.now();
    let lastLog = 0;
    let lastLine = "";
    let total = 0;
    let lockedCount = 0;
    $("cpu-status").textContent = "Bezig met kraken... ⚡";
    MWW.play("click");

    function frame(now) {
      if (run !== cpuRun) return;
      const elapsed = now - t0;
      const current = Math.min(12, Math.floor(elapsed / perReel));

      while (lockedCount < current) {
        const i = lockedCount;
        const ch = secret[i];
        reels[i].className = "reel locked";
        reels[i].textContent = ch;
        total += ABC.indexOf(ch) + 1;
        log(`${secret.slice(0, i + 1)}  ✔ letter ${i + 1} gevonden!`, true);
        MWW.play("tick");
        lockedCount++;
      }

      if (current >= 12) {
        $("cpu-count").textContent = nl(total);
        $("cpu-status").textContent = "Gekraakt! ✔";
        cpuDone(secret, total);
        return;
      }

      const p = (elapsed % perReel) / perReel;
      const target = ABC.indexOf(secret[current]);
      const k = Math.min(target, Math.floor(p * (target + 1.5)));
      const ch = ABC[k];
      reels[current].className = "reel spin";
      reels[current].textContent = ch;
      for (let j = current + 1; j < 12; j++) {
        reels[j].className = "reel spin";
        reels[j].textContent = ABC[Math.floor(Math.random() * 26)];
      }
      $("cpu-count").textContent = nl(total + k + 1);
      if (now - lastLog > 70) {
        lastLog = now;
        const line = `${secret.slice(0, current)}${ch}  ✘ fout`;
        if (ch !== secret[current] && line !== lastLine) { log(line); lastLine = line; }
      }
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

  // ---------- Zo zit het echt ----------
  let sim = { running: false, t0: 0, done: 0, raf: 0 };

  $("to-truth").addEventListener("click", () => {
    cpuRun++;
    setStep(4);
    show("truth");
    resetSim();
    scrollToStage(stages.truth);
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
    state.results = [];
    startRound(0);
    window.scrollTo({ top: 0, behavior: MWW.reduceMotion.matches ? "auto" : "smooth" });
  });

  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      cpuRun++;
      resetSim();
      state.results = [];
      startRound(0);
    }
  });

  startRound(0);
})();

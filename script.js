(() => {
  "use strict";

  // Alles gebeurt hier in de browser. Er wordt niets opgeslagen of verstuurd.

  const GUESSES_PER_SECOND = 1e10;
  const GUESSES_LOG = Math.log10(GUESSES_PER_SECOND);
  const LONG_LENGTH = 12;

  const SETS = {
    lower: 26,
    upper: 26,
    digit: 10,
    symbol: 33,
  };

  const COMMON = new Set([
    "123456", "1234567", "12345678", "123456789", "1234567890", "12345", "1234", "123",
    "111111", "000000", "654321", "123123", "121212", "112233", "666666", "555555",
    "password", "password1", "password123", "wachtwoord", "wachtwoord1", "wachtwoord123",
    "welkom", "welkom01", "welkom1", "welkom123", "qwerty", "qwerty123", "azerty", "asdfgh",
    "abc123", "abcdef", "iloveyou", "ikhouvanjou", "letmein", "admin", "test", "test123",
    "geheim", "hallo", "hallo123", "voetbal", "football", "monkey", "dragon", "princess",
    "sunshine", "minecraft", "fortnite", "roblox", "pokemon", "school", "school123",
    "ajax", "feyenoord", "psv", "zomer", "lente", "winter", "herfst", "poes", "hond",
  ]);

  const UNITS = [
    { s: 31557600, one: "jaar", many: "jaar" },
    { s: 2629800, one: "maand", many: "maanden" },
    { s: 86400, one: "dag", many: "dagen" },
    { s: 3600, one: "uur", many: "uur" },
    { s: 60, one: "minuut", many: "minuten" },
    { s: 1, one: "seconde", many: "seconden" },
  ];

  const BIG_WORDS = [
    { exp: 24, word: "quadriljoen" },
    { exp: 21, word: "triljard" },
    { exp: 18, word: "triljoen" },
    { exp: 15, word: "biljard" },
    { exp: 12, word: "biljoen" },
    { exp: 9, word: "miljard" },
    { exp: 6, word: "miljoen" },
    { exp: 3, word: "duizend" },
  ];

  const LEVELS = [
    { label: "😱 Heel zwak", color: "var(--lvl-0)", mouth: "M42 116 Q60 100 78 116" },
    { label: "😟 Zwak", color: "var(--lvl-1)", mouth: "M45 114 Q60 106 75 114" },
    { label: "😐 Kan beter", color: "var(--lvl-2)", mouth: "M45 112 Q60 112 75 112" },
    { label: "🙂 Sterk", color: "var(--lvl-3)", mouth: "M44 108 Q60 120 76 108" },
    { label: "🤩 Super sterk!", color: "var(--lvl-4)", mouth: "M40 106 Q60 128 80 106" },
  ];

  const nf = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });

  function analyse(pw) {
    const chars = Array.from(pw);
    return {
      length: chars.length,
      lower: /[a-z]/.test(pw),
      upper: /[A-Z]/.test(pw),
      digit: /[0-9]/.test(pw),
      symbol: /[^a-zA-Z0-9]/.test(pw),
    };
  }

  function poolSize(a) {
    let size = 0;
    for (const key of Object.keys(SETS)) if (a[key]) size += SETS[key];
    return size;
  }

  // Gemiddelde kraaktijd (log10 seconden): de helft van alle combinaties proberen.
  function crackLog10Seconds(length, pool) {
    if (length === 0 || pool === 0) return -Infinity;
    return length * Math.log10(pool) - Math.log10(2) - GUESSES_LOG;
  }

  function isCommon(pw) {
    if (!pw) return false;
    const lower = pw.toLowerCase();
    if (COMMON.has(lower)) return true;
    return Array.from(lower).every((c) => c === lower[0]) && lower.length > 1;
  }

  function fmt(n) {
    return n < 10 ? nf1.format(n) : nf.format(n);
  }

  function formatDuration(logSec) {
    if (!isFinite(logSec) || logSec < 0) return "Meteen! ⚡";
    const sec = Math.pow(10, logSec);
    const yearLog = logSec - Math.log10(31557600);

    if (yearLog >= 3) {
      if (yearLog >= 30) return "Bijna oneindig lang ♾️";
      const big = BIG_WORDS.find((b) => yearLog >= b.exp);
      return `${fmt(Math.pow(10, yearLog - big.exp))} ${big.word} jaar`;
    }
    for (const u of UNITS) {
      if (sec >= u.s) {
        const v = Math.floor((sec / u.s) * 10) / 10;
        const shown = v < 10 ? v : Math.floor(v);
        return `${fmt(shown)} ${shown === 1 ? u.one : u.many}`;
      }
    }
    return "Meteen! ⚡";
  }

  function compareText(logSec) {
    if (!isFinite(logSec) || logSec < 0) return "Sneller dan je met je ogen knippert! 😱";
    const years = Math.pow(10, logSec - Math.log10(31557600));
    if (years >= 1.38e10) return "Langer dan het heelal bestaat! 🌌";
    if (years >= 6.6e7) return "Langer dan geleden dat de dinosaurussen leefden! 🦖";
    if (years >= 3e5) return "Langer dan er mensen op aarde zijn! 🌍";
    if (years >= 4500) return "Langer dan de piramides bestaan! 🏛️";
    if (years >= 100) return "Langer dan een mensenleven! 👵";
    if (years >= 8) return "Langer dan jij op de basisschool zit! 🎒";
    if (years >= 1) return "Meer dan een jaar 📅";
    const sec = Math.pow(10, logSec);
    if (sec >= 86400) return "Een paar dagen of weken… dat is niet zo lang! 🤔";
    if (sec >= 3600) return "Ongeveer zo lang als een schooldag 🏫";
    if (sec >= 60) return "Zo lang als een pauze op het schoolplein ⏱️";
    return "Zo snel als je je veters strikt! 👟";
  }

  function levelFor(logSec, common) {
    if (common || logSec < 0) return 0;
    if (logSec < Math.log10(86400)) return 1;
    if (logSec < Math.log10(31557600 * 100)) return 2;
    if (logSec < Math.log10(31557600 * 1e6)) return 3;
    return 4;
  }

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const input = $("password");
  const toggle = $("toggle");
  const clearBtn = $("clear");
  const lengthEl = $("length");
  const result = $("result");
  const crackTime = $("crack-time");
  const crackCompare = $("crack-compare");
  const meter = $("meter");
  const meterFill = $("meter-fill");
  const strengthLabel = $("strength-label");
  const warning = $("warning");
  const mouth = $("mouth");
  const lengthFill = $("length-fill");
  const allDone = $("all-done");
  const items = Array.from(document.querySelectorAll("#checklist li"));
  const miniItems = Array.from(document.querySelectorAll(".mini-checks li"));
  const miniLen = $("mini-len");
  const play = $("play");
  const nextTip = $("next-tip");

  const TIP_TEXT = {
    lower: "Voeg een kleine letter toe",
    upper: "Voeg een hoofdletter toe",
    digit: "Voeg een cijfer toe",
    symbol: "Voeg een speciaal teken toe",
    long: `Maak hem ${LONG_LENGTH} tekens lang`,
  };

  // Zoek de stap die de kraaktijd het meest verlengt
  function bestTip(a, pool) {
    let best = null;
    for (const key of Object.keys(SETS)) {
      if (a[key]) continue;
      const log = crackLog10Seconds(a.length + 1, pool + SETS[key]);
      if (!best || log > best.log) best = { key, log };
    }
    if (a.length < LONG_LENGTH) {
      const log = crackLog10Seconds(LONG_LENGTH, pool);
      if (!best || log > best.log) best = { key: "long", log };
    }
    return best;
  }

  let wasAllDone = false;
  let lastTimeText = "";

  function setGain(el, parts) {
    el.textContent = "";
    for (const p of parts) {
      if (typeof p === "string") el.append(p);
      else {
        const b = document.createElement("b");
        b.textContent = p.b;
        el.append(b);
      }
    }
  }

  function update() {
    const pw = input.value;
    const a = analyse(pw);
    const pool = poolSize(a);
    const common = isCommon(pw);
    const logSec = common ? -Infinity : crackLog10Seconds(a.length, pool);

    lengthEl.textContent = a.length;

    // Resultaat
    if (a.length === 0) {
      result.dataset.level = "none";
      crackTime.textContent = "…";
      crackCompare.textContent = "Begin met typen om het te zien!";
      strengthLabel.innerHTML = "&nbsp;";
      meterFill.style.width = "0";
      meter.setAttribute("aria-valuenow", "0");
      mouth.setAttribute("d", "M45 112 Q60 112 75 112");
      warning.hidden = true;
      nextTip.hidden = true;
      lastTimeText = "";
    } else {
      const level = levelFor(logSec, common);
      const lv = LEVELS[level];
      const timeText = formatDuration(logSec);
      if (timeText !== lastTimeText) {
        crackTime.textContent = timeText;
        crackTime.classList.remove("pop");
        void crackTime.offsetWidth;
        crackTime.classList.add("pop");
        lastTimeText = timeText;
      }
      crackCompare.textContent = compareText(logSec);
      result.dataset.level = String(level);
      strengthLabel.textContent = lv.label;
      strengthLabel.style.color = lv.color;
      meterFill.style.background = lv.color;
      meterFill.style.width = `${Math.max(8, ((level + 1) / LEVELS.length) * 100)}%`;
      meter.setAttribute("aria-valuenow", String(level));
      mouth.setAttribute("d", lv.mouth);

      const tip = common ? null : bestTip(a, pool);
      nextTip.hidden = !tip;
      if (tip) setGain(nextTip, [`💡 ${TIP_TEXT[tip.key]} en het wordt `, { b: formatDuration(tip.log) }]);

      if (common) {
        warning.hidden = false;
        warning.textContent = "⚠️ Dit is een bekend wachtwoord! Hackers proberen deze als allereerste.";
      } else {
        warning.hidden = true;
      }
    }

    // Checklist
    let doneCount = 0;
    for (const li of items) {
      const key = li.dataset.check;
      const gain = li.querySelector(".gain");
      const done = key === "long" ? a.length >= LONG_LENGTH : a[key];

      if (done && !li.classList.contains("done")) {
        li.classList.add("just-done");
        setTimeout(() => li.classList.remove("just-done"), 700);
      }
      li.classList.toggle("done", Boolean(done));
      if (done) doneCount++;

      if (a.length === 0) {
        gain.textContent = "";
        continue;
      }

      if (key === "long") {
        if (done) {
          setGain(gain, ["Goed zo! Lange wachtwoorden zijn het sterkst. 💪"]);
        } else {
          const missing = LONG_LENGTH - a.length;
          const longer = crackLog10Seconds(LONG_LENGTH, pool);
          setGain(gain, [
            `Nog ${missing} ${missing === 1 ? "teken" : "tekens"}. Met ${LONG_LENGTH} tekens wordt het: `,
            { b: formatDuration(longer) },
          ]);
        }
      } else if (done) {
        setGain(gain, ["Goed zo! 👍"]);
      } else {
        const withIt = crackLog10Seconds(a.length + 1, pool + SETS[key]);
        setGain(gain, ["Voeg er één toe en het wordt: ", { b: formatDuration(withIt) }]);
      }
    }
    for (const li of miniItems) {
      const key = li.dataset.check;
      const done = Boolean(key === "long" ? a.length >= LONG_LENGTH : a[key]);
      if (done && !li.classList.contains("done")) {
        li.classList.add("just-done");
        setTimeout(() => li.classList.remove("just-done"), 600);
      }
      li.classList.toggle("done", done);
    }
    miniLen.textContent = `${Math.min(a.length, LONG_LENGTH)}/${LONG_LENGTH}`;

    lengthFill.style.width = `${Math.min(100, (a.length / LONG_LENGTH) * 100)}%`;

    const isAllDone = doneCount === items.length && !common;
    allDone.hidden = !isAllDone;
    if (isAllDone && !wasAllDone) confetti();
    wasAllDone = isAllDone;
  }

  // ---------- Verschil-ladder ----------
  const LADDER = [
    { pw: "zon", what: "Heel kort" },
    { pw: "zonnetje", what: "Langer, maar alleen kleine letters" },
    { pw: "Zonnetje", what: "+ een hoofdletter" },
    { pw: "Zonnetje7", what: "+ een cijfer" },
    { pw: "Zonnetje7!", what: "+ een speciaal teken" },
    { pw: "DeZonSchijntFijn7!", what: "Een hele zin: lang én alles erin!" },
  ];

  function buildLadder() {
    const list = $("ladder");
    for (const row of LADDER) {
      const a = analyse(row.pw);
      const logSec = crackLog10Seconds(a.length, poolSize(a));
      const li = document.createElement("li");
      li.style.setProperty("--c", LEVELS[levelFor(logSec, false)].color);
      const code = document.createElement("code");
      code.textContent = row.pw;
      const what = document.createElement("span");
      what.className = "what";
      what.textContent = row.what;
      const time = document.createElement("span");
      time.className = "time";
      time.textContent = formatDuration(logSec);
      li.append(code, time, what);
      list.append(li);
    }
  }

  // ---------- Confetti ----------
  function confetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = $("confetti");
    const colors = ["#6c4cff", "#ff6fb1", "#ffd23f", "#1fbf75", "#4cc9f0", "#ff9f1c"];
    for (let i = 0; i < 120; i++) {
      const p = document.createElement("span");
      p.className = "confetti-piece";
      p.style.left = `${Math.random() * 100}vw`;
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = `${2 + Math.random() * 2}s`;
      p.style.animationDelay = `${Math.random() * 0.6}s`;
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.append(p);
      setTimeout(() => p.remove(), 5000);
    }
  }

  // ---------- Layout-animatie ----------
  // Meet de posities voor en na de wissel en laat de blokken soepel naar hun nieuwe plek schuiven.
  const mainEl = document.querySelector("main");
  const playCards = Array.from(play.children);
  const otherSections = Array.from(mainEl.children).filter((el) => el !== play);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const running = [];

  function animateLayout(change) {
    if (reduceMotion.matches) { change(); return; }

    // Meten vóór het stoppen van een lopende animatie, zodat een snelle wissel vloeiend omkeert
    const all = [...playCards, ...otherSections];
    const before = new Map(all.map((el) => [el, el.getBoundingClientRect()]));
    while (running.length) running.pop().cancel();
    change();

    const timing = { duration: 550, easing: "cubic-bezier(.2, .9, .25, 1.05)" };
    for (const el of all) {
      const a = before.get(el);
      const b = el.getBoundingClientRect();
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      if (!dx && !dy && a.width === b.width && a.height === b.height) continue;
      const frames = playCards.includes(el)
        ? [
            { transform: `translate(${dx}px, ${dy}px)`, width: `${a.width}px`, height: `${a.height}px` },
            { transform: "translate(0, 0)", width: `${b.width}px`, height: `${b.height}px` },
          ]
        : [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }];
      running.push(el.animate(frames, timing));
    }
  }

  // ---------- Typmodus ----------
  // Tijdens het typen verdwijnen titel en privacyblok, zodat typveld en slotje
  // ook met een open toetsenbord samen in beeld blijven.
  function setTyping() {
    const typing = document.activeElement === input || input.value.length > 0;
    if (typing === document.body.classList.contains("typing")) return;
    animateLayout(() => document.body.classList.toggle("typing", typing));
    if (typing) {
      requestAnimationFrame(() => {
        const top = play.getBoundingClientRect().top + window.scrollY - 30;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      });
    }
  }

  // ---------- Events ----------
  input.addEventListener("input", () => { update(); setTyping(); });
  input.addEventListener("focus", setTyping);
  input.addEventListener("blur", setTyping);

  // Knoppen mogen de focus niet van het typveld afpakken (toetsenbord blijft open)
  for (const btn of [toggle, clearBtn]) {
    btn.addEventListener("pointerdown", (e) => e.preventDefault());
  }

  toggle.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    toggle.setAttribute("aria-pressed", String(show));
    toggle.setAttribute("aria-label", show ? "Verberg wachtwoord" : "Laat wachtwoord zien");
    toggle.firstElementChild.textContent = show ? "👀" : "🙈";
    input.focus();
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    update();
    input.focus();
  });

  // Zorg dat er nooit een oud wachtwoord blijft staan (bijv. na terug-knop)
  window.addEventListener("pageshow", () => { input.value = ""; update(); setTyping(); });
  window.addEventListener("pagehide", () => { input.value = ""; });

  buildLadder();
  update();
})();

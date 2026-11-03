// Gedeelde hulpjes voor alle opdrachten: confetti en geluid.
// Er wordt niets opgeslagen of verstuurd.
window.MWW = (() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function confetti(amount = 120) {
    if (reduceMotion.matches) return;
    let box = document.getElementById("confetti");
    if (!box) {
      box = document.createElement("div");
      box.id = "confetti";
      box.setAttribute("aria-hidden", "true");
      document.body.append(box);
    }
    const colors = ["#6c4cff", "#ff6fb1", "#ffd23f", "#1fbf75", "#4cc9f0", "#ff9f1c"];
    for (let i = 0; i < amount; i++) {
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

  // ---------- Geluid (standaard uit) ----------
  let soundOn = false;
  let ctx = null;

  function tone(freq, start, duration, type = "sine", volume = 0.15) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = ctx.currentTime + start;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  const SOUNDS = {
    click: () => tone(1400, 0, 0.035, "square", 0.04),
    tick: () => tone(1000, 0, 0.05, "sine", 0.08),
    good: () => { tone(660, 0, 0.12); tone(990, 0.08, 0.16); },
    wrong: () => { tone(220, 0, 0.18, "sawtooth", 0.08); tone(160, 0.12, 0.25, "sawtooth", 0.08); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, "triangle", 0.18)),
    lose: () => [440, 370, 311, 262].forEach((f, i) => tone(f, i * 0.16, 0.3, "triangle", 0.15)),
  };

  function play(name) {
    if (!soundOn || !SOUNDS[name]) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      SOUNDS[name]();
    } catch (e) {
      soundOn = false;
    }
  }

  function setupSoundToggle() {
    const btn = document.getElementById("sound-toggle");
    if (!btn) return;
    const render = () => {
      btn.setAttribute("aria-pressed", String(soundOn));
      btn.setAttribute("aria-label", soundOn ? "Geluid uitzetten" : "Geluid aanzetten");
      btn.querySelector("[data-icon]").textContent = soundOn ? "🔊" : "🔇";
      btn.querySelector("[data-label]").textContent = soundOn ? "Geluid aan" : "Geluid uit";
    };
    btn.addEventListener("click", () => {
      soundOn = !soundOn;
      render();
      play("good");
    });
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupSoundToggle);
  } else {
    setupSoundToggle();
  }

  return { confetti, play, reduceMotion };
})();

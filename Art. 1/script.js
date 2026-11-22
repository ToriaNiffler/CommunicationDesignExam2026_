const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const DURATION = 1800;      // ms per rolling-pin pass (larger = slower)
const PIN_H = 64;        // height of the rolling-pin element

function ease(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }   // smooth start and stop

/* ===== Sound (synthesized in the browser, no audio file needed) ===== */
let audioCtx = null, soundOn = false;
const soundButton = document.getElementById("soundButton");
soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  if (soundOn) {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
  }
  soundButton.textContent = soundOn ? "🔊 Sound on" : "🔇 Sound off";
  soundButton.setAttribute("aria-pressed", soundOn);
  soundButton.blur();   // so space/arrow keys don't stay focused on the button
});

// Dull, deep rolling sound
function playRollSound(seconds) {
  if (!soundOn || !audioCtx) return;
  const sr = audioCtx.sampleRate, n = Math.floor(sr * seconds);
  const buf = audioCtx.createBuffer(1, n, sr), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) { last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = last * 9; }
  const t0 = audioCtx.currentTime;
  const source = audioCtx.createBufferSource(); source.buffer = buf;
  const filter = audioCtx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 170; filter.Q.value = 1.2;
  const envelope = audioCtx.createGain();
  envelope.gain.setValueAtTime(0.0001, t0);
  envelope.gain.linearRampToValueAtTime(0.22, t0 + seconds * 0.2);
  envelope.gain.setValueAtTime(0.22, t0 + seconds * 0.75);
  envelope.gain.linearRampToValueAtTime(0.0001, t0 + seconds);
  source.connect(filter); filter.connect(envelope); envelope.connect(audioCtx.destination);
  source.start(t0); source.stop(t0 + seconds);
}

// Dull stamp thud for the section signs
function playStampSound() {
  if (!soundOn || !audioCtx) return;
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator(), amp = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(110, t0);
  osc.frequency.exponentialRampToValueAtTime(38, t0 + 0.2);
  amp.gain.setValueAtTime(0.25, t0);
  amp.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
  osc.connect(amp); amp.connect(audioCtx.destination);
  osc.start(t0); osc.stop(t0 + 0.3);
}

/* ===== Stage, rolling pin, navigation ===== */
const stage = document.getElementById("stage");
const slides = [...stage.querySelectorAll(".slide")];
const dotsBox = document.getElementById("dots");
const hint = document.getElementById("hint");

const rollingPin = document.createElement("div");
rollingPin.className = "rolling-pin";
rollingPin.innerHTML = '<div class="handle left"></div><div class="barrel"></div><div class="handle right"></div>';
stage.append(rollingPin);

// Shrink the font if the tallest slide doesn't fit on screen
function fitText() {
  stage.style.removeProperty("--fs");
  stage.style.setProperty("--fs", "1.15rem");
  const limit = window.innerHeight * 0.9;
  for (let fs = 18.4; fs >= 11.5 && stage.offsetHeight > limit; fs -= 0.4) {
    stage.style.setProperty("--fs", fs + "px");
  }
  stage.querySelectorAll(".content").forEach(i => i.style.setProperty("--fs", getComputedStyle(stage).getPropertyValue("--fs")));
}
window.addEventListener("resize", fitText);

// Dot navigation
const dots = slides.map((_, i) => {
  const b = document.createElement("button");
  b.type = "button"; b.setAttribute("aria-label", "Section " + (i + 1));
  b.addEventListener("click", () => { goTo(i); b.blur(); });
  dotsBox.append(b);
  return b;
});
function updateDots() { dots.forEach((b, i) => b.classList.toggle("active", i === current)); }

let current = -1, running = false, lockedUntil = 0;

function clip(el, top, bottom) { el.style.clipPath = `inset(${top}px -120px ${bottom}px -120px)`; }

function goTo(target) {
  if (running || target === current || target < 0 || target >= slides.length) return;
  const outgoing = current >= 0 ? slides[current] : null;
  const incoming = slides[target];
  const direction = target > current ? 1 : -1;   // 1: rolling pin moves up, -1: moves down
  if (outgoing) outgoing.classList.remove("done");
  current = target;
  updateDots();
  hint.classList.add("gone");

  function finish() {
    if (outgoing) { outgoing.classList.remove("visible"); outgoing.style.clipPath = ""; outgoing.style.willChange = ""; }
    incoming.style.clipPath = "";
    incoming.style.willChange = "";
    incoming.classList.add("visible", "done");     // starts the slide's effects
    rollingPin.style.opacity = 0;
    running = false;
    lockedUntil = performance.now() + 500;
    if (incoming.classList.contains("legal")) {
      [200, 700, 1200].forEach(ms => setTimeout(() => { if (current === target) playStampSound(); }, ms));
    }
  }

  if (reducedMotion) { running = true; finish(); return; }

  running = true;
  incoming.classList.add("visible");
  if (outgoing) outgoing.classList.add("visible");
  const H = stage.offsetHeight;
  rollingPin.style.opacity = 1;
  playRollSound(DURATION / 1000);
  incoming.style.willChange = "clip-path";
  if (outgoing) outgoing.style.willChange = "clip-path";
  let start = null;

  function step(now) {
    if (start === null) start = now;           // start on the first frame, no stutter at the beginning
    const t = Math.min((now - start) / DURATION, 1);
    const p = ease(t);
    const c = direction === 1 ? (H + PIN_H / 2) - p * (H + PIN_H)   // center of the rolling pin
                             : -PIN_H / 2 + p * (H + PIN_H);
    rollingPin.style.transform = `translateY(${(c - PIN_H / 2).toFixed(1)}px)`;
    const cc = Math.min(Math.max(c, 0), H);
    if (direction === 1) {            // new text appears below, old text stays above
      clip(incoming, cc, 0);
      if (outgoing) clip(outgoing, 0, H - cc);
    } else {                         // new text appears above, old text stays below
      clip(incoming, 0, H - cc);
      if (outgoing) clip(outgoing, cc, 0);
    }
    if (t < 1) requestAnimationFrame(step); else finish();
  }
  requestAnimationFrame(step);
}

const next = () => goTo(current + 1);
const prev = () => goTo(current - 1);

// Mouse wheel / touchpad
window.addEventListener("wheel", e => {
  e.preventDefault();
  if (running || performance.now() < lockedUntil || Math.abs(e.deltaY) < 12) return;
  e.deltaY > 0 ? next() : prev();
}, { passive: false });

// Arrow keys & co.
window.addEventListener("keydown", e => {
  const forward = ["ArrowDown", "ArrowRight", "PageDown", " "];
  const backward = ["ArrowUp", "ArrowLeft", "PageUp"];
  if (forward.includes(e.key)) { e.preventDefault(); next(); }
  else if (backward.includes(e.key)) { e.preventDefault(); prev(); }
  else if (e.key === "Home") { e.preventDefault(); goTo(0); }
  else if (e.key === "End") { e.preventDefault(); goTo(slides.length - 1); }
});

// Swipe on phones
let touchY = null;
window.addEventListener("touchstart", e => { touchY = e.touches[0].clientY; }, { passive: true });
window.addEventListener("touchend", e => {
  if (touchY === null) return;
  const dy = touchY - e.changedTouches[0].clientY;
  touchY = null;
  if (Math.abs(dy) > 40) dy > 0 ? next() : prev();
}, { passive: true });

// Start: after loading, the rolling pin rolls over the dough for the first time
window.addEventListener("load", () => {
  fitText();
  setTimeout(() => goTo(0), 500);
});

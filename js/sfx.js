// Petits sons générés (pas de fichiers audio) : réussite, erreur, fin de séance.

let ctx = null;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
}

function tone(freq, start, dur, { type = "sine", gain = 0.18 } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function ok() {
  tone(660, 0, 0.18);
  tone(990, 0.1, 0.28);
}

export function almost() {
  tone(520, 0, 0.2, { type: "triangle", gain: 0.15 });
}

export function ko() {
  tone(300, 0, 0.18, { type: "triangle", gain: 0.16 });
  tone(220, 0.12, 0.3, { type: "triangle", gain: 0.16 });
}

export function pop() {
  tone(880, 0, 0.08, { gain: 0.08 });
}

export function done() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.35, { gain: 0.16 }));
}

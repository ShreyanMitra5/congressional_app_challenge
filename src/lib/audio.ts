"use client";

/**
 * All sound is synthesised with Web Audio so nothing needs downloading and
 * nothing can be mistimed by a network. The chime only ever plays after a
 * tap; nothing plays when a stimulus appears.
 */

let ctx: AudioContext | null = null;
let musicNodes: { gain: GainNode; oscillators: OscillatorNode[]; lfo: OscillatorNode } | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx || ctx.state === "closed") {
    musicNodes = null;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  // WebKit also reports "interrupted" after calls or backgrounding. Retry on
  // the next sound/user gesture, while allowing denied autoplay to stay quiet.
  if (ctx.state !== "running") void ctx.resume().catch(() => {});
  return ctx;
}

/** Call from a user gesture so iOS allows audio for the rest of the session. */
export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  const buf = c.createBuffer(1, 1, 22050);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(c.destination);
  src.start(0);
}

/** A soft two-note chime, ~400 ms. */
export function playChime(enabled: boolean) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const notes = [880, 1174.66]; // A5, D6
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = now + i * 0.09;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  });
}

/** Quiet, slow pad for Ready / All done only. */
export function startMusic(enabled: boolean) {
  if (!enabled) return;
  const c = getCtx();
  if (!c || musicNodes) return;
  const master = c.createGain();
  master.gain.setValueAtTime(0.0001, c.currentTime);
  master.gain.exponentialRampToValueAtTime(0.045, c.currentTime + 2.5);
  master.connect(c.destination);

  const lfo = c.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 0.012;
  lfo.connect(lfoGain).connect(master.gain);
  lfo.start();

  const chord = [196, 246.94, 293.66, 392]; // G3 B3 D4 G4
  const oscillators = chord.map((f, i) => {
    const o = c.createOscillator();
    o.type = i % 2 ? "triangle" : "sine";
    o.frequency.value = f;
    o.detune.value = i * 3;
    const g = c.createGain();
    g.gain.value = 0.25;
    o.connect(g).connect(master);
    o.start();
    return o;
  });
  musicNodes = { gain: master, oscillators, lfo };
}

export function stopMusic() {
  if (!musicNodes || !ctx) return;
  const { gain, oscillators, lfo } = musicNodes;
  const t = ctx.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(gain.gain.value || 0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  oscillators.forEach((o) => o.stop(t + 0.9));
  lfo.stop(t + 0.9);
  musicNodes = null;
}

/**
 * Voice instructions. The product uses pre-recorded lines; until the
 * recordings land this uses the device voice with the exact same script so
 * the wording is locked today.
 */
export function speak(text: string, enabled: boolean) {
  if (!enabled) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9;
  u.pitch = 1.05;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}

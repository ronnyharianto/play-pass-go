/**
 * Lightweight Web Audio API sound effects for game events.
 * All sounds are synthesized at runtime — no audio assets needed,
 * so they work offline and have no licensing concerns.
 */

export type SoundName =
  | 'dice'
  | 'buy'
  | 'pay'
  | 'gain'
  | 'jail'
  | 'card'
  | 'win'
  | 'bankrupt'
  | 'build'
  | 'bail'
  | 'start';

const MUTE_KEY = 'monopoly-sound-muted';

let audioCtx: AudioContext | null = null;
let muted = false;

// Tiny external store so React can subscribe to the mute state without
// setState-in-effect (and stay hydration-safe).
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  // Browsers suspend audio until a user gesture — resume when possible.
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

/** Restore the muted preference (call once on app load). */
export function initSounds(): void {
  if (typeof window === 'undefined') return;
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    muted = false;
  }
}

export function isMuted(): boolean {
  return muted;
}

/** Subscribe to mute-state changes (for useSyncExternalStore). */
export function subscribeSounds(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Current mute state snapshot (client). */
export function getSoundsSnapshot(): boolean {
  return muted;
}

/** Mute state used during server rendering (no window, always unmuted). */
export function getSoundsServerSnapshot(): boolean {
  return false;
}

export function setMuted(value: boolean): void {
  muted = value;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(MUTE_KEY, value ? '1' : '0');
    } catch {
      /* ignore storage errors */
    }
  }
  notify();
}

/** Schedule a single oscillator tone with a fade-out envelope. */
function tone(
  freq: number,
  startAt: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.2,
  endFreq?: number
): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + startAt;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(endFreq, 1),
      t0 + duration
    );
  }
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** Schedule a burst of filtered white noise (for dice/card swishes). */
function noise(
  startAt: number,
  duration: number,
  volume = 0.15,
  filterFreq = 2500
): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + startAt;
  const buffer = ctx.createBuffer(
    1,
    Math.max(1, Math.floor(ctx.sampleRate * duration)),
    ctx.sampleRate
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.05);
}

/** Play a named game sound effect (no-op when muted or audio unavailable). */
export function playSound(name: SoundName): void {
  if (muted) return;
  switch (name) {
    case 'dice':
      noise(0, 0.1, 0.12, 3000);
      noise(0.12, 0.1, 0.12, 4200);
      tone(500, 0, 0.08, 'square', 0.08, 250);
      break;
    case 'buy': // cash register cha-ching
      tone(1200, 0, 0.09, 'square', 0.12);
      tone(1600, 0.09, 0.16, 'square', 0.12);
      break;
    case 'pay': // paying money out
      tone(600, 0, 0.1, 'triangle', 0.15, 450);
      tone(450, 0.1, 0.14, 'triangle', 0.15, 300);
      break;
    case 'gain': // collecting money
      tone(500, 0, 0.09, 'triangle', 0.15);
      tone(750, 0.09, 0.12, 'triangle', 0.15);
      tone(1000, 0.19, 0.16, 'triangle', 0.15);
      break;
    case 'jail': // heavy clank going down
      tone(280, 0, 0.18, 'sawtooth', 0.16, 160);
      tone(220, 0.16, 0.2, 'sawtooth', 0.14, 120);
      break;
    case 'card': // card swish
      noise(0, 0.16, 0.1, 5200);
      tone(700, 0.02, 0.1, 'sine', 0.08, 900);
      break;
    case 'win': // fanfare C-E-G-C
      tone(523, 0, 0.14, 'triangle', 0.16);
      tone(659, 0.14, 0.14, 'triangle', 0.16);
      tone(784, 0.28, 0.14, 'triangle', 0.16);
      tone(1047, 0.42, 0.4, 'triangle', 0.18);
      break;
    case 'bankrupt': // sad trombone slide
      tone(400, 0, 0.7, 'sawtooth', 0.14, 90);
      break;
    case 'build': // hammer knocks
      tone(180, 0, 0.07, 'square', 0.14, 120);
      tone(200, 0.1, 0.07, 'square', 0.14, 130);
      break;
    case 'bail': // coin drop
      tone(900, 0, 0.09, 'square', 0.12);
      tone(1400, 0.08, 0.12, 'square', 0.12);
      break;
    case 'start': // game start chime
      tone(440, 0, 0.12, 'triangle', 0.14);
      tone(660, 0.12, 0.18, 'triangle', 0.14);
      break;
    default:
      break;
  }
}

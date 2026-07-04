// ============================================================
// LORE — sound effects. Pure WebAudio synthesis (no asset files):
// tiny, instant, and tunable. Every game/UI action calls sfx(name).
// Volume lives in localStorage ("lore_sfx", 0..1) — see Settings.
// The AudioContext is created lazily and resumed on the first user
// gesture (autoplay policy), so early calls are safely dropped.
// ============================================================

export type SfxName =
  | "click" | "play" | "summon" | "attack" | "impact" | "damage" | "heal"
  | "death" | "trapSet" | "trap" | "draw" | "buy" | "mana" | "maxhp"
  | "turn" | "win" | "lose" | "drawGame" | "match" | "error" | "coin" | "pop";

const LS_KEY = "lore_sfx";
let volume = 0.7;
try { const v = parseFloat(localStorage.getItem(LS_KEY) ?? ""); if (!Number.isNaN(v)) volume = Math.min(1, Math.max(0, v)); } catch { /* ignore */ }

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let unlocked = false;

function ac(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = volume * volume; // perceptual curve
    master.connect(ctx.destination);
  }
  return ctx;
}

/** Install the one-time gesture unlock. Call once at app boot. */
export function initSound(): void {
  const unlock = () => {
    unlocked = true;
    const c = ac();
    if (c && c.state === "suspended") void c.resume().catch(() => { /* ignore */ });
  };
  document.addEventListener("pointerdown", unlock, { once: true, capture: true });
  document.addEventListener("keydown", unlock, { once: true, capture: true });
}

export function getSfxVolume(): number { return volume; }
export function setSfxVolume(v: number): void {
  volume = Math.min(1, Math.max(0, v));
  try { localStorage.setItem(LS_KEY, String(volume)); } catch { /* ignore */ }
  if (master) master.gain.value = volume * volume;
}

// ---- tiny synth helpers ----
interface ToneOpts { f: number; f2?: number; type?: OscillatorType; dur?: number; vol?: number; at?: number; attack?: number; }
function tone(o: ToneOpts): void {
  const c = ctx!;
  const t0 = c.currentTime + (o.at ?? 0);
  const dur = o.dur ?? 0.12;
  const osc = c.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.f, t0);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + dur);
  const g = c.createGain();
  const v = o.vol ?? 0.5;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(v, t0 + (o.attack ?? 0.005));
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  osc.connect(g).connect(master!);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

let noiseBuf: AudioBuffer | null = null;
interface NoiseOpts { dur?: number; vol?: number; at?: number; hp?: number; lp?: number; lp2?: number; }
function noise(o: NoiseOpts): void {
  const c = ctx!;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = c.currentTime + (o.at ?? 0);
  const dur = o.dur ?? 0.15;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  let node: AudioNode = src;
  if (o.hp) { const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = o.hp; node.connect(f); node = f; }
  if (o.lp) {
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(o.lp, t0);
    if (o.lp2) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.lp2), t0 + dur);
    node.connect(f); node = f;
  }
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(o.vol ?? 0.3, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  node.connect(g).connect(master!);
  src.start(t0); src.stop(t0 + dur + 0.02);
}

// ---- the sound set (each ≈ a few oscillators; tuned to be short & unobtrusive) ----
const SOUNDS: Record<SfxName, () => void> = {
  click:   () => { tone({ f: 640, f2: 520, type: "triangle", dur: 0.05, vol: 0.16 }); },
  pop:     () => { tone({ f: 420, f2: 620, type: "sine", dur: 0.07, vol: 0.2 }); },
  play:    () => { noise({ dur: 0.14, vol: 0.16, hp: 900, lp: 6000, lp2: 1400 }); },
  draw:    () => { noise({ dur: 0.08, vol: 0.12, hp: 1600 }); tone({ f: 1750, f2: 2300, type: "sine", dur: 0.05, vol: 0.05 }); },
  summon:  () => { tone({ f: 150, f2: 70, type: "sine", dur: 0.22, vol: 0.5 }); noise({ dur: 0.1, vol: 0.14, lp: 900, lp2: 200 }); },
  attack:  () => { noise({ dur: 0.18, vol: 0.22, hp: 300, lp: 4500, lp2: 700 }); },
  impact:  () => { tone({ f: 120, f2: 45, type: "sine", dur: 0.18, vol: 0.65 }); noise({ dur: 0.1, vol: 0.3, lp: 2600, lp2: 300 }); },
  damage:  () => { tone({ f: 260, f2: 130, type: "sawtooth", dur: 0.12, vol: 0.16 }); noise({ dur: 0.08, vol: 0.14, lp: 1800, lp2: 400 }); },
  heal:    () => { tone({ f: 660, type: "sine", dur: 0.12, vol: 0.16 }); tone({ f: 990, type: "sine", dur: 0.16, vol: 0.12, at: 0.06 }); },
  death:   () => { tone({ f: 200, f2: 50, type: "sawtooth", dur: 0.34, vol: 0.2 }); noise({ dur: 0.28, vol: 0.2, lp: 1300, lp2: 120 }); },
  trapSet: () => { tone({ f: 340, f2: 250, type: "square", dur: 0.05, vol: 0.1 }); tone({ f: 250, f2: 190, type: "square", dur: 0.05, vol: 0.1, at: 0.07 }); },
  trap:    () => { tone({ f: 1250, f2: 300, type: "sawtooth", dur: 0.2, vol: 0.22 }); noise({ dur: 0.12, vol: 0.12, hp: 800 }); },
  buy:     () => { tone({ f: 988, type: "square", dur: 0.06, vol: 0.09 }); tone({ f: 1319, type: "square", dur: 0.1, vol: 0.09, at: 0.06 }); },
  coin:    () => { [988, 1319, 1568, 2093].forEach((f, i) => tone({ f, type: "square", dur: 0.09, vol: 0.08, at: i * 0.07 })); },
  mana:    () => { [523, 784, 1047].forEach((f, i) => tone({ f, type: "triangle", dur: 0.1, vol: 0.1, at: i * 0.05 })); },
  maxhp:   () => { tone({ f: 392, type: "sine", dur: 0.16, vol: 0.14 }); tone({ f: 588, type: "sine", dur: 0.22, vol: 0.12, at: 0.08 }); },
  turn:    () => { tone({ f: 440, type: "sine", dur: 0.1, vol: 0.14 }); tone({ f: 660, type: "sine", dur: 0.16, vol: 0.14, at: 0.09 }); },
  match:   () => { tone({ f: 880, type: "sine", dur: 0.09, vol: 0.16 }); tone({ f: 1175, type: "sine", dur: 0.16, vol: 0.16, at: 0.1 }); },
  win:     () => { [523, 659, 784, 1047].forEach((f, i) => tone({ f, type: "triangle", dur: i === 3 ? 0.4 : 0.14, vol: 0.16, at: i * 0.13 })); },
  lose:    () => { [392, 349, 311, 262].forEach((f, i) => tone({ f, type: "triangle", dur: i === 3 ? 0.45 : 0.16, vol: 0.14, at: i * 0.16 })); },
  drawGame: () => { tone({ f: 440, type: "triangle", dur: 0.2, vol: 0.14 }); tone({ f: 440, type: "triangle", dur: 0.3, vol: 0.12, at: 0.24 }); },
  error:   () => { tone({ f: 180, type: "square", dur: 0.14, vol: 0.1 }); tone({ f: 150, type: "square", dur: 0.16, vol: 0.1, at: 0.1 }); },
};

const last: Partial<Record<SfxName, number>> = {};

/** Fire-and-forget. Safe before unlock / with volume 0 (no-ops). */
export function sfx(name: SfxName): void {
  if (volume <= 0 || !unlocked) return;
  const c = ac();
  if (!c || !master) return;
  if (c.state === "suspended") { void c.resume().catch(() => { /* ignore */ }); return; }
  const now = performance.now();
  if (last[name] && now - last[name]! < 45) return; // de-dupe bursts
  last[name] = now;
  try { SOUNDS[name](); } catch { /* never let audio break the game */ }
}

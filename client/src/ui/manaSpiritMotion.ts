export type SpiritMood = 'idle' | 'flutter' | 'sleepy' | 'happy';
export const SPIRIT_IDLE_GAP = { min: 8, max: 14 };
export const SPIRIT_MOTION_DURATION = { flutter: 4.6, sleepy: 6.8, happy: 2.6 };
const smooth = (a: number, b: number, t: number) => {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
const envelope = (t: number, a: number, b: number, c: number, d: number) => smooth(a,b,t) * (1-smooth(c,d,t));

/** Seconds are visible, animated time. Hidden tabs and reduced motion never advance it. */
export function createSpiritMotion(ambient: boolean, random = Math.random) {
  let time = 0, elapsed = 0, mood: SpiritMood = 'idle';
  let previous: SpiritMood = 'idle', repeats = 0;
  const gap = () => SPIRIT_IDLE_GAP.min + random() * (SPIRIT_IDLE_GAP.max - SPIRIT_IDLE_GAP.min);
  let next = gap();
  const begin = (kind: Exclude<SpiritMood,'idle'>) => { mood=kind; elapsed=0; };
  return {
    greet() { if (mood !== 'happy') begin('happy'); },
    celebrate() { if (mood !== 'flutter') begin('flutter'); },
    tick(dt: number) {
      time += dt;
      elapsed += dt;
      if (mood === 'idle' && ambient && elapsed >= next) {
        let chosen: Exclude<SpiritMood,'idle'> = random() < .5 ? 'flutter' : 'sleepy';
        if (chosen === previous && repeats >= 2) chosen = chosen === 'flutter' ? 'sleepy' : 'flutter';
        repeats = chosen === previous ? repeats + 1 : 1; previous = chosen;
        begin(chosen);
      } else if (mood !== 'idle' && elapsed >= SPIRIT_MOTION_DURATION[mood]) {
        mood='idle'; elapsed=0; next=gap();
      }
      const flutter = mood === 'flutter' ? elapsed : -1;
      const sleepy = mood === 'sleepy' ? elapsed : -1;
      const happy = mood === 'happy' ? elapsed : -1;
      const pleased = envelope(happy,.08,.55,1.6,2.6);
      const nuzzle = envelope(happy,.3,.85,1.15,2.25);
      const flight = envelope(flutter,.3,1.05,2.8,4.6);
      const smile = envelope(flutter,.75,1.25,3,4.3) + pleased*.42;
      const drowsy = envelope(sleepy,0,1.5,5.1,6.8);
      const nod = envelope(sleepy,2.1,3.25,3.6,4.6);
      const yawn = envelope(sleepy,2.7,3.3,4.1,4.9);
      const blinkPhase = time % 5.8;
      const blink = 1 - .94 * envelope(blinkPhase,5.53,5.65,5.7,5.8);
      const flap = Math.sin(flutter * 16) * .34 * flight;
      return {
        mood, elapsed,
        x: Math.sin(time*.55) * (ambient ? .08 : .025),
        y: Math.sin(time*1.8)*.05 + pleased*.065 + flight*.18 - envelope(flutter,0,.2,.3,.7)*.055 - drowsy*.08 - nod*.055,
        yaw: Math.sin(time*.8)*.16 * (1-drowsy*.7),
        roll: Math.sin(time*1.2)*.025 - nuzzle*.09 + Math.sin(flutter*3)*flight*.035 + drowsy*.055,
        pitch: nuzzle*.065 + drowsy*.12 + nod*.12 - flight*.04,
        fin: .04 + Math.sin(time*1.8)*.045 + flight*.30 + flap - drowsy*.12,
        finPitch: Math.sin(flutter*16+.45)*flight*.20,
        eye: blink * (1-drowsy*.77) * (1-smile*.95),
        smile, yawn,
      };
    },
  };
}

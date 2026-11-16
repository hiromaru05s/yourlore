import {loungeText} from './loungeText';

export type RabbitFlight = {
  attention: number; turn: number; gather: number; stroke: number; brake: number;
};
export const restingFlight: RabbitFlight = {attention:0, turn:0, gather:0, stroke:0, brake:0};

function ease(start: number, end: number, t: number) {
  const x = Math.max(0, Math.min(1, (t - start) / (end - start)));
  return x * x * (3 - 2 * x);
}
function pulse(t: number, start: number, peak: number, end: number) {
  return ease(start,peak,t) * (1-ease(peak,end,t));
}

// Project the route from shoulder height toward a point in front of the Seeker.
// The 3D renderer uses the same magnification to change the view of the face.
export function createHomeZenoFlight(button: HTMLButtonElement, setView: (scale: number, pose: RabbitFlight) => void) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let depth = 0;
  let pose = restingFlight;
  let currentLift = 0, currentBend = 0;
  let destination = 0;
  let frame = 0;
  let idleTimer = 0;
  let queuedGreeting: (() => void) | undefined;

  function place(position: number, lift: number, bend: number, nextPose: RabbitFlight) {
    depth = position;
    const scale = 1 / (1 - .38 * depth);
    pose = nextPose;
    currentLift = lift; currentBend = bend;
    button.style.transform = depth === 0 && !lift && !bend ? '' :
      `translate(${depth * 56 + bend}%, calc(var(--zeno-drop,32%) * ${depth} - ${lift}%)) scale(${scale})`;
    setView(scale, pose);
  }

  function travel(to: number) {
    cancelAnimationFrame(frame);
    destination = to;
    button.setAttribute('aria-label', to
      ? loungeText('ゼノに挨拶する','Greet Zeno','제노에게 인사하기')
      : loungeText('ゼノを呼ぶ','Call Zeno closer','제노 부르기'));
    const from = depth;
    const initialPose = pose;
    const initialLift = currentLift, initialBend = currentBend;
    const distance = Math.abs(to - from);
    const duration = (to ? 910 : 1240) * Math.sqrt(distance);
    const started = performance.now();
    button.dataset.flight = to ? 'approaching' : 'returning';

    function step(now: number) {
      const t = reduced.matches || !duration ? 1 : Math.max(0, Math.min(1, (now - started) / duration));
      // A rabbit listens and gathers before pushing off. On the way back it
      // looks over its shoulder first and banks around the Seeker's sleeve.
      const stride = to ? ease(.17,.69,t) : ease(.21,.85,t);
      const gather = pulse(t,.035,.18,.34);
      const stroke = pulse(t,.17,.36,.65);
      const brake = pulse(t,to ? .48 : .64,to ? .67 : .82,1);
      const turn = to ? .4 * stroke : -1.65 * ease(.02,.29,t) * (1-ease(.66,.98,t));
      const depthOvershoot = to ? .044 * brake : -.018 * brake;
      const nextPose: RabbitFlight = {
        attention: to ? ease(0,.13,t) : 1-ease(.68,.99,t),
        gather, stroke, brake, turn,
      };
      // A recall halfway home starts from the actual posture and position.
      const takeOver = ease(0,.14,t);
      for (const key of Object.keys(nextPose) as (keyof RabbitFlight)[]) {
        nextPose[key] = initialPose[key] + (nextPose[key]-initialPose[key])*takeOver;
      }
      const lift = (to ? 13 : 20)*Math.sin(Math.PI*stride) - 4*gather - 3*brake;
      const bend = (to ? -4 : -14)*Math.sin(Math.PI*stride);
      place(from + (to-from)*stride + distance*depthOvershoot, initialLift*(1-takeOver)+lift*distance, initialBend*(1-takeOver)+bend*distance, nextPose);
      if (t < 1) { frame = requestAnimationFrame(step); return; }
      frame = 0;
      button.dataset.flight = to ? 'near' : 'far';
      if (to && queuedGreeting) { queuedGreeting(); queuedGreeting = undefined; }
    }
    step(started);
  }

  function scheduleReturn() {
    clearTimeout(idleTimer);
    if (destination === 1) idleTimer = window.setTimeout(() => travel(0), 4000);
  }
  // Holding and turning Zeno up close also counts as interacting with him.
  const hold = () => clearTimeout(idleTimer);
  button.addEventListener('gotpointercapture', hold);
  button.addEventListener('lostpointercapture', scheduleReturn);

  function reset() {
    cancelAnimationFrame(frame);
    clearTimeout(idleTimer);
    frame = 0;
    destination = 0;
    queuedGreeting = undefined;
    place(0, 0, 0, restingFlight);
    button.dataset.flight = 'far';
  }

  button.dataset.flight = 'far';
  return {
    activate(greet: () => void) {
      clearTimeout(idleTimer);
      if (!destination) travel(1);
      else if (frame) queuedGreeting = greet;
      else greet();
      scheduleReturn();
    },
    reset,
    destroy() {
      reset();
      button.removeEventListener('gotpointercapture', hold);
      button.removeEventListener('lostpointercapture', scheduleReturn);
    },
  };
}

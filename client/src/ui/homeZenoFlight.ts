import {loungeText} from './loungeText';

// Project the route from shoulder height toward a point in front of the Seeker.
// The 3D renderer uses the same magnification to change the view of the face.
export function createHomeZenoFlight(button: HTMLButtonElement, setView: (scale: number, bank: number) => void) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let depth = 0;
  let destination = 0;
  let frame = 0;
  let idleTimer = 0;
  let queuedGreeting: (() => void) | undefined;

  function place(position: number, bank: number) {
    depth = position;
    const scale = 1 / (1 - .38 * depth);
    const arc = Math.sin(Math.PI * depth);
    button.style.transform = depth === 0 ? '' :
      `translate(${depth * 56}%, calc(var(--zeno-drop,32%) * ${depth} - ${arc * 10}%)) scale(${scale})`;
    setView(scale, bank);
  }

  function travel(to: number) {
    cancelAnimationFrame(frame);
    destination = to;
    button.setAttribute('aria-label', to
      ? loungeText('ゼノに挨拶する','Greet Zeno','제노에게 인사하기')
      : loungeText('ゼノを呼ぶ','Call Zeno closer','제노 부르기'));
    const from = depth;
    const duration = (to ? 540 : 880) * Math.sqrt(Math.abs(to - from));
    const started = performance.now();
    button.dataset.flight = to ? 'approaching' : 'returning';

    function step(now: number) {
      const t = reduced.matches || !duration ? 1 : Math.max(0, Math.min(1, (now - started) / duration));
      const eased = t * t * (3 - 2 * t);
      // Lean into the thrust, then lift the face to brake before hovering.
      const bank = (to - from) * Math.sin(2 * Math.PI * t) * Math.sin(Math.PI * t);
      place(from + (to - from) * eased, bank);
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
    place(0, 0);
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

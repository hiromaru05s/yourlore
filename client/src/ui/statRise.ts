import * as T from 'three';
import type {GameState} from '../shared/types';
import {boardLens, layoutRect, screenToBoard} from './boardProjection';
import {createAttackRiseTracker} from './statRiseChanges';
import {createStatRiseVisual, STAT_RISE_DURATION} from './statRiseVisual';

/** One lazily created canvas per board, shared by all simultaneous stat gains. */
export function createBoardStatRise(root: HTMLElement) {
  const track = createAttackRiseTracker(), trackHealth = createAttackRiseTracker('health');
  const scene = new T.Scene(), camera = new T.PerspectiveCamera();
  const active = new Map<string, {uid: string; visual: ReturnType<typeof createStatRiseVisual>; start: number}>();
  let renderer: T.WebGLRenderer | undefined;
  let frame = 0, width = 0, height = 0, disposed = false, unavailable = false;
  const reduced = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  function clear() {
    cancelAnimationFrame(frame); frame = 0;
    active.forEach(({visual}) => visual.dispose()); active.clear();
    if (renderer) {renderer.clear(); renderer.domElement.hidden = true;}
  }
  function ensureRenderer() {
    if (renderer) return true;
    if (unavailable) return false;
    try {
      renderer = new T.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'low-power'});
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0, 0);
      const canvas = renderer.domElement;
      canvas.className = 'stat-rise-layer'; canvas.setAttribute('aria-hidden', 'true');
      canvas.dataset.numericOverlay = 'none';
      canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1800';
      document.body.append(canvas);
      return true;
    } catch {unavailable = true; return false;}
  }
  function tick(now: number) {
    frame = 0;
    if (disposed || !root.isConnected || document.hidden || reduced?.matches) {clear(); return;}
    if (!renderer) return;
    if (width !== innerWidth || height !== innerHeight) {
      width = innerWidth; height = innerHeight; renderer.setSize(width, height);
      const {focal, angle} = boardLens(width, height);
      camera.fov = T.MathUtils.radToDeg(2 * Math.atan(height / (2 * focal)));
      camera.aspect = width / height; camera.near = focal * .25; camera.far = focal * 3;
      camera.position.set(0, focal * Math.cos(angle), focal * Math.sin(angle));
      camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    }
    // Re-resolve every frame: GameView replaces card elements on each snapshot.
    const targets = new Map([...root.querySelectorAll<HTMLElement>('.zone-mon .card[data-uid]')].map(el => [el.dataset.uid, el]));
    for (const [uid, entry] of active) {
      const target = targets.get(entry.uid), age = (now - entry.start) / 1000;
      if (!target || age >= STAT_RISE_DURATION) {entry.visual.dispose(); active.delete(uid); continue;}
      entry.visual.group.visible=age>=0;if(age<0)continue;
      const rect = layoutRect(target), group = entry.visual.group;
      const screen=target.getBoundingClientRect(),center=screenToBoard(screen.left+screen.width/2,screen.top+screen.height/2);
      group.position.set(center.x-width/2,0,center.y-height/2);
      group.scale.setScalar(rect.width); entry.visual.update(age, camera);
    }
    renderer.domElement.dataset.targets = [...active.keys()].join(' ');
    renderer.render(scene, camera);
    if (active.size) frame = requestAnimationFrame(tick);
    else renderer.domElement.hidden = true;
  }
  const onHidden = () => {if (document.hidden) clear();};
  document.addEventListener('visibilitychange', onHidden);
  return {
    update(state: GameState) {
      if (disposed) return;
      const raised = track(state).map(uid=>({uid,kind:'attack' as const}));
      const health = trackHealth(state).map(uid=>({uid,kind:'health' as const}));
      const gains = [...raised,...health];
      if (state.over || document.hidden || reduced?.matches) {clear(); return;}
      if (!gains.length || !ensureRenderer()) return;
      const start = performance.now();
      for (const {uid,kind} of gains) {
        const key=uid+'|'+kind;active.get(key)?.visual.dispose();
        const visual = createStatRiseVisual(kind); scene.add(visual.group);
        active.set(key, {uid, visual, start:start+(kind==='health'&&raised.some(e=>e.uid===uid)?600:0)});
      }
      renderer!.domElement.hidden = false;
      if (!frame) frame = requestAnimationFrame(tick);
    },
    dispose() {disposed = true; clear(); document.removeEventListener('visibilitychange', onHidden); renderer?.dispose(); renderer?.domElement.remove();},
  };
}

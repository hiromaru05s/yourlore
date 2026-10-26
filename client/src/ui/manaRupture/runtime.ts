import {captureOutcomeSurface,outcomeAnchor} from '../outcomeSurface';
import type {ManaRuptureRenderer} from './renderer';
import {ruptureSound} from './sound';
import './runtime.css';

export interface ManaRupture {
  ready:Promise<void>;
  finished:Promise<void>;
  /** Called after the authoritative damage has painted HP zero, at impact. */
  start():void;
  /** Also restores the native portrait after completed playback, on view disposal. */
  cancel():void;
}
const active=new Set<ManaRupture>();
export function cancelManaRuptures():void {for(const effect of [...active])effect.cancel();}

/** One bounded lifetime owns loading, native capture, GPU, sound and result gating. */
export function prepareManaRupture(root:HTMLElement):ManaRupture {
  const abort=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)');
  let renderer:ManaRuptureRenderer|undefined,canvas:HTMLCanvasElement|undefined,host:HTMLElement|undefined;
  let sound:ReturnType<typeof ruptureSound>|undefined,frame=0,timer=0,ended=false,started=false;
  let settle!:()=>void;
  const finished=new Promise<void>(resolve=>{settle=resolve;});
  const cancel=()=>{finish(false);root.removeAttribute('data-mana-ruined');};
  const visibility=()=>{if(document.hidden)cancel();};
  function finish(complete:boolean):void {
    if(ended)return;
    ended=true;abort.abort();clearTimeout(timer);cancelAnimationFrame(frame);
    window.removeEventListener('resize',cancel);window.removeEventListener('pagehide',cancel);
    document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',cancel);
    // A driver/audio teardown error must never keep the result promise pending.
    try{sound?.close();}catch(error){console.warn('[mana rupture audio cleanup]',error);}
    host?.remove();
    try{renderer?.dispose();}catch(error){console.warn('[mana rupture GPU cleanup]',error);}
    renderer=undefined;
    if(canvas)canvas.width=canvas.height=1;
    if(!complete)root.removeAttribute('data-mana-ruined');
    else root.dataset.manaFxFinished=String(Math.round(performance.now()));
    active.delete(handle);settle();
  }
  async function begin():Promise<void> {
    await ready;
    if(ended)return;
    try {
      timer=window.setTimeout(cancel,6500);
      const surface=await captureOutcomeSurface(root,abort.signal);
      if(ended){if(surface)surface.width=surface.height=1;return;}
      if(!surface || !renderer || !canvas || !root.isConnected){cancel();return;}
      renderer.updateSurface(surface);
      host=document.createElement('div');host.className='mana-rupture';host.setAttribute('aria-hidden','true');
      host.dataset.renderer='perspective-3d';host.dataset.pieces=String(renderer.count);
      host.append(canvas);document.body.append(host);
      root.dataset.manaRuined='true';root.dataset.manaFxStarted=String(Math.round(performance.now()));
      sound=ruptureSound();
      const origin=performance.now();
      const draw=(now:number)=>{
        if(ended)return;
        if(!root.isConnected){cancel();return;}
        const time=Math.min(3550,Math.max(0,now-origin));
        try {
          renderer!.draw(innerWidth,innerHeight,time,outcomeAnchor(root));sound?.tick(time,false);
          host!.dataset.time=String(Math.round(time));
        }catch(error){console.warn('[mana rupture playback]',error);cancel();return;}
        if(time>=3550)finish(true);else frame=requestAnimationFrame(draw);
      };
      draw(origin);
    }catch(error){console.warn('[mana rupture capture]',error);cancel();}
  }
  // Cancellation always settles ready too, even if a texture/network request never resolves.
  let ready:Promise<void>;
  const handle:ManaRupture={ready:Promise.resolve(),finished,cancel,start:()=>{
    if(started||ended)return;started=true;void begin();
  }};
  active.add(handle);
  window.addEventListener('resize',cancel);window.addEventListener('pagehide',cancel);
  document.addEventListener('visibilitychange',visibility);motion.addEventListener('change',cancel);
  timer=window.setTimeout(cancel,2500);
  const prepare=(async()=>{
    if(motion.matches || document.hidden || !root.isConnected){cancel();return;}
    try {
      const [surface,module]=await Promise.all([captureOutcomeSurface(root,abort.signal),import('./renderer')]);
      if(ended){if(surface)surface.width=surface.height=1;return;}
      if(!surface){cancel();return;}
      canvas=document.createElement('canvas');renderer=new module.ManaRuptureRenderer(surface,canvas);
      canvas.addEventListener('webglcontextlost',()=>{if(!ended)cancel();},{once:true});
      renderer.draw(innerWidth,innerHeight,0,outcomeAnchor(root));clearTimeout(timer);
    }catch(error){console.warn('[mana rupture prepare]',error);cancel();}
  })();
  ready=handle.ready=Promise.race([prepare,finished]);
  return handle;
}

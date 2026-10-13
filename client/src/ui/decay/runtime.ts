import {FRAME_BACK} from '../../shared/cards';
import {captureCardSurface,CARD_PADDING} from '../cardSurface';
import {projectedPlacement} from '../boardProjection';
import {Renderer,DECAY_DURATION} from './renderer';

/** Approved 02 surface only: flat on the board, no droplet or residue phase. */
const jobs=new Map<HTMLElement,()=>void>();
export function cancelDecay(root?:HTMLElement){for(const [source,cancel] of [...jobs])if(!root||root.contains(source))cancel();}
export function playDecayDissolve(source:HTMLElement,options:{signal?:AbortSignal}={}):Promise<boolean>{
 jobs.get(source)?.();
 if(!source.isConnected||document.hidden||options.signal?.aborted)return Promise.resolve(false);
 return new Promise(resolve=>{
  const visibility=source.style.visibility;
  let ended=false,frame=0,renderer:Renderer|undefined,host:HTMLElement|undefined,captureHost:HTMLElement|undefined,fallback:Animation|undefined;
  const finish=(complete=false)=>{
   if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(frame);fallback?.cancel();
   options.signal?.removeEventListener('abort',abort);host?.remove();captureHost?.remove();renderer?.dispose();
   source.style.visibility=visibility;jobs.delete(source);resolve(complete);
  };
  const abort=()=>finish(false),timeout=setTimeout(abort,6000);
  jobs.set(source,abort);options.signal?.addEventListener('abort',abort,{once:true});
  const invalid=()=>ended||!source.isConnected||document.hidden||options.signal?.aborted;
  void(async()=>{
   if(matchMedia('(prefers-reduced-motion:reduce)').matches){finish(true);return;}
   captureHost=document.createElement('div');captureHost.className='game decay-capture';
   captureHost.style.cssText='position:fixed;left:-4000px;top:0;width:180px;pointer-events:none';
   const copy=source.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.removeAttribute('data-uid');
   copy.classList.remove('fx-field-ghost','fx-card-flight','cast-reveal');
   copy.style.cssText='position:relative;width:180px;height:270px;--cw:180px;--ch:270px;transform:none;opacity:1;visibility:visible';
   captureHost.append(copy);document.body.append(captureHost);
   const surface=await captureCardSurface(copy,FRAME_BACK,true,false);
   captureHost?.remove();captureHost=undefined;
   if(invalid()){finish();return;}if(!surface.face)throw Error('Missing public card surface');
   // Strip capture padding to keep the runtime face exactly on the live card's full footprint.
   const face=document.createElement('canvas');face.width=540;face.height=810;
   const pad=surface.face.width*CARD_PADDING/(1+2*CARD_PADDING);
   face.getContext('2d')!.drawImage(surface.face,pad,pad,surface.face.width-2*pad,surface.face.height-2*pad,0,0,540,810);
   const r=source.getBoundingClientRect(),size=Math.round(Math.max(256,Math.min(768,r.width*(devicePixelRatio||1)*3.4)));
   renderer=new Renderer(size);
   host=document.createElement('div');host.className='decay-dissolve';host.dataset.effect='blister-dissolve';host.setAttribute('aria-hidden','true');
   host.style.cssText='position:fixed;left:0;top:0;width:180px;height:270px;transform-origin:0 0;pointer-events:none;z-index:180';
   host.style.transform=projectedPlacement(source,180,270).toString();
   const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
   canvas.style.cssText='position:absolute;left:-216px;top:-171px;width:612px;height:612px';host.append(canvas);
   const c=canvas.getContext('2d')!;c.setTransform(size/612,0,0,size/612,0,0);
   const paint=(ms:number)=>{c.clearRect(0,0,612,612);renderer!.draw(c,face,ms,306,306,180);host!.dataset.time=String(Math.round(ms));};
   paint(0);if(invalid()){finish();return;}
   document.body.append(host);source.style.visibility='hidden';const start=performance.now();
   const tick=(now:number)=>{if(invalid()){finish();return;}const ms=Math.min(DECAY_DURATION,Math.max(0,now-start));try{paint(ms);}catch{finish();return;}if(ms===DECAY_DURATION)finish(true);else frame=requestAnimationFrame(tick);};
   frame=requestAnimationFrame(tick);
  })().catch(()=>{
   if(invalid()){finish();return;}
   // Explicit no-GPU/texture fallback: a short native dissolve, never the normal shatter.
   host?.remove();captureHost?.remove();source.style.visibility=visibility;
   if(!source.animate){finish(true);return;}
   fallback=source.animate([{opacity:1,filter:'sepia(.3)'},{opacity:0,filter:'sepia(.7) hue-rotate(35deg)'}],{duration:220,easing:'ease-out'});
   void fallback.finished.then(()=>finish(true),()=>finish(false));
  });
 });
}
window.addEventListener('resize',()=>cancelDecay());
window.addEventListener('pagehide',()=>cancelDecay());
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelDecay();});

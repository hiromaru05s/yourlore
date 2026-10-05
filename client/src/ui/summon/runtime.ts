import {FRAME_BACK} from '../../shared/cards';
import {captureCardSurface} from '../cardSurface';
import {boardMatrix,layoutRect,projectedPlacement} from '../boardProjection';
import {Renderer} from './renderer';
import {DURATION,motion} from './catalog';

/** Approved #3. The same material and timeline power the six-way preview. */
export const SUMMON_VARIANT=2;
const jobs=new Map<HTMLElement,{anchor:HTMLElement;cancel:()=>void}>();
type Options={anchor?:HTMLElement;signal?:AbortSignal;onImpact?:()=>void};
export function summonPlacement(target:HTMLElement,w:number,h:number,ms=0,reduced=false){
 const m=motion(SUMMON_VARIANT,ms,reduced),plane=target.closest<HTMLElement>('[data-board-plane]');
 if(!plane)return projectedPlacement(target,w,h).translate(0,-m.lift*w);
 const r=layoutRect(target);
 return boardMatrix(r.left,r.top,(Number(plane.dataset.boardPlane)||0)+m.lift*r.width).scale(r.width/w,r.height/h);
}
export function cancelSummon(source:HTMLElement){jobs.get(source)?.cancel();}
export function cancelSummons(root?:HTMLElement){for(const [source,j] of [...jobs])if(!root||root.contains(source)||root.contains(j.anchor))j.cancel();}

export function playSlateSummon(source:HTMLElement,options:Options={}):Promise<boolean>{
 jobs.get(source)?.cancel();
 const anchor=options.anchor??source;
 if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted)return Promise.resolve(false);
 return new Promise(resolve=>{
  const visibility=source.style.visibility;
  let ended=false,frame=0,renderer:Renderer|undefined,host:HTMLElement|undefined,captureHost:HTMLElement|undefined;
  const finish=(complete=false)=>{
   if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(frame);
   options.signal?.removeEventListener('abort',abort);host?.remove();captureHost?.remove();renderer?.dispose();
   source.style.visibility=visibility;jobs.delete(source);resolve(complete);
  };
  const abort=()=>finish(false),timeout=setTimeout(abort,6000);
  jobs.set(source,{anchor,cancel:abort});options.signal?.addEventListener('abort',abort,{once:true});
  void (async()=>{
   const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
   if(reduced){options.onImpact?.();finish(true);return;}
   // Capture only this already-public face, unprojected, so text/frame geometry is preserved.
   captureHost=document.createElement('div');captureHost.className='game';
   captureHost.style.cssText='position:fixed;left:-4000px;top:0;width:180px;pointer-events:none';
   const copy=source.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.removeAttribute('data-uid');
   copy.classList.remove('fx-field-ghost','fx-card-flight','cast-reveal');
   copy.style.cssText='position:relative;width:180px;height:270px;--cw:180px;--ch:270px;transform:none;opacity:1;visibility:visible';
   captureHost.append(copy);document.body.append(captureHost);
   const surface=await captureCardSurface(copy,FRAME_BACK,true,false);
   captureHost.remove();captureHost=undefined;
   if(ended)return;
   if(!source.isConnected||!anchor.isConnected||options.signal?.aborted||!surface.face){finish();return;}
   const face=document.createElement('canvas');face.width=540;face.height=Math.round(540*surface.face.height/surface.face.width);face.getContext('2d')!.drawImage(surface.face,0,0,face.width,face.height);
   renderer=new Renderer();
   host=document.createElement('div');host.className='slate-summon';host.setAttribute('aria-hidden','true');
   host.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:136;isolation:isolate';
   const planes=['ground','card'].map(pass=>{
    const el=document.createElement('div');el.dataset.summonPass=pass;
    el.style.cssText='position:absolute;left:0;top:0;width:180px;height:270px;transform-origin:0 0';
    const canvas=document.createElement('canvas');canvas.width=canvas.height=684;
    canvas.style.cssText='position:absolute;left:-252px;top:-207px;width:684px;height:684px';
    el.append(canvas);host!.append(el);return {el,c:canvas.getContext('2d')!,pass:pass as 'ground'|'card'};
   });
   document.body.append(host);source.style.visibility='hidden';
   const ground=projectedPlacement(anchor,180,270).toString(),start=performance.now();let impacted=false,lastPaint=-Infinity;
   const tick=(now:number)=>{
    if(ended)return;
    if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}
    const ms=Math.min(DURATION,now-start);
    host!.dataset.time=String(Math.round(ms));host!.dataset.variant='slate';
    if(!impacted&&ms>=790){impacted=true;options.onImpact?.();if(ended)return;}
    const paint=now-lastPaint>=1000/30;if(paint)lastPaint=now;
    for(const {el,c,pass} of planes){
     el.style.transform=pass==='ground'?ground:summonPlacement(anchor,180,270,ms).toString();
     if(paint){c.clearRect(0,0,684,684);renderer!.draw(c,face,SUMMON_VARIANT,ms,342,342,180,false,pass,false);}
    }
    if(ms===DURATION){finish(true);return;}frame=requestAnimationFrame(tick);
   };tick(start);
  })().catch(error=>{if(!ended){console.warn('[summon] Native card fallback',error);options.onImpact?.();finish();}});
 });
}
window.addEventListener('resize',()=>cancelSummons());
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelSummons();});

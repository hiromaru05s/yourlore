import {sizeSummonCanvas,summonPixelMatrix} from '../summon/quality';
import {FRAME_BACK} from '../../shared/cards';
import {captureCardSurface} from '../cardSurface';
import {boardMatrix,layoutRect,screenToBoard} from '../boardProjection';
import {renderBoard,releaseFace} from './renderer';
import {isPoisonSummon,POISON_SELECTION,DURATION,CONTACT_MS,cardHeight,ease} from './selection';

type Options={anchor?:HTMLElement;from?:DOMRect;signal?:AbortSignal;onImpact?:()=>void};
const jobs=new Map<HTMLElement,{anchor:HTMLElement;cancel:()=>void}>();
const motion=matchMedia('(prefers-reduced-motion:reduce)');
export function cancelPoisonSummon(source:HTMLElement){jobs.get(source)?.cancel();}
export function cancelPoisonSummons(root?:HTMLElement){for(const [source,j]of [...jobs])if(!root||root.contains(source)||root.contains(j.anchor))j.cancel();}

/** The selected preview surface owns motion, material, contact and native handoff. */
export function playPoisonSummon(source:HTMLElement,options:Options={}):Promise<boolean>{
 cancelPoisonSummon(source);const anchor=options.anchor??source,id=source.dataset.cardId;
 if(!isPoisonSummon(id)||!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted)return Promise.resolve(false);
 if(motion.matches){options.onImpact?.();return Promise.resolve(true);}
 const visibility=source.style.visibility;source.style.visibility='hidden';
 return new Promise(resolve=>{
  let ended=false,frame=0,impacted=false,host:HTMLElement|undefined,captureHost:HTMLElement|undefined,face:HTMLCanvasElement|undefined;
  const impact=()=>{if(!impacted){impacted=true;options.onImpact?.();}};
  const finish=(complete=false)=>{
   if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(frame);
   options.signal?.removeEventListener('abort',abort);host?.remove();captureHost?.remove();
   if(face)releaseFace(face);source.style.visibility=visibility;jobs.delete(source);resolve(complete);
  };
  const abort=()=>finish(),timeout=setTimeout(abort,6500);
  jobs.set(source,{anchor,cancel:abort});options.signal?.addEventListener('abort',abort,{once:true});
  const fallback=(error:unknown)=>{if(ended)return;console.warn('[poison-summon] Native card fallback',error);try{impact();}finally{finish();}};
  void(async()=>{
   captureHost=document.createElement('div');captureHost.className='game';
   captureHost.style.cssText='position:fixed;left:-4000px;top:0;width:180px;pointer-events:none';
   const copy=source.cloneNode(true) as HTMLElement;
   for(const node of [copy,...copy.querySelectorAll<HTMLElement>('[id],[data-uid]')]){node.removeAttribute('id');node.removeAttribute('data-uid');}
   copy.classList.remove('fx-field-ghost','fx-card-flight','cast-reveal');
   copy.style.cssText='position:relative;width:180px;height:280px;--cw:180px;--ch:280px;transform:none;translate:none;opacity:1;visibility:visible';
   captureHost.append(copy);document.body.append(captureHost);
   const surface=await captureCardSurface(copy,FRAME_BACK,true,false);captureHost?.remove();captureHost=undefined;
   if(ended)return;
   if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}
   if(!surface.face)throw Error('Public card surface unavailable');
   face=document.createElement('canvas');face.width=640;face.height=Math.round(640*surface.face.height/surface.face.width);
   face.getContext('2d')!.drawImage(surface.face,0,0,face.width,face.height);
   host=document.createElement('div');host.className='poison-summon';host.dataset.cardId=id;host.dataset.variant=String(POISON_SELECTION[id]+1);host.setAttribute('aria-hidden','true');
   host.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:136';
   const canvas=document.createElement('canvas');sizeSummonCanvas(canvas);canvas.style.cssText='width:100%;height:100%';host.append(canvas);
   const c=canvas.getContext('2d')!;
   const paint=(ms:number)=>{
    const r=layoutRect(anchor),plane=Number(anchor.closest<HTMLElement>('[data-board-plane]')?.dataset.boardPlane)||0;
    const translate=getComputedStyle(anchor).translate?.split(' ')??[];
    const sx=r.width/144,sz=r.height/224,tx=r.left+r.width/2+(parseFloat(translate[0])||0),tz=r.top+r.height/2+(parseFloat(translate[1])||0);
    const from=options.from,origin=from?screenToBoard(from.left+from.width/2,from.top+from.height/2,plane+cardHeight(ms)*sx):{x:tx,y:tz};
    const travel=ease(0,CONTACT_MS,ms),m=boardMatrix(origin.x+(tx-origin.x)*travel,origin.y+(tz-origin.y)*travel,plane).scale(sx,sz,sx);
    c.clearRect(0,0,canvas.width,canvas.height);renderBoard(c,face!,id,POISON_SELECTION[id],ms,summonPixelMatrix(m),canvas.width,canvas.height);
    host!.dataset.time=String(Math.round(ms));
   };
   // Compile and paint before starting the shared physical clock.
   paint(0);document.body.append(host);const start=performance.now();
   const tick=(now:number)=>{try{
    if(ended)return;if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}
    const ms=Math.min(DURATION,now-start);paint(ms);
    if(ms>=CONTACT_MS){impact();if(ended)return;}
    if(ms===DURATION){finish(true);return;}frame=requestAnimationFrame(tick);
   }catch(error){fallback(error);}};
   frame=requestAnimationFrame(tick);
  })().catch(fallback);
 });
}
window.addEventListener('resize',()=>cancelPoisonSummons());
window.addEventListener('pagehide',()=>cancelPoisonSummons());
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelPoisonSummons();});
motion.addEventListener('change',()=>cancelPoisonSummons());

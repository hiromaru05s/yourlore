import {settleSummonFace,sizeSummonCanvas,summonPixelMatrix} from '../summon/quality';
import {FRAME_BACK} from '../../shared/cards';
import {captureCardSurface} from '../cardSurface';
import {layoutRect,projectedPlacement} from '../boardProjection';
import {DURATION,ease} from './catalog';
import {isDungeon} from './selection';
import type {DungeonRenderer} from './renderer';

type Options={anchor?:HTMLElement;signal?:AbortSignal;onImpact?:()=>void;from?:DOMRect};
const jobs=new Map<HTMLElement,{anchor:HTMLElement;cancel:()=>void}>();
let pool:{renderer:DungeonRenderer;users:number}|undefined;
let artPromise:Promise<HTMLImageElement>|undefined;
function rockArt(){return artPromise??=new Promise<HTMLImageElement>((resolve,reject)=>{
 const image=new Image(),fail=()=>{clearTimeout(timer);artPromise=undefined;reject(Error('Dungeon rock art unavailable'));};
 const timer=setTimeout(fail,4000);image.onload=()=>{clearTimeout(timer);resolve(image);};image.onerror=fail;image.src='/art/cards/DUNGEON.webp';
});}
function acquire(Type:typeof DungeonRenderer,face:HTMLCanvasElement,art:HTMLImageElement){
 const entry=pool??={renderer:new Type(face,art),users:0};
 if(entry.users===0){try{entry.renderer.warmup();}catch(error){entry.renderer.dispose();pool=undefined;throw error;}}
 entry.users++;let released=false;
 return{renderer:entry.renderer,release(){if(released)return;released=true;entry.renderer.releaseFace(face);if(--entry.users===0){entry.renderer.dispose();if(pool===entry)pool=undefined;}}};
}
export function cancelDungeonSummon(source:HTMLElement){jobs.get(source)?.cancel();}
export function cancelDungeonSummons(root?:HTMLElement){for(const [source,j]of [...jobs])if(!root||root.contains(source)||root.contains(j.anchor))j.cancel();}

/** One owner from the hand through the approved rock motion and native return. */
export function playDungeonSummon(source:HTMLElement,options:Options={}):Promise<boolean>{
 cancelDungeonSummon(source);const anchor=options.anchor??source;
 if(!isDungeon(source.dataset.cardId)||!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted)return Promise.resolve(false);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){options.onImpact?.();return Promise.resolve(true);}
 const visibility=source.style.visibility;source.style.visibility='hidden';
 return new Promise(resolve=>{
  let ended=false,frame=0,impacted=false,host:HTMLCanvasElement|undefined,captureHost:HTMLElement|undefined,lease:ReturnType<typeof acquire>|undefined;
  const impact=()=>{if(!impacted){impacted=true;options.onImpact?.();}};
  const finish=(complete=false)=>{
   if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(frame);
   options.signal?.removeEventListener('abort',abort);host?.remove();captureHost?.remove();lease?.release();
   source.style.visibility=visibility;jobs.delete(source);resolve(complete);
  };
  const abort=()=>finish(),timeout=setTimeout(abort,10000);
  const fallback=(error:unknown)=>{if(ended)return;console.warn('[dungeon-summon] Native card fallback',error);try{impact();}finally{finish();}};
  jobs.set(source,{anchor,cancel:abort});options.signal?.addEventListener('abort',abort,{once:true});
  void(async()=>{
   const [{DungeonRenderer},art]=await Promise.all([import('./renderer'),rockArt()]);if(ended)return;
   captureHost=document.createElement('div');captureHost.className='game';captureHost.dataset.dungeonCapture='true';
   captureHost.style.cssText='position:fixed;left:-4000px;top:0;width:180px;pointer-events:none';
   const copy=source.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.removeAttribute('data-uid');
   copy.classList.remove('fx-field-ghost','fx-card-flight','cast-reveal');
   copy.style.cssText='position:relative;width:180px;height:270px;--cw:180px;--ch:270px;transform:none;opacity:1;visibility:visible';
   captureHost.append(copy);document.body.append(captureHost);
   const surface=await captureCardSurface(copy,FRAME_BACK,true,false,source);captureHost?.remove();captureHost=undefined;if(ended)return;
   if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}
   if(!surface.face)throw Error('Public dungeon face unavailable');
   // Remove captureCardSurface's transparent padding, just as in the approved lab.
   const face=document.createElement('canvas');face.width=1536;face.height=2304;
   const pad=surface.face.width*.12/1.24;
   face.getContext('2d')!.drawImage(surface.face,pad,pad,surface.face.width-pad*2,surface.face.height-pad*2,0,0,face.width,face.height);
   lease=acquire(DungeonRenderer,face,art);
   host=document.createElement('canvas');host.className='dungeon-summon';host.dataset.cardId='DUNGEON';host.dataset.variant='1';host.setAttribute('aria-hidden','true');
   host.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:136';sizeSummonCanvas(host);
   const flight=options.from?420:0,total=flight+DURATION;
   const paint=(elapsed:number)=>{
    const box=layoutRect(anchor);let placement=projectedPlacement(anchor,180,270),width=box.width;
    if(options.from&&elapsed<flight){
     const from=options.from,start=new DOMMatrix().translate(from.left,from.top).scale(from.width/180,from.height/270);
     const a=Array.from(start.toFloat64Array()),b=Array.from(placement.toFloat64Array()),q=ease(0,flight,elapsed);
     placement=new DOMMatrix(a.map((n,j)=>n+(b[j]-n)*q));width=from.width+(width-from.width)*q;
    }
    lease!.renderer.drawBoard(host!,face,Math.max(0,elapsed-flight),summonPixelMatrix(placement),width);
    host!.dataset.time=String(Math.round(elapsed));host!.dataset.placement=placement.toString();
   };
   // Compile, then paint frame zero before starting the real-time clock.
   paint(0);document.body.append(host);const start=performance.now();
   const tick=(now:number)=>{try{
    if(ended)return;if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}
    const elapsed=Math.min(total,now-start);paint(elapsed);settleSummonFace(source,host!,elapsed,total);
    if(elapsed>=flight+2040){impact();if(ended)return;}
    if(elapsed===total){finish(true);return;}frame=requestAnimationFrame(tick);
   }catch(error){fallback(error);}};
   frame=requestAnimationFrame(tick);
  })().catch(fallback);
 });
}
window.addEventListener('resize',()=>cancelDungeonSummons());
window.addEventListener('pagehide',()=>cancelDungeonSummons());
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelDungeonSummons();});

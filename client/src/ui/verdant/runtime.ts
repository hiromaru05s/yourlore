import {FRAME_BACK} from '../../shared/cards';
import {captureCardSurface} from '../cardSurface';
import {boardMatrix,layoutRect,projectedPlacement} from '../boardProjection';
import {RichRenderer} from './richRenderer';
import {Renderer as HalfRenderer} from './renderer';
import {CONTACT,DURATION,type Id} from './richCatalog';
import {selections} from './selection';

type Options={anchor?:HTMLElement;signal?:AbortSignal;onImpact?:()=>void};
const jobs=new Map<HTMLElement,{anchor:HTMLElement;cancel:()=>void}>();
export function cancelVerdant(source:HTMLElement){jobs.get(source)?.cancel();}
export function cancelVerdants(root?:HTMLElement){
 for(const [source,job] of [...jobs])if(!root||root.contains(source)||root.contains(job.anchor))job.cancel();
}

/** The approved renderer, projected through the live board's own camera. */
export function playVerdant(source:HTMLElement,id:Id,options:Options={}):Promise<boolean>{
 cancelVerdant(source);
 const anchor=options.anchor??source,variant=selections[id];
 if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted)return Promise.resolve(false);
 if(variant===null||matchMedia('(prefers-reduced-motion: reduce)').matches){options.onImpact?.();return Promise.resolve(true);}
 return new Promise(resolve=>{
  const visibility=source.style.visibility;
  let ended=false,frame=0,impacted=false,host:HTMLElement|undefined,captureHost:HTMLElement|undefined;
  let renderer:RichRenderer|undefined,half:HalfRenderer|undefined;
  const impact=()=>{if(!impacted){impacted=true;options.onImpact?.();}};
  const finish=(complete=false)=>{
   if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(frame);
   options.signal?.removeEventListener('abort',abort);
   host?.remove();captureHost?.remove();renderer?.dispose();half?.dispose();
   source.style.visibility=visibility;jobs.delete(source);resolve(complete);
  };
  const abort=()=>finish(false),timeout=setTimeout(abort,10000);
  const fallback=(error:unknown)=>{if(!ended){console.warn('[verdant] Native card fallback',error);try{impact();}finally{finish();}}};
  jobs.set(source,{anchor,cancel:abort});options.signal?.addEventListener('abort',abort,{once:true});
  void(async()=>{
   // Only this already-public face is captured. Preserve live stats, frame and art.
   captureHost=document.createElement('div');captureHost.className='game';
   captureHost.style.cssText='position:fixed;left:-4000px;top:0;width:180px;pointer-events:none';
   const copy=source.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.removeAttribute('data-uid');
   copy.classList.remove('fx-field-ghost','fx-card-flight','cast-reveal');
   copy.style.cssText='position:relative;width:180px;height:280px;--cw:180px;--ch:280px;transform:none;opacity:1;visibility:visible';
   captureHost.append(copy);document.body.append(captureHost);
   const surface=await captureCardSurface(copy,FRAME_BACK,true,false);
   captureHost.remove();captureHost=undefined;
   if(ended)return;
   if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}
   if(!surface.face)throw Error('Public card surface unavailable');
   const face=document.createElement('canvas');face.width=640;face.height=Math.round(640*surface.face.height/surface.face.width);
   face.getContext('2d')!.drawImage(surface.face,0,0,face.width,face.height);
   if(id==='HALF_ELF')half=new HalfRenderer();else renderer=new RichRenderer();
   host=document.createElement('div');host.className='verdant-summon';host.setAttribute('aria-hidden','true');
   host.dataset.cardId=id;host.dataset.variant=String(variant+1);
   host.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:136;isolation:isolate';
   const canvas=document.createElement('canvas'),c=canvas.getContext('2d')!;
   if(half){
    host.style.cssText='position:fixed;left:0;top:0;width:180px;height:280px;transform-origin:0 0;pointer-events:none;z-index:136';
    canvas.width=900;canvas.height=1200;
    canvas.style.cssText='position:absolute;left:-210px;top:-260px;width:600px;height:800px';
   }else{
    const dpr=Math.min(devicePixelRatio,2);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);
    canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%';c.setTransform(dpr,0,0,dpr,0,0);
   }
   host.append(canvas);document.body.append(host);source.style.visibility='hidden';
   const start=performance.now();let lastPaint=-Infinity;
   const tick=(now:number)=>{
    try{
    if(ended)return;
    if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}
    const ms=Math.min(DURATION,now-start);host!.dataset.time=String(Math.round(ms));
    if(ms>=(half?2700/4.2*3.1:CONTACT)){impact();if(ended)return;}
    if(now-lastPaint>=1000/30){
     lastPaint=now;
     if(half){
      host!.style.transform=projectedPlacement(anchor,180,280).toString();
      c.setTransform(1.5,0,0,1.5,0,0);c.clearRect(0,0,600,800);half.draw(c,face,id,0,ms,300,400,180);
     }else{
      c.clearRect(0,0,innerWidth,innerHeight);
      const plane=anchor.closest<HTMLElement>('[data-board-plane]'),box=plane?layoutRect(anchor):anchor.getBoundingClientRect();
      const matrix=(plane?boardMatrix(box.left+box.width/2,box.top+box.height/2,Number(plane.dataset.boardPlane)||0):new DOMMatrix().translate(box.left+box.width/2,box.top+box.height/2))
       .scale(box.width/180,-box.height/280,box.width/180);
      renderer!.drawBoard(c,face,id,variant,ms,matrix,innerWidth,innerHeight);
     }
    }
    if(ms===DURATION){finish(true);return;}frame=requestAnimationFrame(tick);
    }catch(error){fallback(error);}
   };tick(start);
  })().catch(fallback);
 });
}

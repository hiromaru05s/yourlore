import {FRAME_BACK} from '../../shared/cards';
import {capturePileSurface} from '../cardSurface';
import {projectedPlacement} from '../boardProjection';
import {TribeRenderer} from './renderer';
import {ease} from './catalog';
import {selectedTribeSummon} from './selection';
type Options={anchor?:HTMLElement;signal?:AbortSignal;onImpact?:()=>void;from?:DOMRect;reveal?:HTMLElement};
const jobs=new Map<HTMLElement,{anchor:HTMLElement;cancel:()=>void}>();
export function cancelTribeSummons(root?:HTMLElement){for(const [node,j]of [...jobs])if(!root||root.contains(node)||root.contains(j.anchor))j.cancel();}
export function cancelTribeSummon(node:HTMLElement){jobs.get(node)?.cancel();}
/** The frozen selected painter uses one clock through the hand flight and landing. */
export function playTribeSummon(node:HTMLElement,options:Options={}):Promise<boolean>{
 cancelTribeSummon(node);const selection=selectedTribeSummon(node.dataset.cardId),anchor=options.anchor??node;
 if(!selection||!node.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted)return Promise.resolve(false);
 return new Promise(resolve=>{
  let ended=false,raf=0,host:HTMLElement|undefined,flight:HTMLCanvasElement|undefined,impacted=false;
  const visibility=node.style.visibility,revealVisibility=options.reveal?.style.visibility;
  const finish=(ok=false)=>{if(ended)return;ended=true;cancelAnimationFrame(raf);clearTimeout(timeout);options.signal?.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',abort);host?.remove();flight?.remove();node.style.visibility=visibility;if(options.reveal)options.reveal.style.visibility=revealVisibility??'';jobs.delete(node);resolve(ok);};
  const abort=()=>finish(),hidden=()=>{if(document.hidden)abort();},timeout=setTimeout(abort,7000);
  jobs.set(node,{anchor,cancel:abort});options.signal?.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',abort);
  const impact=()=>{if(!impacted){impacted=true;options.onImpact?.();}};
  void(async()=>{
   const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
   if(reduced){impact();finish(true);return;}
   const {face}=await capturePileSurface(node,FRAME_BACK);if(ended)return;
   if(!face||!node.isConnected||!anchor.isConnected){finish();return;}
   const texture=document.createElement('canvas');texture.width=640;texture.height=Math.round(640*face.height/face.width);texture.getContext('2d')!.drawImage(face,0,0,texture.width,texture.height);
   const painter=new TribeRenderer();host=document.createElement('div');host.dataset.tribeSummon=selection.tribe;host.dataset.variant=String(selection.variant+1);host.setAttribute('aria-hidden','true');host.style.cssText='position:fixed;left:0;top:0;width:180px;height:280px;transform-origin:0 0;pointer-events:none;z-index:136';
   const canvas=document.createElement('canvas');canvas.width=720;canvas.height=960;canvas.style.cssText='position:absolute;left:-150px;top:-180px;width:480px;height:640px';host.append(canvas);document.body.append(host);
   if(options.from){flight=document.createElement('canvas');flight.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:136';document.body.append(flight);}
   node.style.visibility='hidden';if(options.reveal)options.reveal.style.visibility='hidden';const start=performance.now();
   const tick=(now:number)=>{if(ended)return;if(!node.isConnected||!anchor.isConnected){finish();return;}const ms=now-start;if(ms>=1800){impact();finish(true);return;}
    host!.dataset.time=String(Math.round(ms));if(ms>=selection.impact)impact();if(ended)return;
    const flying=!!flight&&ms<450;host!.style.visibility=flying?'hidden':'visible';
    if(flying){const dpr=Math.min(devicePixelRatio,2);if(flight!.width!==Math.round(innerWidth*dpr)||flight!.height!==Math.round(innerHeight*dpr)){flight!.width=Math.round(innerWidth*dpr);flight!.height=Math.round(innerHeight*dpr);flight!.style.width=innerWidth+'px';flight!.style.height=innerHeight+'px';}const c=flight!.getContext('2d')!;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,innerWidth,innerHeight);const a=options.from!,b=anchor.getBoundingClientRect(),q=ease(0,1,ms/450);painter.summon(c,texture,selection.tribe,selection.variant,ms,(a.x+a.width/2)*(1-q)+(b.x+b.width/2)*q,(a.y+a.height/2)*(1-q)+(b.y+b.height/2)*q-40*Math.sin(q*Math.PI),a.width*(1-q)+b.width*q);}
    else{flight?.remove();flight=undefined;host!.style.transform=projectedPlacement(anchor,180,280).toString();const c=canvas.getContext('2d')!;c.setTransform(1.5,0,0,1.5,0,0);c.clearRect(0,0,480,640);painter.summon(c,texture,selection.tribe,selection.variant,ms,240,320,180);}
    raf=requestAnimationFrame(tick);
   };tick(start);
  })().catch(error=>{if(!ended){console.warn('[tribe-summon] Native fallback',error);impact();finish();}});
 });
}

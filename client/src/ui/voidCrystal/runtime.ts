import type {CardInst} from '../../shared/types';
import {FRAME_BACK} from '../../shared/cards';
import {cardEl} from '../cardView';
import {captureCardSurface} from '../cardSurface';
import {Renderer} from './renderer';
import {DURATION,HIT} from './catalog';
import {reaction} from './reaction';

export interface VoidCrystalCast {count:number; target?:'me'|'opp'; record?:CardInst; onImpact:()=>void;}
const active=new Map<HTMLElement,()=>void>();
const center=(r:DOMRect)=>({x:r.x+r.width/2,y:r.y+r.height/2});
/** Only public Rift records are supplied by the controller. */
async function texture(card:CardInst,signal:AbortSignal){
 const el=cardEl(card,{field:true});
 el.style.cssText='position:fixed;left:-4000px;top:0;width:180px;height:270px;--cw:180px;--ch:270px;transform:none';
 document.body.append(el);
 const remove=()=>el.remove();signal.addEventListener('abort',remove,{once:true});
 try{
  const surface=await captureCardSurface(el,FRAME_BACK,true,false);
  if(signal.aborted||!surface.face)throw new Error('Crystal surface unavailable');
  const out=document.createElement('canvas');out.width=540;out.height=Math.round(540*surface.face.height/surface.face.width);
  out.getContext('2d')!.drawImage(surface.face,0,0,540,810);return out;
 }finally{signal.removeEventListener('abort',remove);remove();}
}
/** One clock owns shell contact, HP reaction and resource cleanup. Damage itself stays in the engine. */
export function playVoidCrystal(card:HTMLElement,definition:CardInst,side:'me'|'opp',cast:VoidCrystalCast,signal:AbortSignal):Promise<boolean>{
 active.get(card)?.();
 const rift=document.getElementById(`rift-${side}`),hp=document.getElementById(`hp-${cast.target??(side==='me'?'opp':'me')}`);
 if(!rift||!hp||!card.isConnected||signal.aborted||document.hidden||cast.count<=0)return Promise.resolve(false);
 return new Promise(resolve=>{
  let done=false,frame=0,renderer:Renderer|undefined,hit=false;
  const assets=new AbortController(),overlay=document.createElement('canvas');
  overlay.className='void-crystal-overlay';overlay.setAttribute('aria-hidden','true');
  overlay.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:180;pointer-events:none';
  const before={transform:hp.style.transform,filter:hp.style.filter,opacity:card.style.opacity};
  const finish=(complete:boolean)=>{
   if(done)return;done=true;cancelAnimationFrame(frame);clearTimeout(deadline);assets.abort();
   signal.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',abort);window.removeEventListener('resize',abort);
   if(active.get(card)===abort)active.delete(card);
   renderer?.dispose();overlay.remove();hp.style.transform=before.transform;hp.style.filter=before.filter;card.style.opacity=before.opacity;resolve(complete);
  };
  const abort=()=>finish(false),hidden=()=>{if(document.hidden)abort();};
  const deadline=setTimeout(abort,10000);
  active.set(card,abort);signal.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',abort);window.addEventListener('resize',abort);
  void Promise.all([texture(definition,assets.signal),texture(cast.record??definition,assets.signal)]).then(([face,record])=>{
   if(done)return;
   renderer=new Renderer(face,record);document.body.append(overlay);
   const dpr=Math.min(devicePixelRatio,1.5);overlay.width=Math.round(innerWidth*dpr);overlay.height=Math.round(innerHeight*dpr);
   const ctx=overlay.getContext('2d')!;const source=center(rift.getBoundingClientRect()),target=center(hp.getBoundingClientRect()),spell=center(card.getBoundingClientRect());
   const unit=Math.max(35,Math.min(85,innerWidth*.075)),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,start=performance.now();
   const tick=(now:number)=>{
    if(done)return;if(signal.aborted||document.hidden||!card.isConnected||!hp.isConnected||!rift.isConnected){abort();return;}
    try{
     const ms=Math.min(DURATION,now-start);renderer!.clearCanvas(overlay);ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,overlay.width,overlay.height);ctx.setTransform(dpr,0,0,dpr,0,0);
     renderer!.draw(ctx,0,ms,{source,target,spell,unit,count:cast.count,reduced});
     if(!hit&&ms>=HIT){hit=true;cast.onImpact();}
     const r=reaction(0,ms,reduced,cast.count);hp.style.transform=`${before.transform} translate(${r.x*unit*(side==='opp'?-1:1)}px,${r.y*unit}px) scale(${r.sx},${r.sy})`;hp.style.filter=r.light?`brightness(${1+r.light})`:before.filter;
     card.style.opacity=String(Math.max(0,1-Math.max(0,Math.min(1,(ms-350)/450)),Math.max(0,Math.min(1,(ms-5450)/450))));
     if(ms>=DURATION)finish(true);else frame=requestAnimationFrame(tick);
    }catch{abort();}
   };tick(start);
  }).catch(abort);
 });
}

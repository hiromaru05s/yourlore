import {captureCardSurface,CARD_PADDING} from '../cardSurface';
import {FRAME_BACK} from '../../shared/cards';
import {combatRect} from '../combatAnchor';
import {projectedPlacement} from '../boardProjection';
import {attackPlan,drawAttackVisual} from '../attackVisual';
import {counterPose,runCounterTimeline,COUNTER_PREP_MS} from './model';
import {CounterRenderer} from './renderer';

const active=new Map<HTMLElement,{cancel:()=>void;visibility:string}>();
type Options={signal:AbortSignal;onLaunch:()=>void;onImpact:()=>void};

/** Clone the live public face so buffs, health and passive badges stay intact. */
function copyFace(source:HTMLElement){
 const copy=source.cloneNode(true) as HTMLElement,width=source.offsetWidth||180;
 copy.removeAttribute('id');copy.removeAttribute('data-uid');
 copy.classList.remove('is-attacker','is-aiming','is-atk-target','is-targetable','mhit','is-dim','is-exhausted');
 copy.querySelectorAll<HTMLElement>('[style]').forEach(el=>{if(el.style.fontSize.endsWith('px'))el.style.fontSize=`${parseFloat(el.style.fontSize)*180/width}px`;});
 const originals=[...source.querySelectorAll('img')];
 [...copy.querySelectorAll('img')].forEach((img,i)=>{const src=originals[i]?.currentSrc||img.src;img.removeAttribute('srcset');img.removeAttribute('sizes');img.src=src;});
 copy.style.cssText='position:fixed!important;left:-4000px!important;top:0!important;width:180px!important;height:281.25px!important;--cw:180px;--ch:281.25px;--field-card-size:180px;transform:none!important;translate:none!important;animation:none!important;transition:none!important;filter:none!important;opacity:1!important;visibility:hidden!important;margin:0!important;pointer-events:none!important';
 copy.classList.add('counter-capture');document.body.append(copy);return copy;
}

async function capture(copy:HTMLElement):Promise<HTMLCanvasElement>{
 const {face}=await captureCardSurface(copy,FRAME_BACK,true,false);
 if(!face)throw Error('Counter surface unavailable');
 const w=face.width/(1+2*CARD_PADDING),pad=w*CARD_PADDING,h=face.height-2*pad;
 const out=document.createElement('canvas');out.width=540;out.height=844;
 const c=out.getContext('2d')!;c.drawImage(face,pad,pad,w,h,0,0,540,844);
 const bounds=copy.getBoundingClientRect();
 for(const icon of copy.querySelectorAll<HTMLImageElement>('.card-status .passive-icon img')){
  if(!icon.complete||!icon.naturalWidth)continue;
  const r=icon.getBoundingClientRect();c.drawImage(icon,(r.left-bounds.left)/bounds.width*540,(r.top-bounds.top)/bounds.height*844,r.width/bounds.width*540,r.height/bounds.height*844);
 }
 face.width=face.height=1;return out;
}

/** Same approved material and geometry for both sides; all ownership is scoped. */
export async function playCounter(source:HTMLElement,target:HTMLElement,options:Options):Promise<boolean>{
 const previous=active.get(source);previous?.cancel();
 if(options.signal.aborted||document.hidden||!combatRect(source)||!combatRect(target))return false;
 const abort=new AbortController(),cancel=()=>abort.abort(),signal=abort.signal;
 const visibility=previous?.visibility??source.style.visibility;
 active.set(source,{cancel,visibility});options.signal.addEventListener('abort',cancel,{once:true});
 window.addEventListener('resize',cancel);document.addEventListener('visibilitychange',cancel);
 document.addEventListener('scroll',cancel,true);window.addEventListener('pagehide',cancel);
 const motion=matchMedia('(prefers-reduced-motion: reduce)');motion.addEventListener('change',cancel);
 const timer=setTimeout(cancel,5000),copy=copyFace(source);
 signal.addEventListener('abort',()=>copy.remove(),{once:true});
 let face:HTMLCanvasElement|undefined,renderer:CounterRenderer|undefined,rig:HTMLElement|undefined,fx:HTMLCanvasElement|undefined;
 try{
  // Cached art normally resolves immediately. A texture failure retains the DOM
  // face and the complete anticipation/strike clock instead of losing the card.
  try{face=await capture(copy);}catch{/* DOM fallback below. */}
  if(signal.aborted||document.hidden||!source.isConnected||!target.isConnected)return false;
  const from=combatRect(source),to=combatRect(target);if(!from||!to)return false;
  const plan=attackPlan(from,to),base=projectedPlacement(source,180,281.25),reduced=motion.matches;
  rig=document.createElement('div');rig.className='counter-rig';rig.dataset.counterVariant='02';rig.setAttribute('aria-hidden','true');
  rig.style.cssText='position:fixed;left:0;top:0;width:180px;height:281.25px;transform-origin:0 0;pointer-events:none;z-index:180';
  let card:CanvasRenderingContext2D|null=null;
  if(face){
   const canvas=document.createElement('canvas');canvas.width=540;canvas.height=810;
   canvas.style.cssText='position:absolute;left:-45px;top:-61.875px;width:270px;height:405px';
   card=canvas.getContext('2d');renderer=new CounterRenderer();rig.append(canvas);copy.remove();
  }else{
   copy.style.setProperty('position','absolute','important');copy.style.setProperty('left','0','important');copy.style.setProperty('visibility','visible','important');rig.append(copy);
  }
  fx=document.createElement('canvas');fx.className='counter-impact';fx.setAttribute('aria-hidden','true');
  fx.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:181;width:100%;height:100%';
  const dpr=Math.min(devicePixelRatio||1,1.5);fx.width=Math.round(innerWidth*dpr);fx.height=Math.round(innerHeight*dpr);const impact=fx.getContext('2d')!;
  const paint=(ms:number)=>{
   const pose=counterPose(plan,ms,reduced);
   rig!.style.transform=new DOMMatrix().translate(pose.x-plan.origin.x,pose.y-plan.origin.y).multiply(base).translate(90,140.625).rotate(pose.turn).scale(pose.scale).translate(-90,-140.625).toString();
   rig!.dataset.counterMs=String(Math.round(ms));
   if(card&&face&&renderer){card.setTransform(2,0,0,2,0,0);card.clearRect(0,0,270,405);renderer.draw(card,face,reduced?ms/320*700:ms<COUNTER_PREP_MS?ms:0,reduced);}
   impact.setTransform(dpr,0,0,dpr,0,0);impact.clearRect(0,0,innerWidth,innerHeight);
   if(!reduced&&ms>=COUNTER_PREP_MS)drawAttackVisual(impact,from,to,(ms-COUNTER_PREP_MS+180)/1000);
  };
  paint(0);source.classList.remove('mhit');source.style.visibility='hidden';document.body.append(rig,fx);
  return await runCounterTimeline({signal,reduced,isAlive:()=>source.isConnected&&target.isConnected&&!document.hidden,paint,onLaunch:options.onLaunch,onImpact:options.onImpact});
 }finally{
  clearTimeout(timer);cancel();options.signal.removeEventListener('abort',cancel);
  window.removeEventListener('resize',cancel);document.removeEventListener('visibilitychange',cancel);document.removeEventListener('scroll',cancel,true);window.removeEventListener('pagehide',cancel);motion.removeEventListener('change',cancel);
  copy.remove();rig?.remove();fx?.remove();renderer?.dispose();if(face)face.width=face.height=1;
  if(active.get(source)?.cancel===cancel){source.style.visibility=visibility;active.delete(source);}
 }
}

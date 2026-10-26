import {cloneCardNode} from '../cardClone';
import {captureCardSurface,CARD_PADDING} from '../cardSurface';
import {FRAME_BACK} from '../../shared/cards';
import {combatRect} from '../combatAnchor';
import {projectedPlacement} from '../boardProjection';
import {IAI,ease,runAssassinTimeline} from './model';
import {AssassinRenderer,type Geometry} from './renderer';
const active=new Map<HTMLElement,{cancel:()=>void;visibility:string}>();
export function cancelAssassinStrikes(){for(const job of active.values())job.cancel();}

function copyFace(source:HTMLElement){
 const copy=cloneCardNode(source),width=source.offsetWidth||180;
 copy.removeAttribute('id');copy.removeAttribute('data-uid');copy.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
 copy.classList.remove('is-attacker','is-aiming','is-atk-target','is-targetable','mhit','is-dim','is-exhausted');
 copy.querySelectorAll<HTMLElement>('[style]').forEach(el=>{if(el.style.fontSize.endsWith('px'))el.style.fontSize=`${parseFloat(el.style.fontSize)*180/width}px`;});
 const original=[...source.querySelectorAll('img')];[...copy.querySelectorAll('img')].forEach((img,i)=>{const src=original[i]?.currentSrc||img.src;img.removeAttribute('srcset');img.removeAttribute('sizes');img.loading='eager';img.src=src;});
 copy.style.cssText='position:fixed!important;left:-4000px!important;top:0!important;width:180px!important;height:281.25px!important;--cw:180px;--ch:281.25px;--field-card-size:180px;transform:none!important;translate:none!important;animation:none!important;transition:none!important;filter:none!important;opacity:1!important;visibility:hidden!important;margin:0!important;pointer-events:none!important';
 copy.classList.add('assassin-capture');document.body.append(copy);return copy;
}
async function capture(copy:HTMLElement):Promise<HTMLCanvasElement>{
 const {face}=await captureCardSurface(copy,FRAME_BACK,true,false);if(!face)throw Error('Assassin face unavailable');
 const w=face.width/(1+2*CARD_PADDING),pad=w*CARD_PADDING,h=face.height-2*pad;
 const out=document.createElement('canvas');out.width=360;out.height=563;out.getContext('2d')!.drawImage(face,pad,pad,w,h,0,0,out.width,out.height);return out;
}

/** Approved 01 has a single surface/impact clock. Other ambush cards never enter here. */
export async function playAssassinStrike(source:HTMLElement,target:HTMLElement,o:{signal:AbortSignal;onImpact:()=>void;side:number}):Promise<boolean>{
 const previous=active.get(source);previous?.cancel();
 if(o.signal.aborted||document.hidden||!combatRect(source)||!combatRect(target))return false;
 const abort=new AbortController(),signal=abort.signal,cancel=()=>abort.abort(),visibility=previous?.visibility??source.style.visibility;
 active.set(source,{cancel,visibility});o.signal.addEventListener('abort',cancel,{once:true});
 window.addEventListener('resize',cancel);window.addEventListener('pagehide',cancel);document.addEventListener('visibilitychange',cancel);document.addEventListener('scroll',cancel,true);
 const motion=matchMedia('(prefers-reduced-motion:reduce)');motion.addEventListener('change',cancel);
 const deadline=setTimeout(cancel,3500);let prepTimer:ReturnType<typeof setTimeout>|undefined;
 let face:HTMLCanvasElement|undefined,renderer:AssassinRenderer|undefined,fx:HTMLCanvasElement|undefined,rig:HTMLElement|undefined,copy:HTMLElement|undefined;
 try{
  const reduced=motion.matches;
  if(!reduced){
   copy=copyFace(source);signal.addEventListener('abort',()=>copy?.remove(),{once:true});
   // Bound cold texture preparation. The same live DOM face is the fallback.
   let accepting=true;
   const pending=capture(copy).then(value=>{if(!accepting){value.width=value.height=1;return undefined;}return value;},()=>undefined);
   const cancelled=new Promise<undefined>(r=>signal.addEventListener('abort',()=>r(undefined),{once:true}));
   face=await Promise.race([pending,cancelled,new Promise<undefined>(r=>{prepTimer=setTimeout(()=>r(undefined),900);})]);accepting=false;if(prepTimer)clearTimeout(prepTimer);
  }
  if(signal.aborted||document.hidden||!source.isConnected||!target.isConnected)return false;
  const from=combatRect(source),to=combatRect(target);if(!from||!to)return false;
  const geometry:Geometry={source:from,target:to,matrix:projectedPlacement(source,180,270),side:o.side};
  const blank=document.createElement('canvas');blank.width=360;blank.height=540;
  renderer=new AssassinRenderer(face??blank);blank.width=blank.height=1;
  if(!reduced&&!face&&copy){
   rig=document.createElement('div');rig.className='assassin-dom-fallback';rig.style.cssText='position:fixed;left:0;top:0;width:180px;height:281.25px;transform-origin:0 0;pointer-events:none;z-index:180';rig.setAttribute('aria-hidden','true');
   copy.style.setProperty('position','absolute','important');copy.style.setProperty('left','0','important');copy.style.setProperty('visibility','visible','important');rig.append(copy);document.body.append(rig);
  }else copy?.remove();
  fx=document.createElement('canvas');fx.className='assassin-strike';fx.dataset.assassinStrike='01';fx.setAttribute('aria-hidden','true');
  fx.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:181;width:100%;height:100%';
  const dpr=Math.min(devicePixelRatio||1,2);fx.width=Math.round(innerWidth*dpr);fx.height=Math.round(innerHeight*dpr);const c=fx.getContext('2d')!;
  const base=rig?projectedPlacement(source,180,281.25):undefined;
  const paint=(ms:number)=>{
   c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,innerWidth,innerHeight);renderer!.draw(c,geometry,ms,reduced,!!face);fx!.dataset.assassinMs=String(Math.round(ms));
   if(rig&&base){const back=ms>=IAI.returnAt,q=back?1-ease(IAI.returnAt,IAI.returnEnd,ms):ease(IAI.vanish-65,IAI.vanish,ms),sg=o.side===0?1:-1;
    rig.style.visibility=ms>=IAI.vanish&&ms<IAI.returnAt?'hidden':'visible';
    rig.style.transform=new DOMMatrix().translate(from.x+from.width/2+sg*from.width*q*(back?.22:.42),from.y+from.height/2+(back?from.width*.08*q:0)).scale(Math.max(.001,1-q),1-q*.3).translate(-from.x-from.width/2,-from.y-from.height/2).multiply(base).toString();
   }
  };
  paint(.001);if(!reduced)source.style.visibility='hidden';document.body.append(fx);
  return await runAssassinTimeline({signal,reduced,isAlive:()=>source.isConnected&&target.isConnected&&!document.hidden,paint,onImpact:o.onImpact});
 }finally{
  clearTimeout(deadline);if(prepTimer)clearTimeout(prepTimer);cancel();o.signal.removeEventListener('abort',cancel);
  window.removeEventListener('resize',cancel);window.removeEventListener('pagehide',cancel);document.removeEventListener('visibilitychange',cancel);document.removeEventListener('scroll',cancel,true);motion.removeEventListener('change',cancel);
  copy?.remove();rig?.remove();fx?.remove();renderer?.dispose();if(face)face.width=face.height=1;
  if(active.get(source)?.cancel===cancel){source.style.visibility=visibility;active.delete(source);}
 }
}

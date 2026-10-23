import {SPECIAL_FX} from '../animationTempo';
import {getLang} from '../../i18n';
import {STARTERS} from '../../shared/cards';
import {cardEl} from '../cardView';
import {holdRiftTarget} from '../riftActivity';
import {DURATION,timing,type Layout} from './catalog';
import {loadFaces} from './surface';
import {InfinityRenderer} from './renderer';
let cached:{lang:string;faces:Map<string,HTMLCanvasElement>}|undefined;
const point=(r:DOMRect)=>({x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height});
/** Presentation only. The authoritative Rift already owns these Cull. */
export async function playInfinityCull(uid:string,side:'me'|'opp',amount:number,signal:AbortSignal):Promise<void>{
 if(signal.aborted||document.hidden||!Number.isFinite(amount)||amount<=0)return;
 const target=document.getElementById(`rift-${side}`);
 const source=document.querySelector<HTMLElement>(`.buff-icon[data-uid="${CSS.escape(uid)}"]`)
  ??document.querySelector<HTMLElement>(`#${side}Row .zone-st .slot`);
 if(!source||!target)return;
 const sample=():Layout=>({source:point(source.getBoundingClientRect()),rift:point(target.getBoundingClientRect()),width:innerWidth,height:innerHeight});
 const layout=sample();if(!layout.source.w||!layout.rift.w)return;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 if(reduced){await fallback(source,target,signal,true);return;}
 let painter:InfinityRenderer|undefined;
 try{
  const lang=getLang();const faces=cached?.lang===lang?cached.faces:await loadFaces(signal);
  if(signal.aborted||document.hidden||!source.isConnected||!target.isConnected)return;
  cached={lang,faces};painter=new InfinityRenderer(faces);
 }catch(error){painter?.dispose();if(!signal.aborted){console.warn('[infinity-page-five] Using reduced transfer',error);await fallback(source,target,signal,false);}return;}
 const renderer=painter;
 await new Promise<void>(resolve=>{
  const canvas=document.createElement('canvas');canvas.dataset.infinityCull='05';canvas.dataset.source=uid;canvas.dataset.side=side;canvas.dataset.amount=String(amount);canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:190';
  const dpr=Math.min(devicePixelRatio,1.5);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);document.body.append(canvas);
  let raf=0,done=false,release:(()=>void)|undefined;
  const finish=()=>{if(done)return;done=true;cancelAnimationFrame(raf);clearTimeout(deadline);release?.();canvas.remove();renderer.dispose();signal.removeEventListener('abort',finish);document.removeEventListener('visibilitychange',finish);window.removeEventListener('pagehide',finish);window.removeEventListener('resize',finish);resolve();};
  const deadline=setTimeout(finish,DURATION+500);signal.addEventListener('abort',finish,{once:true});document.addEventListener('visibilitychange',finish,{once:true});window.addEventListener('pagehide',finish,{once:true});window.addEventListener('resize',finish,{once:true});
  const start=SPECIAL_FX.now();const count=Math.min(24,Math.trunc(amount)); // Bounded stock for extreme amplified damage; never clamps engine resources.
  const tick=(now:number)=>{if(done)return;const ms=now-start;if(signal.aborted||document.hidden||!source.isConnected||!target.isConnected||ms>=DURATION){finish();return;}
   canvas.dataset.time=String(Math.round(ms));
   if(!release&&ms>=timing(0,count).arrive-100)release=holdRiftTarget(target);
   try{renderer.draw(canvas,{ms,amount:count,side:0,dark:true,reduced:false},sample());}catch(error){console.warn('[infinity-page-five] Render stopped',error);finish();return;}
   raf=SPECIAL_FX.requestFrame(tick);
  };raf=SPECIAL_FX.requestFrame(tick);
 });
}
async function fallback(source:HTMLElement,target:HTMLElement,signal:AbortSignal,reduced:boolean){
 if(signal.aborted)return;
 const a=source.getBoundingClientRect(),b=target.getBoundingClientRect(),node=cardEl({...STARTERS.STARTER_TRASH,uid:'infinity-fallback'});
 const w=Math.max(20,Math.min(a.width,52));node.dataset.infinityFallback='05';node.style.cssText=`position:fixed;left:${a.left+a.width/2-w/2}px;top:${a.top}px;width:${w}px;height:${w*1.56}px;--cw:${w}px;--ch:${w*1.56}px;pointer-events:none;z-index:190;transform-origin:center`;
 document.body.append(node);const duration=SPECIAL_FX.milliseconds(reduced?160:420);
 const flight=node.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${b.left+b.width/2-a.left-a.width/2}px,${b.top+b.height/2-a.top}px) scale(.08)`,opacity:0}],{duration,fill:'forwards',easing:'ease-in'});
 if(reduced)flight.cancel();
 await new Promise<void>(resolve=>{const finish=()=>{clearTimeout(timer);flight.cancel();node.remove();signal.removeEventListener('abort',finish);resolve();};const timer=setTimeout(finish,duration);signal.addEventListener('abort',finish,{once:true});});
}

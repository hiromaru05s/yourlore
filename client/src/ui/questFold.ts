import {FRAME_BACK} from '../shared/cards';
import {captureCardSurface,CARD_PADDING} from './cardSurface';
import {projectedPlacement} from './boardProjection';
import type {QuestPactRenderer} from './questPact/renderer';
import {DURATION,smooth} from './questPact/timing';

export const QUEST_FOLD_MS=DURATION;
let rendererModule:Promise<typeof import('./questPact/renderer')>|undefined;
export function warmQuestPact(){return rendererModule??=import('./questPact/renderer').catch(error=>{rendererModule=undefined;throw error;});}

export function nativeQuestGhost(target:HTMLElement,face:HTMLElement):HTMLElement {
 const w=target.offsetWidth,h=target.offsetHeight;
 const host=document.createElement('div');host.className='game quest-fold-host fx-field-ghost';host.dataset.uid=face.dataset.uid;
 host.style.cssText='position:fixed;inset:0;width:100%;height:100%;min-height:0;pointer-events:none;z-index:125;background:none;overflow:visible';
 face.style.cssText=`position:fixed;left:0;top:0;width:${w}px;height:${h}px;--cw:${w}px;--ch:${h}px;transform-origin:0 0;visibility:hidden;pointer-events:none`;
 host.append(face);document.body.append(host);
 face.style.transform=projectedPlacement(target,w,h).toString();face.style.visibility='visible';face.style.opacity='1';
 return host;
}

/** Approved amethyst pact: the revealed face opens as its cover, seals, then
 * closes into the projected native tile. Caller owns the ghost until render. */
export async function foldQuestIntoSlot(reveal:HTMLElement,target:HTMLElement,face:HTMLElement,signal:AbortSignal):Promise<boolean>{
 if(signal.aborted||document.hidden||!target.isConnected)return false;
 const from=reveal.getBoundingClientRect(),w=target.offsetWidth,h=target.offsetHeight;
 if(!from.width||!w||!h)return false;
 const host=nativeQuestGhost(target,face);face.style.visibility='hidden';
 let material:QuestPactRenderer|undefined,frame=0,completed=false;
 const visible=reveal.style.visibility,opacity=reveal.style.opacity;
 const place=()=>{face.style.transform=projectedPlacement(target,w,h).toString();face.style.visibility='visible';};
 try{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){place();completed=true;return true;}
  let cancel=()=>{};
  const capture=Promise.all([captureCardSurface(reveal,FRAME_BACK,true,false),warmQuestPact()]);
  const surfaces=await Promise.race([capture,new Promise<null>(resolve=>{cancel=()=>resolve(null);signal.addEventListener('abort',cancel,{once:true});})]).finally(()=>signal.removeEventListener('abort',cancel));
  if(!surfaces||signal.aborted||document.hidden||!target.isConnected||!reveal.isConnected)return false;
  const [source,module]=surfaces;if(!source.face)return false;
  material=new module.QuestPactRenderer(source.face,true);material.resize(640,520);material.draw(0,DURATION);
  const canvas=material.canvas,b=material.cardBounds();
  // Capture padding is transparent. Match the visible card, not the canvas bounds.
  const cw=from.width*(1+CARD_PADDING*2)/b.width,ch=from.height*(1+CARD_PADDING*2*from.width/from.height)/b.height;
  canvas.className='quest-fold-canvas';canvas.dataset.cardUid=face.dataset.uid;canvas.setAttribute('aria-hidden','true');
  canvas.style.cssText=`position:fixed;left:0;top:0;width:${cw}px;height:${ch}px;transform-origin:0 0;pointer-events:none`;
  host.append(canvas);
  const start=new DOMMatrix().translate(from.left+from.width/2,from.top+from.height/2),sa=start.toFloat64Array();
  await new Promise<void>(resolve=>{
   let ended=false;const finish=()=>{if(ended)return;ended=true;cancelAnimationFrame(frame);signal.removeEventListener('abort',finish);resolve();};
   signal.addEventListener('abort',finish,{once:true});const begun=performance.now();
   const tick=(now:number)=>{
    if(signal.aborted||document.hidden||!target.isConnected||!reveal.isConnected){finish();return;}
    const ms=Math.min(DURATION,now-begun),travel=smooth(3460,4640,ms);
    try{material!.draw(0,ms);}catch{finish();return;}
    const ea=projectedPlacement(target,from.width,from.height).translate(from.width/2,from.height/2).toFloat64Array();
    const matrix=new DOMMatrix(Array.from(sa,(v,i)=>v+(ea[i]-v)*travel));
    matrix.m42-=Math.sin(travel*Math.PI)*from.width*.22;
    canvas.style.transform=matrix.translate(-cw*b.cx,-ch*b.cy).toString();canvas.dataset.time=String(Math.round(ms));
    const enter=smooth(0,180,ms),native=smooth(4510,4780,ms);
    reveal.style.opacity=String((1-enter)*Number(opacity||1));if(enter===1)reveal.style.visibility='hidden';
    face.style.opacity=String(native);if(native>0)place();canvas.style.opacity=String(enter*(1-native));
    if(ms===DURATION){completed=true;finish();return;}frame=requestAnimationFrame(tick);
   };tick(begun);
  });
  if(completed){face.style.opacity='1';place();}return completed;
 }catch(error){console.warn('[quest-pact] Native fallback',error);return false;}finally{
  cancelAnimationFrame(frame);material?.dispose();host.querySelector('canvas')?.remove();reveal.style.visibility=visible;reveal.style.opacity=opacity;
  if(!completed)host.remove();
 }
}

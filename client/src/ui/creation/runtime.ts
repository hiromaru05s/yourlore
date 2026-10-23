import {SPECIAL_FX} from '../animationTempo';
import type {CardInst} from '../../shared/types';
import {FRAME_BACK} from '../../shared/cards';
import {cardEl} from '../cardView';
import {captureCardSurface,CARD_PADDING} from '../cardSurface';
import type {NacreScene} from './scene';
type Side='me'|'opp';
export function warmCreation(){void import('./scene').catch(()=>{});}
/** Lifecycle is owned by boardMotionScope. No state, draw, HP or generic exile changes here. */
export async function playCreation(card:CardInst,side:Side,source:HTMLElement|null,copy:boolean,signal:AbortSignal,handTarget?:HTMLElement):Promise<boolean>{
 const root=document.querySelector<HTMLElement>('.game-shell');
 const pile=document.getElementById(side==='me'?'pile-myDisc':'pile-oppDisc');
 const grave=handTarget??pile?.querySelector<HTMLElement>('.pile-print .card')??pile;
 const rift=document.getElementById(side==='me'?'rift-me':'rift-opp');
 const deck=document.getElementById(side==='me'?'pile-oppDeck':'pile-myDeck');
 const anchor=copy?(deck?.querySelector<HTMLElement>('.pile-draw-anchor')??deck):source;
 if(signal.aborted||document.hidden||!anchor?.isConnected||!grave?.isConnected||!rift)return false;
 const sourceRect=anchor.getBoundingClientRect(),graveRect=grave.getBoundingClientRect();
 if(sourceRect.width<1||graveRect.width<1)return false;
 const capture=card.id==='HIDDEN'&&handTarget?handTarget.cloneNode(true) as HTMLElement:cardEl(card);capture.dataset.creationCapture='true';capture.style.cssText='position:fixed;left:-5000px;top:0;width:180px;height:280px;--cw:180px;--ch:280px;transform:none;pointer-events:none';document.body.append(capture);
 let scene:NacreScene|undefined,frame=0,timer:ReturnType<typeof setTimeout>|undefined,done:((ok:boolean)=>void)|undefined;
 const oldVisibility=source?.style.visibility,targetVisibility=handTarget?.style.visibility;let hidden=false;
 if(handTarget)handTarget.style.visibility='hidden';
 const fallback=()=>new Promise<boolean>(resolve=>{if(signal.aborted){resolve(false);return;}done=resolve;if(!capture.isConnected)document.body.append(capture);capture.dataset.creationFallback='true';capture.style.cssText=`position:fixed;left:${graveRect.left}px;top:${graveRect.top}px;width:${graveRect.width}px;height:${graveRect.height}px;--cw:${graveRect.width}px;--ch:${graveRect.height}px;pointer-events:none;z-index:145;outline:1px solid #9ce4d6`;timer=setTimeout(()=>resolve(true),SPECIAL_FX.milliseconds(240));});
 const cancel=()=>{cancelAnimationFrame(frame);if(timer)clearTimeout(timer);scene?.dispose();scene=undefined;capture.remove();if(hidden&&source)source.style.visibility=oldVisibility??'';hidden=false;if(handTarget)handTarget.style.visibility=targetVisibility??'';done?.(false);};
 signal.addEventListener('abort',cancel,{once:true});
 try{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return await fallback();
  await document.fonts.ready;await Promise.all([...capture.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
  if(signal.aborted)return false;
  const [module,surface,sourceSurface]=await Promise.all([import('./scene'),captureCardSurface(capture,FRAME_BACK,card.id!=='HIDDEN',card.id==='HIDDEN'),handTarget&&source?captureCardSurface(source,FRAME_BACK,true,false):Promise.resolve(null)]);
  if(signal.aborted||!anchor.isConnected||!grave.isConnected)return false;
  const face=surface.face??surface.back;if(!face)return await fallback();
  const crop=(face:HTMLCanvasElement)=>{const canvas=document.createElement('canvas');canvas.width=420;canvas.height=654;const pad=face.width*CARD_PADDING/(1+2*CARD_PADDING);canvas.getContext('2d')!.drawImage(face,pad,pad,face.width-pad*2,face.height-pad*2,0,0,420,654);return canvas;};
  const canvas=crop(face),sourceCanvas=sourceSurface?.face?crop(sourceSurface.face):canvas;
  scene=new module.NacreScene(canvas,{source:copy?(deck?.querySelector<HTMLElement>('.pile-draw-anchor')??anchor).getBoundingClientRect():sourceRect,grave:graveRect,rift:rift.getBoundingClientRect(),width:innerWidth,height:innerHeight},copy,sourceCanvas);
  const overlay=scene.renderer.domElement;overlay.dataset.creationFx=copy?'copy':'birth';overlay.dataset.creationUid=card.uid;overlay.dataset.creationDestination=handTarget?'hand':'grave';overlay.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:145';scene.draw(900);scene.draw(0);document.body.append(overlay);
  if(!copy&&source){source.style.visibility='hidden';hidden=true;}
  capture.remove();
  return await new Promise<boolean>(resolve=>{done=resolve;const start=SPECIAL_FX.now(),duration=copy?2050:2180;
   const tick=(now:number)=>{if(signal.aborted||!anchor.isConnected||!grave.isConnected||(root&&!root.isConnected)){resolve(false);return;}overlay.dataset.time=String(Math.round(now-start));scene!.draw(Math.min(now-start,duration));if(now-start>=duration){resolve(true);return;}frame=SPECIAL_FX.requestFrame(tick);};frame=SPECIAL_FX.requestFrame(tick);
  });
 }catch{if(signal.aborted)return false;scene?.dispose();scene=undefined;return await fallback();}
 finally{signal.removeEventListener('abort',cancel);cancel();}
}

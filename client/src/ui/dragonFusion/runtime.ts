import * as T from 'three';
import {boardMatrix,layoutRect,projectBoardDOM} from '../boardProjection';
import {captureCardSurface} from '../cardSurface';
import {FRAME_BACK} from '../../shared/cards';
import {releaseMonster,reserveMonster} from '../fieldLayout';
import {FusionRenderer,type Faces} from './renderer';
import {DRAGON_FUSION_VARIANT} from './selection';
import {designs,type ResultId} from './catalog';

/** Capture unprojected native faces, including their current stats and language. */
async function capture(node:HTMLElement,ratio:number){
 const copy=node.cloneNode(true) as HTMLElement;
 for(const el of [copy,...copy.querySelectorAll<HTMLElement>('[id],[data-uid]')]){el.removeAttribute('id');el.removeAttribute('data-uid');}
 copy.style.cssText=`position:fixed;left:-4000px;top:0;width:180px;height:${180*ratio}px;--cw:180px;--ch:${180*ratio}px;transform:none;translate:none;visibility:visible`;
 document.body.append(copy);
 try{const surface=await captureCardSurface(copy,FRAME_BACK,true,false);if(!surface.face)throw Error('Missing fusion face');return surface.face;}finally{copy.remove();}
}

/** Own both materials and the result slot. Cancellation settles to the authoritative result. */
export async function playDragonFusion(dragon:HTMLElement|undefined,mate:HTMLElement|undefined,result:HTMLElement,zone:HTMLElement,sourceUids:string[],signal:AbortSignal,skip=false,onImpact:()=>void=()=>{}):Promise<boolean>{
 let renderer:FusionRenderer|undefined,frame=0,finished=false,placed=false,resolveMotion:((v:boolean)=>void)|undefined;
 const place=()=>{
  if(placed)return;placed=true;
  if(!zone.isConnected)return;
  sourceUids.forEach(releaseMonster);
  const slot=reserveMonster(zone,result.dataset.uid!);
  if(slot)slot.replaceWith(result);
  projectBoardDOM(zone.closest<HTMLElement>('.game')??zone);
 };
 const finish=(complete=false)=>{
  if(finished)return;finished=true;cancelAnimationFrame(frame);signal.removeEventListener('abort',abort);
  renderer?.canvas.remove();renderer?.dispose();place();result.style.visibility='';resolveMotion?.(complete);
 };
 const abort=()=>finish();signal.addEventListener('abort',abort,{once:true});
 try{
  if(skip||signal.aborted||document.hidden||matchMedia('(prefers-reduced-motion:reduce)').matches||!dragon?.isConnected||!mate?.isConnected){finish(true);return true;}
  const a=layoutRect(dragon),b=layoutRect(mate),unit=a.width/180;
  if(unit<=0||a.height<=0){finish();return false;}
  const elevation=Number(dragon.closest<HTMLElement>('[data-board-plane]')?.dataset.boardPlane)||0;
  const [dragonFace,mateFace,resultFace]=await Promise.all([capture(dragon,a.height/a.width),capture(mate,b.height/b.width),capture(result,a.height/a.width)]);
  if(finished||signal.aborted||!zone.isConnected||!dragon.isConnected||!mate.isConnected){finish();return false;}
  renderer=new FusionRenderer(abort,[DRAGON_FUSION_VARIANT]);
  const canvas=renderer.canvas;canvas.className='dragon-fusion-summon';canvas.dataset.variant='04';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:136;pointer-events:none';
  place();result.style.visibility='hidden';
  const target=layoutRect(result),x=a.left+a.width/2,y=a.top+a.height/2;
  const origins={dragon:new T.Vector3(),mate:new T.Vector3((b.left+b.width/2-x)/unit,-(b.top+b.height/2-y)/unit,0),target:new T.Vector3((target.left+target.width/2-x)/unit,-(target.top+target.height/2-y)/unit,0)};
  const matrix=boardMatrix(x,y,elevation).scale(unit,-unit,unit),faces:Faces={dragon:dragonFace,mate:mateFace,result:resultFace};
  const paint=(ms:number)=>{renderer!.drawBoard(DRAGON_FUSION_VARIANT,ms,result.dataset.cardId as ResultId,faces,origins,matrix,innerWidth,innerHeight);canvas.dataset.time=String(Math.round(ms));};
  paint(0);document.body.append(canvas);
  return await new Promise<boolean>(resolve=>{
   resolveMotion=resolve;const start=performance.now();let impacted=false;
   const tick=(now:number)=>{
    if(finished)return;
    if(signal.aborted||document.hidden||!result.isConnected){finish();return;}
    try{const ms=Math.min(designs[DRAGON_FUSION_VARIANT].duration,now-start);paint(ms);if(!impacted&&ms>=designs[DRAGON_FUSION_VARIANT].hit){impacted=true;onImpact();}if(ms===designs[DRAGON_FUSION_VARIANT].duration)finish(true);else frame=requestAnimationFrame(tick);}catch(error){console.warn('[dragon-fusion] Native face fallback',error);finish();}
   };frame=requestAnimationFrame(tick);
  });
 }catch(error){console.warn('[dragon-fusion] Native face fallback',error);finish();return false;}
 finally{finish();}
}

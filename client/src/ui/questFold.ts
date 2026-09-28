import {FRAME_BACK} from '../shared/cards';
import {captureCardSurface,captureQuestTile,CARD_PADDING} from './cardSurface';
import {projectedPlacement} from './boardProjection';
import {QuestFoldMaterial} from './questFoldMaterial';

export const QUEST_FOLD_MS=3000;
const smooth=(a:number,b:number,t:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};
function engraving(){
 const a=document.createElement('canvas');a.width=512;a.height=768;const c=a.getContext('2d')!;c.fillStyle='#000';c.fillRect(0,0,512,768);c.strokeStyle='#9b9b9b';c.lineWidth=1.3;
 for(let j=0;j<3;j++){c.beginPath();c.roundRect(58+j*7,89+j*7,396-j*14,584-j*14,28);c.stroke();}
 c.save();c.translate(256,388);
 for(let j=0;j<11;j++){c.beginPath();const y=j*24-123;c.moveTo(-147,y);c.lineTo(-16,y);c.moveTo(16,y);c.lineTo(147-j%3*12,y);c.stroke();}c.strokeRect(-5,-242,10,484);c.restore();
 for(let i=0;i<44;i++){const x=i%2?430:82,y=133+Math.floor(i/2)*23;c.beginPath();c.moveTo(x-3,y-4);c.lineTo(x+3,y);c.lineTo(x-3,y+4);c.moveTo(x+3,y);c.lineTo(x+6,y);c.stroke();}return a;
}

export function nativeQuestGhost(target:HTMLElement,face:HTMLElement):HTMLElement {
 const w=target.offsetWidth,h=target.offsetHeight;
 const host=document.createElement('div');host.className='game quest-fold-host fx-field-ghost';host.dataset.uid=face.dataset.uid;
 host.style.cssText='position:fixed;inset:0;width:100%;height:100%;min-height:0;pointer-events:none;z-index:125;background:none;overflow:visible';
 face.style.cssText=`position:fixed;left:0;top:0;width:${w}px;height:${h}px;--cw:${w}px;--ch:${h}px;transform-origin:0 0;visibility:hidden;pointer-events:none`;
 host.append(face);document.body.append(host);
 face.style.transform=projectedPlacement(target,w,h).toString();face.style.visibility='visible';face.style.opacity='1';
 return host;
}

/** Selected #2: one folding surface, then a projected native tile. The caller
 * owns the returned ghost until the authoritative GameView render replaces it. */
export async function foldQuestIntoSlot(reveal:HTMLElement,target:HTMLElement,face:HTMLElement,signal:AbortSignal):Promise<boolean>{
 if(signal.aborted||document.hidden||!target.isConnected)return false;
 const from=reveal.getBoundingClientRect(),w=target.offsetWidth,h=target.offsetHeight;
 if(!from.width||!w||!h)return false;
 // Keep .game styles for the progress strip even while the ghost is outside the board.
 const host=nativeQuestGhost(target,face);face.style.visibility='hidden';
 let material:QuestFoldMaterial|undefined,frame=0,completed=false;
 const visible=reveal.style.visibility;
 const place=()=>{face.style.transform=projectedPlacement(target,w,h).toString();face.style.visibility='visible';};
 try{
  // Reduced motion retains the same card identity, immediately placed on the board.
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){place();completed=true;return true;}
  let cancel=()=>{};
  const capture=Promise.all([captureCardSurface(reveal,FRAME_BACK,true,false),captureQuestTile(face)]);
  const surfaces=await Promise.race([capture,new Promise<null>(resolve=>{cancel=()=>resolve(null);signal.addEventListener('abort',cancel,{once:true});})]).finally(()=>signal.removeEventListener('abort',cancel));
  if(!surfaces||signal.aborted||!target.isConnected||!reveal.isConnected)return false;
  const [source,tile]=surfaces;if(!source.face)return false;
  material=new QuestFoldMaterial(source.face,tile,engraving());if(!material.available)return false;
  const canvas=material.canvas,u=from.width*(1+CARD_PADDING*2),sourceRatio=source.face.height/source.face.width,targetRatio=tile.height/tile.width;
  canvas.className='quest-fold-canvas';canvas.dataset.cardUid=face.dataset.uid;canvas.setAttribute('aria-hidden','true');
  canvas.style.cssText=`position:fixed;left:0;top:0;width:${u*2.4}px;height:${u*3.2}px;transform-origin:0 0;pointer-events:none`;
  host.append(canvas);
  const start=new DOMMatrix().translate(from.left+from.width/2,from.top+from.height/2);
  const end=projectedPlacement(target,from.width,from.width*h/w).translate(from.width/2,from.width*h/w/2);
  const sa=start.toFloat64Array(),ea=end.toFloat64Array();
  await new Promise<void>(resolve=>{
   let ended=false;const finish=()=>{if(ended)return;ended=true;cancelAnimationFrame(frame);signal.removeEventListener('abort',finish);resolve();};
   signal.addEventListener('abort',finish,{once:true});const begun=performance.now();
   const tick=(now:number)=>{
    if(signal.aborted||document.hidden||!target.isConnected||!reveal.isConnected){finish();return;}
    const ms=Math.min(QUEST_FOLD_MS,now-begun),travel=smooth(1400,2240,ms);
    if(!material!.draw(ms,sourceRatio+(targetRatio-sourceRatio)*travel)){finish();return;}
    const matrix=new DOMMatrix(Array.from(sa,(v,i)=>v+(ea[i]-v)*travel));
    matrix.m42-=Math.sin(travel*Math.PI)*u*.22+smooth(0,420,ms)*(1-travel)*u*.06;
    canvas.style.transform=matrix.translate(-u*1.2,-u*1.6).toString();
    canvas.dataset.time=String(Math.round(ms));
    canvas.style.filter=`drop-shadow(0 0 ${u*.035*smooth(90,600,ms)*(1-smooth(2340,2920,ms))}px #f9d891)`;
    reveal.style.visibility='hidden';
    // Surface and DOM occupy the same projected quad. Cross the final 100ms to
    // retain native text antialiasing without a frame/size pop at replacement.
    const native=smooth(2900,3000,ms);face.style.opacity=String(native);if(native>0)place();canvas.style.opacity=String(1-native);
    if(ms===QUEST_FOLD_MS){completed=true;finish();return;}frame=requestAnimationFrame(tick);
   };tick(begun);
  });
  if(completed){face.style.opacity='1';place();}return completed;
 }catch(error){console.warn('[quest-fold] Native fallback',error);return false;}finally{
  cancelAnimationFrame(frame);material?.dispose();host.querySelector('canvas')?.remove();reveal.style.visibility=visible;
  if(!completed)host.remove();
 }
}

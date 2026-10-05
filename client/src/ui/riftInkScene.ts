import {CARD_PADDING} from './cardSurface';
import {acquireSilverInk,silverInkState,SILVER_INK_DURATION} from './riftInkRenderer';
import type {Point} from './riftTransmute';

/** Approved silver-ink surface, projected through the actual card's DOMMatrix. */
export async function playSilverRift(node:HTMLElement,target:HTMLElement,face:HTMLCanvasElement,start:DOMMatrix,sink:Point,signal:AbortSignal,onStart:()=>void):Promise<boolean>{
 const width=innerWidth,height=innerHeight,w=node.offsetWidth,h=node.offsetHeight,dpr=Math.min(devicePixelRatio||1,2);
 if(signal.aborted||!w||!h)return true;
 const project=(x:number,y:number):Point=>{const p=start.transformPoint(new DOMPoint(x,y));return {x:p.x/p.w,y:p.y/p.w};};
 const source=project(w/2,h/2),left=project(0,h/2),right=project(w,h/2);
 const padded=w*(1+2*CARD_PADDING),screenWidth=Math.hypot(right.x-left.x,right.y-left.y)*(1+2*CARD_PADDING);
 if(!Number.isFinite(screenWidth)||screenWidth<1)return false;
 const unit=Math.min(320,Math.max(96,screenWidth*dpr*1.2)),ratio=(h+2*w*CARD_PADDING)/padded;
 // Preserve the source location even for the opponent's hand near the upper edge.
 const lift=Math.min(screenWidth*.2,Math.max(0,source.y-screenWidth*.85));
 const local=document.createElement('canvas');local.width=Math.ceil(unit*2.8);local.height=Math.ceil(unit*3.4);
 const lc=local.getContext('2d')!;
 const canvas=document.createElement('canvas'),c=canvas.getContext('2d')!;
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.className='rift-fold-canvas rift-transmute-canvas rift-silver-ink-canvas';canvas.setAttribute('aria-hidden','true');canvas.dataset.variant='twin-script';canvas.dataset.duration=String(SILVER_INK_DURATION);
 // Let the compositor project this single surface through the exact card
 // matrix. Canvas2D's 160 clipped triangle copies approximated the same plane.
 const surfaceMatrix=start.translate(w/2-padded*1.4,h/2-padded*1.7).scale(padded*2.8/local.width,padded*3.4/local.height);
 local.className='rift-silver-source';local.setAttribute('aria-hidden','true');
 local.style.cssText=`position:fixed;left:0;top:0;width:${local.width}px;height:${local.height}px;pointer-events:none;z-index:126;transform-origin:0 0;will-change:transform`;

 let acquired:ReturnType<typeof acquireSilverInk>;
 try{acquired=acquireSilverInk();}catch{return false;}
 const style=node.getAttribute('style');let frame=0,finish=(_ok:boolean)=>{},ok=true;
 const abort=()=>finish(true);
 const invalid=()=>signal.aborted||document.hidden||!node.isConnected||!target.isConnected||innerWidth!==width||innerHeight!==height;
 function paint(ms:number){
  const s=silverInkState(ms);c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);
  canvas.dataset.progress=(ms/SILVER_INK_DURATION).toFixed(3);canvas.dataset.phase=['浮上','カード発光','銀紋の流墨','リフトへの軌跡','到着'][s.phase];
  if(ms<2040){
   // The contact shadow stays on the board while the material rises above it.
   c.save();c.globalAlpha=.17*s.lift*(1-s.collapse);c.fillStyle='#20102e';c.shadowColor='#281733';c.shadowBlur=screenWidth*.08;c.beginPath();c.ellipse(source.x,source.y+screenWidth*.35,screenWidth*.35,screenWidth*.08,0,0,Math.PI*2);c.fill();c.restore();
   lc.setTransform(1,0,0,1,0,0);lc.clearRect(0,0,local.width,local.height);lc.translate(local.width/2,local.height/2);
   acquired.renderer.draw(lc,face,{x:0,y:0},{x:0,y:0},unit,ms,{part:'source',heightRatio:ratio,lift:0,ground:false});
   local.style.transform=new DOMMatrix().translate(0,-lift*s.lift).multiply(surfaceMatrix).toString();
  }else local.hidden=true;
  acquired.renderer.draw(c,face,source,sink,screenWidth,ms,{part:'transfer',lift});
 }
 try{
  // Warm the shader before starting the animation clock or hiding the live card.
  paint(0);if(invalid())return true;
  document.body.append(canvas,local);node.style.visibility='hidden';onStart();
  const begun=performance.now();
  ok=await new Promise<boolean>(resolve=>{
   let ended=false;finish=value=>{if(ended)return;ended=true;cancelAnimationFrame(frame);resolve(value);};
   signal.addEventListener('abort',abort,{once:true});
   const tick=(now:number)=>{if(invalid()){finish(true);return;}const ms=Math.min(SILVER_INK_DURATION,Math.max(0,now-begun));try{paint(ms);}catch{finish(false);return;}if(ms===SILVER_INK_DURATION)finish(true);else frame=requestAnimationFrame(tick);};
   frame=requestAnimationFrame(tick);
  });
 }catch{ok=false;}finally{cancelAnimationFrame(frame);signal.removeEventListener('abort',abort);canvas.remove();local.remove();acquired.release();if(style===null)node.removeAttribute('style');else node.setAttribute('style',style);}
 return ok;
}

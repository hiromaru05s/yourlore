import {FRAME_BACK} from '../../shared/cards';
import {captureCardSurface,CARD_PADDING} from '../cardSurface';
import {projectedPlacement,boardPoint} from '../boardProjection';
import {RIFT_MOUNT,readingScale} from '../readingBoardLayout';
import {acquireObsidian,DURATION,state} from './renderer';

const active=new Map<HTMLElement,()=>void>();
const receivers=new Map<HTMLElement,number>();
export function cancelRiftDestruction(root?:HTMLElement){for(const [node,cancel]of [...active])if(!root||root.contains(node))cancel();}
/** Approved rich 01. One projected source surface continues into a screen-space transfer. */
export function playRiftDestruction(node:HTMLElement,target:HTMLElement,signal?:AbortSignal):Promise<boolean>{
 active.get(node)?.();
 if(signal?.aborted||document.hidden||!node.isConnected||!target.isConnected)return Promise.resolve(false);
 if(matchMedia('(prefers-reduced-motion:reduce)').matches)return Promise.resolve(true);
 return new Promise(resolve=>{
  let done=false,raf=0,hidden=false,receiving=false,release:(()=>void)|undefined,local:HTMLCanvasElement|undefined,canvas:HTMLCanvasElement|undefined,host:HTMLElement|undefined;
  const visibility=node.style.visibility,width=innerWidth,height=innerHeight,begin=performance.now();
  const finish=(complete:boolean)=>{
   if(done)return;done=true;clearTimeout(deadline);cancelAnimationFrame(raf);local?.remove();canvas?.remove();host?.remove();release?.();
   if(hidden)node.style.visibility=visibility;
   if(receiving){const n=(receivers.get(target)??1)-1;if(n)receivers.set(target,n);else{receivers.delete(target);target.classList.remove('is-absorbing');}}
   signal?.removeEventListener('abort',cancel);window.removeEventListener('resize',cancel);window.removeEventListener('pagehide',cancel);document.removeEventListener('visibilitychange',onHidden);
   if(active.get(node)===cancel)active.delete(node);
   window.dispatchEvent(new CustomEvent('lore:rift-destruction-finished',{detail:{complete,variant:'obsidian-01',elapsed:Math.round(performance.now()-begin)}}));resolve(complete);
  };
  const cancel=()=>finish(false),onHidden=()=>{if(document.hidden)cancel();};
  const deadline=setTimeout(cancel,6000);active.set(node,cancel);signal?.addEventListener('abort',cancel,{once:true});window.addEventListener('resize',cancel);window.addEventListener('pagehide',cancel);document.addEventListener('visibilitychange',onHidden);
  const invalid=()=>done||signal?.aborted||document.hidden||!node.isConnected||!target.isConnected;
  void (async()=>{
   const w=node.offsetWidth,h=node.offsetHeight;if(!w||!h){cancel();return;}
   host=node.cloneNode(true) as HTMLElement;host.removeAttribute('id');host.removeAttribute('data-uid');host.style.cssText=`position:fixed;left:-10000px;top:0;width:${w}px;height:${h}px;--cw:${w}px;--ch:${h}px;transform:none;opacity:1;visibility:visible`;
   document.body.append(host);
   const captured=await captureCardSurface(host,FRAME_BACK,true,false);host.remove();host=undefined;
   if(invalid()){cancel();return;}if(!captured.face)throw Error('Card surface unavailable');
   const face=document.createElement('canvas');face.width=512;face.height=Math.round(512*captured.face.height/captured.face.width);face.getContext('2d')!.drawImage(captured.face,0,0,face.width,face.height);
   const start=projectedPlacement(node,w,h),project=(x:number,y:number)=>{const p=start.transformPoint(new DOMPoint(x,y));return{x:p.x/p.w,y:p.y/p.w};};
   const source=project(w/2,h/2),left=project(0,h/2),right=project(w,h/2),padded=w*(1+2*CARD_PADDING),screenWidth=Math.hypot(right.x-left.x,right.y-left.y)*(1+2*CARD_PADDING);
   const r=target.getBoundingClientRect(),sink=target.id==='rift-me'||target.id==='rift-opp'?boardPoint(width/2+RIFT_MOUNT.x*readingScale(),height/2+(target.id==='rift-me'?1:-1)*RIFT_MOUNT.z*readingScale(),RIFT_MOUNT.height*readingScale()):{x:r.left+r.width/2,y:r.top+r.height/2};
   const dpr=Math.min(devicePixelRatio||1,2),unit=Math.min(320,Math.max(96,screenWidth*dpr*1.2)),ratio=(h+2*w*CARD_PADDING)/padded,lift=Math.min(screenWidth*.2,Math.max(0,source.y-screenWidth*.85));
   const acquired=acquireObsidian(face);release=acquired.release;
   local=document.createElement('canvas');local.width=Math.ceil(unit*2.8);local.height=Math.ceil(unit*3.4);const lc=local.getContext('2d')!;
   local.className='rift-destruction-source';local.setAttribute('aria-hidden','true');local.style.cssText=`position:fixed;left:0;top:0;width:${local.width}px;height:${local.height}px;pointer-events:none;z-index:136;transform-origin:0 0;will-change:transform`;
   const matrix=start.translate(w/2-padded*1.4,h/2-padded*1.7).scale(padded*2.8/local.width,padded*3.4/local.height);
   canvas=document.createElement('canvas');canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);const c=canvas.getContext('2d')!;
   canvas.className='rift-destruction';canvas.dataset.variant='obsidian-01';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:136';
   const paint=(ms:number)=>{
    c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);canvas!.dataset.phase=['charge','pressure','fracture','transfer','arrival'][state(ms).phase];canvas!.dataset.progress=String(ms/DURATION);
    if(ms<1590){lc.setTransform(1,0,0,1,0,0);lc.clearRect(0,0,local!.width,local!.height);lc.translate(local!.width/2,local!.height/2);acquired.renderer.draw(lc,face,'bevel',{x:0,y:0},{x:0,y:0},unit,ms,{part:'source',heightRatio:ratio,lift:0});local!.style.transform=new DOMMatrix().translate(0,-lift*state(ms).lift).multiply(matrix).toString();}else local!.hidden=true;
    acquired.renderer.draw(c,face,'bevel',source,sink,screenWidth,ms,{part:'transfer',heightRatio:ratio,lift});
   };
   // Compile/upload before the source disappears or the animation clock starts.
   paint(0);if(invalid()){cancel();return;}document.body.append(canvas,local);node.style.visibility='hidden';hidden=true;
   receivers.set(target,(receivers.get(target)??0)+1);target.classList.add('is-absorbing');receiving=true;
   const started=performance.now();
   const tick=(now:number)=>{if(invalid()){cancel();return;}try{const ms=Math.min(DURATION,now-started);paint(ms);if(ms===DURATION)finish(true);else raf=requestAnimationFrame(tick);}catch{cancel();}};
   raf=requestAnimationFrame(tick);
  })().catch(()=>{
   if(invalid()){cancel();return;}
   // Capture/WebGL failure uses a short DOM darkening instead of losing the card.
   const a=node.animate([{filter:'brightness(1)',opacity:1},{filter:'brightness(.1) sepia(1) hue-rotate(235deg)',opacity:0}],{duration:180,fill:'none'});
   const oldRelease=release;release=()=>{a.cancel();oldRelease?.();};void a.finished.then(()=>finish(true),cancel);
  });
 });
}

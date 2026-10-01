import {DRAW_THICKNESS_RATIO} from './cardThickness';
import {drawMotion,drawSmooth,DRAW_DURATION,DRAW_STAGGER} from './drawMotion';
import {handCardMatrix,type HandLayout} from './handGeometry';
import {acquireDrawStage,type StockPose} from './drawStock';
import {sfx} from './sound';
export {handCardMatrix} from './handGeometry';
export interface PaperDrawOptions {cards:HTMLElement[];origin:DOMRect;sleeve:string;reveal:boolean;signal:AbortSignal;onLand:(node:HTMLElement)=>void;previousHand?:HandLayout;durationScale?:number;}
function nativeCopy(node:HTMLElement){
 const copy=node.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.removeAttribute('data-uid');copy.setAttribute('aria-hidden','true');
 const cs=getComputedStyle(node),w=parseFloat(cs.width)||node.offsetWidth,h=parseFloat(cs.height)||node.offsetHeight;copy.classList.remove('is-picked','is-armed','is-played');copy.style.cssText+=`;position:absolute;inset:0;width:${w}px;height:${h}px;--cw:${w}px;--ch:${h}px;margin:0;transform:none;transition:none;animation:none;visibility:visible;pointer-events:none;`;
 copy.style.setProperty('filter',cs.filter,'important');copy.style.fontFamily=cs.fontFamily;
 const originals=node.querySelectorAll<HTMLElement>('.card-frame');copy.querySelectorAll<HTMLElement>('.card-frame').forEach((f,i)=>{f.style.filter=getComputedStyle(originals[i]).filter;});return copy;
}
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
function mixMatrix(a:DOMMatrix,b:DOMMatrix,t:number){return new DOMMatrix([mix(a.a,b.a,t),mix(a.b,b.b,t),mix(a.c,b.c,t),mix(a.d,b.d,t),mix(a.e,b.e,t),mix(a.f,b.f,t)]);}
/** Rigid beveled stock underneath the exact native front/back. No rasterized text
 * swap, paper bending, or flattening filter on the 3D parent. */
export async function drawPaperCards({cards,origin,sleeve,reveal,signal,onLand,previousHand,durationScale=1}:PaperDrawOptions):Promise<void>{
 if(signal.aborted||!cards.length||cards.some(n=>!n.isConnected))return;
 const speed=Math.max(.5,Math.min(5,durationScale)),overlay=document.createElement('div');overlay.className='native-draw-layer';overlay.setAttribute('aria-hidden','true');overlay.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:126;perspective:1200px;perspective-origin:50% 50%;transform-style:preserve-3d';document.body.append(overlay);
 const flights=cards.map(node=>{
  const cs=getComputedStyle(node),w=parseFloat(cs.width)||node.offsetWidth,h=parseFloat(cs.height)||node.offsetHeight,root=document.createElement('div');
  root.className='native-draw-card';root.style.cssText=`position:absolute;left:0;top:0;width:${w}px;height:${h}px;transform-origin:50% 50%;transform-style:preserve-3d;will-change:transform;display:none`;
  if(reveal){const front=nativeCopy(node);front.style.backfaceVisibility='hidden';front.style.transform='translateZ(.015px)';root.append(front);}
  const back=document.createElement('div');back.className='draw-stock-back';back.style.cssText=`position:absolute;inset:0;border-radius:5.2%;background-image:url("${sleeve}");background-size:100% 100%;backface-visibility:hidden;transform:translateZ(${-w*DRAW_THICKNESS_RATIO}px) rotateY(180deg);box-shadow:inset 0 0 0 1px #b1c3d155`;root.append(back);
  // A narrow, short-lived mana edge follows the same rigid surface.
  const light=document.createElement('div');light.style.cssText=`position:absolute;inset:1%;border-radius:5%;border:1px solid #98ddff;box-shadow:0 0 5px #64bdff66,inset 0 0 3px #64bdff44;transform:translateZ(${-w*(DRAW_THICKNESS_RATIO+.001)}px);opacity:0;pointer-events:none`;root.append(light);
  overlay.append(root);return {node,w,h,root,light,landed:false,sounded:false,stock:null as ReturnType<NonNullable<ReturnType<typeof acquireDrawStage>>['add']>|null};
 });
 // Foreground cards open a gap from their pre-render poses. Copies stay above
 // the arriving card only in its last approach, so it is actually inserted.
 const grips:Array<{node:HTMLElement;copy:HTMLElement;visibility:string;from:DOMMatrix;width:number;height:number;settled:boolean}>=[];
 const grip=(node:HTMLElement,index:number,settled=false)=>{
  if(grips.some(g=>g.node===node))return;
  const copy=nativeCopy(node),cs=getComputedStyle(node),w=parseFloat(cs.width)||node.offsetWidth,h=parseFloat(cs.height)||node.offsetHeight;
  const old=previousHand?.get(node.dataset.uid||'#'+index),from=old&&!settled?old.matrix.scale(old.width/w,old.height/h):handCardMatrix(node);
  copy.style.transformOrigin='0 0';copy.style.transform=from.toString();copy.style.zIndex=String(20+(parseFloat(cs.zIndex)||0));overlay.append(copy);grips.push({node,copy,visibility:node.style.visibility,from,width:w,height:h,settled});node.style.visibility='hidden';
 };
 const all=[...cards[0].parentElement!.querySelectorAll<HTMLElement>(':scope > .card,:scope > .card--back')];
 // Setup remains cancellation-safe even when image decoding or module loading stalls.
 const width=innerWidth,height=innerHeight;let frame=0,finish=()=>{},stage:ReturnType<typeof acquireDrawStage>=null,decodeTimer=0;
 let cancelDecode=()=>{};const cancelled=new Promise<void>(resolve=>{cancelDecode=resolve;}),cancel=()=>{cancelDecode();finish();};signal.addEventListener('abort',cancel,{once:true});
 try{
  if(typeof DOMMatrix!=='undefined')all.forEach((n,i)=>{if(!cards.includes(n))grip(n,i);});
  const pending=[...overlay.querySelectorAll('img')].filter(i=>!i.complete||!i.naturalWidth);
  await Promise.race([cancelled,Promise.all(pending.map(i=>i.decode().catch(()=>{}))),new Promise<void>(r=>{decodeTimer=setTimeout(r,180);})]);clearTimeout(decodeTimer);if(signal.aborted)return;
  stage=acquireDrawStage();flights.forEach(f=>{f.stock=stage?.add(f.w,f.h)??null;});
  const start=performance.now();await new Promise<void>(resolve=>{let done=false;finish=()=>{if(done)return;done=true;cancelAnimationFrame(frame);resolve();};
   const tick=(now:number)=>{
    if(signal.aborted||document.hidden||innerWidth!==width||innerHeight!==height||cards.some(n=>!n.isConnected)){finish();return;}
    const elapsed=(now-start)/speed,opening=drawSmooth(.08,.64,elapsed/DRAW_DURATION);let running=false;
    // Read all native geometry before writing animated styles to avoid layout thrash.
    const targets=new Map([...grips.map(g=>g.node),...flights.filter(f=>!f.landed).map(f=>f.node)].map(n=>[n,handCardMatrix(n)]));
    for(const g of grips){const to=targets.get(g.node)!;g.copy.style.transform=(g.settled?to:mixMatrix(g.from,to,opening)).toString();}
    flights.forEach((f,i)=>{
     const t=Math.max(0,Math.min(1,(elapsed-i*DRAW_STAGGER)/DRAW_DURATION)),started=elapsed>=i*DRAW_STAGGER;
     f.root.style.display=started&&!f.landed?'block':'none';if(t<1)running=true;if(!started||f.landed)return;
     if(!f.sounded){f.sounded=true;sfx('draw');}
     if(t===1){f.root.style.display='none';f.stock?.remove();f.stock=null;f.landed=true;onLand(f.node);grip(f.node,all.indexOf(f.node),true);return;}
     const target=targets.get(f.node)!,end=target.transformPoint(new DOMPoint(f.w/2,f.h/2)),p=drawMotion(t,reveal);
     const ox=origin.left+origin.width/2,oy=origin.top+origin.height/2,side=reveal?-1:1;
     const targetScale=Math.hypot(target.a,target.b),startScale=origin.width/f.w,angle=Math.atan2(target.b,target.a)*180/Math.PI;
     const pose:StockPose={x:mix(ox,end.x,p.travel)+side*origin.width*.11*p.peel,y:mix(oy,end.y,p.travel)-Math.min(origin.height*.30,55)*p.lift+1.5*p.seat,
      z:Math.min(origin.width*.72,65)*p.lift,pitch:p.pitch,yaw:180*(1-p.reveal),bank:angle*p.travel+side*10*p.bank,scale:mix(startScale,targetScale,p.travel)};
     // Projection enlarges by depth naturally. No extra scale pulse is layered on.
     f.root.style.left=(pose.x-f.w/2)+'px';f.root.style.top=(pose.y-f.h/2)+'px';f.root.style.transform=`translateZ(${pose.z}px) rotateZ(${pose.bank}deg) rotateY(${pose.yaw}deg) rotateX(${pose.pitch}deg) scale(${pose.scale})`;
     f.root.style.zIndex=p.travel<.78?'80':'0';f.light.style.opacity=String(p.glow*.7);
     if(!stage)f.root.style.boxShadow=`0 ${3+pose.z*.12}px ${4+pose.z*.12}px #050d2040`;
     f.stock?.update(pose,true,p.glow);f.root.dataset.progress=t.toFixed(3);f.root.dataset.phase=t<.18?'separate':t<.58?'turn':t<.84?'carry':'seat';f.root.dataset.thickness=(f.w*DRAW_THICKNESS_RATIO).toFixed(2);
    });
    stage?.render();if(running)frame=requestAnimationFrame(tick);else finish();
   };frame=requestAnimationFrame(tick);
  });
 }finally{clearTimeout(decodeTimer);cancelAnimationFrame(frame);signal.removeEventListener('abort',cancel);flights.forEach(f=>f.stock?.remove());stage?.release();for(const g of grips)g.node.style.visibility=g.visibility;overlay.remove();}
}

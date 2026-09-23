import {sfx} from './sound';
import {drawMotion,DRAW_DURATION,DRAW_STAGGER} from './drawMotion';
export interface PaperDrawOptions {cards:HTMLElement[];origin:DOMRect;sleeve:string;reveal:boolean;signal:AbortSignal;onLand:(node:HTMLElement)=>void;}
/** Exact native hand transform. Bounding rectangles alone stretch rotated cards. */
export function handCardMatrix(node:HTMLElement):DOMMatrix {
 const parent=node.offsetParent as HTMLElement,rect=parent.getBoundingClientRect(),style=getComputedStyle(node),origin=style.transformOrigin.split(' ').map(parseFloat);
 const transform=style.transform==='none'?new DOMMatrix():new DOMMatrix(style.transform);
 return new DOMMatrix().translate(rect.left+(parseFloat(style.left)||node.offsetLeft)+origin[0],rect.top+(parseFloat(style.top)||node.offsetTop)+origin[1]).multiply(transform).translate(-origin[0],-origin[1]);
}
function nativeCopy(node:HTMLElement){
 const copy=node.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.removeAttribute('data-uid');copy.setAttribute('aria-hidden','true');
 const sizing=getComputedStyle(node),w=parseFloat(sizing.width)||node.offsetWidth,h=parseFloat(sizing.height)||node.offsetHeight;copy.classList.remove('is-picked','is-armed');copy.style.cssText+=`;position:absolute;inset:0;width:${w}px;height:${h}px;--cw:${w}px;--ch:${h}px;margin:0;transform:none;transition:none;animation:none;visibility:visible;pointer-events:none;`;
 // Preserve game-scoped surface treatment outside the board subtree, including
 // the opponent sleeve's inline image and the inactive card's exact filter.
 const appearance=getComputedStyle(node);copy.style.setProperty('filter',appearance.filter,'important');copy.style.fontFamily=appearance.fontFamily;
 const originals=node.querySelectorAll<HTMLElement>('.card-frame');copy.querySelectorAll<HTMLElement>('.card-frame').forEach((frame,i)=>{frame.style.filter=getComputedStyle(originals[i]).filter;});
 return copy;
}
/** Keep the same DOM art, masks, frame and glyphs throughout the flip and landing. */
export async function drawPaperCards({cards,origin,sleeve,reveal,signal,onLand}:PaperDrawOptions):Promise<void>{
 if(signal.aborted||!cards.length)return;
 const overlay=document.createElement('div');overlay.className='native-draw-layer';overlay.setAttribute('aria-hidden','true');overlay.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:126;perspective:1200px';document.body.append(overlay);
 const flights=cards.map(node=>{
  const sizing=getComputedStyle(node),w=parseFloat(sizing.width)||node.offsetWidth,h=parseFloat(sizing.height)||node.offsetHeight,root=document.createElement('div'),flip=document.createElement('div');
  root.className='native-draw-card';root.style.cssText=`position:absolute;left:0;top:0;width:${w}px;height:${h}px;transform-origin:0 0;will-change:transform;visibility:hidden;`;
  flip.style.cssText='position:absolute;inset:0;transform-style:preserve-3d;';
  if(reveal){const front=nativeCopy(node);front.style.backfaceVisibility='hidden';front.style.transform='translateZ(.25px)';flip.append(front);}
  const back=document.createElement('div');back.style.cssText=`position:absolute;inset:0;border-radius:7%;background-image:url("${sleeve}");background-size:100% 100%;backface-visibility:hidden;transform:rotateY(180deg);box-shadow:inset 0 0 0 1px #d0c5a380;`;
  const sheen=document.createElement('div');sheen.style.cssText='position:absolute;inset:1%;border-radius:5%;background:linear-gradient(115deg,transparent 30%,#d8eaff44 48%,transparent 62%);pointer-events:none;opacity:0;transform:translateZ(.5px)';
  flip.append(back,sheen);root.append(flip);overlay.append(root);return {node,w,h,root,flip,sheen,landed:false,sounded:false};
 });
 // Foreground cards retain their real affine placement while the new card slips behind.
 const grips:Array<{node:HTMLElement;copy:HTMLElement;visibility:string}>=[];
 const grip=(node:HTMLElement)=>{if(grips.some(g=>g.node===node))return;const copy=nativeCopy(node);copy.style.transformOrigin='0 0';copy.style.transform=handCardMatrix(node).toString();copy.style.zIndex=String(20+(parseFloat(getComputedStyle(node).zIndex)||0));overlay.append(copy);grips.push({node,copy,visibility:node.style.visibility});node.style.visibility='hidden';};
 cards[0].parentElement?.querySelectorAll<HTMLElement>('.card').forEach(node=>{if(!cards.includes(node))grip(node);});
 const width=innerWidth,height=innerHeight;let frame=0,finish=()=>{};let cancelDecode=()=>{};const cancelled=new Promise<void>(resolve=>{cancelDecode=resolve;});const cancel=()=>{cancelDecode();finish();};signal.addEventListener('abort',cancel,{once:true});
 try{await Promise.race([cancelled,Promise.all([...overlay.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})))]);if(signal.aborted)return;
  const start=performance.now();await new Promise<void>(resolve=>{let done=false;finish=()=>{if(done)return;done=true;cancelAnimationFrame(frame);resolve();};
   const tick=(now:number)=>{
    if(signal.aborted||document.hidden||innerWidth!==width||innerHeight!==height||cards.some(n=>!n.isConnected)){finish();return;}
    let running=false;
    flights.forEach((f,i)=>{
     const t=Math.max(0,Math.min(1,(now-start-i*DRAW_STAGGER)/DRAW_DURATION)),started=now-start>=i*DRAW_STAGGER;f.root.style.visibility=started&&!f.landed?'visible':'hidden';
     if(t<1)running=true;if(!started||f.landed)return;
     if(!f.sounded){f.sounded=true;sfx('draw');}
     const target=handCardMatrix(f.node),end=target.transformPoint(new DOMPoint(f.w/2,f.h/2));
     if(t===1){f.root.style.visibility='hidden';f.landed=true;onLand(f.node);grip(f.node);return;}
     const p=drawMotion(t,reveal),ox=origin.left+origin.width/2,oy=origin.top+origin.height/2;
     const dx=end.x-ox,arc=Math.min(90,Math.max(25,Math.abs(dx)*.22));
     const x=ox+dx*p.travel+(reveal?-1:1)*p.peel*origin.width*.09,y=oy+(end.y-oy)*p.travel-arc*p.lift-origin.height*.07*p.peel;
     const targetScale=Math.hypot(target.a,target.b),startScale=origin.width/f.w,scale=(startScale+(targetScale-startScale)*p.travel)*(1+p.size);
     const angle=Math.atan2(target.b,target.a)*180/Math.PI;
     f.root.style.transform=new DOMMatrix().translate(x,y).rotate(0,0,angle*p.travel+(reveal?-10:10)*p.bank).scale(scale).translate(-f.w/2,-f.h/2).toString();
     f.flip.style.transform=`rotateX(${-12*p.peel}deg) rotateY(${180*(1-p.reveal)}deg)`;
     f.root.style.filter=`drop-shadow(${4*p.lift}px ${5+14*p.lift}px ${2+7*p.lift}px #02091670)`;
     f.sheen.style.opacity=String(Math.sin(Math.PI*p.reveal)*.7);f.root.dataset.progress=t.toFixed(3);f.root.dataset.phase=t<.18?'peel':t<.57?'reveal':t<.85?'carry':'land';
    });
    if(running)frame=requestAnimationFrame(tick);else finish();
   };frame=requestAnimationFrame(tick);
  });
 }finally{cancelAnimationFrame(frame);signal.removeEventListener('abort',cancel);for(const g of grips)g.node.style.visibility=g.visibility;overlay.remove();}
}

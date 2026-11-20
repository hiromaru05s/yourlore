import {handCardMatrix,handSlotSpace,type HandLayout} from './handGeometry';
import {drawMotion,drawSmooth} from './drawMotion';
import {FRAME_BACK} from '../shared/cards';
import {decorateDrawBack} from './cosmetics/sleeve';
import {DRAW_THICKNESS_RATIO} from './cardThickness';

import {DRAW_FLIGHT,DRAW_GAP,DRAW_WAKE} from './manaDrawTiming';
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const affine=(a:DOMMatrix,b:DOMMatrix,t:number)=>new DOMMatrix([mix(a.a,b.a,t),mix(a.b,b.b,t),mix(a.c,b.c,t),mix(a.d,b.d,t),mix(a.e,b.e,t),mix(a.f,b.f,t)]);
type Slot={node:HTMLElement;w:number;h:number;to:DOMMatrix;from:DOMMatrix;index:number;visibility:string;transform:(pose:DOMMatrix)=>string;className:string;style:string|null;layers:Array<{node:HTMLElement;style:string|null}>;back?:HTMLElement;active:boolean;started:boolean;finish?:(time:number,tilt:number)=>void};

/** Approved mana draw moving the actual hand owners in their native stacking context.
 * Artwork, frame and badges never change nodes, resolution or coordinate space. */
export class ManaDrawPresentation {
 private slots:Slot[]=[];
 private layer?:HTMLElement;
 private canvas?:HTMLCanvasElement;
 private mounted=false;
 private origin={x:0,y:0,w:1,h:1};
 private opponent=false;
 private count=2;
 private sleeve=FRAME_BACK;
 private onLand:((node:HTMLElement)=>void)|undefined;
 private onStart:(()=>void)|undefined;
 private sprite=document.createElement('canvas');
 constructor(){
  this.sprite.width=this.sprite.height=128;const c=this.sprite.getContext('2d')!,g=c.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(206,241,255,.8)');g.addColorStop(.12,'rgba(99,191,255,.62)');g.addColorStop(.32,'rgba(28,125,255,.30)');g.addColorStop(.63,'rgba(11,72,213,.09)');g.addColorStop(1,'rgba(5,43,150,0)');c.fillStyle=g;c.fillRect(0,0,128,128);
 }
 prepare(incoming:HTMLElement[],r:DOMRect,sleeve:string,reveal:boolean,previous:HandLayout=new Map(),onLand?:(node:HTMLElement)=>void,onStart?:()=>void){
  this.dispose();this.count=incoming.length;this.opponent=!reveal;this.sleeve=sleeve;this.onLand=onLand;this.onStart=onStart;
  if(!incoming.length)return;
  this.origin={x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};
  const cards=[...incoming[0].parentElement!.querySelectorAll<HTMLElement>(':scope > .card,:scope > .card--back')];
  this.slots=cards.map((node,i)=>{const cs=getComputedStyle(node),w=parseFloat(cs.width)||node.offsetWidth,h=parseFloat(cs.height)||node.offsetHeight,to=handCardMatrix(node),old=previous.get(node.dataset.uid||'#'+i);return {node,w,h,to,from:old?old.matrix.scale(old.width/w,old.height/h):to,index:incoming.indexOf(node),visibility:node.style.visibility,transform:handSlotSpace(node).transform,className:node.className,style:node.getAttribute('style'),layers:[...node.children].map(n=>({node:n as HTMLElement,style:n.getAttribute('style')})),active:false,started:false};});
 }
 private mount(){
  const layer=this.layer=document.createElement('div');layer.className='native-draw-layer mana-draw-layer';layer.setAttribute('aria-hidden','true');layer.style.cssText='position:fixed;inset:0;z-index:126;pointer-events:none;overflow:visible';document.body.append(layer);
  const canvas=this.canvas=document.createElement('canvas'),ratio=Math.min(devicePixelRatio,2);canvas.width=innerWidth*ratio;canvas.height=innerHeight*ratio;canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';canvas.getContext('2d')!.setTransform(ratio,0,0,ratio,0,0);layer.append(canvas);
  for(const s of this.slots){
   const n=s.node;s.active=true;n.dataset.manaDraw='true';n.dataset.incoming=String(s.index>=0);
   n.style.setProperty('transition','none','important');n.style.pointerEvents='none';if(s.index>=0)n.classList.add('native-draw-card');
   if(s.index>=0&&!this.opponent){
    n.classList.remove('is-dim','is-exhausted','is-playable','is-buyable','has-play-condition');
    const back=s.back=document.createElement('div');back.className='draw-stock-back';back.style.cssText=`position:absolute;inset:0;border-radius:0;background:url("${this.sleeve}") center/100% 100%;transform:translateZ(${-s.w*DRAW_THICKNESS_RATIO}px) rotateY(180deg);pointer-events:none`;n.append(back);s.finish=decorateDrawBack(back,this.sleeve);
   }
  }
  this.mounted=true;
 }
 private pose(s:Slot,t:number){
  if(t>=1)return s.to;
  const p=drawMotion(Math.max(0,t),!this.opponent),k=p.travel,o=this.origin,end=s.to.transformPoint(new DOMPoint(s.w/2,s.h/2)),sign=this.opponent?1:-1;
  const angle=Math.atan2(s.to.b,s.to.a)*180/Math.PI;
  const sx=mix(o.w/s.w,Math.hypot(s.to.a,s.to.b),k),sy=mix(o.h/s.h,Math.hypot(s.to.c,s.to.d),k);
  // One smooth arc and a single rigid turn. Its endpoints use the exact native fan.
  const lift=Math.min(innerHeight*.17,105)*p.lift;
  const x=mix(o.x,end.x,k)+sign*o.w*.11*p.peel,y=mix(o.y,end.y,k)-lift;
  const size=1+(this.opponent?.12:.32)*p.lift;
  const plane=new DOMMatrix().translate(x,y).rotate(0,0,angle*k+sign*7*p.bank).rotate(p.pitch,this.opponent?0:180*(1-p.reveal),0).scale(sx*size,sy*size,1).translate(-s.w/2,-s.h/2);
  // Project the rigid turn onto the native hand's affine plane. Keeping the print
  // on this same compositor path avoids a 3D-to-2D raster-density change at rest.
  const projected=new DOMMatrix([plane.a,plane.b,plane.c,plane.d,plane.e,plane.f]);
  // The opponent fan also contains the table's shear on narrow screens. Blend
  // into that full matrix, rather than approximating it with angle and scale.
  return affine(projected,s.to,drawSmooth(.78,.98,t));
 }
 private wake(s:Slot,t:number,ctx:CanvasRenderingContext2D){
  const strength=drawSmooth(.02,.18,t)*(1-drawSmooth(.78,1,t));if(strength<=0)return;
  // Two narrow wakes originate at the moving printed edge; history follows the
  // actual curve. Smooth density falloff replaces the old opaque ribbon/splinters.
  const samples=28,tail=DRAW_WAKE/DRAW_FLIGHT;
  for(const edge of[-.34,.34]){
   const points:Array<{x:number;y:number;q:number}>=[];
   for(let j=0;j<=samples;j++){
    const q=j/samples,age=(1-q)*tail,at=Math.max(0,t-age),m=this.pose(s,at),p=m.transformPoint(new DOMPoint(s.w*.92,s.h*(.5+edge)));
    const spread=(1-q)*s.w*.032*Math.sin(q*8+t*6+edge*4);
    points.push({x:p.x/p.w+spread,y:p.y/p.w+spread*.6,q});
   }
   ctx.save();
   for(const p of points){const r=Math.max(3,s.w*Math.hypot(s.to.a,s.to.b)*(.15+.12*(1-p.q)));ctx.globalAlpha=strength*p.q*.36;ctx.drawImage(this.sprite,p.x-r,p.y-r,r*2,r*2);}
   ctx.lineCap='round';ctx.lineJoin='round';
   for(const [width,alpha,color] of [[7,.065,'32,112,235'],[2.4,.11,'69,169,255'],[.65,.30,'207,240,255']] as const){
    ctx.lineWidth=width;for(let j=1;j<points.length;j++){const a=points[j-1],b=points[j];ctx.globalAlpha=strength*b.q*b.q*alpha;ctx.strokeStyle=`rgb(${color})`;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
   }
   ctx.restore();
  }
 }
 render(time:number){
  if(!this.slots.length)return;
  const end=DRAW_FLIGHT+(this.count-1)*DRAW_GAP;
  if(time>=end){this.release(true);return;}
  if(this.mounted&&this.slots.some(s=>!s.active&&time<(s.index<0?DRAW_FLIGHT*.86:DRAW_FLIGHT+s.index*DRAW_GAP)))this.release();
  if(!this.mounted)this.mount();
  const ctx=this.canvas!.getContext('2d')!;ctx.clearRect(0,0,innerWidth,innerHeight);
  const opening=drawSmooth(.06,.86,time/DRAW_FLIGHT);
  for(const s of this.slots){
   const t=(time-s.index*DRAW_GAP)/DRAW_FLIGHT,n=s.node;
   if(s.index<0){if(opening>=1)this.restoreSlot(s);else n.style.setProperty('transform',s.transform(affine(s.from,s.to,opening)),'important');continue;}
   if(t>=1){this.restoreSlot(s,true);continue;}
   n.style.visibility=t<0?'hidden':'visible';n.dataset.progress=String(Math.max(0,Math.min(1,t)));
   n.style.setProperty('transform',s.transform(this.pose(s,t)),'important');
   if(s.back){
    const face=drawMotion(Math.max(0,t),true).reveal>=.5;
    s.back.style.visibility=face?'hidden':t<0?'hidden':'visible';
    for(const layer of s.layers)layer.node.style.visibility=face&&!layer.node.classList.contains('hand-condition-effect')?'': 'hidden';
   }
   if(t>=.06/1.38&&!s.started){s.started=true;this.onStart?.();}
   s.finish?.(time*1000,Math.atan2(s.to.b,s.to.a)*180/Math.PI);
   if(t>=0)this.wake(s,t,ctx);
  }
  // Keep the blue light outside the printed face, including face-down sleeves.
  ctx.save();ctx.globalCompositeOperation='destination-out';ctx.fillStyle='#000';
  for(const s of this.slots){
   const t=(time-s.index*DRAW_GAP)/DRAW_FLIGHT;if(s.index>=0&&t<0)continue;
   const m=s.index<0?affine(s.from,s.to,opening):this.pose(s,t);
   ctx.beginPath();for(const [i,[x,y]] of [[-.045,-.045],[1.045,-.045],[1.045,1.045],[-.045,1.045]].entries()){
    const p=m.transformPoint(new DOMPoint(x*s.w,y*s.h));if(i)ctx.lineTo(p.x/p.w,p.y/p.w);else ctx.moveTo(p.x/p.w,p.y/p.w);
   }ctx.closePath();ctx.fill();
  }ctx.restore();

 }
 private restoreSlot(s:Slot,landed=false){
  if(!s.active)return;
  s.back?.remove();s.back=undefined;s.finish=undefined;s.node.className=s.className;
  for(const l of s.layers){if(l.style===null)l.node.removeAttribute('style');else l.node.setAttribute('style',l.style);}
  // Disable interpolation while restoring the CSS fan, then restore its transitions.
  if(s.style===null)s.node.removeAttribute('style');else s.node.setAttribute('style',s.style);
  const transition=s.node.style.getPropertyValue('transition'),priority=s.node.style.getPropertyPriority('transition');
  s.node.style.setProperty('transition','none','important');void s.node.offsetWidth;
  if(transition)s.node.style.setProperty('transition',transition,priority);else s.node.style.removeProperty('transition');
  delete s.node.dataset.manaDraw;delete s.node.dataset.incoming;delete s.node.dataset.progress;s.active=false;if(landed&&s.index>=0)this.onLand?.(s.node);
 }
 private release(landed=false){
  if(!this.mounted)return;
  for(const s of this.slots)this.restoreSlot(s,landed);
  this.layer?.remove();this.layer=undefined;this.canvas=undefined;this.mounted=false;
 }
 info(){return {count:this.count,mounted:this.mounted,flight:DRAW_FLIGHT,stagger:DRAW_GAP,arrivals:this.slots.filter(s=>s.index>=0).map(s=>({uid:s.node.dataset.uid??'opponent',progress:Number(s.node.dataset.progress??1)}))};}

 dispose(){this.release();this.slots=[];}
}

/** Exile: the raised card itself becomes a vortex, disappears and immediately streams into the Rift. */
export type Point={x:number;y:number};
export const RIFT_DURATION=1800;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(a:number,b:number,t:number)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q);};
export function riftState(ms:number){
 const suction=smooth(780,1280,ms),travel=clamp((ms-1280)/380)**1.5;
 return {lift:smooth(0,360,ms),shroud:smooth(240,640,ms),suction,travel,
  trail:smooth(1280,1300,ms)*(1-smooth(1660,1770,ms)),arrival:smooth(1640,1680,ms)*(1-smooth(1680,1800,ms)),
  phase:ms<360?'浮上':ms<780?'黒紫の被覆':ms<1280?'カードの渦化':ms<1660?'リフトへの軌跡':'到着'};
}
export type RiftState=ReturnType<typeof riftState>;
/** Keep upper-edge hand cards and their vortex inside the viewport. */
export const riftLift=(source:Point,width:number)=>{const u=Math.max(32,Math.min(width,180));return Math.min(u*.16,Math.max(0,source.y-u*.85));};
export function riftCardPoint(p:Point,source:Point,width:number,state:RiftState):Point{
 const scale=1-state.lift*.48,angle=-state.lift*.045,lift=riftLift(source,width)*state.lift;
 const dx=(p.x-source.x)*scale,dy=(p.y-source.y)*scale;
 const raised={x:source.x+dx*Math.cos(angle)-dy*Math.sin(angle),y:source.y+dx*Math.sin(angle)+dy*Math.cos(angle)-lift};
 return collapsePoint(raised,{x:source.x,y:source.y-lift},state.suction,width);
}
/** A rounded, differentially rotating surface: the card IS the vortex, with no second aperture. */
export function collapsePoint(p:Point,center:Point,suction:number,width:number):Point{
 if(suction<=0)return {...p};if(suction>=1)return {...center};
 const dx=p.x-center.x,dy=p.y-center.y,r=Math.hypot(dx,dy);if(r<1e-8)return {...center};
 const limit=Math.max(1,width)*.47,round=smooth(0,.42,suction);
 const rounded=limit*(1-Math.exp(-r/limit*1.7));
 const radius=(r+(Math.min(r,rounded)-r)*round)*(1-smooth(.48,1,suction))**.66;
 // Inner material winds ahead of the rim, curling the rectangular corners into a spiral.
 const inner=1-clamp(r/(Math.max(1,width)*.95));
 const angle=Math.atan2(dy,dx)+suction*3.8+5.6*suction*inner**1.25;
 return {x:center.x+Math.cos(angle)*radius,y:center.y+Math.sin(angle)*radius};
}
export function riftTrailPosition(source:Point,sink:Point,travel:number):Point{
 const q=clamp(travel),arc=Math.min(44,Math.hypot(sink.x-source.x,sink.y-source.y)*.1);
 return {x:source.x+(sink.x-source.x)*q,y:source.y+(sink.y-source.y)*q-Math.sin(Math.PI*q)*arc};
}
type C=CanvasRenderingContext2D;
function shape(c:C,pts:number[][],color:string){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();}
function crescent(c:C,r:number,turn:number,width:number,color:string){
 const a:number[][]=[],b:number[][]=[];for(let i=0;i<=28;i++){const q=i/28,t=turn+q*Math.PI*1.25,w=Math.sin(Math.PI*q)*width;
 a.push([Math.cos(t)*(r+w),Math.sin(t)*(r+w)*.65]);b.unshift([Math.cos(t)*r,Math.sin(t)*r*.65]);}shape(c,[...a,...b],color);
}
/** A filled tapered stroke, aligned to the path normal; no solid travelling object. */
function ribbon(c:C,origin:Point,sink:Point,from:number,to:number,width:number,color:string){
 if(to-from<.0001)return;
 const front:number[][]=[],back:number[][]=[];
 for(let i=0;i<=20;i++){
  const q=i/20,t=from+(to-from)*q,p=riftTrailPosition(origin,sink,t);
  const before=riftTrailPosition(origin,sink,Math.max(0,t-.001)),after=riftTrailPosition(origin,sink,Math.min(1,t+.001));
  const dx=after.x-before.x,dy=after.y-before.y,len=Math.hypot(dx,dy)||1;
  const w=width*Math.sin(Math.PI*q)**.8*(.4+.6*q);
  front.push([p.x-dy/len*w,p.y+dx/len*w]);back.unshift([p.x+dy/len*w,p.y-dx/len*w]);
 }
 shape(c,[...front,...back],color);
}
/** The deformed card supplies the whole vortex silhouette. Its residue departs immediately as a short Toon streak. */
export function drawRiftTransmute(c:C,source:Point,sink:Point,width:number,ms:number,paintCard:(suction:number)=>void){
 const s=riftState(ms),u=Math.max(32,Math.min(width,180));
 c.save();
 // A grounded shadow makes the initial rigid lift visible before any magic covers the face.
 if(s.suction<1){c.save();c.globalAlpha=.23*s.lift*(1-s.suction);c.fillStyle='#20162e';c.shadowColor='#22132f';c.shadowBlur=u*.12;c.beginPath();c.ellipse(source.x,source.y+u*.35,u*(.39+.12*s.lift),u*.12,0,0,Math.PI*2);c.fill();c.restore();}
 paintCard(s.suction);
 if(s.trail>0){
  const origin={x:source.x,y:source.y-riftLift(source,width)},distance=Math.hypot(sink.x-origin.x,sink.y-origin.y);
  const length=Math.min(80,Math.max(26,u*.92))/Math.max(1,distance);
  const from=Math.max(0,s.travel-length*(1-smooth(1660,1770,ms)));
  const thickness=Math.max(1.8,Math.min(5,u*.058));c.globalAlpha=s.trail;
  ribbon(c,origin,sink,from,s.travel,thickness,'#291637');
  ribbon(c,origin,sink,from+(s.travel-from)*.10,s.travel,thickness*.56,'#9b74be');
  ribbon(c,origin,sink,from+(s.travel-from)*.40,s.travel,thickness*.16,'#ddc8ed');
  // A detached tapered remnant follows briefly, then contracts into nothing.
  const end=Math.max(0,from-length*.08),start=Math.max(0,end-length*.23);
  c.globalAlpha=s.trail*.45;ribbon(c,origin,sink,start,end,thickness*.34,'#83569f');
 }
 if(s.arrival>0){
  c.globalAlpha=s.arrival;c.save();c.translate(sink.x,sink.y);const r=u*(.12+.22*smooth(1650,1800,ms));
  crescent(c,r,-.8,u*.035*(1-smooth(1680,1800,ms)),'#cdb2ef');crescent(c,r,Math.PI-.8,u*.025*(1-smooth(1680,1800,ms)),'#84619f');c.restore();
 }
 c.restore();
}

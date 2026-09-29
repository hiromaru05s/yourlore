import {pose,isBuff,strikeTime,strikeMs,duration,clamp,ease,out,pulse,vi,contactTime,asRect,type Kind,type Variant,type Rect} from './catalogBase';
import {attackPlan,drawAttackVisual} from '../attackVisual';
import {drawToonPlay} from '../toonPlayVisual';
import {placement,corners} from './actor';
type C=CanvasRenderingContext2D;
type Options={active:boolean;reduced:boolean;side:number;crowded?:boolean;destination?:Rect;pass?:'rear'|'front'};
const noise=(n:number)=>{const x=Math.sin(n*127.1+74.7)*43758.5453;return x-Math.floor(x);};
const poly=(c:C,p:number[][],fill:string|CanvasGradient)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();};
// One authored contact sheet. Its broad body opens, splits and narrows;
// the outer contour, body and white-hot spine share geometry and time.
function tear(c:C,length:number,width:number,q:number,color:string,seed:number){
 if(q<0||q>=1)return;
 const open=ease(.08,.48,q),shrink=1-ease(.42,1,q),bend=(noise(seed)-.5)*width*.9;
 const root=length*open*.76,tip=length*(.26+.74*out(q/.38));
 c.save();c.globalAlpha*=1-ease(.82,1,q);
 const shape=(scale:number,fill:string|CanvasGradient)=>{
  c.beginPath();c.moveTo(root,bend*open);
  c.bezierCurveTo(root+length*.12,-width*.40*scale*shrink,tip*.66,-width*.10*scale*shrink,tip,-width*.38*shrink+bend);
  c.lineTo(tip*.69,bend-width*.015*shrink);c.lineTo(tip*.83,bend+width*.025*shrink);
  c.bezierCurveTo(tip*.64,width*.18*scale*shrink,root+length*.17,width*.28*scale*shrink,root,bend*open);
  c.fillStyle=fill;c.fill();
 };
 shape(1.07,'#826447');shape(1,color);shape(.40,'#fff9df');
 if(q>.32){c.translate(tip*.89,bend);c.rotate(-.28);poly(c,[[0,0],[width*.39*shrink,-width*.14*shrink],[width*.21*shrink,width*.09*shrink]],color);}
 c.restore();
}
// Closed cloud lobes turn into open hooked wisps using an even-odd inner cut.
// No soft particle sprites: the contour changes as each cloud is advected.
function cloud(c:C,x:number,y:number,size:number,q:number,seed:number){
 if(q<=0||q>=1||size<.2)return;
 const grow=.32+.68*out(q/.42),erode=ease(.21,.91,q),points=52;
 c.save();c.translate(x,y);c.scale(size*grow,size*grow*.62);c.rotate((noise(seed)-.5)*.4);c.globalAlpha*=1-ease(.78,1,q);
 const path=(scale:number,dy:number)=>{
  c.beginPath();for(let j=0;j<=points;j++){const a=j/points*Math.PI*2,r=scale*(1+.16*Math.sin(5*a+seed)+.07*Math.sin(9*a+q*4));const px=Math.cos(a)*r,py=Math.sin(a)*r+dy;j?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();
  if(erode>0){for(let j=0;j<=points;j++){const a=-j/points*Math.PI*2,r=erode*(1.31+.18*Math.sin(a*4+seed));const px=Math.cos(a)*r-.20*erode,py=Math.sin(a)*r+.23*erode;j?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();}
 };
 path(1.04,.05);c.fillStyle='#615c54';c.fill('evenodd');
 path(.98,0);const g=c.createLinearGradient(0,-1,0,1);g.addColorStop(0,'#e3e0cc');g.addColorStop(.52,'#b9b9ad');g.addColorStop(.54,'#899396');g.addColorStop(1,'#707c80');c.fillStyle=g;c.fill('evenodd');
 c.restore();
}
export function chevron(c:C,x:number,y:number,size:number,q:number,red:boolean,rotation=0){
 if(q<0||q>=1)return;
 const grow=.7+.3*out(q/.18),fade=1-ease(.54,1,q),cut=ease(.58,.97,q);c.save();c.translate(x,y);c.rotate(rotation);c.scale(size*grow,size*grow);c.globalAlpha*=fade;
 const g=c.createLinearGradient(0,-.40,0,.32);g.addColorStop(0,red?'#fff0df':'#e4fdff');g.addColorStop(.35,red?'#ffb29e':'#9de8ff');g.addColorStop(.4,red?'#ed6c66':'#50b8ef');g.addColorStop(1,red?'#a42e43':'#2878b5');
 const p=[[-.5+cut*.20,.20-cut*.05],[0,-.30],[.5-cut*.20,.20-cut*.05],[.34,.34],[0,-.015],[-.34,.34]];
 c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=g;c.fill();
 // Highlight only the leading bevel, never a vertical shaft.
 poly(c,[[-.48+cut*.20,.20],[0,-.30],[.48-cut*.20,.20],[0,-.19]],red?'#ffcebd':'#bceeff');
 c.restore();
}
// Card-coordinate light uses the actual projected face. Rear and front passes share the same projected card coordinates.
function cardSpace(c:C,r:Rect,p:ReturnType<typeof pose>){
 const m=placement(r,p.x,p.y,p.angle,p.scale,p.z,p.rock),q=corners(m,r.w,r.h);
 c.transform((q[1][0]-q[0][0])/r.w,(q[1][1]-q[0][1])/r.w,(q[3][0]-q[0][0])/r.h,(q[3][1]-q[0][1])/r.h,q[0][0],q[0][1]);
}
export function drawEffect(c:C,k:Kind,v:Variant,t:number,r:Rect,target:Rect,o:Options){
 if(k==='blocked')return;
 if(!['aura','ready'].includes(k)&&(t<=0||t>=1||o.reduced))return;
 const idx=vi(v),u=r.w,p=pose(k,v,t,r,target,o.reduced,o.active,o.side);
 c.save();
 if(o.pass==='rear'){
  if(k==='summon'){
   cardSpace(c,r,{...p,x:r.x,y:r.y,z:0,rock:0,scale:1});
   const a=1-clamp(p.z/u);c.globalAlpha=.08+.20*a;c.fillStyle='#07121b';c.shadowColor='#07121b';c.shadowBlur=u*(.13-.10*a);c.fillRect(u*.03,r.h*.02,u*.94,r.h*.96);
  }else if(k==='trigger'||isBuff(k)){
   cardSpace(c,r,{...p,x:r.x,y:r.y,scale:1,z:0,rock:0});c.globalAlpha=.13*p.edge;c.fillStyle='#04121a';c.shadowColor='#06171f';c.shadowBlur=u*.07;c.fillRect(0,0,u,r.h);
  }
  c.restore();return;
 }
 if(k==='summon'){
  const hit=contactTime(k,v),q=(t-hit)/(1-hit);
  // The receiver is the whole card footprint, never its upright bottom edge.
  const groundPose={...p,x:r.x,y:r.y,z:0,rock:0,scale:1};cardSpace(c,r,groundPose);
  if(q>=0&&q<1){
   for(const side of [-1,1])for(let j=0;j<3;j++){c.save();c.translate(u*.5,r.h*(.18+j*.32));c.scale(side,1);c.rotate((j-1)*.14);tear(c,u*(v==='B'?1.08:.86),u*(v==='B'?.22:.14),q*1.8-j*.045,'#f4dfa7',j+idx);c.restore();}
   for(let i=0;i<8;i++){const sign=i%2?1:-1,age=clamp((q-(i%3)*.035)/.88);cloud(c,u*.5+sign*u*(.50+.22*out(age)),r.h*(.08+Math.floor(i/2)*.27+(noise(i+12)-.5)*.11),u*(v==='B'?.19:.13),age,i+7);}
  }
 }
 if(k==='attack'&&t*duration(k,v)<strikeMs(v)){
  const at=strikeTime(v,t),plan=attackPlan(asRect(r),asRect(target)),hit=contactTime(k,v),launch=v==='A'?180/880:v==='B'?.28:.17;
  if(at>launch&&at<hit+.06){const a=pulse(launch,launch+.04,hit,hit+.06,at);for(const sign of [-1,1]){c.save();c.translate(p.x-plan.ny*u*.48*sign,p.y+plan.nx*u*.48*sign);c.rotate(Math.atan2(-plan.ny,-plan.nx));c.globalAlpha=a;const len=u*(v==='C'?1.7:1.25)*ease(launch,hit,at);poly(c,[[0,-u*.035],[len,-u*.08],[len*.79,0],[0,u*.032]],'#52758d');poly(c,[[0,-u*.015],[len,-u*.065],[len*.60,0],[0,u*.02]],'#eff5ee');c.restore();}}
  const q=(at-hit)/(v==='B'?.51:.56);
  if(q>=0&&q<1){
   c.save();c.translate(plan.contact.x-plan.nx*u*.065,plan.contact.y-plan.ny*u*.065);
   if(o.crowded)c.scale(1,.42);c.rotate(Math.atan2(plan.ny,plan.nx));
   for(const sign of [-1,1])for(let j=0;j<(v==='B'?4:3);j++){c.save();c.rotate(sign*(.90+j*.39)+(v==='C'?-.16:0)+(sign===1?.09:-.06));tear(c,u*[1.50,1.72,1.56][idx]*(1-j*.12),u*[.34,.49,.27][idx],q-j*.02,'#f3d28b',j+idx*7);c.restore();}
   if(v==='C')for(const sign of [-1,1]){c.save();c.rotate(sign*1.47+.10);tear(c,u*1.7,u*.16,q-.13,'#e8f5ff',25);c.restore();}
   c.restore();
   if(o.crowded){
    // A high-contrast contact sheet fits the real gap between monster and market.
    // Its thickness is authored in screen pixels, so it survives mobile scaling.
    c.save();c.translate(plan.contact.x,plan.contact.y-plan.ny*Math.max(4,u*.065));
    const shrink=1-ease(.28,1,q),reach=u*(.70+out(q/.32)*.95),thick=Math.max(3.4,u*.056)*(v==='B'?1.14:1)*shrink;
    for(const sign of [-1,1]){c.save();c.scale(sign,1);const x=u*(.16+ease(.15,.75,q)*.28);
     const pts=[[x,-thick*.35],[reach*.50,-thick],[reach,-thick*.42],[reach*.72,0],[reach*.96,thick*.46],[reach*.45,thick*.65],[x,thick*.28]];
     poly(c,pts,'#624429');c.save();c.scale(1,.61);poly(c,pts,'#e9b856');c.scale(.90,.48);poly(c,pts,'#fff7d8');c.restore();c.restore();
    }
    c.restore();
   }
  }
 }
 if(k==='trigger'||isBuff(k)){
  cardSpace(c,r,p);const strength=p.edge*(o.crowded?1.2:1),blue=isBuff(k),color=blue?'#b5edff':'#fff2cb';
  if(strength>0){
   c.lineWidth=Math.max(1.2,u*.023)*strength;c.strokeStyle=blue?'#2c94d0':'#ab8b59';c.beginPath();c.roundRect(-u*.02,-r.h*.012,u*1.04,r.h*1.024,u*.065);c.stroke();
   const sweep=(t*1.7)%1;c.strokeStyle=color;c.lineWidth=Math.max(1,u*.012);
   for(const sign of [-1,1]){const x=sign===1?u*1.024:-u*.024,y=r.h*(1-sweep);c.globalAlpha=strength;c.beginPath();c.moveTo(x,y+r.h*.12);c.lineTo(x,y);c.stroke();}
  }
  if(k==='trigger'){
   const start=v==='B'?.34:.27,q=(t-start)/.53;
   for(const sign of [-1,1]){c.save();c.translate(u*.5,sign===1?r.h:0);c.rotate(sign===1?Math.PI/2:-Math.PI/2);c.scale(1,o.crowded?.72:1);tear(c,u*(v==='B'?.52:.38),u*.13,q,'#f7e5b4',idx);if(v==='B')tear(c,u*.60,u*.07,q-.12,'#f5f6de',12);c.restore();}
  }else{
   // Subdued outside reflection; chevrons are drawn ONLY in Actor.surface.
   const q=(t-.32)/.50;for(const sign of [-1,1]){c.save();c.translate(sign===1?u:0,r.h*.46);c.scale(sign,1);tear(c,u*.22,u*.065,q,'#90dcff',idx);c.restore();}
  }
 }
 if(k==='aura'&&o.active){
  cardSpace(c,r,p);const breath=o.reduced?1:.84+.16*Math.sin(t*Math.PI*2),weight=Math.max(2.3,u*.034);
  c.lineJoin='round';c.strokeStyle='#103f4e';c.lineWidth=weight+1.7;c.beginPath();c.roundRect(-2,-2,u+4,r.h+4,u*.07);c.stroke();
  c.strokeStyle='#72f2d8';c.lineWidth=weight;c.globalAlpha=breath;
  if(v==='A'){c.beginPath();c.roundRect(-2,-2,u+4,r.h+4,u*.07);c.stroke();c.strokeStyle='#e0fff4';c.lineWidth=1;c.beginPath();c.roundRect(-3,-3,u+6,r.h+6,u*.07);c.stroke();}
  if(v==='B')for(const sx of [-1,1])for(const sy of [-1,1]){const x=sx===1?u+2:-2,y=sy===1?r.h+2:-2;c.beginPath();c.moveTo(x-sx*u*.24,y);c.lineTo(x,y);c.lineTo(x,y-sy*r.h*.21);c.stroke();}
  if(v==='C')for(const sign of [-1,1]){const x=sign===1?u+2:-2;c.beginPath();c.moveTo(x,r.h*.08);c.lineTo(x,r.h*.92);c.stroke();c.strokeStyle='#e8fff4';c.lineWidth=1.8;const y=r.h*(.82-.64*(o.reduced?.5:t));c.beginPath();c.moveTo(x,y);c.lineTo(x,y+r.h*.11);c.stroke();c.strokeStyle='#72f2d8';c.lineWidth=weight;}
 }
 if(k==='ready'){
  const b=o.reduced?.5:.5+.5*Math.sin(t*Math.PI*2-Math.PI/2),y=p.y-o.side*r.h*.55;
  for(let i=0;i<(v==='B'?2:1);i++){const a=v==='B'?(i?b:1-b):.7+.3*b;c.save();c.globalAlpha=.48+.52*a;chevron(c,r.x,y-o.side*u*(.018+i*.11+.04*b),u*(v==='B'?.30:.39),.26,false,o.side<0?Math.PI:0);c.restore();}
 }
 if(k==='destroy'&&v==='B'&&o.destination&&t>.25&&t<.99){
  const d=o.destination,q=ease(.20,.91,t);for(let j=0;j<7;j++){const lag=.06+(j%3)*.025,start=Math.max(0,q-lag),end=q,sign=j%2?1:-1,curve=u*(.20+j%3*.07);const a:number[][]=[],b:number[][]=[];
   for(let i=0;i<=20;i++){const f=start+(end-start)*i/20,x=r.x+(d.x-r.x)*f+sign*u*.15*(1-f),y=r.y+(d.y-r.y)*f-Math.sin(f*Math.PI)*curve,w=u*.024*Math.sin(i/20*Math.PI)*(1-ease(.72,.99,t));a.push([x-w,y]);b.unshift([x+w,y]);}
   poly(c,[...a,...b],j%2?'#b58ddc':'#402e62');
  }
 }
 c.restore();
}
export function drawBaseline(c:C,k:Kind,ms:number,r:Rect,target:Rect){
 if(k==='attack')drawAttackVisual(c,asRect(r),asRect(target),ms/1000);
 if(k==='summon'){if(ms<960)drawToonPlay(c,'summon-charge',asRect(r),ms/1000);else drawToonPlay(c,'summon-impact',asRect(r),(ms-960)/1000);}
}

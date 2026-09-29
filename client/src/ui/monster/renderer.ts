import {drawEffect as approvedEffect,chevron} from './rendererBase';
import type {Kind as OldKind,Variant as OldVariant} from './catalogBase';
import {pose,approved,isDebuff,statKind,attackTiming,duration,strikeMs,vi,clamp,ease,out,asRect,type Kind,type Variant,type Rect} from './catalog';
import {attackPlan} from '../attackVisual';
import {placement,corners} from './actor';
export {chevron};
type C=CanvasRenderingContext2D;type Options={active:boolean;reduced:boolean;side:number;crowded?:boolean;destination?:Rect;pass?:'rear'|'front'};
function polygon(c:C,p:number[][],color:string){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();}
function face(c:C,r:Rect,p:ReturnType<typeof pose>){const m=placement(r,p.x,p.y,p.angle,p.scale,p.z,p.rock),q=corners(m,r.w,r.h);c.transform((q[1][0]-q[0][0])/r.w,(q[1][1]-q[0][1])/r.w,(q[3][0]-q[0][0])/r.h,(q[3][1]-q[0][1])/r.h,q[0][0],q[0][1]);}
function sliver(c:C,length:number,width:number,age:number,color:string){
 if(age<0||age>=1)return;const a=out(age/.28),b=1-ease(.15,1,age),x=length*(.2+.8*a),tail=length*ease(.20,.85,age);c.globalAlpha*=1-ease(.55,1,age);
 c.beginPath();c.moveTo(tail,0);c.bezierCurveTo(x*.5,-width*b,x*.85,-width*.7*b,x,0);c.bezierCurveTo(x*.64,width*.06*b,x*.42,width*.25*b,tail,0);c.fillStyle=color;c.fill();
}
export function drawEffect(c:C,k:Kind,v:Variant,t:number,r:Rect,target:Rect,o:Options){
 if(approved(k)||k==='ready'){approvedEffect(c,k as OldKind,v as OldVariant,t,r,target,o);return;}
 if(k==='aura'||o.reduced)return;
 const p=pose(k,v,t,r,target,false,o.active,o.side),u=r.w,ms=t*duration(k,v);
 c.save();
 if(o.pass==='rear'){
  if(k==='summon'&&t<1){c.save();face(c,r,{...p,x:r.x,y:r.y,scale:1,z:0,rock:0});const near=1-clamp(p.z/(u*.75));c.globalAlpha=.06+.18*near;c.fillStyle='#182027';c.shadowColor='#182027';c.shadowBlur=u*(.09-.065*near);c.beginPath();c.roundRect(u*.04,r.h*.025,u*.92,r.h*.95,u*.055);c.fill();c.restore();}
  if(k==='attack'&&ms<strikeMs(v)){face(c,r,{...p,z:0,rock:0});c.globalAlpha=.18;c.fillStyle='#182027';c.shadowColor='#182027';c.shadowBlur=u*.035;c.beginPath();c.roundRect(2,3,u-4,r.h-6,u*.06);c.fill();}
  if(k==='summon')drawContactDust(c,r,v,t,'rear');
  c.restore();return;
 }
 if(k==='summon')drawContactDust(c,r,v,t,'front');
 // Contact dust follows the settled card plane. Attack A remains unchanged.
 if(k==='attack'&&ms<strikeMs(v)){
  const plan=attackPlan(asRect(r),asRect(target)),timing=attackTiming(v),age=ms-timing.hit;
  if(ms>timing.wind&&ms<timing.hit){const q=(ms-timing.wind)/(timing.hit-timing.wind),a=Math.sin(q*Math.PI);c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(plan.ny,plan.nx));c.globalAlpha=a*.5;
   for(const s of [-1,1]){const offset=u*.47*s;polygon(c,[[-r.h*.20,offset],[-r.h*.20-u*.50*q,offset-u*.013],[-r.h*.20-u*.34*q,offset+u*.014]],'#a9c6d7');}c.restore();}
  if(age>=0&&age<290){
   const q=age/290,grow=out(age/55),fade=1-ease(80,290,age);
   c.save();c.translate(plan.contact.x,plan.contact.y);c.rotate(Math.atan2(plan.ny,plan.nx));
   // One contact focal point. Dark rim -> warm body -> small white core.
   if(age<100){const a=1-ease(38,100,age);c.save();c.globalAlpha=a;
    const rad=u*(.035+.14*grow),pts=[[rad*.85,0],[rad*.2,-rad*.25],[0,-rad],[-rad*.27,-rad*.17],[-rad*.72,0],[-rad*.13,rad*.23],[0,rad*.75],[rad*.16,rad*.17]];
    polygon(c,pts,'#6b4634');c.scale(.80,.80);polygon(c,pts,'#f9d28e');c.scale(.48,.48);polygon(c,pts,'#fffdf0');c.restore();}
   if(v==='A')for(const [rotation,length,width] of [[-.8,.62,.18],[1.15,.46,.10],[-2.0,.27,.08]]){c.save();c.rotate(rotation);sliver(c,u*length,u*width,q,'#b88451');c.scale(.97,.60);sliver(c,u*length,u*width,q,'#fff0cc');c.restore();}
   if(v==='B'){
    // Asymmetric pressure crescent opens around contact, then breaks into two tips.
    const radius=u*(.10+.40*out(q/.45)),thick=u*.105*(1-ease(.15,.9,q));c.globalAlpha=fade;
    for(const sign of [-1,1]){const pts:number[][]=[];for(let i=0;i<=24;i++){const a=-.70+i/24*1.33,rr=radius+thick*Math.sin(i/24*Math.PI);pts.push([Math.cos(a)*rr*.60,sign*Math.sin(a)*rr]);}for(let i=24;i>=0;i--){const a=-.70+i/24*1.33;pts.push([Math.cos(a)*radius*.60,sign*Math.sin(a)*radius]);}polygon(c,pts,'#885738');c.save();c.scale(.92,.96);polygon(c,pts,'#ffe1a4');c.restore();}
    for(const a of [-1.15,1.4]){c.save();c.rotate(a);sliver(c,u*.66,u*.11,q-.08,'#e9bd7d');c.restore();}
   }
   if(v==='C'){c.save();c.rotate(.87);c.translate(-u*.35,0);sliver(c,u*.95,u*.16,q,'#5e7384');c.translate(0,-u*.008);sliver(c,u*.94,u*.065,q,'#f3f8ec');c.restore();}
   c.restore();
  }
 }
 if(isDebuff(k)&&t>.16&&t<.92){face(c,r,p);const a=p.edge,which=statKind(k),positions=which==='both'?[.23,.77]:[which==='atk'?.23:.77];for(const x of positions){const red=x>.5;c.globalAlpha=a*.7;c.strokeStyle=red?'#b66378':'#517cba';c.lineWidth=Math.max(1,u*.016);c.beginPath();c.moveTo(u*x-u*.095,r.h*.93);c.lineTo(u*x+u*.095,r.h*.93);c.stroke();}}
 c.restore();
}

/** Same silhouette drop-shadow mechanism as attackerPulse, with a quieter green palette. */
export function ongoingFilter(v:Variant,t:number,reduced:boolean){
 const profiles=[
  {rgb:'91,185,124',base:3,spread:4,low:.27,high:.62,cycles:4},
  {rgb:'89,178,118',base:3,spread:5,low:.23,high:.53,cycles:2},
  {rgb:'53,154,102',base:2,spread:3,low:.32,high:.65,cycles:2},
  {rgb:'135,193,112',base:4,spread:5,low:.22,high:.50,cycles:2},
  {rgb:'95,180,127',base:4,spread:2,low:.42,high:.56,cycles:4},
  {rgb:'91,190,132',base:4,spread:4,low:.20,high:.43,cycles:2},
 ];
 const p=profiles[vi(v)],b=reduced?.5:.5-.5*Math.cos(t*Math.PI*2*p.cycles);
 return `drop-shadow(0 2px 4px #0009)${v==='F'?' drop-shadow(0 0 1.15px rgba(87,190,123,.55))':''} drop-shadow(0 0 ${p.base+p.spread*b}px rgba(${p.rgb},${p.low+(p.high-p.low)*b}))`;
}
const dustProfiles=[
 {count:8,size:.14,spread:.22,life:570,delay:20,flatten:.60,alpha:.50,grains:9},
 {count:10,size:.125,spread:.34,life:540,delay:35,flatten:.52,alpha:.56,grains:15},
 {count:12,size:.074,spread:.28,life:450,delay:55,flatten:.75,alpha:.58,grains:29},
 {count:8,size:.19,spread:.25,life:660,delay:25,flatten:.64,alpha:.51,grains:11},
 {count:12,size:.125,spread:.27,life:680,delay:125,flatten:.57,alpha:.47,grains:17},
];
const noise=(n:number)=>{const a=Math.sin(n*127.1+311.7)*43758.5453;return a-Math.floor(a);};
/** Lobed body grows, rolls outward, then opens into a crescent and breaks apart. */
function dustBody(c:C,age:number,seed:number){
 c.save();
 const points=38,radius=(.2+.8*out(age/.34))*(1-.48*ease(.45,1,age));
 c.beginPath();for(let j=0;j<=points;j++){const a=j/points*Math.PI*2,rr=radius*(1+.17*Math.sin(a*5+seed)+.07*Math.sin(a*8-seed));const x=Math.cos(a)*rr,y=Math.sin(a)*rr;if(j===0)c.moveTo(x,y);else c.lineTo(x,y);}c.closePath();c.clip();
 // An expanding hole opens through the inward edge; the remaining material narrows.
 if(age>.30){const hole=ease(.30,.96,age)*1.32;c.moveTo(-.46+hole,0);c.ellipse(-.46,0,hole,hole*.84,0,0,Math.PI*2);}
 c.fill('evenodd');c.restore();
}
export function drawContactDust(c:C,r:Rect,v:Variant,t:number,pass:'rear'|'front'){
 const elapsed=t*1500-506;if(elapsed<0)return;const cfg=dustProfiles[vi(v)],u=r.w;
 c.save();face(c,r,{x:r.x,y:r.y,angle:0,scale:1,reveal:1,brightness:1,saturation:1,edge:0,z:0,rock:0});
 // Rear and near-side material remain within the shared foreground animation root.
 for(let i=0;i<cfg.count;i++){
  let edge=i%4; if(v==='B')edge=i%2; // B pushes primarily sideways.
  const sideNoise=noise(i+19),along=.16+.68*sideNoise;
  const nx=edge===0?-1:edge===1?1:0,ny=edge===2?-1:edge===3?1:0;
  if((edge===3?'front':'rear')!==pass)continue;
  const age=(elapsed-cfg.delay*noise(i+44)-(v==='E'&&i>=8?145:0))/cfg.life;if(age<=0||age>=1)continue;
  const drift=cfg.spread*out(age/.83),size=u*cfg.size*(.76+.42*noise(i+71));
  const x=(edge===0?0:edge===1?u:u*along)+nx*u*(.025+drift),y=(edge===2?0:edge===3?r.h:r.h*along)+ny*u*(.025+drift);
  c.save();c.translate(x,y);c.rotate(Math.atan2(ny,nx));c.scale(size,size*cfg.flatten);
  c.globalAlpha=cfg.alpha*ease(0,.065,age)*(1-ease(.40,1,age));
  c.fillStyle='#918778';dustBody(c,age,i*.84);
  c.translate(-.07,-.14);c.scale(.94,.81);c.fillStyle='#cdc2ae';dustBody(c,age+.015,i*.84);
  // Shaded curl within the same body, not a separate floating ring.
  if(age<.63){c.globalAlpha*=.24;c.strokeStyle='#eee1c8';c.lineWidth=.08;c.beginPath();c.ellipse(.2,-.18,.47,.36,-.4,-1.8,.35);c.stroke();}
  c.restore();
 }
 // Sparse grains leave the contact edge, rise briefly, and settle onto the plane.
 for(let i=0;i<cfg.grains;i++){
  const edge=i%4;if((edge===3?'front':'rear')!==pass)continue;
  const age=(elapsed-noise(i+111)*65)/(cfg.life*.9);if(age<=0||age>=1)continue;
  const nx=edge===0?-1:edge===1?1:0,ny=edge===2?-1:edge===3?1:0,along=.12+.76*noise(i+92),d=u*(.02+cfg.spread*(.6+noise(i+73))*out(age));
  const x=(edge===0?0:edge===1?u:u*along)+nx*d,y=(edge===2?0:edge===3?r.h:r.h*along)+ny*d-u*.055*Math.sin(age*Math.PI),s=Math.max(.55,u*(.007+.006*noise(i)))*(1-ease(.5,1,age));
  c.globalAlpha=.58*(1-ease(.38,1,age));c.fillStyle=i%3?'#9f8e75':'#dac7a5';c.beginPath();c.moveTo(x-s,y);c.lineTo(x,y-s*.63);c.lineTo(x+s*.72,y);c.lineTo(x,y+s*.48);c.closePath();c.fill();
 }
 c.restore();
}

import {Surface} from './surface';
import {beforeCount,afterCount} from './catalog';
import type {Study} from './catalog';
type C=CanvasRenderingContext2D;type P={x:number;y:number};
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const smooth=(a:number,b:number,v:number)=>{const x=clamp((v-a)/(b-a));return x*x*(3-2*x)};
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const TAU=Math.PI*2;
const load=(src:string)=>new Promise<HTMLImageElement>((ok,fail)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>fail(Error('Asset failed: '+src));i.src=src});
export async function loadAssets(){const [dew,blue,red,card]=await Promise.all(['/art/biblion/modular/dew-ui.webp','/art/seekers/v2/blue-idle.webp','/art/seekers/v2/red-idle.webp','/art/cards/ELF.webp'].map(load));return{dew,blue,red,card}}
export type Assets=Awaited<ReturnType<typeof loadAssets>>;
/** All geometry is local to the real badge. The final frame is the unchanged UI art. */
export class Renderer{
 surface=new Surface();image:CanvasImageSource;
 constructor(public assets:Assets){this.image=assets.dew;}
 dispose(){this.surface.dispose()}
 face(c:C,alpha=1){c.save();c.globalAlpha*=clamp(alpha);c.drawImage(this.image,-100,-100,200,200);c.restore()}
 outline(c:C,inset=1){c.beginPath();c.moveTo(0,-91*inset);c.bezierCurveTo(-20*inset,-51*inset,-73*inset,-15*inset,-70*inset,34*inset);c.bezierCurveTo(-68*inset,110*inset,68*inset,110*inset,70*inset,34*inset);c.bezierCurveTo(73*inset,-15*inset,20*inset,-51*inset,0,-91*inset);c.closePath()}
 inside(c:C){this.outline(c,.80);c.clip()}
 /** A solid refractive bead: deep body, displaced inner light, narrow grazing highlight. */
 bead(c:C,x:number,y:number,rx:number,ry:number,angle=0,opacity=1){if(rx<.05||ry<.05||opacity<=0)return;c.save();c.globalAlpha*=clamp(opacity);c.translate(x,y);c.rotate(angle);c.scale(rx,ry);
  const g=c.createRadialGradient(-.38,-.48,.05,.12,.1,1.16);g.addColorStop(0,'#d7fff0');g.addColorStop(.15,'#73c8b2');g.addColorStop(.29,'#1d796b');g.addColorStop(.58,'#063f40');g.addColorStop(.79,'#032f33');g.addColorStop(.91,'#3b9e8e');g.addColorStop(1,'#b5e7d4');c.fillStyle=g;c.beginPath();c.ellipse(0,0,1,1,0,0,TAU);c.fill();
  c.lineWidth=.026;c.strokeStyle='#a6e5d3';c.stroke();
  c.beginPath();c.ellipse(-.3,-.4,.45,.16,-.6,Math.PI*.75,Math.PI*2);c.strokeStyle='#f0fff2';c.lineWidth=.062;c.stroke();
  c.beginPath();c.ellipse(.20,.28,.64,.42,-.4,.05,2.3);c.strokeStyle='#7fd8ac';c.lineWidth=.032;c.stroke();c.restore();
 }
 /** Wide, twisting liquid sheet. Width and specular edge vary with the surface normal. */
 sheet(c:C,sample:(u:number)=>P,width:number,time:number,opacity=1){if(width<=0||opacity<=0)return;c.save();c.globalAlpha*=clamp(opacity);
  const nodes=Array.from({length:49},(_,j)=>{const u=j/48,p=sample(u),a=sample(Math.max(0,u-.008)),b=sample(Math.min(1,u+.008)),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;return{...p,u,nx:-dy/len,ny:dx/len,w:width*Math.pow(Math.sin(Math.PI*u),.68)*(.24+.76*Math.abs(Math.cos(u*4+time)))}});
  for(let j=0;j<48;j++){const a=nodes[j],b=nodes[j+1];c.beginPath();c.moveTo(a.x-a.nx*a.w,a.y-a.ny*a.w);c.lineTo(b.x-b.nx*b.w,b.y-b.ny*b.w);c.lineTo(b.x+b.nx*b.w,b.y+b.ny*b.w);c.lineTo(a.x+a.nx*a.w,a.y+a.ny*a.w);c.closePath();const g=c.createLinearGradient(a.x-a.nx*(a.w+.1),a.y-a.ny*(a.w+.1),a.x+a.nx*(a.w+.1),a.y+a.ny*(a.w+.1));g.addColorStop(0,'#b4e8d7');g.addColorStop(.09,'#2d8c7f');g.addColorStop(.35,'#064744');g.addColorStop(.61,'#125c55');g.addColorStop(.76,'#94d8bd');g.addColorStop(.85,'#e4fff0');g.addColorStop(.93,'#499b87');g.addColorStop(1,'#123e40');c.fillStyle=g;c.fill();
   const light=.35+.65*Math.pow(Math.max(0,Math.cos(a.u*6-time)),4);c.beginPath();c.moveTo(a.x+a.nx*a.w*.86,a.y+a.ny*a.w*.86);c.lineTo(b.x+b.nx*b.w*.86,b.y+b.ny*b.w*.86);c.lineWidth=.55;c.strokeStyle=`rgba(238,255,230,${light})`;c.stroke();
  }c.restore();
 }
 /** Smooth liquid lens follows the existing art; original gold remains registered. */
 water(c:C,t:number,energy:number){c.save();this.inside(c);const g=c.createLinearGradient(-65,-70,55,90);g.addColorStop(0,'#e1ffdf');g.addColorStop(.12,'#5cbeab');g.addColorStop(.29,'#105b52');g.addColorStop(.6,'#043436');g.addColorStop(.83,'#2a8571');g.addColorStop(1,'#b4e5b5');c.globalAlpha=.65*energy;c.fillStyle=g;c.fillRect(-100,-100,200,200);
  for(let j=0;j<4;j++){c.beginPath();for(let i=0;i<=40;i++){const x=-90+i*4.5,y=-55+j*36+Math.sin(x*.037+t*9+j*.9)*12+Math.cos(x*.059-t*6)*5;i?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle=j%2?'#d9ffcc':'#72e6c2';c.lineWidth=j%2?.65:1.4;c.globalAlpha=energy*(j%2?.44:.23);c.stroke();}c.restore()}
 glint(c:C,t:number,opacity=1){const q=smooth(.64,.94,t);if(q<=0||q>=1)return;c.save();this.outline(c);c.clip();c.globalAlpha=Math.sin(q*Math.PI)*opacity;c.rotate(-.4);const x=-130+270*q,g=c.createLinearGradient(x-15,0,x+15,0);g.addColorStop(0,'#e5ffdd00');g.addColorStop(.44,'#d6f8d433');g.addColorStop(.51,'#ffffffbb');g.addColorStop(.57,'#e5ffdd33');g.addColorStop(1,'#e5ffdd00');c.fillStyle=g;c.fillRect(-200,-200,400,400);c.restore()}
 effect(c:C,s:Study,ms:number,x:number,y:number,size:number,reduced=false){const t=clamp(ms/s.duration),add=s.mode==='add';c.save();c.translate(x,y);c.scale(size/200,size/200);
  if(reduced||t<=0||t>=1){this.image=this.assets.dew;if(add||ms>=s.contact)this.face(c);c.restore();return;}
  const settle=smooth(.72,.98,t),energy=Math.sin(Math.PI*smooth(.10,.98,t));this.image=this.surface.draw(this.assets.dew,1,t*2.5,energy*.8,false);
  // Local contact shadow follows the establishing material, never an unrelated ring.
  const body=add?1:smooth(.22,.7,t);c.save();c.translate(0,88);c.scale(1,.2);const sh=c.createRadialGradient(0,0,1,0,0,78);sh.addColorStop(0,`rgba(0,34,29,${body*.20})`);sh.addColorStop(1,'#00332200');c.fillStyle=sh;c.fillRect(-80,-80,160,160);c.restore();
  if(add)this.face(c);
  if(!add&&s.index===0){
   const merge=smooth(.28,.65,t),growth=smooth(.30,.69,t);c.save();this.outline(c);c.clip();c.beginPath();for(let j=0;j<11;j++){const a=j*2.3999,r=(18+Math.sqrt(j/11)*66)*(1-merge),k=smooth(.18+(j%4)*.035,.60+(j%3)*.028,t),xx=Math.cos(a)*r,yy=18+Math.sin(a)*r;c.moveTo(xx+80*k,yy);c.ellipse(xx,yy,80*k,76*k,0,0,TAU);}c.clip();this.face(c);this.water(c,t,1-settle);c.restore();
   for(let j=0;j<7;j++){const a=j*2.3999,r=(35+j*7)*(1-merge),appear=smooth(.12+j*.012,.28+j*.012,t);this.bead(c,Math.cos(a)*r,Math.sin(a)*r+20, (8+j%3*3)*appear*(1-merge), (10+j%3*3)*appear*(1-merge),a,1-settle);}
   if(growth>.9)this.face(c,smooth(.60,.79,t));
  }
  if(!add&&s.index===1){
   const fall=smooth(.19,.43,t),form=smooth(.43,.69,t),impact=Math.sin(Math.PI*smooth(.43,.59,t));
   if(t<.50){const yy=-100+137*fall;this.bead(c,0,yy,25+impact*21,43-impact*26,0,smooth(.14,.22,t)*(1-smooth(.44,.50,t)));}
   if(t>.40){c.save();c.translate(0,29*(1-form));c.scale(.55+.45*form+impact*.18,.33+.67*form-impact*.12);this.face(c,smooth(.40,.49,t));this.water(c,t,1-settle);c.restore();}
   if(impact>0){for(const side of [-1,1])this.bead(c,side*(35+impact*29),37-22*impact,7*(1-form),4*(1-form),side*.5,1-form);}
  }
  if(!add&&s.index===2){const close=smooth(.25,.72,t);c.save();this.outline(c);c.clip();const w=110*close;c.beginPath();c.ellipse(0,24,w,95*close,0,0,TAU);c.clip();this.face(c);this.water(c,t,1-settle);c.restore();
   for(const side of [-1,1]){c.save();c.globalAlpha=(1-settle)*smooth(.16,.30,t);c.translate(side*29*(1-close),0);c.rotate(side*.34*(1-close));c.scale(side,1);c.beginPath();c.moveTo(0,-91);c.bezierCurveTo(30,-47,96,-11,72,48);c.bezierCurveTo(63,76,30,91,0,91);c.bezierCurveTo(30,60,39,26,26,-14);c.bezierCurveTo(20,-42,8,-65,0,-91);c.closePath();const g=c.createLinearGradient(0,0,88,0);g.addColorStop(0,'#c4ffe5');g.addColorStop(.13,'#397f77');g.addColorStop(.34,'#063e3f');g.addColorStop(.7,'#287a6a');g.addColorStop(.88,'#a9e8c9');g.addColorStop(.95,'#edfff0');g.addColorStop(1,'#327568');c.fillStyle=g;c.fill();c.strokeStyle='#b9ecd5';c.lineWidth=.65;c.stroke();c.clip();c.globalAlpha*=.28;c.drawImage(this.assets.dew,-100,-100,200,200);c.restore();}
   this.face(c,smooth(.62,.81,t));
  }
  if(add&&s.index===0){const arrival=smooth(.22,.55,t),ripple=smooth(.55,.9,t);if(t<.56)this.bead(c,-8*(1-arrival),-130+123*arrival,12*(1-smooth(.50,.57,t)),24-10*arrival,0,smooth(.18,.25,t));
   this.water(c,t,Math.sin(Math.PI*ripple)*.65);c.save();this.inside(c);for(let j=0;j<3;j++){const p=clamp((ripple-j*.11)/.75);if(p<=0||p>=1)continue;c.beginPath();c.ellipse(0,-5+14*p,8+96*p,4+61*p,-.18,0,TAU);c.lineWidth=1.1*(1-p)+.2;c.strokeStyle=`rgba(192,255,220,${Math.sin(Math.PI*p)*.66})`;c.stroke();}c.restore();
  }
  if(add&&s.index===1){const flow=smooth(.19,.67,t),wet=Math.sin(Math.PI*flow);for(const side of [-1,1]){this.sheet(c,u=>{const p=clamp(flow*.99-u*.22),a=p*Math.PI;return{x:side*Math.sin(a)*70,y:85-176*p}},8*wet+.05,t,1-settle);const a=flow*Math.PI;this.bead(c,side*Math.sin(a)*70,85-176*flow,5.5*wet,8*wet,side*.3,1-settle);}c.save();this.inside(c);const level=100-210*flow;c.beginPath();c.rect(-100,level,200,200);c.clip();this.water(c,t,.8*(1-settle));c.restore();}
  if(add&&s.index===2){const fold=smooth(.20,.67,t),h=Math.sin(Math.PI*fold);for(const side of [-1,1])this.sheet(c,u=>{const a=u*Math.PI*1.25+t*1.7+side*.4,r=(95-66*fold)*(1-.34*u);return{x:side*Math.cos(a)*r,y:14+Math.sin(a)*r*.86}},18*h,t*2+side,1-settle);this.water(c,t,h*.72);}
  if(settle)this.face(c,settle);this.glint(c,t,.62);c.restore();
 }
 count(c:C,s:Study,ms:number,x:number,y:number,size:number){const n=ms>=s.contact?afterCount(s):beforeCount(s);if(!n)return;c.save();c.font=`600 ${size*.32}px Georgia,serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff8e7';c.shadowColor='#021e20';c.shadowBlur=2;c.shadowOffsetY=1;c.fillText(String(n),x,y+size*.045);c.restore()}
 transfer(c:C,s:Study,ms:number,a:P,b:P,scale=1){const t=ms/s.duration,p=smooth(.06,.26,t);if(t<=.06||t>=.30)return;const vanish=1-smooth(.255,.30,t),target={x:b.x,y:b.y-68*scale};
  const path=(u:number)=>({x:mix(a.x,target.x,u),y:mix(a.y,target.y,u)-Math.sin(Math.PI*u)*46*scale});
  this.sheet(c,u=>path(Math.max(0,p-(1-u)*.15)),4*scale*Math.sin(Math.PI*p),t*5,vanish);const head=path(p);this.bead(c,head.x,head.y,(4+3*Math.sin(p*Math.PI))*scale,(7+4*Math.sin(p*Math.PI))*scale,-.6,vanish);
 }
 source(c:C,ms:number,s:Study,r:{x:number;y:number;width:number;height:number}){const t=ms/s.duration,p=smooth(.01,.13,t),fade=1-smooth(.16,.32,t),v=p*fade;if(!v)return;c.save();c.translate(r.x,r.y);c.beginPath();c.rect(0,0,r.width,r.height);c.clip();c.scale(r.width/100,r.height/145);c.globalAlpha=v;
  for(let j=0;j<5;j++){const y=29+j*21;this.sheet(c,u=>({x:10+85*u,y:y+Math.sin(u*5+t*9+j)*5}),1.3,t+j,.65);this.bead(c,28+j*12,y,2,3,0,.8);}c.restore();
 }
 draw(canvas:HTMLCanvasElement,s:Study,ms:number,dark:boolean,side:number,reduced=false){const c=canvas.getContext('2d')!;c.setTransform(canvas.width/640,0,0,canvas.height/370,0,0);c.clearRect(0,0,640,370);
  const g=c.createLinearGradient(0,0,640,370);g.addColorStop(0,dark?'#0c1b20':'#f7f3e9');g.addColorStop(1,dark?'#1d3335':'#deded3');c.fillStyle=g;c.fillRect(0,0,640,370);c.strokeStyle=dark?'#bdebd408':'#4f5a4510';c.lineWidth=.7;for(let j=0;j<5;j++){c.beginPath();c.moveTo(-30,292+j*13);c.lineTo(670,292+j*13);c.stroke();}
  const pc={x:402,y:195},badge={x:485,y:116},sz=132;
  c.save();c.beginPath();c.arc(pc.x,pc.y,99,0,TAU);c.fillStyle='#102d3a';c.fill();c.clip();const img=side?this.assets.red:this.assets.blue;c.drawImage(img,0,0,img.naturalWidth/4,img.naturalHeight/4,pc.x-102,pc.y-102,204,204);c.restore();
  c.strokeStyle='#af995e';c.lineWidth=3;c.beginPath();c.arc(pc.x,pc.y,101,0,TAU);c.stroke();c.lineWidth=1;c.strokeStyle='#fff1c5';c.beginPath();c.arc(pc.x,pc.y,103,0,TAU);c.stroke();
  const sx=76,sy=118,sw=100,sh=145;c.save();c.shadowColor='#162e3155';c.shadowBlur=12;c.shadowOffsetY=6;c.fillStyle='#ae9762';c.fillRect(sx-3,sy-3,sw+6,sh+6);c.shadowBlur=0;c.shadowOffsetY=0;c.drawImage(this.assets.card,sx,sy,sw,sh);c.restore();
  if(!reduced){this.source(c,ms,s,{x:sx,y:sy,width:sw,height:sh});this.transfer(c,s,ms,{x:sx+sw*.82,y:sy+sh*.55},badge,1);}
  this.effect(c,s,ms,badge.x,badge.y,sz,reduced);this.count(c,s,ms,badge.x,badge.y,sz);
  c.fillStyle=dark?'#a2baac':'#6b756c';c.font='11px system-ui';c.textAlign='center';c.fillText('発生源 · エルフ',sx+sw/2,291);c.fillText(side?'OPPONENT':'YOU',pc.x,42);c.textAlign='left';c.font='10px system-ui';c.fillText(s.mode==='first'?'初回：雫が形になる':'追加：既存の雫へ合流',24,344);c.textAlign='right';c.fillText(`${beforeCount(s)} → ${afterCount(s)}`,612,344);
 }
}

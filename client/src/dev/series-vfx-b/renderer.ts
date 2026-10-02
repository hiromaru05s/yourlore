import {drawForm,familyStyles} from './forms';
import type {Scene} from './catalog';
export const DURATION=3600;
export type Anchor={x:number;y:number;w:number;h:number};
const material=document.createElement('canvas');material.width=320;material.height=500;const materialCtx=material.getContext('2d')!;
const glints=new WeakMap<HTMLCanvasElement,HTMLCanvasElement>();
function engraving(t:HTMLCanvasElement){let out=glints.get(t);if(out)return out;out=document.createElement('canvas');out.width=320;out.height=500;const g=out.getContext('2d')!;g.drawImage(t,0,0);const pix=g.getImageData(0,0,320,500),d=pix.data;const src=new Uint8ClampedArray(d);for(let y=1;y<499;y++)for(let x=1;x<319;x++){const k=(y*320+x)*4,dx=Math.abs(src[k]-src[k-4])+Math.abs(src[k+1]-src[k-3]),dy=Math.abs(src[k]-src[k-1280]);d[k]=222;d[k+1]=250;d[k+2]=218;d[k+3]=Math.min(src[k+3],Math.max(0,(dx+dy-38)*1.65));}g.putImageData(pix,0,0);glints.set(t,out);return out;}
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(x:number)=>{x=clamp(x);return x*x*(3-2*x);};
function ribbon(c:CanvasRenderingContext2D,a:Anchor,b:Anchor,p:number,color:string,v:number){
 const t=ease((p-.30)/.40),tail=Math.max(0,t-.28),dx=b.x-a.x,dy=b.y-a.y;
 const at=(q:number)=>({x:a.x+dx*q,y:a.y+dy*q-Math.sin(q*Math.PI)*a.h*(v===1?.35:.85)});
 if(t<=0||t>=1)return;
 const width=a.w*.085*Math.sin(Math.PI*t);
 c.save();
 for(const [scale,fill] of [[1,'#18343b'],[.66,color],[.13,'#effff7']] as const){const left:{x:number;y:number}[]=[],right:{x:number;y:number}[]=[];for(let i=0;i<=18;i++){const f=i/18,q=tail+(t-tail)*f,pos=at(q),next=at(Math.min(1,q+.002)),angle=Math.atan2(next.y-pos.y,next.x-pos.x)+Math.PI/2,r=width*.7*Math.pow(Math.sin(Math.PI*f),.7)*scale;left.push({x:pos.x+Math.cos(angle)*r,y:pos.y+Math.sin(angle)*r});right.push({x:pos.x-Math.cos(angle)*r,y:pos.y-Math.sin(angle)*r});}c.beginPath();c.moveTo(left[0].x,left[0].y);for(const pt of [...left,...right.reverse()])c.lineTo(pt.x,pt.y);c.closePath();c.fillStyle=fill;c.fill();}
 c.restore();
}
function arrow(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string,p:number){
 c.save();c.translate(x,y-ease(p)*h*.5);c.scale(w,h);c.beginPath();c.moveTo(0,-.28);c.lineTo(.22,0);c.lineTo(.09,0);c.lineTo(.09,.26);c.lineTo(-.09,.26);c.lineTo(-.09,0);c.lineTo(-.22,0);c.closePath();c.fillStyle='#172431';c.fill();c.scale(.75,.8);c.fillStyle=color;c.fill();c.restore();
}
function seal(c:CanvasRenderingContext2D,kind:string,w:number,h:number,p:number,v:number){
 const k=Math.sin(Math.PI*clamp((p-.2)/.75));if(k<=0)return;c.save();c.scale(k,k);c.lineWidth=Math.max(1,w*.018);
 if(kind==='shield'){
  if(v===2){for(let i=0;i<6;i++){const side=i<3?-1:1,row=i%3,tear=p>.58&&i===4?ease((p-.58)/.3):0;c.save();c.translate(side*w*(.28+tear*.23),h*(row-1)*.22);c.rotate(side*(.06+tear*.4));c.scale(1-tear,1-tear);c.beginPath();c.moveTo(-w*.19,-h*.13);c.lineTo(w*.12,-h*.16);c.lineTo(w*.22,h*.08);c.lineTo(-w*.06,h*.15);c.lineTo(-w*.22,h*.06);c.closePath();c.fillStyle='#24485aba';c.fill();c.strokeStyle='#a3e4eb';c.stroke();c.beginPath();c.moveTo(-w*.16,-h*.11);c.lineTo(w*.10,-h*.13);c.lineTo(w*.18,h*.07);c.strokeStyle='#edfdf3';c.lineWidth=.7;c.stroke();c.restore();}c.restore();return;}
  c.beginPath();c.moveTo(-w*.44,-h*.3);c.quadraticCurveTo(0,-h*.47,w*.44,-h*.3);c.lineTo(w*.35,h*.18);c.quadraticCurveTo(0,h*.58,-w*.35,h*.18);c.closePath();c.fillStyle='#18354dab';c.fill();c.strokeStyle='#99d9f4';c.stroke();
  c.beginPath();c.moveTo(0,-h*.35);c.lineTo(0,h*.4);c.moveTo(-w*.34,-h*.2);c.lineTo(w*.32,h*.15);c.strokeStyle='#ecfaff';c.lineWidth=.8;c.stroke();
  if(p>.58){c.beginPath();c.moveTo(w*.25,-h*.1);c.lineTo(0,0);c.lineTo(w*.12,h*.12);c.strokeStyle='#fff';c.lineWidth=2;c.stroke();}
 }else if(kind==='dew'){
  if(v===2){const pinch=ease((p-.55)/.35);c.beginPath();c.moveTo(-w*.43,-h*.32);c.bezierCurveTo(-w*.58,h*.1,-w*.5,h*.46,0,h*.38);c.bezierCurveTo(w*.5,h*.46,w*.58,h*.1,w*.43,-h*.32);c.bezierCurveTo(w*.28,-h*.08,w*.35,h*.3,0,h*(.20-pinch*.1));c.bezierCurveTo(-w*.35,h*.3,-w*.28,-h*.08,-w*.43,-h*.32);c.closePath();c.fillStyle='#1e758bc0';c.fill();c.strokeStyle='#bffbef';c.stroke();}
  const n=v===1?3:1;for(let i=0;i<n;i++){c.save();c.translate((i-(n-1)/2)*w*.28,-h*.05);c.beginPath();c.moveTo(0,-h*.23);c.bezierCurveTo(w*.03,-h*.08,w*.2,h*.02,w*.14,h*.14);c.bezierCurveTo(0,h*.31,-w*.2,h*.15,-w*.14,h*.01);c.closePath();c.fillStyle='#0c465e';c.fill();c.strokeStyle='#8ae9ed';c.stroke();c.beginPath();c.ellipse(-w*.04,h*.07,w*.025,h*.07,.3,0,Math.PI*2);c.fillStyle='#dbfff6';c.fill();c.restore();}
 }else if(kind==='hatch'){
  for(let s=-1;s<=1;s+=2){c.save();c.translate(s*w*.3*ease((p-.43)/.4),h*.15*ease((p-.43)/.4));c.rotate(s*ease((p-.43)/.4)*.55);c.beginPath();c.moveTo(0,-h*.36);c.bezierCurveTo(s*w*.5,-h*.22,s*w*.56,h*.36,0,h*.37);c.lineTo(s*w*.06,h*.16);c.lineTo(-s*w*.03,h*.04);c.lineTo(s*w*.09,-h*.09);c.closePath();c.fillStyle=v===1?'#dedbc6':'#38596c';c.fill();c.strokeStyle=v===1?'#fffbea':'#bfecf4';c.stroke();c.restore();}
 }else if(['purchase','exchange','refresh','restrict','discount'].includes(kind)){
  c.beginPath();c.roundRect(-w*.42,-h*.35,w*.84,h*.7,w*.03);c.fillStyle='#302a23cc';c.fill();c.strokeStyle='#e9c680';c.stroke();for(let i=0;i<5;i++){c.beginPath();c.moveTo(-w*.3,-h*.24+i*h*.1);c.lineTo(w*(i%2?.17:.3),-h*.24+i*h*.1);c.stroke();}if(kind==='restrict'){c.beginPath();c.moveTo(-w*.35,-h*.3);c.lineTo(w*.35,h*.3);c.strokeStyle='#db8b83';c.lineWidth=w*.06;c.stroke();}
 }else if(['counter','quest','synergy','victory'].includes(kind)){
 const n=kind==='victory'?6:3;for(let i=0;i<n;i++){const a=i/n*Math.PI*2-Math.PI/2,x=Math.cos(a)*w*.5,y=Math.sin(a)*h*.3;c.beginPath();c.moveTo(x,y-h*.07);c.lineTo(x+w*.055,y);c.lineTo(x,y+h*.07);c.lineTo(x-w*.055,y);c.closePath();c.fillStyle=p>(.2+i*.065)?'#f8e3a2':'#364353';c.fill();c.strokeStyle='#b99556';c.stroke();}
 }
 c.restore();
}
export function paint(c:CanvasRenderingContext2D,texture:HTMLCanvasElement,s:Scene,v:number,time:number,a:Anchor,b:Anchor,enemy:Anchor,hand:Anchor,reduced=false,arrival?:HTMLCanvasElement){
 const p=clamp(time/DURATION);if(p<=0||p>=1)return;const style=familyStyles[s.family]||familyStyles.elf;
 const moving=['bounce','purchase','exchange'].includes(s.kind);
 const target=s.kind==='bounce'||s.kind==='purchase'?hand:b;
 const q=moving?ease((p-.37)/.35):0;
 const x=a.x+(target.x-a.x)*q,y=a.y+(target.y-a.y)*q-(reduced?0:Math.sin(Math.PI*p)*a.h*.13);
 const lift=reduced?0:Math.sin(Math.PI*p);const sc=1+lift*.07;
 c.save();c.translate(x,y);c.scale(sc,sc);
 c.save();c.translate(0,a.h*.51+lift*a.h*.13);c.scale(1,.18);c.beginPath();c.ellipse(0,0,a.w*.5,a.w*.21,0,0,Math.PI*2);c.fillStyle='#1c252b35';c.fill();c.restore();
 const pulse=Math.sin(Math.PI*p);const deform=reduced?0:Math.sin(Math.PI*ease((p-.17)/.70))*a.w*.018;
 // The actual card art and the surface engravings share this mesh, including each fold.
 const m=materialCtx;m.clearRect(0,0,320,500);m.drawImage(texture,0,0);if(arrival&&p>.58){const reveal=ease((p-.58)/.26);m.save();m.beginPath();m.rect(0,500*(1-reveal),320,500*reveal);m.clip();m.drawImage(arrival,0,0,320,500);m.restore();}m.save();m.globalCompositeOperation='screen';m.globalAlpha=Math.sin(Math.PI*p)*.68;m.drawImage(engraving(texture),0,0);m.restore();
 m.save();m.globalCompositeOperation='source-atop';m.strokeStyle=style.light;m.fillStyle=style.mid;m.globalAlpha=pulse*.7;m.lineWidth=1.1;
 if(v===1){for(let i=0;i<13;i++){const yy=55+i*32;m.beginPath();m.moveTo(160,yy+50);m.bezierCurveTo(100,yy+12,75,yy+32,26,yy-8);m.moveTo(160,yy+50);m.bezierCurveTo(200,yy+12,245,yy+32,294,yy-8);m.stroke();}m.beginPath();m.moveTo(160,480);m.bezierCurveTo(174,280,132,170,162,32);m.lineWidth=2;m.stroke();}
 else {for(let i=0;i<14;i++){m.beginPath();m.moveTo(16,35+i*33);m.bezierCurveTo(90,10+i*33,215,65+i*33,305,30+i*33);m.stroke();}for(let i=0;i<24;i++){const xx=35+(i*79)%250,yy=35+(i*113)%420;m.fillRect(xx,yy,2,7);}}
 m.globalAlpha=pulse*.25;m.fillRect(0,(1-p)*620-90,320,65);m.restore();
 for(let i=0;i<40;i++){const yy=i/40-.5,offset=v===1?Math.sin(yy*9+p*8)*deform:Math.sin(yy*18-p*12)*deform;const cut=500/40;const fold=v===2&&!reduced?Math.sin(Math.PI*ease((p-.26)/.53))*Math.sin(yy*12)*a.h*.018:0;c.drawImage(material,0,i*cut,320,cut,-a.w/2+offset,yy*a.h+fold,a.w,a.h/40+.4);}
 if(!reduced)drawForm(c,s.family,v,s.id==='A075'?1-p:p,a.w,a.h);
 seal(c,s.kind,a.w,a.h,p,v);c.restore();
 const travel=['D_RED','D_BLUE','D_BLACK'].includes(s.cardIds[0])||['heal','dew','shield','buff','aura','synergy','merge','destroy','ferment'].includes(s.kind);
 if(travel&&!reduced)ribbon(c,s.kind==='merge'?b:a,s.kind==='destroy'||s.cardIds[0]==='D_RED'||s.cardIds[0]==='D_BLACK'?enemy:b,s.kind==='hatch'?clamp((p-.55)/.4):p,s.cardIds[0]==='D_RED'?'#d26a45':s.cardIds[0]==='D_BLUE'?'#8bdbe8':style.mid,v);
 if(s.kind==='shield'&&p>.54&&p<.98){c.save();c.translate(b.x,b.y);seal(c,'shield',b.w*.7,b.h*.8,clamp((p-.50)/.5),v);c.restore();}
 if(s.kind==='buff'&&p>.53&&p<.94){if(s.id!=='A060')arrow(c,b.x-b.w*.2,b.y,b.w,b.h,'#6ea8ff',(p-.53)/.41);arrow(c,b.x+b.w*.2,b.y,b.w,b.h,'#f07782',(p-.53)/.41);}
 if(['heal','dew'].includes(s.kind)&&p>.66&&p<.93){const t=(p-.66)/.27;c.save();c.translate(b.x,b.y-b.h*.1*t);c.scale(1-t*.65,1-t*.65);c.fillStyle='#daf7e0';c.strokeStyle='#3b806d';c.lineWidth=1.3;c.beginPath();const z=b.w*.14;c.moveTo(-z/3,-z);c.lineTo(z/3,-z);c.lineTo(z/3,-z/3);c.lineTo(z,-z/3);c.lineTo(z,z/3);c.lineTo(z/3,z/3);c.lineTo(z/3,z);c.lineTo(-z/3,z);c.lineTo(-z/3,z/3);c.lineTo(-z,z/3);c.lineTo(-z,-z/3);c.lineTo(-z/3,-z/3);c.closePath();c.fill();c.stroke();c.restore();}
}

import {Surface} from './surface';
import {luminousPath} from './light';
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x)};
const ease=(x:number)=>1-Math.pow(1-clamp(x),3);
const TAU=Math.PI*2;type C=CanvasRenderingContext2D;type P=[number,number];
export type GrantStudy={id:string;family:'shield'|'brand';mode:'first'|'add';duration:number;contact:number};
export const approvedGrant=(family:'shield'|'brand',before:number):GrantStudy=>family==='shield'?(before>0?{id:'SA1',family,mode:'add',duration:2100,contact:1240}:{id:'SF3',family,mode:'first',duration:2600,contact:1630}):(before>0?{id:'BA4',family,mode:'add',duration:2350,contact:1480}:{id:'BF3',family,mode:'first',duration:2850,contact:1830});
export class GrantMaterial {
 original:HTMLImageElement;image:HTMLImageElement|HTMLCanvasElement;mask:HTMLCanvasElement;gold:HTMLCanvasElement;shade:HTMLCanvasElement;sheen=document.createElement('canvas');
 constructor(image:HTMLImageElement,public surface:Surface){this.original=image;this.sheen.width=this.sheen.height=256;this.image=image;this.mask=this.tint('#a5e6ff');this.gold=this.tint('#ffddb0');this.shade=this.tint('#061025');}
 tint(color:string){const a=document.createElement('canvas');a.width=a.height=512;const c=a.getContext('2d')!;c.drawImage(this.image,0,0,512,512);c.globalCompositeOperation='source-in';c.fillStyle=color;c.fillRect(0,0,512,512);return a;}
 face(c:C,x=0,y=0,scale=1,alpha=1,rotation=0){c.save();c.translate(x,y);c.rotate(rotation);c.scale(scale,scale);c.globalAlpha*=clamp(alpha);c.drawImage(this.image,-100,-100,200,200);c.restore();}
 shadow(c:C,dx=0,dy=5,a=.3){c.save();c.globalAlpha*=a;c.drawImage(this.shade,-100+dx,-100+dy,200,200);c.restore();}
 clip(c:C,points:P[]){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();}
 piece(c:C,points:P[],dx:number,dy:number,angle:number,sx=1,sy=1,shine=0){
  const center: P=[points.reduce((a,p)=>a+p[0],0)/points.length,points.reduce((a,p)=>a+p[1],0)/points.length];
  c.save();c.translate(center[0]+dx,center[1]+dy);c.rotate(angle);c.scale(sx,sy);c.translate(-center[0],-center[1]);
  for(let depth=Math.min(5,Math.ceil((Math.abs(dx)+Math.abs(dy))*.09+Math.abs(angle)*7));depth>=1;depth--){c.save();c.translate(depth*.55,depth*.9);this.clip(c,points);c.globalAlpha*=.9;c.drawImage(depth<2?this.gold:this.shade,-100,-100,200,200);c.restore();}
  this.clip(c,points);this.face(c);if(shine>0){c.globalCompositeOperation='screen';c.globalAlpha*=shine;c.drawImage(this.mask,-100,-100,200,200);}c.restore();
 }
 glint(c:C,t:number,hot=false,strength=1){
  if(t<=0||t>=1)return;const x=-160+t*320;c.save();c.globalCompositeOperation='screen';
  const g=c.createLinearGradient(x-47,0,x+47,0);g.addColorStop(0,'transparent');g.addColorStop(.30,hot?'#d62e452c':'#48cafa2c');g.addColorStop(.5,hot?'#ffd5b987':'#e2f7ff87');g.addColorStop(.74,hot?'#c9200c55':'#648cee55');g.addColorStop(1,'transparent');
  const a=this.sheen;const q=a.getContext('2d')!;q.setTransform(1,0,0,1,0,0);q.globalCompositeOperation='source-over';q.clearRect(0,0,256,256);q.translate(128,128);q.scale(1.28,1.28);q.drawImage(this.image,-100,-100,200,200);q.globalCompositeOperation='source-in';q.transform(1,0,-.35,1,0,0);q.fillStyle=g;q.fillRect(-250,-200,500,400);c.globalAlpha*=strength;c.drawImage(a,-100,-100,200,200);c.restore();
 }

 light(c:C,path:P[],p:number,brand:boolean,width:number,alpha=1,tail=.4){
  const a=this.sheen,q=a.getContext('2d')!;q.setTransform(1,0,0,1,0,0);q.globalCompositeOperation='source-over';q.globalAlpha=1;q.clearRect(0,0,256,256);q.translate(128,128);q.scale(1.28,1.28);
  luminousPath(q,path,p,brand,width,tail);q.globalCompositeOperation='destination-in';q.drawImage(this.original,-100,-100,200,200);
  c.save();c.globalCompositeOperation='screen';c.globalAlpha*=alpha;c.drawImage(a,-100,-100,200,200);c.restore();
 }
 draw(c:C,s:GrantStudy,ms:number){
  const t=clamp(ms/s.duration),add=s.mode==='add',brand=s.family==='brand',q=smooth(.11,.71,t),settle=smooth(.74,.97,t);
  this.image=t===1?this.original:this.surface.draw(this.original,brand?(add?1:5):(add?0:2),t*3,Math.sin(Math.PI*t)*.85,brand);
  if(t<=0){if(add)this.face(c);return;}if(t>=1){this.face(c);return;}
  if(add){this.shadow(c,1,5,.28);this.face(c);}
  if(s.id==='SF3'){
   // Retain the eleven crystal seeds; illuminate the growing surface front, not radial spokes.
   for(let j=0;j<11;j++){
    const a=j/11*TAU-Math.PI/2,z=(j+1)/11*TAU-Math.PI/2,k=smooth(.1+(j%3)*.07,.61+(j%4)*.025,t);if(!k)continue;
    c.save();this.clip(c,[[0,5],[Math.cos(a)*150,Math.sin(a)*150],[Math.cos(z)*150,Math.sin(z)*150]]);c.beginPath();c.arc(0,5,170*k,0,TAU);c.clip();this.face(c);c.globalCompositeOperation='screen';c.globalAlpha=(1-settle)*(.06+(j%4)*.07);c.drawImage(this.mask,-100,-100,200,200);c.restore();
    if(k<.9){const r=170*k;const path:P[]=Array.from({length:7},(_,n)=>{const b=a+(z-a)*n/6;return [Math.cos(b)*r,5+Math.sin(b)*r]});this.light(c,path,1,false,1.5,Math.sin(k*Math.PI)*.85,1);}
   }
  }else if(s.id==='SA1'){
   const edge:P[]=[[0,-91],[-29,-75],[-74,-66],[-73,-9],[-51,47],[0,88],[51,47],[73,-9],[74,-66],[29,-75],[0,-91]];
   this.light(c,edge,q,false,2.2,1-settle,.34);this.glint(c,q,false,.38);
  }else if(s.id==='BF3'){
   c.save();c.beginPath();for(let j=0;j<23;j++){const a=j*2.39996,rr=20+Math.sqrt(j/23)*65,k=smooth(.09+(j%7)*.025,.58+(j%4)*.043,t);c.moveTo(Math.cos(a)*rr+65*k,Math.sin(a)*rr);c.ellipse(Math.cos(a)*rr,Math.sin(a)*rr,65*k,44*k,a,0,TAU);}c.clip();
   for(let y=-100;y<100;y+=3){const dx=Math.sin(y*.046+t*18)*8*(1-q);c.drawImage(this.image,0,(y+100)/200*this.image.height,this.image.width,this.image.height*.015,-100+dx,y,200,3.2);}
   const roots:P[][]=[[[8,58],[-22,39],[-31,13],[-15,-6],[-34,-30],[-22,-68]],[[8,58],[28,35],[18,12],[36,-7],[48,-30],[27,-61]],[[-62,18],[-34,7],[-15,-6],[9,-14],[13,-41]]];
   roots.forEach((path,j)=>this.light(c,path,smooth(.13+j*.065,.72+j*.03,t),true,1.45,(1-settle)*.82,.48));c.restore();
   if(settle)this.face(c,0,0,1,settle);
  }else{
   for(let j=2;j>=0;j--){const k=ease((t-.12-j*.1)/.42);if(k<=0)continue;c.save();c.globalAlpha=(1-settle)*(.48+j*.1);this.shadow(c,(j-1)*23*(1-k),-35*(1-k),.24);this.face(c,(j-1)*23*(1-k),-40*(j+1)/3*(1-k),1-.045*j*(1-k),1,(j-1)*.24*(1-k));c.restore();
    this.light(c,[[-56,2],[-41,42],[-8,62],[26,54],[53,26]],k,true,1.7,Math.sin(k*Math.PI)*(1-settle)*.75,.65);
   }
  }
  this.glint(c,clamp((t-.64)/.31),brand,.55*Math.sin(Math.PI*clamp((t-.12)/.75)));
 }
}

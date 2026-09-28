import {RiftInkMaterial} from './riftInkMaterial';
import {riftTrailPosition} from './riftTransmute';
export const SILVER_INK_DURATION=2800;
export type P={x:number;y:number};
type C=CanvasRenderingContext2D;
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
const TAU=Math.PI*2;
const hash=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export function silverInkState(ms:number){return {charge:smooth(100,720,ms),lift:smooth(0,320,ms),swirl:smooth(1110,1870,ms),collapse:smooth(1660,1990,ms),travel:clamp((ms-1990)/380)**1.6,arrival:smooth(2340,2410,ms)*(1-smooth(2470,2800,ms)),phase:ms<320?0:ms<1040?1:ms<1990?2:ms<2370?3:4};}
function shape(c:C,p:P[],color:string|CanvasGradient){if(!p.length)return;c.beginPath();p.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath();c.fillStyle=color;c.fill();}
function ribbon(c:C,p:P[],w:number,color:string|CanvasGradient){const a:P[]=[],b:P[]=[];for(let i=0;i<p.length;i++){const prev=p[Math.max(0,i-1)],next=p[Math.min(p.length-1,i+1)],dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1,wide=w*Math.sin(Math.PI*i/(p.length-1))**.72;a.push({x:p[i].x-dy/len*wide,y:p[i].y+dx/len*wide});b.unshift({x:p[i].x+dy/len*wide,y:p[i].y-dx/len*wide});}shape(c,[...a,...b],color);}
function glow(c:C,x:number,y:number,r:number,color:string,alpha:number){if(r<=0||alpha<=0)return;c.save();c.globalAlpha*=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(.24,color+'99');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}
function spark(c:C,x:number,y:number,r:number,angle:number,alpha:number){if(alpha<=0||r<=0)return;c.save();c.globalAlpha*=alpha;c.translate(x,y);c.rotate(angle);glow(c,0,0,r*4,'#bda0ff',.35);shape(c,[{x:0,y:-r*1.8},{x:r*.18,y:-r*.18},{x:r,y:0},{x:r*.18,y:r*.18},{x:0,y:r*1.8},{x:-r*.18,y:r*.18},{x:-r,y:0},{x:-r*.18,y:-r*.18}],'#fff1ff');c.restore();}
let shared:RiftInkMaterial|undefined,users=0,idleTimer:ReturnType<typeof setTimeout>|undefined;
export function acquireSilverInk(){
 clearTimeout(idleTimer);shared??=new RiftInkMaterial();users++;
 const material=shared;let released=false;
 return {renderer:new SilverInkRenderer(material),release(){if(released)return;released=true;if(--users===0){material.forgetFace();idleTimer=setTimeout(()=>{shared?.dispose();shared=undefined;},30000);}}};
}
export function silverInkResourceState(){return {users,allocated:!!shared};}
export class SilverInkRenderer {
 constructor(private material:RiftInkMaterial){}
 draw(c:C,face:HTMLCanvasElement,source:P,sink:P,width:number,ms:number,options:{heightRatio?:number;part?:'source'|'transfer';lift?:number;ground?:boolean}={}){
  const u=width,s=silverInkState(ms),p={x:source.x,y:source.y-(options.lift??u*.20)*s.lift};
  const alive=1-s.collapse;
  c.save();try{c.lineCap='round';
  if(ms<2040&&options.part!=='transfer'){
   if(options.ground!==false){c.save();c.globalAlpha=.15*(1-s.collapse);c.fillStyle='#160d29';c.shadowColor='#13071e';c.shadowBlur=u*.08;c.beginPath();c.ellipse(source.x,source.y+u*.57,u*(.36+.06*s.lift),u*.067,0,0,TAU);c.fill();c.restore();
   // Contact light links the card's emission to the surface below it.
   c.save();c.translate(source.x,source.y+u*.59);c.scale(1,.24);glow(c,0,0,u*.71,'#9964ed',s.charge*.24*alive);c.restore();}
   this.motes(c,p,u,ms,false);
   const surface=this.material.draw(face,ms,options.heightRatio??1.5,u*Math.min(devicePixelRatio||1,2)*2.6);
   const x=p.x-u*1.4,y=p.y-u*1.7;
   c.save();c.globalCompositeOperation='screen';c.globalAlpha=.38*s.charge;c.filter=`blur(${Math.max(2,u*.032)}px)`;c.drawImage(surface,x,y,u*2.8,u*3.4);c.restore();
   c.drawImage(surface,x,y,u*2.8,u*3.4);
   this.surfaceAccents(c,p,u,ms);
   this.motes(c,p,u,ms,true);
  }
  if(ms>=1990&&ms<2560&&options.part!=='source'){
   const origin={x:source.x,y:source.y-(options.lift??u*.2)},travel=s.travel,dist=Math.hypot(sink.x-origin.x,sink.y-origin.y);
   const len=Math.min(.52,u*.88/Math.max(1,dist))*(1-smooth(2380,2540,ms));
   const from=Math.max(0,travel-len),pts:P[]=[];for(let i=0;i<=42;i++)pts.push(riftTrailPosition(origin,sink,from+(travel-from)*i/42));
   c.globalAlpha=1-smooth(2390,2550,ms);ribbon(c,pts,u*.031,'#21102f');
   const grad=c.createLinearGradient(pts[0].x,pts[0].y,pts[pts.length-1].x,pts[pts.length-1].y);grad.addColorStop(0,'#8150a0');grad.addColorStop(.68,'#c59aee');grad.addColorStop(1,'#f3e0ff');ribbon(c,pts,u*.015,grad);ribbon(c,pts.slice(12),u*.003,'#fff1ff');
   // Small detached tails carry the same material, never a separate projectile.
   for(let j=0;j<3;j++){const a=Math.max(0,from-.045-j*.025),b=Math.max(0,a-.026);const tail:P[]=[];for(let i=0;i<12;i++)tail.push(riftTrailPosition(origin,sink,b+(a-b)*i/11));c.globalAlpha=(1-smooth(2320,2490,ms))*(.5-j*.1);ribbon(c,tail,u*.007,'#9964be');}
  }
  if(s.arrival>0&&options.part!=='source'){const q=smooth(2360,2800,ms);c.globalAlpha=s.arrival;c.save();c.translate(sink.x,sink.y);const gradient=c.createLinearGradient(-u*.3,-u*.2,u*.3,u*.2);gradient.addColorStop(0,'#8052aa');gradient.addColorStop(.55,'#f3dfff');gradient.addColorStop(1,'#62387e');for(let j=0;j<4;j++){const pts:P[]=[];for(let i=0;i<=24;i++){const a=j*1.7+i/24*1.1,r=u*(.15+q*.36);pts.push({x:Math.cos(a)*r,y:Math.sin(a)*r*.55});}ribbon(c,pts,u*.014*(1-q),gradient);}c.restore();glow(c,sink.x,sink.y,u*.35,'#b984ed',s.arrival*.24);}
  }finally{c.restore();}
 }
 private surfaceAccents(c:C,p:P,u:number,ms:number){
  const s=silverInkState(ms),active=smooth(180,490,ms)*(1-smooth(1080,1460,ms));
  if(active>0){
   // A few highlights travel on the physical frame while the illustration remains readable.
   for(let i=0;i<4;i++){const q=(ms*.00032+i*.25)%1,segment=q*4,side=Math.floor(segment),f=segment-side;let x=0,y=0;
    if(side===0){x=(-.35+f*.7)*u;y=-u*.61;}else if(side===1){x=u*.35;y=(-.61+f*1.22)*u;}else if(side===2){x=(.35-f*.7)*u;y=u*.61;}else{x=-u*.35;y=(.61-f*1.22)*u;}
    spark(c,p.x+x,p.y+y,u*(i===0?.017:.010),ms*.0003+i,active*(i===0?.9:.45));
   }
  }
  {
   const fade=smooth(460,800,ms)*(1-smooth(1290,1710,ms));c.save();c.globalAlpha=fade*.8;c.translate(p.x,p.y);c.rotate(-s.swirl*2);
   // Tiny engraved fragments release from the frame, then curl inward with the ink.
   for(let i=0;i<10;i++){const a=i*2.399+s.swirl*3,rad=u*(.58+.03*Math.sin(i))*(1-s.collapse);c.save();c.translate(Math.cos(a)*rad,Math.sin(a)*rad*.84);c.rotate(a);c.strokeStyle='#e8ccff';c.lineWidth=Math.max(.55,u*.003);c.beginPath();c.moveTo(-u*.014,-u*.025);c.lineTo(u*.012,0);c.lineTo(-u*.014,u*.025);c.moveTo(u*.012,0);c.lineTo(u*.028,0);c.stroke();c.restore();}c.restore();
  }
 }
 private motes(c:C,p:P,u:number,ms:number,front:boolean){
  const s=silverInkState(ms),fade=smooth(250,780,ms)*(1-smooth(1940,2130,ms));if(fade<=0)return;
  const count=26;
  for(let i=0;i<count;i++){
   if((i%3===0)!==front)continue;
   const seed=hash(i+5),speed=.6+hash(i+150)*.8,age=((ms*.00033*speed+seed)%1),angle=i*2.399+ms*.00035+s.swirl*3.8;
   const r=u*(.5+(1-age)*(.25+seed*.48))*(1-s.collapse*.95),x=p.x+Math.cos(angle)*r,y=p.y+Math.sin(angle)*r*.94;
   const a=fade*Math.sin(age*Math.PI)*(front?.85:.4),sz=u*(front?.009:.004)*.85*(1-s.collapse*.8);
   if(front&&i%6===0)spark(c,x,y,sz*(1+seed),angle,a);
   else{c.save();c.globalAlpha=a;c.fillStyle=front?'#f3dfff':'#a26dd4';c.beginPath();c.ellipse(x,y,Math.max(.4,sz),Math.max(.25,sz*.4),angle,0,TAU);c.fill();c.restore();}
  }
  // A handful of broad opaque drops preserve the chosen ink silhouette.
  for(let i=0;i<7;i++){if((i%2===0)!==front)continue;const a=i*2.399+ms*.0015+s.swirl*2.2,r=u*(.54+(i%3)*.10)*(1-s.collapse)**.68,sz=u*.018*(1-s.collapse);c.save();c.globalAlpha=fade*smooth(860,1300,ms);c.translate(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r);c.rotate(a);shape(c,[{x:-sz*1.8,y:0},{x:sz*.4,y:-sz},{x:sz,y:0},{x:sz*.4,y:sz}],i%3===0?'#c597df':'#3e1555');c.restore();}
 }
}

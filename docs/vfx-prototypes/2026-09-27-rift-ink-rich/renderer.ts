import {InkMaterial} from './material';
import {RiftRenderer as PriorInk} from '../2026-09-27-rift-five/renderer';
import {riftTrailPosition} from '../../../client/src/ui/riftTransmute';
export const DURATION=2800;
export const variants=[
 {id:'luminous',name:'燐光の流墨',en:'LUMINOUS INK',description:'カードの縁が白紫に灯り、絵柄の上を細い光脈が流れる。真珠のような光沢を残しながら、厚みのある墨へ巻き込まれる。',look:'最も素直な④の上位版。カードの輪郭から表面へ広がる発光、墨の明暗、縁の細かなきらめき。'},
 {id:'inscription',name:'銀紋の流墨',en:'SILVER INSCRIPTION',description:'枠と絵柄の細部が光を拾い、銀色の紋様が表面に浮かぶ。その紋様ごとねじれて、魔力の流れに変わる。',look:'カード自体のディテールが発光する案。光の走る位置と、紋様が墨に引き延ばされる瞬間。'},
 {id:'astral',name:'星砂の流墨',en:'ASTRAL INK',description:'カードの内側に細かな光点が宿り、縁から星砂がほどける。大小の輝点が奥行きを作り、黒紫の流れへ吸い戻される。',look:'カード面と周囲の星砂が連続する案。近くの大きな光と奥の微光の差、消える順番。'},
 {id:'witchflame',name:'幽炎の流墨',en:'WITCHFLAME INK',description:'カードの縁から薄い紫の炎が立ち、表面を魔力が流れ落ちる。炎の先が裂け、墨の渦に巻き込まれる。',look:'Toonの輪郭を最も強く出した案。太い炎の根元、白い縁、細く千切れる先端。'},
 {id:'eclipse',name:'蝕光の流墨',en:'ECLIPSE INK',description:'光脈を蓄えたカードが一度だけ強く脈動。深い墨が光を呑み込み、短い収束の閃きからリフトへ走る。',look:'ハースストーンの強い溜めと解放を意識した案。カード絵が光る瞬間と、その後の黒との落差。'},
] as const;
export type Variant=typeof variants[number]['id'];
export type P={x:number;y:number};
type C=CanvasRenderingContext2D;
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
const TAU=Math.PI*2;
const hash=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export function state(ms:number,kind:Variant='luminous'){const starts={luminous:1020,inscription:1110,astral:1010,witchflame:960,eclipse:1190};return {charge:smooth(100,720,ms),lift:smooth(0,320,ms),swirl:smooth(starts[kind],1870,ms),collapse:smooth(kind==='eclipse'?1770:1660,1990,ms),travel:clamp((ms-1990)/380)**1.6,arrival:smooth(2340,2410,ms)*(1-smooth(2470,2800,ms)),phase:ms<320?0:ms<1040?1:ms<1990?2:ms<2370?3:4};}
function shape(c:C,p:P[],color:string|CanvasGradient){if(!p.length)return;c.beginPath();p.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath();c.fillStyle=color;c.fill();}
function ribbon(c:C,p:P[],w:number,color:string|CanvasGradient){const a:P[]=[],b:P[]=[];for(let i=0;i<p.length;i++){const prev=p[Math.max(0,i-1)],next=p[Math.min(p.length-1,i+1)],dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1,wide=w*Math.sin(Math.PI*i/(p.length-1))**.72;a.push({x:p[i].x-dy/len*wide,y:p[i].y+dx/len*wide});b.unshift({x:p[i].x+dy/len*wide,y:p[i].y-dx/len*wide});}shape(c,[...a,...b],color);}
function glow(c:C,x:number,y:number,r:number,color:string,alpha:number){if(r<=0||alpha<=0)return;c.save();c.globalAlpha*=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(.24,color+'99');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}
function spark(c:C,x:number,y:number,r:number,angle:number,alpha:number){if(alpha<=0||r<=0)return;c.save();c.globalAlpha*=alpha;c.translate(x,y);c.rotate(angle);glow(c,0,0,r*4,'#bda0ff',.35);shape(c,[{x:0,y:-r*1.8},{x:r*.18,y:-r*.18},{x:r,y:0},{x:r*.18,y:r*.18},{x:0,y:r*1.8},{x:-r*.18,y:r*.18},{x:-r,y:0},{x:-r*.18,y:-r*.18}],'#fff1ff');c.restore();}
let shared:InkMaterial|undefined,failed=false;
export function materialStatus(){return failed?'fallback':'webgl';}
export function disposeMaterial(){shared?.dispose();shared=undefined;}
export class RiftRenderer {
 private fallback=new PriorInk();
 draw(c:C,face:HTMLCanvasElement,kind:Variant,source:P,sink:P,width:number,ms:number,options:{light?:boolean;receiver?:boolean;heightRatio?:number}={}){
  const u=width,s=state(ms,kind),p={x:source.x,y:source.y-u*.20*s.lift};
  const alive=1-s.collapse,index=variants.findIndex(v=>v.id===kind);
  c.save();c.lineCap='round';
  if(options.receiver)this.receiver(c,sink,u,ms,options.light??false);
  if(ms<2040){
   c.save();c.globalAlpha=.15*(1-s.collapse);c.fillStyle='#160d29';c.shadowColor='#13071e';c.shadowBlur=u*.08;c.beginPath();c.ellipse(source.x,source.y+u*.57,u*(.36+.06*s.lift),u*.067,0,0,TAU);c.fill();c.restore();
   // Contact light links the card's emission to the surface below it.
   c.save();c.translate(source.x,source.y+u*.59);c.scale(1,.24);glow(c,0,0,u*.71,'#9964ed',s.charge*.24*alive);c.restore();
   this.motes(c,kind,p,u,ms,false);
   try{
    if(failed)throw new Error('Fallback');shared??=new InkMaterial();
    const surface=shared.draw(face,index,ms,options.heightRatio??1.5,u*(devicePixelRatio||1)*2.6);
    const x=p.x-u*1.4,y=p.y-u*1.7;
    // Bloom is a softer copy of the exact luminous silhouette, not a circular halo.
    c.save();c.globalCompositeOperation='screen';c.globalAlpha=.38*s.charge;c.filter=`blur(${Math.max(2,u*.032)}px)`;c.drawImage(surface,x,y,u*2.8,u*3.4);c.restore();
    c.drawImage(surface,x,y,u*2.8,u*3.4);
   }catch{failed=true;this.fallback.draw(c,face,'ink',source,sink,u,ms/DURATION*2200,options);}
   this.surfaceAccents(c,kind,p,u,ms);
   this.motes(c,kind,p,u,ms,true);
  }
  if(ms>=1990&&ms<2560){
   const origin={x:source.x,y:source.y-u*.2},travel=s.travel,dist=Math.hypot(sink.x-origin.x,sink.y-origin.y);
   const len=Math.min(.52,u*.88/Math.max(1,dist))*(1-smooth(2380,2540,ms));
   const from=Math.max(0,travel-len),pts:P[]=[];for(let i=0;i<=42;i++)pts.push(riftTrailPosition(origin,sink,from+(travel-from)*i/42));
   c.globalAlpha=1-smooth(2390,2550,ms);ribbon(c,pts,u*.031,'#21102f');
   const grad=c.createLinearGradient(pts[0].x,pts[0].y,pts[pts.length-1].x,pts[pts.length-1].y);grad.addColorStop(0,'#8150a0');grad.addColorStop(.68,'#c59aee');grad.addColorStop(1,'#f3e0ff');ribbon(c,pts,u*.015,grad);ribbon(c,pts.slice(12),u*.003,'#fff1ff');
   // Small detached tails carry the same material, never a separate projectile.
   for(let j=0;j<3;j++){const a=Math.max(0,from-.045-j*.025),b=Math.max(0,a-.026);const tail:P[]=[];for(let i=0;i<12;i++)tail.push(riftTrailPosition(origin,sink,b+(a-b)*i/11));c.globalAlpha=(1-smooth(2320,2490,ms))*(.5-j*.1);ribbon(c,tail,u*.007,'#9964be');}
  }
  if(s.arrival>0){const q=smooth(2360,2800,ms);c.globalAlpha=s.arrival;c.save();c.translate(sink.x,sink.y);const gradient=c.createLinearGradient(-u*.3,-u*.2,u*.3,u*.2);gradient.addColorStop(0,'#8052aa');gradient.addColorStop(.55,'#f3dfff');gradient.addColorStop(1,'#62387e');for(let j=0;j<4;j++){const pts:P[]=[];for(let i=0;i<=24;i++){const a=j*1.7+i/24*1.1,r=u*(.15+q*.36);pts.push({x:Math.cos(a)*r,y:Math.sin(a)*r*.55});}ribbon(c,pts,u*.014*(1-q),gradient);}c.restore();glow(c,sink.x,sink.y,u*.35,'#b984ed',s.arrival*.24);}
  c.restore();
 }
 private surfaceAccents(c:C,kind:Variant,p:P,u:number,ms:number){
  const s=state(ms,kind),active=smooth(180,490,ms)*(1-smooth(1080,1460,ms));
  if(active>0){
   // A few highlights travel on the physical frame while the illustration remains readable.
   for(let i=0;i<4;i++){const q=(ms*.00032+i*.25)%1,segment=q*4,side=Math.floor(segment),f=segment-side;let x=0,y=0;
    if(side===0){x=(-.35+f*.7)*u;y=-u*.61;}else if(side===1){x=u*.35;y=(-.61+f*1.22)*u;}else if(side===2){x=(.35-f*.7)*u;y=u*.61;}else{x=-u*.35;y=(.61-f*1.22)*u;}
    spark(c,p.x+x,p.y+y,u*(i===0?.017:.010),ms*.0003+i,active*(i===0?.9:.45));
   }
   if(kind==='eclipse'){const flash=smooth(810,890,ms)*(1-smooth(910,1090,ms));glow(c,p.x,p.y,u*.57,'#ceadff',flash*.45);spark(c,p.x,p.y-u*.08,u*.064,0,flash*.85);}
  }
  if(kind==='witchflame'){
   const fade=smooth(510,830,ms)*(1-smooth(1700,1950,ms)),scale=(1-s.collapse)**.65;
   for(let i=0;i<8;i++){
    const k=hash(i+21),a=i*2.399+ms*.00018+s.swirl*3.8,r=u*(.43+(i%3)*.045)*scale;
    const evolve=smooth(.05,.5,s.swirl),edgeX=(i%2?1:-1)*u*.33,edgeY=(-.48+Math.floor(i/2)*.32)*u;
    const x=p.x+edgeX*(1-evolve)+Math.cos(a)*r*evolve,y=p.y+edgeY*(1-evolve)+Math.sin(a)*r*.98*evolve,w=u*(.024+k*.022)*scale,reach=u*(.22+k*.13)*scale;
    c.save();c.globalAlpha=fade*.85;c.translate(x,y);c.rotate((-Math.PI/2+(i%2?.38:-.38))*(1-evolve)+(a+.45)*evolve);
    const pts:P[]=[];for(let j=0;j<=28;j++){const q=j/28;pts.push({x:q*reach,y:Math.sin(q*4.8-ms*.006+k*7)*w*q});}
    const g=c.createLinearGradient(0,0,reach,0);g.addColorStop(0,'#32113f');g.addColorStop(.35,'#9146b5');g.addColorStop(.7,'#b784db');g.addColorStop(1,'#efe1ff');const left:P[]=[],right:P[]=[];for(let j=0;j<pts.length;j++){const q=j/(pts.length-1),wide=w*(1-q)**.7;left.push({x:pts[j].x,y:pts[j].y-wide});right.unshift({x:pts[j].x,y:pts[j].y+wide});}shape(c,[...left,...right],g);ribbon(c,pts.slice(5),u*.004*scale,'#e1bafa');c.restore();
   }
  }
  if(kind==='inscription'){
   const fade=smooth(460,800,ms)*(1-smooth(1290,1710,ms));c.save();c.globalAlpha=fade*.8;c.translate(p.x,p.y);c.rotate(-s.swirl*2);
   // Tiny engraved fragments release from the frame, then curl inward with the ink.
   for(let i=0;i<10;i++){const a=i*2.399+s.swirl*3,rad=u*(.58+.03*Math.sin(i))*(1-s.collapse);c.save();c.translate(Math.cos(a)*rad,Math.sin(a)*rad*.84);c.rotate(a);c.strokeStyle='#e8ccff';c.lineWidth=Math.max(.55,u*.003);c.beginPath();c.moveTo(-u*.014,-u*.025);c.lineTo(u*.012,0);c.lineTo(-u*.014,u*.025);c.moveTo(u*.012,0);c.lineTo(u*.028,0);c.stroke();c.restore();}c.restore();
  }
 }
 private motes(c:C,kind:Variant,p:P,u:number,ms:number,front:boolean){
  const s=state(ms,kind),fade=smooth(250,780,ms)*(1-smooth(1940,2130,ms));if(fade<=0)return;
  const count=kind==='astral'?60:26;
  for(let i=0;i<count;i++){
   if((i%3===0)!==front)continue;
   const seed=hash(i+5),speed=.6+hash(i+150)*.8,age=((ms*.00033*speed+seed)%1),angle=i*2.399+ms*.00035+s.swirl*3.8;
   const r=u*(.5+(1-age)*(.25+seed*.48))*(1-s.collapse*.95),x=p.x+Math.cos(angle)*r,y=p.y+Math.sin(angle)*r*.94;
   const a=fade*Math.sin(age*Math.PI)*(front?.85:.4),sz=u*(front?.009:.004)*(kind==='astral'?1.2:.85)*(1-s.collapse*.8);
   if(front&&i%6===0)spark(c,x,y,sz*(1+seed),angle,a);
   else{c.save();c.globalAlpha=a;c.fillStyle=front?'#f3dfff':'#a26dd4';c.beginPath();c.ellipse(x,y,Math.max(.4,sz),Math.max(.25,sz*.4),angle,0,TAU);c.fill();c.restore();}
  }
  // A handful of broad opaque drops preserve the chosen ink silhouette.
  for(let i=0;i<7;i++){if((i%2===0)!==front)continue;const a=i*2.399+ms*.0015+s.swirl*2.2,r=u*(.54+(i%3)*.10)*(1-s.collapse)**.68,sz=u*.018*(1-s.collapse);c.save();c.globalAlpha=fade*smooth(860,1300,ms);c.translate(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r);c.rotate(a);shape(c,[{x:-sz*1.8,y:0},{x:sz*.4,y:-sz},{x:sz,y:0},{x:sz*.4,y:sz}],i%3===0?'#c597df':'#3e1555');c.restore();}
 }
 private receiver(c:C,p:P,u:number,ms:number,light:boolean){
  const r=u*.28,s=state(ms);c.save();c.translate(p.x,p.y);c.rotate(-.3);glow(c,0,0,r*1.65,light?'#60427c':'#9264bc',.14+s.arrival*.1);c.fillStyle='#0c0515';c.beginPath();c.ellipse(0,0,r*.86,r*.27,0,0,TAU);c.fill();for(let j=0;j<3;j++){const pts:P[]=[];for(let i=0;i<=30;i++){const a=j*2.1+i/30*2.2+ms*.00013;pts.push({x:Math.cos(a)*r,y:Math.sin(a)*r*.31});}ribbon(c,pts,r*.015,'#b185d7');}c.restore();
 }
}

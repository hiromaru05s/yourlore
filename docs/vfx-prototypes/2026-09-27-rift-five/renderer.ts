import {riftTrailPosition} from '../../../client/src/ui/riftTransmute';
export const DURATION=2200;
export const variants=[
 {id:'lens',name:'重力レンズ',en:'GRAVITATIONAL LENS',description:'光の筋が層を重ね、深い黒へ巻き込まれる。内側と外側の速度差で、重力の強さを描く。',look:'暗い中心を残したまま細い光が加速。手前を横切る帯と奥に沈む帯の差が、渦に奥行きを作る。'},
 {id:'veil',name:'魔力のヴェール',en:'ARCANE VEIL',description:'幅のある魔力の帯が、柔らかな布のようにカードを包む。細い尾を遅らせながら、最後は鋭く絞り込む。',look:'大きな色面と細い縁、前後の重なり。全体を同時に縮めず、帯の先端が遅れて追いつく。'},
 {id:'fracture',name:'次元の断片',en:'DIMENSIONAL FRACTURE',description:'黒紫のカード面に光が走り、角張った断片が渦へほどける。短い静止から、一気に吸い込まれる。',look:'角のある主形状と、遅れて消える微小な破片。断片は外へ爆発せず、中心へ向かって収束する。'},
 {id:'ink',name:'流墨',en:'FLOWING INK',description:'濃い黒紫の流体が、筆のような太細を残して巻き込まれる。縁が裂け、しずく状の小片へほどける。',look:'太い流れから細い尾への変化。輪郭の欠けと、少数の離れた小片でToonらしい消え方を作る。'},
 {id:'eclipse',name:'蝕の収束',en:'ECLIPSE COLLAPSE',description:'三日月状の面が逆方向へ噛み合い、中央を閉じる。溜めの後の急収束と、細い残光が余韻を作る。',look:'五案の中で最も強い緩急。明るさのピークを一点に集め、細い余韻を時間差で消す。'},
] as const;
export type Variant=typeof variants[number]['id'];
export type P={x:number;y:number};
type C=CanvasRenderingContext2D;
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
const TAU=Math.PI*2;
export function state(ms:number,kind:Variant='lens'){const swirl=kind==='fracture'?smooth(820,1440,ms):kind==='veil'?smooth(660,1490,ms):kind==='ink'?smooth(700,1470,ms):kind==='eclipse'?smooth(830,1470,ms):smooth(730,1490,ms);const vanish=kind==='eclipse'?smooth(1280,1500,ms):kind==='fracture'?smooth(1220,1500,ms):kind==='veil'?smooth(1080,1500,ms):smooth(1160,1500,ms);return {lift:smooth(0,340,ms),coat:smooth(270,680,ms),swirl,vanish,travel:clamp((ms-1500)/370)**1.65,arrival:smooth(1840,1900,ms)*(1-smooth(1930,2190,ms)),phase:ms<340?0:ms<730?1:ms<1500?2:ms<1870?3:4};}
function polygon(c:C,points:P[],color:string|CanvasGradient){if(!points.length)return;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=color;c.fill();}
function line(c:C,points:P[],color:string,width:number){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function glow(c:C,p:P,r:number,color:string,alpha:number){if(r<=0||alpha<=0)return;c.save();c.globalAlpha*=alpha;const g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,color);g.addColorStop(1,color.slice(0,7)+'00');c.fillStyle=g;c.fillRect(p.x-r,p.y-r,r*2,r*2);c.restore();}
function band(c:C,pts:P[],thickness:number,color:string|CanvasGradient,taper=1){const a:P[]=[],b:P[]=[];for(let i=0;i<pts.length;i++){const p=pts[i],prev=pts[Math.max(0,i-1)],next=pts[Math.min(pts.length-1,i+1)],dx=next.x-prev.x,dy=next.y-prev.y,d=Math.hypot(dx,dy)||1;const q=i/(pts.length-1),w=thickness*Math.sin(Math.PI*q)**taper;a.push({x:p.x-dy/d*w,y:p.y+dx/d*w});b.unshift({x:p.x+dy/d*w,y:p.y-dx/d*w});}polygon(c,[...a,...b],color);}
function spiral(c:C,r:number,angle:number,span:number,w:number,color:string|CanvasGradient,flatten=1,angular=false){const p:P[]=[];const n=angular?10:64;for(let i=0;i<=n;i++){const q=i/n,a=angle+q*span,rad=r*(.48+.52*q);p.push({x:Math.cos(a)*rad,y:Math.sin(a)*rad*flatten});}band(c,p,w,color,.7);}
function triangle(c:C,im:HTMLCanvasElement,src:P[],dst:P[]){const [a,b,d]=src,[p,q,r]=dst,den=(b.x-a.x)*(d.y-a.y)-(d.x-a.x)*(b.y-a.y);if(Math.abs((q.x-p.x)*(r.y-p.y)-(r.x-p.x)*(q.y-p.y))<.008)return;const aa=((q.x-p.x)*(d.y-a.y)-(r.x-p.x)*(b.y-a.y))/den,bb=((q.y-p.y)*(d.y-a.y)-(r.y-p.y)*(b.y-a.y))/den,cc=((r.x-p.x)*(b.x-a.x)-(q.x-p.x)*(d.x-a.x))/den,dd=((r.y-p.y)*(b.x-a.x)-(q.y-p.y)*(d.x-a.x))/den;c.save();c.beginPath();const mid={x:(p.x+q.x+r.x)/3,y:(p.y+q.y+r.y)/3};dst.forEach((v,i)=>{const dx=v.x-mid.x,dy=v.y-mid.y,l=Math.hypot(dx,dy)||1,x=v.x+dx/l*.4,y=v.y+dy/l*.4;i?c.lineTo(x,y):c.moveTo(x,y);});c.closePath();c.clip();c.transform(aa,bb,cc,dd,p.x-aa*a.x-cc*a.y,p.y-bb*a.x-dd*a.y);c.drawImage(im,0,0);c.restore();}
export class RiftRenderer {
 private mixed=document.createElement('canvas');private coat=document.createElement('canvas');
 constructor(){this.mixed.width=this.coat.width=320;this.mixed.height=this.coat.height=480;}
 private texture(face:HTMLCanvasElement,kind:Variant,ms:number){
  const c=this.coat.getContext('2d')!,m=this.mixed.getContext('2d')!,s=state(ms,kind),w=320,h=480;
  c.clearRect(0,0,w,h);c.globalCompositeOperation='source-over';c.drawImage(face,0,0,w,h);c.globalCompositeOperation='source-in';
  const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#9470b2');g.addColorStop(.19,'#39264f');g.addColorStop(.51,'#06050d');g.addColorStop(.78,'#20142e');g.addColorStop(1,'#725093');c.fillStyle=g;c.fillRect(0,0,w,h);
  c.globalCompositeOperation='source-atop';c.save();c.translate(w/2,h/2);
  // Material detail belongs to the card itself; the mesh warps both detail and silhouette.
  for(let i=0;i<11;i++){const r=34+i*20,a=i*2.399+ms*.0003;spiral(c,r,a,3.8,1+i*.25,i%3===0?'#b199d9':'#65487d',1.3,kind==='fracture');}
  const core=c.createRadialGradient(0,0,5,0,0,110);core.addColorStop(0,'#030309');core.addColorStop(.32,'#090512');core.addColorStop(1,'#08041000');c.fillStyle=core;c.fillRect(-160,-240,320,480);c.restore();c.globalCompositeOperation='source-over';
  m.clearRect(0,0,w,h);m.globalAlpha=1;m.drawImage(face,0,0,w,h);m.globalAlpha=s.coat;m.drawImage(this.coat,0,0);m.globalAlpha=1;return this.mixed;
 }
 draw(c:C,face:HTMLCanvasElement,kind:Variant,source:P,sink:P,width:number,ms:number,options:{baseline?:boolean;light?:boolean;receiver?:boolean;heightRatio?:number}={}){
  const s=state(ms,kind),baseline=options.baseline??false,u=width,center={x:source.x,y:source.y-u*.19*s.lift},q=s.swirl;
  c.save();
  // Ground response is low contrast and tied to the source; no screen wash.
  if(ms<1500){c.save();c.globalAlpha=.20*(1-s.vanish);c.fillStyle=options.light?'#392c45':'#000';c.beginPath();c.ellipse(source.x,source.y+u*.69,u*(.37+.07*s.lift),u*.085,0,0,TAU);c.fill();c.restore();}
  if(!baseline&&ms<1500)glow(c,center,u*.9,'#8b50d4',.16*s.coat*(1-s.vanish));
  if(options.receiver)this.receiver(c,sink,u*.28,ms,kind,options.light??false);
  const remaining=1-s.vanish;
  if(ms<1500){
   // Rear layer before the card; foreground after it. This is what gives depth.
   if(!baseline)this.details(c,kind,center,u,ms,false);
   const texture=this.texture(face,kind,ms),cols=width<85?9:16,rows=width<85?13:24;
   const ratio=options.heightRatio??1.5,verts:P[]=[],uv:P[]=[];
   for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){
    let dx=(x/cols-.5)*u*(1-s.lift*.12),dy=(y/rows-.5)*u*ratio*(1-s.lift*.12);
    const r=Math.hypot(dx,dy),norm=r/u,round=smooth(0,.4,q),rounded=u*.5*(1-Math.exp(-r/(u*.5)*1.4));
    let radius=(r+(Math.min(r,rounded)-r)*round)*remaining**.68;
    const twist=kind==='ink'?5.8:kind==='veil'?3.3:kind==='eclipse'?2.5:4.4;
    let angle=Math.atan2(dy,dx)-s.lift*.03+q*twist+q*3.8*(1-clamp(norm));
    if(kind==='fracture'){angle+=Math.sin(Math.floor(x/3)*2+Math.floor(y/3)*3)*q*.07;radius*=1+Math.sin(x*.9+y*.7)*q*.035;}
    if(kind==='veil')radius*=1+Math.sin(angle*3+ms*.005)*q*.05;
    if(kind==='ink')radius*=1+Math.sin(angle*5+norm*12-ms*.004)*q*.07;
    const squeeze=kind==='eclipse'?1-smooth(.56,.97,q)*.65:1;
    verts.push({x:center.x+Math.cos(angle)*radius*squeeze,y:center.y+Math.sin(angle)*radius});uv.push({x:x/cols*320,y:y/rows*480});
   }
   for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+1,d=a+cols+1,e=d+1;triangle(c,texture,[uv[a],uv[b],uv[e]],[verts[a],verts[b],verts[e]]);triangle(c,texture,[uv[a],uv[e],uv[d]],[verts[a],verts[e],verts[d]]);}
   if(!baseline)this.details(c,kind,center,u,ms,true);
  }
  // Same immediate departure for all five: no crystal and no floating object.
  if(ms>=1500&&ms<2010){const origin={x:source.x,y:source.y-u*.19},distance=Math.hypot(sink.x-origin.x,sink.y-origin.y),length=Math.min(.55,u*.8/Math.max(1,distance))*(1-smooth(1870,2010,ms)),to=s.travel;
   for(let layer=0;layer<(baseline?2:3);layer++){const pts:P[]=[];const from=Math.max(0,to-length+layer*length*.12);for(let i=0;i<=30;i++)pts.push(riftTrailPosition(origin,sink,from+(to-from)*i/30));c.globalAlpha=1-smooth(1870,2010,ms);band(c,pts,u*(layer===0?.028:layer===1?.015:.004),['#291333','#9c76ca','#efdcff'][layer]);}
  }
  if(!baseline&&s.arrival>0){c.save();c.translate(sink.x,sink.y);c.globalAlpha=s.arrival;const t=smooth(1850,2200,ms);for(let i=0;i<3;i++)spiral(c,u*(.16+t*.29),i*2.1+t*.4,.9,u*.018*(1-t),i===0?'#e8d6fc':'#9670c0',.55,kind==='fracture');c.restore();glow(c,sink,u*.48,'#9d76d4',s.arrival*.22);}
  c.restore();
 }
 private details(c:C,kind:Variant,center:P,u:number,ms:number,front:boolean){
  const s=state(ms,kind),q=s.swirl,appear=smooth(440,760,ms),death=1-smooth(1360,1530,ms),alpha=appear*death;if(alpha<=0)return;
  c.save();c.translate(center.x,center.y);c.globalAlpha=alpha;
  const r=u*(.5+.055*Math.sin(q*Math.PI))*(1-s.vanish)**.68,turn=ms*.0014+q*3.8;
  const sheen=c.createLinearGradient(-r,-r,r,r);sheen.addColorStop(0,'#3a244f');sheen.addColorStop(.24,'#7a509f');sheen.addColorStop(.46,'#bd94dc');sheen.addColorStop(.58,'#9168b3');sheen.addColorStop(1,'#362046');
  const fine=c.createLinearGradient(-r,r,r,-r);fine.addColorStop(0,'#5d417c');fine.addColorStop(.44,'#d9bef6');fine.addColorStop(.51,'#fff0ff');fine.addColorStop(.64,'#c7a5e6');fine.addColorStop(1,'#553275');
  if(kind==='lens'){
   for(let i=0;i<9;i++){if((i%2===0)!==front)continue;const a=i*2.399-turn*(i%3===0?1.25:.85),rad=r*(.87+i*.024),color=i%3===0?fine:i%3===1?sheen:'#533270';spiral(c,rad,a,2.7,u*(i%3===0?.005:.012)*(1-s.vanish),color,.73);}
   if(front){glow(c,{x:-r*.48,y:r*.1},r*.34,'#b38af4',.6);glow(c,{x:r*.38,y:-r*.18},r*.17,'#eee0ff',.38);}
  }else if(kind==='veil'){
   for(let i=0;i<6;i++){if((i%2===0)!==front)continue;const a=i*TAU/3+turn*(i<3?1:-.67),rad=r*(.95+i*.015),pts:P[]=[];for(let j=0;j<=55;j++){const t=j/55,ang=a+t*3.3,rr=rad*(.55+t*.52);pts.push({x:Math.cos(ang)*rr,y:Math.sin(ang)*rr*.78+Math.sin(t*Math.PI*2+turn)*u*.07});}band(c,pts,u*.09*(1-s.vanish),i%3===0?sheen:i%3===1?'#513069':sheen);band(c,pts.map(p=>({x:p.x,y:p.y-u*.017})),u*.009*(1-s.vanish),fine);}
  }else if(kind==='fracture'){
   for(let i=0;i<17;i++){if((i%2===0)!==front)continue;const a=i*2.399+turn*.6,rr=r*(.82+(i%4)*.09),size=u*(.03+(i%3)*.014)*(1-s.vanish);c.save();c.translate(Math.cos(a)*rr,Math.sin(a)*rr*.93);c.rotate(a+1.4);polygon(c,[{x:-size,y:-size*.4},{x:size*.15,y:-size*.7},{x:size*1.2,y:0},{x:-size*.6,y:size*.5}],i%3===0?'#cbb1ee':i%3===1?'#6b448c':'#392448');line(c,[{x:-size,y:-size*.4},{x:size*.15,y:-size*.7},{x:size*1.2,y:0}],'#e2cafa',u*.003);c.restore();}
   for(let i=0;i<3;i++)spiral(c,r*.88,i*2.1+turn,1.8,u*.012,'#b591dd',.9,true);
  }else if(kind==='ink'){
   for(let i=0;i<7;i++){if((i%2===0)!==front)continue;const a=i*2.4+turn,rr=r*(.8+(i%3)*.1);spiral(c,rr,a,3.7,u*(.034+(i%3)*.023)*(1-s.vanish),i%3===0?sheen:i%3===1?'#3b214d':'#180c25',.84);spiral(c,rr*1.01,a+.15,2.4,u*.008*(1-s.vanish),fine,.84);}
   for(let i=0;i<8;i++){if((i%2===0)!==front)continue;const a=i*2.399+turn*.8,rr=r*(1.12+(i%3)*.12),sz=u*.022*(1-s.vanish);c.save();c.translate(Math.cos(a)*rr,Math.sin(a)*rr*.84);c.rotate(a);c.fillStyle=i%2?'#8f60b4':'#412252';c.beginPath();c.ellipse(0,0,sz*1.7,sz,0,0,TAU);c.fill();c.restore();}
  }else{
   for(let i=0;i<4;i++){if((i%2===0)!==front)continue;const a=i*Math.PI/2+(i%2?-1:1)*turn*.65;spiral(c,r*(1+i*.018),a,2.3,u*.055*(1-s.vanish),i%2?sheen:'#422955',.96);spiral(c,r*1.01,a,2.1,u*.007*(1-s.vanish),fine,.96);}
   if(front){const p=smooth(1200,1300,ms)*(1-smooth(1320,1500,ms));c.globalAlpha=p;glow(c,{x:0,y:0},u*.45,'#bda0ed',.7);polygon(c,[{x:-u*.43*p,y:0},{x:0,y:-u*.013},{x:u*.43*p,y:0},{x:0,y:u*.013}],'#f4e6ff');}
  }
  // Small sparks follow coherent inward spirals; never independently random per frame.
  if(!front){for(let i=0;i<12;i++){const phase=(i*.618+ms*.0003)%1,ang=i*2.399+turn*.52,rr=r*(1.02+.7*(1-phase)),size=u*.007*(1-phase)*death;c.globalAlpha=alpha*Math.sin(phase*Math.PI)*.8;c.fillStyle='#c7a3e9';c.beginPath();c.ellipse(Math.cos(ang)*rr,Math.sin(ang)*rr*.9,size,size*.6,ang,0,TAU);c.fill();}}
  c.restore();
 }
 private receiver(c:C,p:P,r:number,ms:number,kind:Variant,light:boolean){
  const s=state(ms);c.save();c.translate(p.x,p.y);const g=c.createRadialGradient(0,0,0,0,0,r*1.7);g.addColorStop(0,light?'#37233d40':'#a078d428');g.addColorStop(1,'#62428100');c.fillStyle=g;c.fillRect(-r*2,-r*2,r*4,r*4);c.rotate(-.25);c.fillStyle='#0c0716';c.beginPath();c.ellipse(0,0,r*.85,r*.32,0,0,TAU);c.fill();for(let i=0;i<3;i++)spiral(c,r*(.9+i*.06),i*2.1+ms*.00012,2.3,r*(.024+s.arrival*.06),i===0?'#b08bd8':'#5d3c7f',.37,kind==='fracture');c.restore();
 }
}

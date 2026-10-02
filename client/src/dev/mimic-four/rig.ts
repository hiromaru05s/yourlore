export const DURATION=3200;
export const patterns=[
 {name:'跳ね蓋',description:'上半分が跳ね上がり、下顎を支点にひと吠え。素早く噛み合って戻る。'},
 {name:'大口',description:'上下が大きく離れ、奥の口腔と牙を見せて長く吠える。ゆっくり閉じる。'},
 {name:'ひねり顎',description:'片端からこじ開けるように上下がねじれ、斜めの大口で威嚇して戻る。'},
 {name:'喰らいつき',description:'一度身を縮め、前へせり出して大きく吠える。重い顎を閉じて静まる。'},
];
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export function ease(a:number,b:number,t:number){const u=clamp((t-a)/(b-a));return u*u*(3-2*u);}
type Point={x:number;y:number};
export function pose(time:number,variant:number,reduced=false){
 const timings=[[630,950,1510,2000],[610,1130,1680,2280],[640,1090,1650,2160],[760,1010,1550,2090]][variant-1];
 const [a,b,c,d]=timings;const open=ease(a,b,time)*(1-ease(c,d,time));
 const roar=ease(b-80,b+120,time)*(1-ease(c-80,c+100,time));
 const tremble=Math.sin((time-b)*.035)*roar*(variant===4?1.9:.7);
 const prep=Math.sin(Math.PI*ease(440,a,time))*(1-ease(a,a+30,time));
 const yaw=variant===3?open*9*(1-.45*ease(1100,1500,time)):0;
 const gap=open*[68,99,82,85][variant-1]*(reduced?.48:1);
 return {open,gap,upper:variant===1?.88:variant===4?.7:.53,topAngle:variant===3?-yaw:variant===1?-open*1.8:0,bottomAngle:variant===3?yaw*.8:0,roar,dx:reduced?0:tremble,dy:reduced?0:prep*4-(variant===4?open*9:0),scale:reduced?1:1-prep*.045+(variant===4?open*.13:open*.025),squash:reduced?1:1-prep*.055,tilt:reduced?0:variant===3?open*-2:variant===4?Math.sin(time*.023)*roar*.65:0};
}
export class MimicRig{
 readonly node=document.createElement('div');private body=document.createElement('div');private top=document.createElement('div');private bottom=document.createElement('div');private canvas=document.createElement('canvas');private shadow=document.createElement('div');
 constructor(card:HTMLElement){
  this.node.className='m4-rig';this.node.style.cssText='position:fixed;left:0;top:0;width:180px;height:280px;transform-origin:0 0;pointer-events:none;z-index:180;';
  this.body.style.cssText='position:absolute;inset:0;transform-origin:50% 55%;';
  this.shadow.style.cssText='position:absolute;left:8px;top:271px;width:164px;height:15px;background:radial-gradient(ellipse,#0c080c66,transparent 70%);transform-origin:center;';
  this.canvas.width=480;this.canvas.height=800;this.canvas.style.cssText='position:absolute;width:240px;height:400px;left:-30px;top:-60px;z-index:0';
  for(const [half,lower]of [[this.top,false],[this.bottom,true]]as const){
   // Leave the original cost/stat badges outside the card rectangle intact.
   half.style.cssText=`position:absolute;left:-16px;top:${lower?140:-16}px;width:212px;height:156px;overflow:hidden;transform-origin:106px ${lower?0:156}px;z-index:2;`;
   const face=card.cloneNode(true)as HTMLElement;face.removeAttribute('data-uid');face.style.cssText=`position:absolute;left:16px;top:${lower?-140:16}px;margin:0;width:180px;height:280px;--cw:180px;--ch:280px;opacity:1;visibility:visible;transform:none;transition:none;animation:none;pointer-events:none;`;
   face.querySelectorAll('[data-uid]').forEach(n=>n.removeAttribute('data-uid'));half.append(face);
  }
  this.body.append(this.canvas,this.top,this.bottom);this.node.append(this.shadow,this.body);
 }
 async ready(){await Promise.all([...this.node.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));}
 draw(time:number,variant:number,reduced=false){
  const p=pose(time,variant,reduced);this.node.dataset.open=String(p.open);this.node.dataset.variant=String(variant);
  this.body.style.transform=`translate(${p.dx}px,${p.dy}px) rotate(${p.tilt}deg) scale(${p.scale},${p.scale*p.squash})`;
  this.top.style.transform=`translateY(${-p.gap*p.upper}px) rotate(${p.topAngle}deg) scaleY(${1-p.open*.08})`;
  this.bottom.style.transform=`translateY(${p.gap*(1-p.upper)}px) rotate(${p.bottomAngle}deg) scaleY(${1-p.open*.035})`;
  this.shadow.style.transform=`scale(${1+p.open*.22},${1-p.open*.25})`;this.shadow.style.opacity=String(.5+p.open*.2);
  const c=this.canvas.getContext('2d')!;c.setTransform(2,0,0,2,60,120);c.clearRect(-30,-60,240,400);if(p.gap<.05)return;
  const edge=(x:number,upper:boolean):Point=>{const a=(upper?p.topAngle:p.bottomAngle)*Math.PI/180;return{x:90+(x-90)*Math.cos(a),y:140+(upper?-p.gap*p.upper:p.gap*(1-p.upper))+(x-90)*Math.sin(a)};};
  const tl=edge(3,true),tr=edge(177,true),bl=edge(3,false),br=edge(177,false),mid=(tl.y+tr.y+bl.y+br.y)/4;
  c.save();c.beginPath();c.moveTo(tl.x,tl.y);c.lineTo(tr.x,tr.y);c.bezierCurveTo(170,mid-5,170,mid+7,br.x,br.y);c.lineTo(bl.x,bl.y);c.bezierCurveTo(9,mid+7,9,mid-5,tl.x,tl.y);c.closePath();
  const cavity=c.createRadialGradient(91,mid-6,5,90,mid,104);cavity.addColorStop(0,'#080507');cavity.addColorStop(.47,'#190b10');cavity.addColorStop(.77,'#472021');cavity.addColorStop(1,'#886142');c.fillStyle=cavity;c.fill();c.clip();
  // The tongue and palate stay within the mouth; the darkness is the cavity itself.
  c.globalAlpha=p.open;
  for(let i=0;i<4;i++){c.strokeStyle=`rgba(126,67,59,${.3-i*.045})`;c.lineWidth=2.8-i*.4;c.beginPath();c.ellipse(90,mid+11,46-i*8,Math.max(3,p.gap*.25-i*3),0,Math.PI,Math.PI*2);c.stroke();}
  const tongueWidth=variant===2?47:variant===4?32:37,tongueTop=mid+p.gap*.035-Math.sin(ease(1060,1500,time)*Math.PI)*p.roar*(variant===2?12:4);
  const flesh=c.createLinearGradient(90,tongueTop,90,br.y+8);flesh.addColorStop(0,'#b87965');flesh.addColorStop(.35,'#8b4944');flesh.addColorStop(1,'#3b191e');c.fillStyle=flesh;c.beginPath();c.moveTo(90-tongueWidth,br.y+12);c.bezierCurveTo(90-tongueWidth-9,tongueTop+10,90-23,tongueTop-3,90,tongueTop);c.bezierCurveTo(113,tongueTop-3,90+tongueWidth+9,tongueTop+10,90+tongueWidth,br.y+12);c.fill();
  c.strokeStyle='#e0ad8466';c.lineWidth=1.4;c.beginPath();c.moveTo(91,tongueTop+5);c.bezierCurveTo(85,tongueTop+15,98,br.y-8,91,br.y+9);c.stroke();
  for(const upper of [true,false]){
   const left=edge(0,upper),right=edge(180,upper),sign=upper?1:-1;
   c.beginPath();c.moveTo(left.x,left.y-sign*3);c.lineTo(right.x,right.y-sign*3);c.lineTo(right.x,right.y+sign*8);c.quadraticCurveTo(90,(left.y+right.y)/2+sign*12,left.x,left.y+sign*8);c.closePath();c.fillStyle=upper?'#6b382e':'#82493a';c.fill();
   const count=variant===4?7:9;
   for(let i=0;i<count;i++){
    const x=12+i*(156/(count-1))+(upper?0:6),root=edge(Math.min(174,x),upper);
    const fang=variant===4?(i===1||i===5):i===2||i===count-3;
    const length=(fang?(variant===4?34:27):13+(i*7%9))*(upper?1:.83);
    this.tooth(c,root.x,root.y+sign*3,(fang?9:7.5),length,sign,(i%2?1:-1)*(fang?4:2));
   }
   c.beginPath();c.moveTo(left.x,left.y);c.lineTo(right.x,right.y);c.strokeStyle='#382718';c.lineWidth=3;c.stroke();c.strokeStyle='#ccac70';c.lineWidth=.8;c.stroke();
   for(const x of [7,173]){const q=edge(x,upper);c.fillStyle='#e4c38e';c.fillRect(q.x-1,q.y-1,2,2);}
  }
  c.restore();
 }
 private tooth(c:CanvasRenderingContext2D,x:number,y:number,w:number,l:number,sign:number,lean:number){
  c.save();c.translate(x,y);c.scale(1,sign);c.beginPath();c.moveTo(-w,0);c.quadraticCurveTo(-w*.75,l*.58,lean,l);c.quadraticCurveTo(w*.8,l*.55,w,0);c.quadraticCurveTo(0,-4,-w,0);c.closePath();const enamel=c.createLinearGradient(-w,0,w,l*.2);enamel.addColorStop(0,'#746044');enamel.addColorStop(.24,'#c4af81');enamel.addColorStop(.5,'#fff0c4');enamel.addColorStop(.77,'#d7c29a');enamel.addColorStop(1,'#907757');c.fillStyle=enamel;c.shadowColor='#070307aa';c.shadowBlur=2;c.shadowOffsetY=2;c.fill();c.shadowBlur=0;c.shadowOffsetY=0;c.strokeStyle='#362319';c.lineWidth=.65;c.stroke();c.beginPath();c.moveTo(-w*.3,2);c.quadraticCurveTo(-w*.2,l*.35,lean,l-3);c.strokeStyle='#fff7d899';c.lineWidth=.8;c.stroke();c.restore();
 }
 dispose(){this.node.remove();}
}

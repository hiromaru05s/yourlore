/** Selected 02, 血脈の鼓動. Frozen from the approved five-way comparison. */
export const BLOOD_RITE_DURATION=1550, BLOOD_RITE_HEAL=420;
const TAU=Math.PI*2;
const ease=(a:number,b:number,t:number)=>{const q=Math.max(0,Math.min(1,(t-a)/(b-a)));return q*q*(3-2*q);};
export const bloodRiteActivation=(t:number)=>ease(0,140,t)*(1-ease(650,1190,t));
 function paint(c:CanvasRenderingContext2D,path:Path2D,top=-65,bottom=65,alpha=1){
  c.save();c.globalAlpha*=alpha;const g=c.createLinearGradient(-30,top,35,bottom);g.addColorStop(0,'#f27474');g.addColorStop(.13,'#af172f');g.addColorStop(.43,'#62091f');g.addColorStop(.7,'#ba213c');g.addColorStop(.82,'#e74751');g.addColorStop(1,'#300714');c.fillStyle=g;c.fill(path);c.strokeStyle='#540b20';c.lineWidth=.85;c.stroke(path);
  c.save();c.clip(path);const sheen=c.createLinearGradient(-60,-25,45,20);sheen.addColorStop(0,'#ffb6a500');sheen.addColorStop(.44,'#ffb6a500');sheen.addColorStop(.51,'#ffd4c966');sheen.addColorStop(.57,'#ffb6a500');sheen.addColorStop(1,'#ffb6a500');c.fillStyle=sheen;c.fillRect(-100,-100,200,200);c.restore();c.restore();
 }
 function stroke(c:CanvasRenderingContext2D,points:number[][],width:number,alpha=1){if(width<.05)return;c.save();c.globalAlpha*=alpha;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle='#43081c';c.lineWidth=width+1.6;c.stroke();c.strokeStyle='#a51c37';c.lineWidth=width;c.stroke();c.strokeStyle='#f88987';c.lineWidth=Math.max(.55,width*.18);c.stroke();c.restore();}
export function drawBloodRite(c:CanvasRenderingContext2D,t:number,reduced=false){
 if(t<=0||t>=BLOOD_RITE_DURATION)return;
 const grow=ease(0,260,t),close=ease(440,1060,t),end=1-ease(1120,1490,t),beat=Math.pow(Math.sin(Math.PI*ease(210,670,t)),2);
  // Keep the HP shield and number readable; the surrounding blood belongs to this icon.
  c.save();const mask=new Path2D();mask.rect(-110,-110,220,220);mask.moveTo(-28,-32);mask.quadraticCurveTo(-8,-31,0,-41);mask.quadraticCurveTo(8,-31,28,-32);mask.lineTo(25,8);mask.quadraticCurveTo(19,28,0,42);mask.quadraticCurveTo(-19,28,-25,8);mask.closePath();c.clip(mask,'evenodd');
  const glow=c.createRadialGradient(0,6,20,0,6,77);glow.addColorStop(0,`rgba(214,33,61,${.19*grow*end})`);glow.addColorStop(1,'#d5213d00');c.fillStyle=glow;c.fillRect(-80,-80,160,160);
  if(reduced){stroke(c,[[-31,-29],[-37,5],[-21,32],[0,43],[21,32],[37,5],[31,-29]],3,grow*end);c.restore();return;}
   const roots=[[-28,-17],[-20,29],[27,-13],[22,27],[0,-36]];
   for(let j=0;j<roots.length;j++){const [x,y]=roots[j],ang=Math.atan2(y,x),reach=(22+7*Math.sin(j*2))*grow*(1-close*.8),dx=Math.cos(ang),dy=Math.sin(ang);const pts=[[x,y],[x+dx*reach*.4-dy*5,y+dy*reach*.4+dx*5],[x+dx*reach,y+dy*reach]];stroke(c,pts,3.8+beat*2.4,end);const elbow=pts[1];stroke(c,[elbow,[elbow[0]+dx*reach*.55-dy*12*grow,elbow[1]+dy*reach*.55+dx*12*grow]],2.1,end);const pulse=1-ease(260+j*25,780+j*25,t),px=x+dx*reach*pulse,py=y+dy*reach*pulse;const p=new Path2D();p.ellipse(px,py,4+beat*2,2.6,ang,0,TAU);paint(c,p,py-7,py+7,end);}

  c.restore();
  const heal=ease(410,510,t)*(1-ease(770,1150,t));if(heal>0){c.save();c.strokeStyle=`rgba(255,202,174,${heal})`;c.lineWidth=1.6;c.beginPath();c.moveTo(-28,-30);c.quadraticCurveTo(0,-40,28,-30);c.stroke();c.restore();}
 }

import {ease} from './timing';
type C=CanvasRenderingContext2D;
const TAU=Math.PI*2;
/** Six sources feed a physically layered, engraved seal. No random per-frame geometry. */
export function victory(c:C,ms:number,x:number,y:number,r:number,reduced=false){
 const t=ms/1000,charge=ease(.1,1.3,t),reveal=ease(.8,2.35,t),release=1-ease(3.65,4.8,t),power=charge*release;
 if(power<=0)return;
 c.save();c.translate(x,y);c.scale(r/230,r/230);
 const floor=c.createRadialGradient(0,20,10,0,20,280);floor.addColorStop(0,`rgba(242,181,56,${power*.22})`);floor.addColorStop(1,'rgba(125,73,20,0)');c.fillStyle=floor;c.fillRect(-300,-230,600,460);
 c.save();c.scale(1,.58);
 // Contact shadow, bronze recess, warm reflected light, thin emissive inlay.
 for(let layer=0;layer<3;layer++){
  c.save();c.translate(0,reduced?0:-layer*18*reveal);c.rotate((layer%2?-1:1)*t*(reduced?0:.035));
  const rad=215-layer*48;c.globalAlpha=power;
  for(const [offset,width,color] of [[2,3.5,'#3e321f'],[1,1.8,'#b68845'],[0,1,'#fff1bd']] as const){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(0,offset,rad,-Math.PI/2,-Math.PI/2+TAU*charge);c.stroke();c.beginPath();c.arc(0,offset,rad-13,-Math.PI/2,-Math.PI/2+TAU*charge);c.stroke();}
  // Continuous metal annulus with reflected highlights and fine engraved scratches.
  const metal=c.createLinearGradient(-rad,-rad,rad,rad);metal.addColorStop(0,'#f0d296');metal.addColorStop(.23,'#675438');metal.addColorStop(.46,'#c29959');metal.addColorStop(.58,'#f3d59a');metal.addColorStop(.8,'#796141');metal.addColorStop(1,'#be9859');
  c.fillStyle=metal;c.globalAlpha=power*.75;c.beginPath();c.arc(0,0,rad-3,-Math.PI/2,-Math.PI/2+TAU*charge);c.arc(0,0,rad-12,-Math.PI/2+TAU*charge,-Math.PI/2,true);c.closePath();c.fill();c.globalAlpha=power;
  for(let i=0;i<144;i++){const a=i*TAU/144;c.strokeStyle=i%5===0?'#ffe6a7':'#705636';c.lineWidth=.4;c.beginPath();c.arc(0,0,rad-5-(i%4),a,a+.009);c.stroke();}
  for(let i=0;i<72;i++){
   if(i/72>charge)continue;const a=i*TAU/72;c.save();c.rotate(a);c.strokeStyle=i%6===0?'#fff0bd':'#bc995d';c.lineWidth=i%6===0?1.2:.65;c.beginPath();c.moveTo(rad-4,0);c.lineTo(rad-(i%6===0?10:7),0);c.stroke();
   // Invented runes cut in bronze: each glyph has a different deterministic branch.
   if(i%2===0){c.translate(rad-23,0);c.strokeStyle='#6e522b';c.lineWidth=1.8;c.beginPath();c.moveTo(-3,-3);c.lineTo(3,0);c.lineTo(-2,4);c.moveTo(0,-5);c.lineTo(0,5);if(i%3===0){c.moveTo(-3,2);c.lineTo(3,-3);}c.stroke();c.translate(-.5,-.65);c.strokeStyle='#fff0ba';c.lineWidth=.7;c.stroke();}c.restore();}
  c.strokeStyle='#976c30';c.lineWidth=1.5;
  for(const phase of [0,Math.PI/3]){c.beginPath();for(let i=0;i<=3;i++){const a=phase+i*TAU/3-Math.PI/2,xx=Math.cos(a)*(rad-39)*reveal,yy=Math.sin(a)*(rad-39)*reveal;i?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.stroke();}
  for(let i=0;i<6;i++){const a=i*TAU/6,xx=Math.cos(a)*(rad-35),yy=Math.sin(a)*(rad-35);c.beginPath();c.arc(xx,yy,7*reveal,0,TAU);c.stroke();}
  // Interlaced fine arches add readable filigree inside each major ring.
  c.strokeStyle='#b98c43';c.lineWidth=.7;c.globalAlpha=power*.9;
  for(let j=0;j<12;j++){c.save();c.rotate(j*TAU/12);c.beginPath();c.moveTo(rad-41,0);c.bezierCurveTo(rad-66,-22,rad-91,22,rad-114,0);c.bezierCurveTo(rad-91,-22,rad-66,22,rad-41,0);c.stroke();c.restore();}
  c.restore();
 }
 // Engraved radial connectors make the six sources part of one structure.
 c.globalAlpha=power*reveal;c.strokeStyle='#b2873c';c.lineWidth=1.15;
 for(let i=0;i<6;i++){c.save();c.rotate(i*TAU/6);c.beginPath();c.moveTo(18,0);c.lineTo(72,0);c.lineTo(90,11);c.lineTo(129,11);c.lineTo(149,0);c.lineTo(209,0);c.stroke();c.restore();}
 c.restore();
 // Volume rises out of the seal instead of a full-screen white flash.
 if(!reduced){const beam=ease(2.05,2.8,t)*(1-ease(3.25,4.45,t));c.globalAlpha=beam;const g=c.createLinearGradient(0,-265,0,45);g.addColorStop(0,'#ffe3a300');g.addColorStop(.75,'#d69a372b');g.addColorStop(1,'#ffe6a4a8');c.fillStyle=g;c.beginPath();c.moveTo(-88,25);c.lineTo(-47,-260);c.quadraticCurveTo(0,-287,47,-260);c.lineTo(88,25);c.closePath();c.fill();for(let i=0;i<9;i++){const xx=(i-4)*15;c.strokeStyle=i===4?'#fff2c2':'#d9b267';c.globalAlpha=beam*(i===4?.7:.2);c.lineWidth=i===4?1.8:.65;c.beginPath();c.moveTo(xx,22);c.lineTo(xx*.6,-210-Math.cos(i)*22);c.stroke();}}
 c.restore();
}

import * as T from 'three';
import {canvasMap,physical} from './materials';
import {glyph} from './script';
const random=(n:number)=>Math.abs(Math.sin(n*78.233+19.19)*43758.5453)%1;
export function stoneFinish(){
 const map=canvasMap(2048,2048,c=>{
  c.fillStyle='#d4d4c8';c.fillRect(0,0,2048,2048);
  for(let i=0;i<700;i++){
   const y=random(i)*2600-400;c.beginPath();c.moveTo(-30,y);
   for(let x=0;x<=2070;x+=24)c.lineTo(x,y+x*.23+Math.sin(x*.004+i)*72+Math.sin(x*.016+i*3)*16);
   c.strokeStyle=`rgba(62,82,84,${.012+random(i+600)*.045})`;c.lineWidth=1+random(i+30)*5;c.stroke();
  }
  for(let i=0;i<40000;i++){const a=random(i+5);c.fillStyle=`rgba(${a>.5?'255,247,228':'55,68,70'},${.035+random(i+7)*.025})`;c.fillRect(random(i)*2048,random(i+1)*2048,1.5,1.5)}
 });
 const mat=physical('#f3eee0',.025,.49,map);mat.bumpMap=map;mat.bumpScale=.008;mat.clearcoat=.12;return mat;
}
export function woodFinish(){
 const map=canvasMap(1024,2048,c=>{
  c.fillStyle='#485258';c.fillRect(0,0,1024,2048);
  for(let i=0;i<2700;i++){const x=random(i)*1200-100;c.beginPath();for(let y=0;y<=2050;y+=24){const xx=x+Math.sin(y*.003+i)*9+Math.sin(y*.016+i)*2;y?c.lineTo(xx,y):c.moveTo(xx,y)}c.strokeStyle=`rgba(${i%3?'18,27,32':'153,144,116'},${.05+random(i+4)*.11})`;c.lineWidth=.6+random(i+8)*2;c.stroke()}
 });const mat=physical('#a4adb2',.03,.52,map);mat.bumpMap=map;mat.bumpScale=.012;return mat;
}
export function carpetFinish(){
 const map=canvasMap(1024,2048,c=>{
  c.fillStyle='#14283b';c.fillRect(0,0,1024,2048);
  for(let x=0;x<1024;x+=3){c.fillStyle=x%2?'#d5cfb306':'#00000012';c.fillRect(x,0,1,2048)}
  for(let y=0;y<2048;y+=3){c.fillStyle=y%2?'#dae8f008':'#00000010';c.fillRect(0,y,1024,1)}
  c.strokeStyle='#a6956e';c.lineWidth=3;
  for(const x of [52,78,946,972]){c.beginPath();c.moveTo(x,0);c.lineTo(x,2048);c.stroke()}
  c.strokeStyle='#b4a68155';c.lineWidth=1.2;
  for(let y=0;y<2100;y+=128){for(const x of [65,959]){c.beginPath();c.moveTo(x,y-45);c.lineTo(x+10,y);c.lineTo(x,y+45);c.lineTo(x-10,y);c.closePath();c.stroke()}c.beginPath();c.moveTo(512,y-42);c.lineTo(562,y);c.lineTo(512,y+42);c.lineTo(462,y);c.closePath();c.stroke()}
 });map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(1,4);
 const mat=physical('#c0d1dd',0,.96,map);mat.sheen=.45;mat.sheenColor.set('#68839a');mat.bumpMap=map;mat.bumpScale=.006;return mat;
}
export function spineAtlas(){
 return canvasMap(2048,2048,c=>{
  const colors=['#1d354c','#343c42','#654139','#283b35','#4a3849','#8a775b','#27313e','#5f5646'];
  for(let n=0;n<32;n++){
   c.save();c.translate(n%8*256,Math.floor(n/8)*512);
   const g=c.createLinearGradient(0,0,256,0);g.addColorStop(0,'#101820');g.addColorStop(.15,colors[n%8]);g.addColorStop(.48,colors[n%8]);g.addColorStop(.88,'#202629');g.addColorStop(1,'#090e16');c.fillStyle=g;c.fillRect(0,0,256,512);
   for(let j=0;j<2200;j++){c.fillStyle=`rgba(225,196,139,${random(j+n*800)*.08})`;c.fillRect(random(j+n)*256,random(j+7+n)*512,1,1)}
   c.strokeStyle='#bfa36d';c.lineWidth=2;c.strokeRect(21,18,214,476);c.strokeStyle='#c9b88370';c.lineWidth=1;c.strokeRect(28,25,200,462);
   for(const y of [63,79,421,435]){c.fillStyle='#aa90606b';c.fillRect(12,y,232,4);c.fillStyle='#dec88e90';c.fillRect(12,y,232,1)}
   c.strokeStyle=c.fillStyle='#d8c395';
   for(let j=0;j<5+n%3;j++)glyph(c,128,125+j*34,22,n*19+j);
   c.beginPath();c.ellipse(128,362,26,36,0,0,Math.PI*2);c.stroke();glyph(c,128,362,27,n*3);
   c.restore();
  }
 });
}

import * as T from 'three';
import {glyph} from './glyph';

/** Author the same fictional alphabet into four readable, distinct spell diagrams. */
export function purpleSigil(style:number){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
 const c=canvas.getContext('2d')!;c.translate(512,512);c.lineCap='round';c.lineJoin='round';
 const diagram=()=>{
  const circle=(r:number)=>{c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();};
  c.lineWidth=6;circle(449);c.lineWidth=3;circle(467);circle(356);c.lineWidth=5;circle(340);
  for(let i=0;i<28;i++){c.save();c.rotate(i*Math.PI/14);c.lineWidth=5;glyph(c,i*3+style,0,-402,19);c.restore();}
  for(let i=0;i<56;i++){c.save();c.rotate(i*Math.PI/28);c.lineWidth=3;c.beginPath();c.moveTo(0,-453);c.lineTo(0,i%2?-461:-473);c.stroke();c.restore();}
  if(style===0){for(let j=0;j<2;j++){c.lineWidth=7;c.beginPath();for(let i=0;i<3;i++){const a=i*Math.PI*2/3+j*Math.PI-Math.PI/2;const x=Math.cos(a)*319,y=Math.sin(a)*319;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.stroke();}c.lineWidth=3;circle(208);}
  if(style===1){for(let i=0;i<6;i++){c.save();c.rotate(i*Math.PI/3);c.lineWidth=8;c.beginPath();c.moveTo(-54,-321);c.lineTo(-54,-255);c.lineTo(0,-222);c.lineTo(54,-255);c.lineTo(54,-321);c.stroke();c.lineWidth=4;c.beginPath();c.moveTo(0,-222);c.lineTo(0,-160);c.stroke();c.restore();}c.lineWidth=5;circle(168);}
  if(style===2){for(let i=0;i<2;i++){c.save();c.rotate(i*Math.PI);c.lineWidth=9;c.beginPath();c.arc(0,0,278,-1.35,1.35);c.stroke();c.lineWidth=4;c.beginPath();c.arc(0,0,305,-1.35,1.35);c.stroke();c.restore();}c.lineWidth=6;c.beginPath();c.moveTo(0,-300);c.lineTo(186,0);c.lineTo(0,300);c.lineTo(-186,0);c.closePath();c.stroke();}
  if(style===3){for(let i=0;i<4;i++){c.save();c.rotate(i*Math.PI/2);c.lineWidth=7;c.beginPath();for(let j=0;j<=32;j++){const a=j/32*Math.PI*.8,r=310-j*4.2;const x=Math.cos(a)*r,y=Math.sin(a)*r;j?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();c.restore();}c.lineWidth=4;circle(145);}
  // An interrupted casting path, crossed by a final sealing bar at the centre.
  c.lineWidth=7;c.beginPath();c.moveTo(0,-105);c.lineTo(61,-8);c.lineTo(28,-8);c.lineTo(28,85);c.lineTo(-28,85);c.lineTo(-28,-8);c.lineTo(-61,-8);c.closePath();c.stroke();
  c.lineWidth=11;c.beginPath();c.moveTo(-98,35);c.lineTo(98,-35);c.stroke();
 };
 // A dark violet body remains visible on the white board; the pale core reads on dark boards.
 c.strokeStyle='#531294';c.shadowColor='#751be8';c.shadowBlur=24;diagram();
 c.shadowBlur=0;c.strokeStyle='#ba65ff';diagram();
 c.globalAlpha=.82;c.strokeStyle='#efd2ff';c.scale(.997,.997);diagram();
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
}
export function runeRibbon(){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const c=canvas.getContext('2d')!;const g=c.createLinearGradient(0,0,0,128);g.addColorStop(0,'#7125bc');g.addColorStop(.5,'#351052');g.addColorStop(1,'#7125bc');c.fillStyle=g;c.fillRect(0,0,1024,128);c.strokeStyle='#d38dff';c.lineWidth=3;c.strokeRect(1,7,1022,114);c.lineWidth=2;c.strokeRect(1,15,1022,98);c.lineWidth=4;c.strokeStyle='#e8c6ff';for(let i=0;i<20;i++)glyph(c,i,25+i*51,64,25);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;return tex;}

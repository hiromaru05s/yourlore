import type {FxRect} from './biblionFx';
/** Refraction streaks run across the real gemstone tray; no replacement floating gem. */
export function drawManaGain(c:CanvasRenderingContext2D,r:FxRect,age:number){
 const p=Math.max(0,Math.min(1,age/1.4));if(p<=0||p>=1)return;
 const h=Math.max(12,r.height),w=r.width,x=r.left+w*p,y=r.top+h*.52,fade=Math.sin(Math.PI*p);
 c.save();c.globalAlpha=fade;
 for(let i=0;i<3;i++){
  const dx=(i-1)*h*.22,ww=h*(.10-i*.018);c.beginPath();c.moveTo(x+dx-ww,y+h*.5);c.quadraticCurveTo(x+dx+h*.3,y-h*.15,x+dx+ww,y-h*.9);c.quadraticCurveTo(x+dx+h*.1,y-h*.18,x+dx-ww,y+h*.5);c.fillStyle=['#2375d8','#88d7ff','#e8f8ff'][i];c.fill();
 }
 for(let i=0;i<7;i++){const q=Math.max(0,Math.min(1,(p-i*.07)/.45)),a=Math.sin(Math.PI*q);if(!a)continue;
 const px=r.left+w*(.12+i*.12),py=r.top+h*.35-h*.5*q,s=Math.max(1,h*.09)*a;
 c.globalAlpha=a*.85;c.fillStyle=i%2?'#82c9ff':'#e2f5ff';c.beginPath();c.moveTo(px,py-s*1.8);c.lineTo(px+s*.3,py-s*.3);c.lineTo(px+s,py);c.lineTo(px+s*.3,py+s*.3);c.lineTo(px,py+s*1.8);c.lineTo(px-s*.3,py);c.closePath();c.fill();
 }
 c.restore();
}

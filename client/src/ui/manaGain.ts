import type {FxRect} from './biblionFx';
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(a:number,b:number,t:number)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q);};
/** Three folded streams gather at the real crystal, a short refraction peak,
 * then crescent fragments open and dissolve. No substitute jewel or numbers. */
export function drawManaGain(c:CanvasRenderingContext2D,r:FxRect,age:number){
 const t=age/1.4;if(t<=0||t>=1)return;
 const u=Math.max(12,Math.min(36,r.height*1.3)),x=r.left+r.width*.64,y=r.top+r.height*.52;
 c.save();
 const gather=smooth(0,.5,t);
 for(let j=0;j<3;j++){
  const p=clamp((t-j*.045)/.48);if(p>=1)continue;const a=j*Math.PI*2/3-.8,rad=u*(1.5*(1-p)**.65+.05);
  const px=x+Math.cos(a+p*.7)*rad,py=y+Math.sin(a+p*.7)*rad*.7-u*.14;
  const tail=u*(.8-.55*p),thick=u*.13*Math.sin(Math.PI*p);
  c.save();c.translate(px,py);c.rotate(a+p*.7+Math.PI/2);c.globalAlpha=Math.sin(Math.PI*p);
  for(let k=0;k<3;k++){const w=thick*(1-k*.3);c.beginPath();c.moveTo(0,-tail);c.bezierCurveTo(-w*2,-tail*.35,-w,tail*.35,0,tail*.5);c.bezierCurveTo(w*1.2,tail*.10,w,-tail*.45,0,-tail);c.fillStyle=['#176cc5','#58baff','#e0f7ff'][k];c.fill();}c.restore();
 }
 const flash=Math.exp(-(((t-.48)/.07)**2));if(flash>.01){
  const g=c.createRadialGradient(x,y,0,x,y,u);g.addColorStop(0,'#d8f7ff');g.addColorStop(.22,'#61c4ff88');g.addColorStop(1,'#328ce800');c.globalAlpha=flash*.7;c.fillStyle=g;c.fillRect(x-u,y-u,u*2,u*2);
  c.globalAlpha=flash;c.fillStyle='#e5fbff';c.beginPath();c.moveTo(x,y-u*.7);c.lineTo(x+u*.07,y-u*.06);c.lineTo(x+u*.62,y);c.lineTo(x+u*.07,y+u*.06);c.lineTo(x,y+u*.7);c.lineTo(x-u*.07,y+u*.06);c.lineTo(x-u*.62,y);c.lineTo(x-u*.07,y-u*.06);c.closePath();c.fill();
 }
 const spread=smooth(.47,.96,t),fade=1-spread;
 if(t>.47){for(let j=0;j<3;j++){
  const a=j*2.094+spread*.3,rx=u*(.3+spread*.95),ry=rx*.38;c.globalAlpha=fade*.8;c.beginPath();
  for(let i=0;i<=20;i++){const q=i/20,angle=a+q*1.6,rr=rx+u*.1*Math.sin(q*Math.PI)*fade;const px=x+Math.cos(angle)*rr,py=y+Math.sin(angle)*ry;i?c.lineTo(px,py):c.moveTo(px,py);}
  for(let i=20;i>=0;i--){const angle=a+i/20*1.6;c.lineTo(x+Math.cos(angle)*rx,y+Math.sin(angle)*ry);}c.closePath();c.fillStyle=j%2?'#b4eaff':'#469fe8';c.fill();
 }
 for(let j=0;j<9;j++){const a=j*2.399,rad=u*(.35+spread*(.55+(j%3)*.2)),s=u*.055*fade;const px=x+Math.cos(a)*rad,py=y+Math.sin(a)*rad*.5-u*spread*.4;c.globalAlpha=fade*.85;c.fillStyle=j%3?'#67baff':'#e0faff';c.beginPath();c.moveTo(px,py-s*2);c.lineTo(px+s,py);c.lineTo(px,py+s);c.lineTo(px-s*.5,py);c.closePath();c.fill();}}
 // Low intensity illumination remains on the real row while its facets settle.
 c.globalAlpha=Math.sin(Math.PI*gather)*.12;c.fillStyle='#68b9ff';c.fillRect(r.left,r.top,r.width,r.height);c.restore();
}

/** A payment: blue mana facets leave the player's UI and chime into the purchased card. */
export type ManaRect=Pick<DOMRect,'left'|'top'|'width'|'height'>;
export const MANA_PURCHASE_DURATION=.86;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
type C=CanvasRenderingContext2D;
function face(c:C,points:number[][],color:string){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();}
export function manaPaymentPoint(from:ManaRect,to:ManaRect,q:number,lane=0){
 const t=clamp(q),x=from.left+from.width/2,y=from.top+from.height/2;
 const tx=to.left+to.width*.25,ty=to.top+to.height*.2;
 const dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy)||1,bend=Math.sin(t*Math.PI)*(Math.min(46,d*.13)+lane*9);
 return {x:x+dx*t-dy/d*bend,y:y+dy*t+dx/d*bend};
}
export function drawManaPurchase(c:C,from:ManaRect,to:ManaRect,age:number){
 if(age<0||age>=MANA_PURCHASE_DURATION)return;
 const size=Math.max(7,Math.min(12,to.width*.17));
 c.save();c.lineCap='round';
 for(let i=0;i<3;i++){
  const elapsed=age-i*.075;if(elapsed<0)continue;
  const q=clamp(elapsed/.53),travel=q*q*(3-2*q),p=manaPaymentPoint(from,to,travel,i-1);
  if(q<1){
   const tail=manaPaymentPoint(from,to,Math.max(0,travel-.065),i-1);
   c.globalAlpha=Math.min(1,elapsed/.055);c.strokeStyle='#669bd7';c.lineWidth=1.6;
   c.beginPath();c.moveTo(tail.x,tail.y);c.lineTo(p.x,p.y);c.stroke();
   c.save();c.translate(p.x,p.y);c.rotate(-.35+q*1.1+i*.4);
   const s=size*(1-.55*clamp((q-.87)/.13));
   face(c,[[0,-s],[s*.56,0],[0,s],[-s*.56,0]],'#285786');
   face(c,[[0,-s],[-s*.56,0],[0,s*.15]],'#d3faff');
   face(c,[[0,-s],[s*.56,0],[0,s*.15]],'#70cbe6');
   face(c,[[-s*.56,0],[0,s],[0,s*.15]],'#438ac0');
   face(c,[[s*.56,0],[0,s],[0,s*.15]],'#a1e5f3');c.restore();
  }else{
   const fade=clamp((elapsed-.53)/.17);if(fade>=1)continue;
   c.globalAlpha=1-fade;
   for(let j=0;j<4;j++){
    const a=j*Math.PI/2+.35+i*.6,d=size*(.6+fade*1.9),s=size*.28*(1-fade);
    c.save();c.translate(p.x+Math.cos(a)*d,p.y+Math.sin(a)*d);c.rotate(a);
    face(c,[[0,-s],[s*.36,0],[0,s],[-s*.36,0]],j%2?'#a5e9f2':'#397bb1');c.restore();
   }
  }
 }
 c.restore();
}

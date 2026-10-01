/** Restriction/ward studies: two material actions anchored to the card surface.
 * Neither invents replacement ability icons; authoritative native UI shows the state.
 */
export function stateMaterial(c:CanvasRenderingContext2D,img:HTMLImageElement,v:1|2,t:number,W:number,H:number){
 const E=(a:number,b:number,n:number)=>{const q=Math.max(0,Math.min(1,(n-a)/(b-a)));return q*q*(3-2*q);};const q=E(.01,.29,t)*(1-E(.61,1,t)),x=W*.5,y=H*.53;
 if(v===1){for(const side of[-1,1]){const reach=170*q;c.save();c.beginPath();c.moveTo(x+side*230,y-145);c.lineTo(x+side*(230-reach),y-110);c.lineTo(x+side*(230-reach*.85),y+120);c.lineTo(x+side*230,y+160);c.closePath();c.clip();c.translate(-side*12*q,0);c.filter='contrast(1.14) brightness(.8)';c.drawImage(img,0,0,W,H);c.restore();c.beginPath();c.moveTo(x+side*(230-reach),y-110);c.lineTo(x+side*(230-reach*.85),y+120);c.strokeStyle=`rgba(221,210,182,${q*.7})`;c.lineWidth=2;c.stroke();}}
 else{for(let i=0;i<3;i++){const a=E(i*.04,.3+i*.04,t)*(1-E(.56+i*.055,1,t)),yy=y+(i-1)*78;c.save();c.beginPath();c.moveTo(x-200,yy-20*a);c.quadraticCurveTo(x,yy-55*a,x+200,yy-20*a);c.lineTo(x+200,yy+20*a);c.quadraticCurveTo(x,yy+50*a,x-200,yy+20*a);c.closePath();c.clip();c.translate(x,yy);c.scale(1,.75+.25*(1-a));c.translate(-x,-yy);c.filter='contrast(1.15) saturate(.7)';c.drawImage(img,0,0,W,H);c.restore();c.beginPath();c.moveTo(x-200,yy-20*a);c.quadraticCurveTo(x,yy-55*a,x+200,yy-20*a);c.strokeStyle=`rgba(230,214,190,${a*.6})`;c.lineWidth=1.5;c.stroke();}}
}

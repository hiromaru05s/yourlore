export function assassinMaterial(c:CanvasRenderingContext2D,img:HTMLImageElement,id:string,v:1|2,t:number,W:number,H:number){
 const E=(a:number,b:number,n:number)=>{const q=Math.max(0,Math.min(1,(n-a)/(b-a)));return q*q*(3-2*q);};const q=E(0,.26,t)*(1-E(.53,1,t));const guild=id.startsWith('GUILD')||id==='Q_ASSASSIN';const x=W*.54,y=H*.50;
 if(guild){for(const side of[-1,1]){c.save();c.beginPath();c.rect(x+(side<0?-130:0),y-150,130,310);c.clip();c.fillStyle='#101015';c.fillRect(0,0,W,H);c.translate(x,y);if(v===1)c.transform(1-q*.43,0,side*q*.15,1,side*15*q,0);else c.translate(side*24*q,-8*q);c.translate(-x,-y);c.filter=v===1?'brightness(.75)':'contrast(1.15)';c.drawImage(img,0,0,W,H);c.restore();c.beginPath();c.moveTo(x+side*(130-50*q),y-150);c.lineTo(x+side*(130-50*q),y+160);c.strokeStyle=`rgba(161,99,66,${q*.7})`;c.lineWidth=2;c.stroke();}return;}
 if(v===1){
 // Steel is restricted to the foreground blade, with the original image
 // carried by a thin shearing plane. Cloth receives a delayed broad fold.
 const ax=W*.30,ay=H*.63,bx=W*.83,by=H*.85;c.save();c.beginPath();c.moveTo(ax,ay);c.lineTo(bx,by);c.lineTo(bx-18,by+9);c.lineTo(ax-8,ay+14);c.closePath();c.clip();c.translate(8*q,-5*q);c.filter='contrast(1.3) brightness(1.3)';c.drawImage(img,0,0,W,H);c.restore();c.beginPath();c.moveTo(ax,ay);c.lineTo(ax+(bx-ax)*E(.07,.47,t),ay+(by-ay)*E(.07,.47,t));c.strokeStyle=`rgba(215,227,223,${q*.82})`;c.lineWidth=2;c.stroke();
 const cloth=E(.12,.4,t)*(1-E(.54,1,t));c.save();c.beginPath();c.moveTo(x-50,y-40);c.bezierCurveTo(x-130-30*cloth,y+35,x-190,y+170,x-210,y+230);c.lineTo(x-70,y+180);c.closePath();c.clip();c.transform(1,0,-.055*cloth,1,20*cloth,0);c.drawImage(img,0,0,W,H);c.restore();
 }else{
 // Two depth planes of the pictured night separate around the portrait.
 // Their silhouettes recede sideways, exposing the same identity.
 for(const side of[-1,1]){const a=E(side<0?0:.10,.35,t)*(1-E(side<0?.50:.65,1,t));c.save();c.beginPath();c.moveTo(x+side*50,y-170);c.bezierCurveTo(x+side*(200*a),y-70,x+side*(110+80*a),y+130,x+side*185,y+240);c.lineTo(x+side*25,y+160);c.quadraticCurveTo(x+side*100,y,x+side*50,y-170);c.clip();c.translate(side*38*a,0);c.filter='brightness(.53) saturate(.58)';c.drawImage(img,0,0,W,H);c.restore();}
 }
}

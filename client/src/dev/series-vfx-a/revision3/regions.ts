const E=(a:number,b:number,t:number)=>{const q=Math.max(0,Math.min(1,(t-a)/(b-a)));return q*q*(3-2*q);};
/** Authored shape families: solitary cloth, demon plate, folded rune leaves, optical pages. */
export function regionalMaterial(c:CanvasRenderingContext2D,img:HTMLImageElement,id:string,v:1|2,t:number,W:number,H:number){
 const p=E(0,.27,t)*(1-E(.58,1,t)),x=W*.5,y=H*.53;
 if(id.startsWith('TSO')){
 if(v===1){for(const side of[-1,1]){c.save();c.beginPath();c.moveTo(x+side*60,y-40);c.bezierCurveTo(x+side*(100+70*p),y+70,x+side*(190+40*p),y+120,x+side*250,y+170);c.lineTo(x+side*100,y+210);c.quadraticCurveTo(x+side*100,y+70,x+side*60,y-40);c.clip();c.translate(0,-12*p);c.transform(1,0,side*.09*p,1,-side*20*p,0);c.drawImage(img,0,0,W,H);c.restore();}}
 else{for(let i=0;i<4;i++){const a=E(.02+i*.07,.30+i*.04,t)*(1-E(.54+i*.07,1,t));const xx=x+(i-1.5)*55,yy=y+40+i*20;c.save();c.beginPath();c.moveTo(xx-45*a,yy-85*a);c.lineTo(xx+17*a,yy-68*a);c.lineTo(xx+40*a,yy+100*a);c.lineTo(xx-24*a,yy+74*a);c.closePath();c.clip();c.translate(-12*a,4*a);c.filter='contrast(1.16) saturate(.6)';c.drawImage(img,0,0,W,H);c.restore();c.beginPath();c.moveTo(xx-45*a,yy-85*a);c.lineTo(xx-24*a,yy+74*a);c.strokeStyle=`rgba(214,210,186,${a*.65})`;c.lineWidth=2;c.stroke();}}
 return;
 }
 if(id.startsWith('TDE')||id==='DEMON_REALM'){
 if(v===1){for(const side of[-1,1])for(let i=0;i<3;i++){const a=E(i*.035,.3+i*.035,t)*(1-E(.58+i*.04,1,t)),xx=x+side*(50+i*34),yy=y+(i-1)*72;c.save();c.beginPath();c.moveTo(xx,yy-70);c.lineTo(xx+side*(90+24*a),yy-25);c.lineTo(xx+side*80,yy+58);c.lineTo(xx-side*12,yy+34);c.closePath();c.clip();c.fillStyle='#1b1114';c.fillRect(0,0,W,H);c.translate(side*12*a,-14*a);c.filter='contrast(1.18) brightness(.86)';c.drawImage(img,0,0,W,H);c.restore();c.beginPath();c.moveTo(xx,yy-70);c.lineTo(xx+side*(90+24*a),yy-25);c.strokeStyle=`rgba(230,104,54,${a*.7})`;c.lineWidth=3;c.stroke();}}
 else{for(const side of[-1,1]){const a=E(.02,.33,t)*(1-E(.55,1,t));c.beginPath();c.moveTo(x,y-120*a);c.lineTo(x+side*39*a,y-59*a);c.lineTo(x+side*13*a,y-10*a);c.lineTo(x+side*66*a,y+80*a);c.lineTo(x+side*35*a,y+175*a);c.lineWidth=18*a;c.strokeStyle='#1d0a0d';c.stroke();c.lineWidth=6*a;c.strokeStyle='#b94421';c.stroke();c.lineWidth=1.6*a;c.strokeStyle='#e9ae69';c.stroke();for(let i=0;i<3;i++){const xx=x+side*40*a,yy=y+(i-1)*65*a;c.beginPath();c.moveTo(xx,yy);c.lineTo(xx+side*(80+i*12)*a,yy-32*a);c.lineTo(xx+side*(110+i*12)*a,yy-65*a);c.lineWidth=6*a;c.strokeStyle='#2d1012';c.stroke();c.lineWidth=1.5*a;c.strokeStyle='#d56536';c.stroke();}}}
 return;
 }
 const rune=id.startsWith('RUNE');
 if(v===1){
 // Art-bearing leaves pivot about their own spine. The back paper plane
 // is dark at the fold and ivory at the exposed edge.
 const count=rune?2:3;for(let i=0;i<count;i++){const side=i%2?1:-1,a=E(i*.04,.32+i*.04,t)*(1-E(.60+i*.035,1,t));const cx=x+(i-1)*45,cy=y+(i-1)*25,w=(rune?165:145)*a;const pts=[[cx,cy-130],[cx+side*w,cy-110-45*a],[cx+side*w*.88,cy+145],[cx,cy+115]];c.save();c.beginPath();pts.forEach(([px,py],j)=>j?c.lineTo(px,py):c.moveTo(px,py));c.closePath();c.clip();c.fillStyle='#c1b5a0';c.fillRect(0,0,W,H);c.translate(cx,cy);c.transform(.55+.45*(1-a),side*.09*a,0,1,0,0);c.translate(-cx,-cy);c.drawImage(img,0,0,W,H);c.restore();c.beginPath();c.moveTo(...pts[0]as[number,number]);c.lineTo(...pts[1]as[number,number]);c.lineTo(...pts[2]as[number,number]);c.strokeStyle=`rgba(246,224,172,${a*.85})`;c.lineWidth=2;c.stroke();}
 }else{
 // The engraved/pictured object refracts in a connected diamond lens;
 // its perimeter contracts while the interior original detail is retained.
 const a=E(.03,.32,t)*(1-E(.58,1,t)),r=(rune?180:230)*a;c.save();c.beginPath();c.moveTo(x,y-r);c.bezierCurveTo(x+r*.2,y-r*.35,x+r*.7,y-r*.25,x+r,y);c.bezierCurveTo(x+r*.45,y+r*.25,x+r*.35,y+r*.7,x,y+r);c.bezierCurveTo(x-r*.4,y+r*.45,x-r*.6,y+r*.3,x-r,y);c.bezierCurveTo(x-r*.4,y-r*.2,x-r*.3,y-r*.7,x,y-r);c.clip();c.translate(x,y);c.scale(1+.15*a,1+.09*a);c.translate(-x,-y);c.filter=rune?'brightness(1.09) contrast(1.1)':'brightness(1.07) saturate(.85)';c.drawImage(img,0,0,W,H);c.restore();for(let i=0;i<3;i++){const d=r*(1-i*.13);c.beginPath();c.moveTo(x,y-d);c.quadraticCurveTo(x+d*.2,y-d*.2,x+d,y);c.strokeStyle=`rgba(${rune?'125,203,236':'228,216,164'},${a*(.6-i*.15)})`;c.lineWidth=i?1:2.5;c.stroke();}
 }
}

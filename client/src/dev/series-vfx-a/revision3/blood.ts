import {ease,W,H} from './material';
/** Blood follows liquid volume and the pictured fabric, never free particle rings. */
export function bloodMaterial(c:CanvasRenderingContext2D,img:HTMLImageElement,id:string,variant:1|2,t:number){
 const vamp=id.startsWith('VAMP'),q=ease(.01,.26,t)*(1-ease(.58,1,t));const x=W*(vamp?.5:.48),y=H*(vamp?.56:.55);
 if(vamp&&variant===1){
 // The portrait's cloak opens in two broad folds. Art stays on the cloth;
 // the rigid face, frame and stat seals do not deform with it.
 for(const side of[-1,1]){const w=160*q;c.save();c.beginPath();c.moveTo(x+side*18,y-90);c.bezierCurveTo(x+side*(70+w),y-30,x+side*(80+w*.9),y+120,x+side*145,y+210);c.quadraticCurveTo(x+side*42,y+135,x+side*18,y-90);c.clip();c.fillStyle='#230913';c.fillRect(0,0,W,H);c.translate(x,y);c.transform(1,side*.035*q,side*.15*q,1,side*12*q,0);c.translate(-x,-y);c.filter='saturate(1.15) contrast(1.12)';c.drawImage(img,0,0,W,H);c.restore();c.beginPath();c.moveTo(x+side*18,y-90);c.bezierCurveTo(x+side*(70+w),y-30,x+side*(80+w*.9),y+120,x+side*145,y+210);c.lineWidth=2;c.strokeStyle=`rgba(224,174,166,${q*.65})`;c.stroke();}
 }else if(vamp){
 // A convex blood film forms within the torso, splits at the figure's
 // central seam, and drains toward two anchored fingertips.
 for(let i=0;i<3;i++){const a=ease(i*.04,.3+i*.04,t)*(1-ease(.54+i*.04,1,t));const rx=(100-i*20)*a,ry=(160-i*21)*a;c.save();c.beginPath();c.ellipse(x+(i-1)*15,y,rx,ry,.2,0,Math.PI*2);c.clip();c.translate(x,y);c.scale(1+.07*a,1+.04*a);c.translate(-x,-y);c.drawImage(img,0,0,W,H);c.fillStyle=`rgba(103,7,26,${a*.2})`;c.fillRect(0,0,W,H);c.restore();c.beginPath();c.ellipse(x+(i-1)*15,y,rx,ry,.2,.15,2.4);c.strokeStyle=`rgba(242,165,158,${a*.65})`;c.lineWidth=2;c.stroke();}
 }else if(variant===1){
 // Thick viscous brush strokes change thickness along their arc. Each
 // stroke is a wedge of dark liquid with a narrow wet edge, not a glyph.
 for(let i=0;i<3;i++){const a=ease(i*.065,.27+i*.065,t)*(1-ease(.57+i*.05,1,t));const yy=y+(i-1)*78;c.beginPath();c.moveTo(x-200*a,yy+40*a);c.bezierCurveTo(x-100*a,yy-100*a,x+90*a,yy+100*a,x+200*a,yy-35*a);c.bezierCurveTo(x+95*a,yy+155*a,x-110*a,yy-45*a,x-200*a,yy+40*a);c.closePath();const g=c.createLinearGradient(0,yy-50,0,yy+80);g.addColorStop(0,'#260913');g.addColorStop(.48,'#85172b');g.addColorStop(.57,'#d44a52');g.addColorStop(1,'#310711');c.globalAlpha=a*.85;c.fillStyle=g;c.fill();c.globalAlpha=1;}
 }else{
 // A connected meniscus rises from the depicted goblet/ritual surface,
 // narrows at the neck, then collapses from its outer rim inward.
 const r=150*q;c.save();c.beginPath();c.moveTo(x-r,y+80*q);c.bezierCurveTo(x-r*1.2,y-r*.7,x-r*.3,y-r,x,y-r*1.1);c.bezierCurveTo(x+r*.6,y-r,x+r*1.25,y-r*.4,x+r,y+80*q);c.quadraticCurveTo(x,y+r*.65,x-r,y+80*q);c.closePath();c.clip();c.translate(x,y);c.scale(1+.11*q,1-.07*q);c.translate(-x,-y);c.drawImage(img,0,0,W,H);const g=c.createLinearGradient(x-r,y,x+r,y);g.addColorStop(0,'#19040be6');g.addColorStop(.32,'#710c2540');g.addColorStop(.60,'#b3354245');g.addColorStop(1,'#280816b0');c.fillStyle=g;c.fillRect(0,0,W,H);c.restore();c.beginPath();c.ellipse(x,y+80*q,r,24*q,0,0,Math.PI);c.strokeStyle=`rgba(243,147,145,${q*.8})`;c.lineWidth=3;c.stroke();
 }
}

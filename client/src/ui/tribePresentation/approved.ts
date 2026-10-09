// FIX 2026-10-07: preserve the selected stage 1 and victory-source illumination.
import {ease,synergyDuration,tier} from './timing';
type C=CanvasRenderingContext2D;
export class ApprovedTribeRenderer {
 shadow(c:C,x:number,y:number,r:number,a:number){c.save();c.translate(x,y);c.scale(1,.19);const g=c.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,`rgba(15,13,22,${a})`);g.addColorStop(1,'rgba(15,13,22,0)');c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);c.restore();}
 synergy(c:C,face:HTMLCanvasElement,n:number,ms:number,x:number,y:number,w:number,reduced=false){
  const stage=tier(n),p=ms/synergyDuration(n),a=ease(0,.17,p)*(1-ease(.72,1,p));
  c.save();c.translate(x,y);c.scale(w/180,w/180);this.shadow(c,0,147,90+a*10,.29-a*.09);
  c.translate(0,reduced?0:-(5+stage*3)*a);
  c.drawImage(face,-111.6,-161.6,223.2,323.2);
  if(a>0){c.save();c.globalAlpha=a*.15;c.fillStyle='#ff9d29';c.beginPath();c.roundRect(-86,-136,172,272,12);c.fill();c.restore();
   c.save();c.shadowColor='#ff951c';c.shadowBlur=(5+stage*3)*a;c.strokeStyle=`rgba(255,155,40,${a*.85})`;c.lineWidth=1+stage*.45;c.beginPath();c.roundRect(-88,-140,176,280,11);c.stroke();c.shadowBlur=0;
   // Surface etching hugs the carved rails; it never covers the name or stats.
   for(const s of [-1,1])for(let i=0;i<7;i++){const yy=-100+i*32;c.globalAlpha=a*(.3+.5*ease(i/12,i/12+.2,p));c.beginPath();c.moveTo(s*82,yy-8);c.lineTo(s*76,yy);c.lineTo(s*82,yy+8);c.stroke();}
   if(stage>=2){const yy=-112+224*ease(.08,.7,p);c.globalAlpha=a*.55;const g=c.createLinearGradient(-70,yy,70,yy);g.addColorStop(0,'#ef811000');g.addColorStop(.5,'#ffe0a0');g.addColorStop(1,'#ef811000');c.strokeStyle=g;c.lineWidth=stage===3?2:1;c.beginPath();c.moveTo(-70,yy);c.lineTo(70,yy);c.stroke();}c.restore();}
  c.restore();
 }
}

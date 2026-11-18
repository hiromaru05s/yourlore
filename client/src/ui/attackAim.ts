import {aimCurve} from './aimGeometry';
export type AimPose={x:number;y:number;tx:number;ty:number;valid:boolean;blocked:boolean;sourceWidth?:number};
type Section={x:number;y:number;nx:number;ny:number;r:number};
function ribbon(c:CanvasRenderingContext2D,points:Section[],scale=1){
 c.beginPath();points.forEach((p,i)=>{const x=p.x+p.nx*p.r*scale,y=p.y+p.ny*p.r*scale;i?c.lineTo(x,y):c.moveTo(x,y);});
 for(let i=points.length-1;i>=0;i--){const p=points[i];c.lineTo(p.x-p.nx*p.r*scale,p.y-p.ny*p.r*scale);}c.closePath();
}
/** A fine luminous arc. Long, tapered light fronts travel toward the arrow tip;
 * the source stays attached to the lifted card, including while it settles. */
export function createAttackAim(follow?:()=>AimPose|null) {
 const canvas=document.createElement('canvas');canvas.className='attack-aim';canvas.setAttribute('aria-hidden','true');canvas.dataset.material='flowing-light';document.body.append(canvas);
 const c=canvas.getContext('2d')!,motion=matchMedia('(prefers-reduced-motion:reduce)');let pose:AimPose|null=null,frame=0,dead=false;
 function draw(now:number){
  if(dead)return;if(!canvas.isConnected||document.hidden){remove();return;}
  if(follow)pose=follow();
  const dpr=Math.min(devicePixelRatio||1,1.75),w=innerWidth,h=innerHeight;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  if(pose){
   const {x,y,tx,ty,valid,blocked}=pose,curve=aimCurve({x,y},{x:tx,y:ty}),reduced=motion.matches;
   canvas.dataset.valid=String(valid);canvas.dataset.source=`${x.toFixed(1)},${y.toFixed(1)}`;canvas.dataset.target=`${tx.toFixed(1)},${ty.toFixed(1)}`;
   if(curve.length>3){
    const unit=pose.sourceWidth??80,head=Math.min(23,Math.max(10,unit*.22),curve.length*.4),end=1-head*.55/curve.length;
    const width=Math.min(2.8,Math.max(1.15,unit*.027),curve.length*.07),points:Section[]=[];
    const count=Math.max(20,Math.min(72,Math.ceil(curve.length/5)));
    for(let i=0;i<=count;i++){
     const t=i/count*end,p=curve.point(t),n=curve.tangent(t),r=width*(.22+.78*Math.sin(Math.PI*(.06+t*.82)));
     points.push({x:p.x,y:p.y,nx:-n.y,ny:n.x,r});
    }
    const blue=blocked?'#bd7189':'#279dff',light=blocked?'#ffe1e8':'#ecfcff';
    const along=(stops:[number,string][])=>{const g=c.createLinearGradient(x,y,tx,ty);for(const [p,color]of stops)g.addColorStop(p,color);return g;};
    // A restrained blue edge remains readable on the white board. No hard tube
    // shading, displaced underside, repeated glyphs or detached particles.
    ribbon(c,points,1.8);c.fillStyle=blocked?'#a9557830':'#237ee82c';c.shadowColor=blue;c.shadowBlur=valid?10:6;c.fill();c.shadowBlur=0;
    ribbon(c,points);c.fillStyle=along([[0,blocked?'#ba718f30':'#45baff30'],[.2,blue],[.8,blocked?'#eaa3b9':'#6edaff'],[1,light]]);c.fill();
    ribbon(c,points,.25);c.fillStyle=along([[0,'#ffffff00'],[.35,blocked?'#ffe1e860':'#cbf6ff70'],[1,light]]);c.fill();
    // Each front has a long, fading tail and a sharp leading point. Sampling the
    // same curve keeps the flow attached even when the drag changes direction.
    const span=Math.min(.24,50/curve.length),travel=reduced?.22:(now*.0005)%1;
    for(let k=0;k<3;k++){
     const tip=((travel+k/3)%1)*(end+span),tail=tip-span,front:Section[]=[];
     const start=Math.max(0,tail),finish=Math.min(end,tip);if(finish<=start)continue;
     for(let i=0;i<=20;i++){
      const t=start+(finish-start)*i/20,u=(t-tail)/span,p=curve.point(t),n=curve.tangent(t);
      const r=width*1.3*Math.pow(u,1.4)*Math.sin(Math.PI*u);
      front.push({x:p.x,y:p.y,nx:-n.y,ny:n.x,r});
     }
     const a=curve.point(start),b=curve.point(finish),g=c.createLinearGradient(a.x,a.y,b.x,b.y);
     g.addColorStop(0,blocked?'#ffd1dd00':'#bbf4ff00');g.addColorStop(.58,blocked?'#ffd1ddaa':'#bdf6ffcc');g.addColorStop(.88,light);g.addColorStop(1,light);
     ribbon(c,front);c.fillStyle=g;c.shadowColor=blue;c.shadowBlur=5;c.fill();c.shadowBlur=0;
    }
    // One clean, swept arrowhead, continuous with the arc. A narrow rim carries
    // the brightest light; the open notch keeps the silhouette lightweight.
    const n=curve.tangent(1),wing=head*.43;
    c.save();c.translate(tx,ty);c.rotate(Math.atan2(n.y,n.x));
    c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-head*.62,-wing*.34,-head,-wing);c.lineTo(-head*.67,0);c.lineTo(-head,wing);c.quadraticCurveTo(-head*.62,wing*.34,0,0);c.closePath();
    const fill=c.createLinearGradient(-head,0,0,0);fill.addColorStop(0,blocked?'#bd718950':'#299dff55');fill.addColorStop(.65,blocked?'#efbbce':'#a3eeff');fill.addColorStop(1,light);
    c.fillStyle=fill;c.shadowColor=blue;c.shadowBlur=valid?10:6;c.fill();c.shadowBlur=0;
    c.strokeStyle=blocked?'#eeb3c7':'#a9edff';c.lineWidth=.85;c.stroke();
    c.beginPath();c.moveTo(-head*.75,-wing*.67);c.quadraticCurveTo(-head*.35,-wing*.16,0,0);c.lineTo(-head*.67,0);c.strokeStyle=light;c.lineWidth=.9;c.stroke();c.restore();
    const glow=c.createRadialGradient(x,y,0,x,y,width*2.8);glow.addColorStop(0,light);glow.addColorStop(.2,blocked?'#f1b8cd80':'#89ddff80');glow.addColorStop(1,'#ffffff00');
    c.fillStyle=glow;c.beginPath();c.arc(x,y,width*2.8,0,Math.PI*2);c.fill();
   }
  }
  frame=requestAnimationFrame(draw);
 }
 function remove(){if(dead)return;dead=true;cancelAnimationFrame(frame);window.removeEventListener('resize',remove);canvas.remove();}
 window.addEventListener('resize',remove,{once:true});frame=requestAnimationFrame(draw);
 return {update(x:number,y:number,tx:number,ty:number,valid:boolean,blocked:boolean){pose={x,y,tx,ty,valid,blocked};},remove};
}

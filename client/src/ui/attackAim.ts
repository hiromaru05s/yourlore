import {aimCurve} from './aimGeometry';
export type AimPose={x:number;y:number;tx:number;ty:number;valid:boolean;blocked:boolean};
/** Continuous forward energy runs along the actual screen-space targeting arc. */
export function createAttackAim(follow?:()=>AimPose|null) {
 const canvas=document.createElement('canvas');canvas.className='attack-aim';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
 const c=canvas.getContext('2d')!;let pose:AimPose|null=null,frame=0,dead=false;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 function draw(now:number){
  if(dead||!canvas.isConnected)return;if(document.hidden){remove();return;}
  if(follow)pose=follow();
  const dpr=Math.min(devicePixelRatio||1,1.5),w=innerWidth,h=innerHeight;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  if(pose){
   const {x,y,tx,ty,valid,blocked}=pose,curve=aimCurve({x,y},{x:tx,y:ty});
   canvas.dataset.valid=String(valid);canvas.dataset.target=`${tx.toFixed(1)},${ty.toFixed(1)}`;
   if(curve.length>3){
    const head=Math.min(22,curve.length*.28),end=1-head/curve.length,width=Math.min(7,curve.length*.09),points=[];
    for(let i=0;i<=64;i++){const t=i/64*end,p=curve.point(t),n=curve.tangent(t),r=width*(.36+.64*Math.sin(Math.PI*(.15+t*.62)));points.push({p,n,r});}
    const main=blocked?'#b57484':valid?'#7adaff':'#5baae6',light=blocked?'#f4bdc6':'#e4f8ff';
    c.beginPath();points.forEach(({p,n,r},i)=>i?c.lineTo(p.x-n.y*r,p.y+n.x*r):c.moveTo(p.x-n.y*r,p.y+n.x*r));
    [...points].reverse().forEach(({p,n,r})=>c.lineTo(p.x+n.y*r,p.y-n.x*r));c.closePath();
    c.shadowColor=main;c.shadowBlur=valid?12:5;c.fillStyle='#173d67e8';c.fill();c.shadowBlur=0;c.strokeStyle=main;c.lineWidth=1.1;c.stroke();
    c.beginPath();points.forEach(({p},i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=main;c.globalAlpha=.55;c.lineWidth=2;c.stroke();c.globalAlpha=1;
    // Small forward fins follow the tangent, rather than a vertical dash pattern.
    const spacing=48,phase=reduced?0:(now*.15)%spacing;
    for(let distance=phase;distance<curve.length-head;distance+=spacing){
     const t=distance/curve.length,p=curve.point(t),n=curve.tangent(t),alpha=Math.sin(Math.PI*t)*.85;
     c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(n.y,n.x));c.globalAlpha=alpha;c.beginPath();c.moveTo(-8,-3.5);c.lineTo(2,0);c.lineTo(-8,3.5);c.lineTo(-4,0);c.closePath();c.fillStyle=light;c.fill();c.restore();
    }
    const n=curve.tangent(1);c.save();c.translate(tx,ty);c.rotate(Math.atan2(n.y,n.x));c.beginPath();c.moveTo(0,0);c.lineTo(-head,head*.44);c.lineTo(-head*.73,0);c.lineTo(-head,-head*.44);c.closePath();
    c.fillStyle=light;c.shadowBlur=valid?12:4;c.shadowColor=main;c.fill();c.shadowBlur=0;c.strokeStyle='#547fb0';c.lineWidth=1;c.stroke();c.beginPath();c.moveTo(-3,0);c.lineTo(-head*.87,head*.26);c.lineTo(-head*.73,0);c.closePath();c.fillStyle=main;c.fill();c.restore();
    c.strokeStyle=main;c.lineWidth=1.6;c.globalAlpha=.8;c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.stroke();
    if(valid||blocked){const rotation=reduced?0:now*.001;c.lineWidth=1.2;for(let i=0;i<3;i++){c.beginPath();c.arc(tx,ty,20,rotation+i*2.094,rotation+i*2.094+1.1);c.stroke();}c.globalAlpha=.15;c.beginPath();c.arc(tx,ty,24,0,Math.PI*2);c.stroke();}c.globalAlpha=1;
   }
  }
  frame=requestAnimationFrame(draw);
 }
 function remove(){if(dead)return;dead=true;cancelAnimationFrame(frame);window.removeEventListener('resize',remove);canvas.remove();}
 window.addEventListener('resize',remove,{once:true});frame=requestAnimationFrame(draw);
 return {update(x:number,y:number,tx:number,ty:number,valid:boolean,blocked:boolean){pose={x,y,tx,ty,valid,blocked};},remove};
}

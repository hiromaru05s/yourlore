import {aimCurve} from './aimGeometry';
export type AimPose={x:number;y:number;tx:number;ty:number;valid:boolean;blocked:boolean;targetWidth?:number};
/** Continuous forward energy runs along the actual screen-space targeting arc. */
export function createAttackAim(follow?:()=>AimPose|null) {
 const canvas=document.createElement('canvas');canvas.className='attack-aim';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
 const c=canvas.getContext('2d')!;let pose:AimPose|null=null,frame=0,dead=false;
 const motion=matchMedia('(prefers-reduced-motion:reduce)');
 let wasValid=false,lockAt=0,lastTarget={x:0,y:0};
 function draw(now:number){
  if(dead||!canvas.isConnected)return;if(document.hidden){remove();return;}
  if(follow)pose=follow();
  const dpr=Math.min(devicePixelRatio||1,1.5),w=innerWidth,h=innerHeight;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const reduced=motion.matches;
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
    c.globalAlpha=1;
    if(valid){
     const radius=Math.max(8,Math.min(38,(pose.targetWidth??90)*.3));
     if(!wasValid||Math.hypot(tx-lastTarget.x,ty-lastTarget.y)>radius*1.5)lockAt=now;
     const enter=reduced?1:Math.min(1,(now-lockAt)/180),pulse=reduced?0:(1-Math.cos((now-lockAt)*Math.PI*2/1100))*.5;
     const r=radius*(1+(1-enter)*.24-pulse*.045),weight=Math.max(1.5,Math.min(3.6,radius*.12));
     c.save();c.translate(tx,ty);c.lineCap='round';c.globalAlpha=.65+enter*.35;
     // Four substantial red brackets lock around the aim point. The open center
     // leaves the character/card art readable, while inward teeth say "target".
     const brackets=()=>{c.beginPath();for(let i=0;i<4;i++){const a=i*Math.PI/2;c.moveTo(r*Math.cos(a+.2),r*Math.sin(a+.2));c.arc(0,0,r,a+.2,a+Math.PI/2-.2);}};
     brackets();c.strokeStyle='#631526';c.lineWidth=weight+1.6;c.stroke();
     brackets();c.strokeStyle='#ff353e';c.lineWidth=weight;c.shadowColor='#ff243b';c.shadowBlur=7+pulse*5;c.stroke();c.shadowBlur=0;
     c.beginPath();for(let i=0;i<4;i++){const a=i*Math.PI/2,inner=r-weight*.28;c.moveTo(inner*Math.cos(a+.24),inner*Math.sin(a+.24));c.arc(0,0,inner,a+.24,a+Math.PI/2-.24);}
     c.strokeStyle='#ffe2d7';c.lineWidth=Math.max(.65,weight*.26);c.stroke();
     for(let i=0;i<4;i++){
      c.save();c.rotate(i*Math.PI/2);const reach=r+weight*1.7;
      c.beginPath();c.moveTo(reach-weight*2.7,0);c.lineTo(reach+weight*.7,-weight*1.2);c.lineTo(reach+weight*.7,weight*1.2);c.closePath();
      c.fillStyle='#ff3d46';c.shadowColor='#ff263d';c.shadowBlur=4;c.fill();c.shadowBlur=0;c.strokeStyle='#ffc5bf';c.lineWidth=.6;c.stroke();c.restore();
     }
     // A restrained echo breathes with the bracket contraction, not a flash.
     c.beginPath();c.arc(0,0,r+weight*2.8+pulse*weight,0,Math.PI*2);c.strokeStyle=`rgba(255,55,65,${.12+pulse*.22})`;c.lineWidth=Math.max(.8,weight*.45);c.stroke();c.restore();
     canvas.dataset.targetLock='active';
    }else{
     canvas.dataset.targetLock=blocked?'blocked':'none';
     if(blocked){c.strokeStyle=main;c.lineWidth=1.2;c.globalAlpha=.5;c.beginPath();c.arc(tx,ty,20,0,Math.PI*2);c.stroke();c.globalAlpha=1;}
    }
    wasValid=valid;lastTarget={x:tx,y:ty};
   }
  }
  frame=requestAnimationFrame(draw);
 }
 function remove(){if(dead)return;dead=true;cancelAnimationFrame(frame);window.removeEventListener('resize',remove);canvas.remove();}
 window.addEventListener('resize',remove,{once:true});frame=requestAnimationFrame(draw);
 return {update(x:number,y:number,tx:number,ty:number,valid:boolean,blocked:boolean){pose={x,y,tx,ty,valid,blocked};},remove};
}

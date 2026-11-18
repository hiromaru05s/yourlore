import {aimCurve} from './aimGeometry';
export type AimPose={x:number;y:number;tx:number;ty:number;valid:boolean;blocked:boolean;sourceWidth?:number};
type Section={x:number;y:number;nx:number;ny:number;r:number;t:number};
const cool=[[.0,13,44,70],[.2,33,98,140],[.37,109,201,230],[.44,224,249,255],[.5,143,216,238],[.7,46,123,163],[1,13,49,80]];
function metal(u:number,blocked:boolean){
 let i=1;while(i<cool.length-1&&u>cool[i][0])i++;
 const a=cool[i-1],b=cool[i],t=(u-a[0])/(b[0]-a[0]),rgb=[1,2,3].map(k=>a[k]+(b[k]-a[k])*t);
 return blocked?[rgb[2]*.86,rgb[1]*.68,rgb[1]*.8]:rgb;
}
const rgba=(rgb:number[],light=1,alpha=1)=>`rgba(${rgb.map(v=>Math.round(Math.min(255,v*light))).join(',')},${alpha})`;
function band(c:CanvasRenderingContext2D,points:Section[],a:number,b:number){
 c.beginPath();points.forEach((p,i)=>{const x=p.x+p.nx*p.r*a,y=p.y+p.ny*p.r*a;i?c.lineTo(x,y):c.moveTo(x,y);});
 for(let i=points.length-1;i>=0;i--){const p=points[i];c.lineTo(p.x+p.nx*p.r*b,p.y+p.ny*p.r*b);}c.closePath();
}
/** A bevelled translucent ribbon, with a dark underside and reflections carried
 * along its surface. Its emitter follows the lifted card's upper crest. */
export function createAttackAim(follow?:()=>AimPose|null) {
 const canvas=document.createElement('canvas');canvas.className='attack-aim';canvas.setAttribute('aria-hidden','true');canvas.dataset.material='bevelled-light';document.body.append(canvas);
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
    const unit=pose.sourceWidth??80,head=Math.min(26,Math.max(11,unit*.25),curve.length*.42),end=1-head*.73/curve.length;
    const width=Math.min(7.5,Math.max(2.3,unit*.06),curve.length*.1),points:Section[]=[];
    const count=Math.max(16,Math.min(64,Math.ceil(curve.length/6)));
    for(let i=0;i<=count;i++){const t=i/count*end,p=curve.point(t),n=curve.tangent(t),r=width*(.38+.62*Math.pow(Math.sin(Math.PI*(.04+t*.92)),.65));points.push({x:p.x,y:p.y,nx:-n.y,ny:n.x,r,t});}
    const main=blocked?'#bb7d89':'#76d6f4',pale=blocked?'#f6d2d9':'#e6faff';
    // A close, displaced soft shadow makes the raised strip read above the table.
    c.save();c.translate(1.4,5);band(c,points,-1,1);c.fillStyle='#10233d24';c.shadowColor='#10233d44';c.shadowBlur=5;c.fill();c.restore();
    // Visible lower face: thickness is tied to the same silhouette, not a halo.
    c.save();c.translate(.7,1.8);band(c,points,-1,1);c.fillStyle=blocked?'#512e41':'#092d4b';c.globalAlpha=.85;c.fill();c.restore();
    band(c,points,-1,1);c.fillStyle='#153e5e';c.shadowColor=main;c.shadowBlur=valid?8:3;c.fill();c.shadowBlur=0;
    // Cross-section shading: broad midtone, narrow specular ridge, dark far edge.
    for(let j=0;j<18;j++){
     const u0=j/18,u1=(j+1)/18,rgb=metal((u0+u1)/2,blocked);
     const gradient=c.createLinearGradient(x,y,tx,ty);
     gradient.addColorStop(0,rgba(rgb,.66,.95));gradient.addColorStop(.18,rgba(rgb,.98,.94));gradient.addColorStop(.53,rgba(rgb,.86,.94));gradient.addColorStop(.85,rgba(rgb,valid?1.08:.96,.96));gradient.addColorStop(1,rgba(rgb,.78,.96));
     band(c,points,u0*2-1,u1*2-1);c.fillStyle=gradient;c.fill();
    }
    // Two fine, continuous highlight ridges stay attached to the ribbon skin.
    for(const [offset,alpha,lineWidth]of [[-.14,.72,.7],[-.94,.48,.55],[.93,.6,.65]]){
     c.beginPath();points.forEach((p,i)=>{const px=p.x+p.nx*p.r*offset,py=p.y+p.ny*p.r*offset;i?c.lineTo(px,py):c.moveTo(px,py);});
     c.strokeStyle=offset>.5?'#123c59':pale;c.globalAlpha=alpha;c.lineWidth=lineWidth;c.stroke();
    }c.globalAlpha=1;
    // Reflections and directional fins share the ribbon surface and its curve.
    c.save();band(c,points,-1,1);c.clip();c.globalCompositeOperation='screen';
    const travel=reduced?.36:(now*.00038)%1;
    for(let k=0;k<2;k++){
     const t=((travel+k*.5)%1)*end,p=curve.point(t),n=curve.tangent(t),length=Math.min(33,curve.length*.12),q=Math.sin(Math.PI*t/end);
     c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(n.y,n.x));c.scale(length,width*1.2);
     const g=c.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,blocked?`rgba(255,220,228,${q*.48})`:`rgba(194,243,255,${q*.62})`);g.addColorStop(.32,`rgba(100,191,231,${q*.22})`);g.addColorStop(1,'#79d4ff00');c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();
    }c.restore();
    // Forward-facing light fins make the travel direction readable at a glance.
    // They use the actual curve tangent and stay bonded to the shaded ribbon.
    const spacing=Math.max(23,Math.min(48,unit*.5)),phase=reduced?spacing*.35:(now*.12)%spacing;
    const finLength=Math.min(11,width*1.8),finWidth=width*.78;
    c.save();band(c,points,-1,1);c.clip();
    for(let distance=phase;distance<curve.length*end;distance+=spacing){
     const t=distance/curve.length,p=curve.point(t),n=curve.tangent(t);
     const alpha=Math.min(1,distance/spacing,(curve.length*end-distance)/spacing);
     c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(n.y,n.x));c.globalAlpha=alpha*.95;
     c.beginPath();c.moveTo(finLength*.4,0);c.lineTo(-finLength*.65,-finWidth);c.lineTo(-finLength*.3,0);c.lineTo(-finLength*.65,finWidth);c.closePath();
     c.shadowColor=main;c.shadowBlur=3;c.fillStyle=pale;c.fill();c.shadowBlur=0;
     c.beginPath();c.moveTo(-finLength*.65,-finWidth);c.lineTo(finLength*.4,0);c.lineTo(-finLength*.65,finWidth);c.strokeStyle=blocked?'#783c54':'#205c85';c.lineWidth=.7;c.stroke();
     c.restore();
    }c.restore();
    // The arrowhead is a small faceted prism continuing the central ridge.
    const n=curve.tangent(1),wing=head*.39,neck=head*.73;
    c.save();c.translate(tx,ty);c.rotate(Math.atan2(n.y,n.x));
    const headPath=()=>{c.beginPath();c.moveTo(0,0);c.lineTo(-head,-wing);c.lineTo(-neck,0);c.lineTo(-head,wing);c.closePath();};
    c.save();c.translate(.5,1.8);headPath();c.fillStyle='#0c324f';c.fill();c.restore();
    headPath();c.shadowColor=main;c.shadowBlur=valid?9:4;c.fillStyle=main;c.fill();c.shadowBlur=0;
    const facet=c.createLinearGradient(-head,-wing,0,wing);facet.addColorStop(0,'#68a6c3');facet.addColorStop(.45,pale);facet.addColorStop(1,'#7ab9d5');
    c.beginPath();c.moveTo(0,0);c.lineTo(-head,-wing);c.lineTo(-neck,0);c.closePath();c.fillStyle=facet;c.fill();
    c.beginPath();c.moveTo(0,0);c.lineTo(-neck,0);c.lineTo(-head,wing);c.closePath();c.fillStyle=blocked?'#976573':'#346f97';c.fill();
    c.beginPath();c.moveTo(-head,-wing);c.lineTo(0,0);c.lineTo(-neck,0);c.strokeStyle=pale;c.lineWidth=.9;c.stroke();
    c.restore();
    // A compact emissive join at the real card crest replaces the floating ring.
    const glow=c.createRadialGradient(x,y,0,x,y,width*1.65);glow.addColorStop(0,'#f2fcffdd');glow.addColorStop(.18,'#a9e7ffc0');glow.addColorStop(1,'#66caff00');
    c.fillStyle=glow;c.beginPath();c.arc(x,y,width*1.65,0,Math.PI*2);c.fill();
   }
  }
  frame=requestAnimationFrame(draw);
 }
 function remove(){if(dead)return;dead=true;cancelAnimationFrame(frame);window.removeEventListener('resize',remove);canvas.remove();}
 window.addEventListener('resize',remove,{once:true});frame=requestAnimationFrame(draw);
 return {update(x:number,y:number,tx:number,ty:number,valid:boolean,blocked:boolean){pose={x,y,tx,ty,valid,blocked};},remove};
}

import {pressurePoint,pressureState} from './pressure';
import {at,clamp,lerp,smooth,variants,type P,type Quad} from './catalog';
import type {Material,Piece} from './material';
type C=CanvasRenderingContext2D;
function triangle(c:C,img:CanvasImageSource,src:P[],dst:P[]){
 const [a,b,d]=src,[e,f,g]=dst,det=(b.x-a.x)*(d.y-a.y)-(d.x-a.x)*(b.y-a.y);if(Math.abs(det)<.0001)return;
 const A=((f.x-e.x)*(d.y-a.y)-(g.x-e.x)*(b.y-a.y))/det,B=((f.y-e.y)*(d.y-a.y)-(g.y-e.y)*(b.y-a.y))/det,Cc=((g.x-e.x)*(b.x-a.x)-(f.x-e.x)*(d.x-a.x))/det,D=((g.y-e.y)*(b.x-a.x)-(f.y-e.y)*(d.x-a.x))/det;
 c.save();c.beginPath();c.moveTo(e.x,e.y);c.lineTo(f.x,f.y);c.lineTo(g.x,g.y);c.closePath();c.clip();c.transform(A,B,Cc,D,e.x-A*a.x-Cc*a.y,e.y-B*a.x-D*a.y);c.drawImage(img,0,0);c.restore();
}
function mapped(c:C,img:HTMLCanvasElement,fn:(x:number,y:number)=>P,n=1){
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const u=x/n,v=y/n,u1=(x+1)/n,v1=(y+1)/n,ps=[{x:u*img.width,y:v*img.height},{x:u1*img.width,y:v*img.height},{x:u1*img.width,y:v1*img.height},{x:u*img.width,y:v1*img.height}],ds=[fn(u,v),fn(u1,v),fn(u1,v1),fn(u,v1)];
  triangle(c,img,[ps[0],ps[1],ps[2]],[ds[0],ds[1],ds[2]]);triangle(c,img,[ps[0],ps[2],ps[3]],[ds[0],ds[2],ds[3]]);
 }
}
function glow(c:C,p:P,r:number,alpha:number){
 if(r<=0||alpha<=0)return;c.save();const g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,`rgba(167,231,255,${alpha})`);g.addColorStop(.20,`rgba(56,160,255,${alpha*.65})`);g.addColorStop(.54,`rgba(4,95,255,${alpha*.22})`);g.addColorStop(1,'rgba(0,80,255,0)');c.fillStyle=g;c.fillRect(p.x-r,p.y-r,2*r,2*r);c.restore();
}
function core(c:C,p:P,r:number,aspect=1,angle=0){
 if(r<.01)return;c.save();c.translate(p.x,p.y);c.rotate(angle);c.scale(aspect,1/Math.sqrt(aspect));
 const g=c.createRadialGradient(-r*.16,-r*.20,0,0,0,r);g.addColorStop(0,'#ffffff');g.addColorStop(.28,'#f0fcff');g.addColorStop(.53,'#b6ecff');g.addColorStop(.80,'#49bdff');g.addColorStop(1,'#1670ff');c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.restore();
}
function path(c:C,points:P[],width:number,alpha:number){
 if(points.length<2||width<.05||alpha<=0)return;c.save();c.globalAlpha=alpha;c.lineCap='round';c.lineJoin='round';
 for(const [mult,color]of [[2.4,'#1588ff'],[1,'#83d9ff'],[.27,'#f0fcff']] as const){c.strokeStyle=color;c.lineWidth=width*mult;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}c.restore();
}
const charge=pressurePoint;
function delay(mode:number,p:P){
 const u=p.x-.5,z=p.y-.5,r=Math.hypot(u,z)/.71;
 return mode===0?p.y*.25:mode===1?r*.16:mode===2?(p.x*.43+p.y*.57)*.32:mode===3?(1-r)*.24:Math.abs(u)*.37;
}
/** A fracture front travels over a coherent surface; fragments retain tangential velocity as they merge. */
function fragmentPoint(source:Quad,w:number,h:number,mode:number,t:number,i:number,piece:Piece,x:number,y:number):P{
 const center=piece.center,origin=charge(source,w,mode,1,center.x,center.y),pt=charge(source,w,mode,1,x,y),u=center.x-.5,z=center.y-.5;
 const d=delay(mode,center),q=clamp((t-d)/(1-d)),open=1-Math.pow(1-clamp(q/.38),3),pull=smooth(mode===3?.18:.39,1,q),remain=1-pull;
 const depth=piece.depth,seed=Math.sin(i*8.91),gather=at(source,.5,.48);
 let dx=0,dy=0,angle=0,sx=1,sy=1;
 if(mode===0){dx=(u*.51+seed*.11)*w*open;dy=(-.14+z*.25+(depth-.5)*.15)*h*open;angle=(depth-.5)*2.8*open;}
 if(mode===1){dx=(u*.78+seed*.085)*w*open;dy=(z*.57+(depth-.5)*.10)*h*open;angle=(depth-.5)*3.1*open;}
 if(mode===2){dx=(.23+z*.21+seed*.08)*w*open;dy=(-.17-u*.10+(depth-.5)*.12)*h*open;angle=-.36*open+seed*.55*open;sy=1-.40*open;}
 if(mode===3){const theta=open*.66,cs=Math.cos(theta),sn=Math.sin(theta);dx=(u*cs-z*sn-u)*w*.9;dy=(u*sn+z*cs-z)*h*.65;dx+=(u*.18+seed*.07)*w*open;dy+=(z*.13+(depth-.5)*.10)*h*open;angle=theta+(depth-.5)*.8*open;sx=1-.48*open;sy=1-.20*open;}
 if(mode===4){const sign=u<0?-1:1;dx=(sign*(.16+.07*Math.cos(z*4))+seed*.065)*w*open;dy=(-sign*.19+z*.16+(depth-.5)*.10)*h*open;angle=(sign*.58+seed*.50)*open;}
 const pos=lerp({x:origin.x+dx,y:origin.y+dy},gather,pull);
 if(mode===2){pos.y-=Math.sin(pull*Math.PI)*h*.13;}
 if(mode===3){pos.x+=Math.sin(pull*Math.PI)*z*w*.17;pos.y-=Math.sin(pull*Math.PI)*u*h*.17;}
 if(mode===4){pos.y+=Math.sin(pull*Math.PI)*Math.sign(u)*h*.21;}
 const flip=(.38+.62*Math.abs(Math.cos(q*(1.7+depth*2.1))))*open+1-open;
 sx*=flip;const scale=1-smooth(.58,1,q)*.98,rot=angle*remain,cs=Math.cos(rot),sn=Math.sin(rot),lx=(pt.x-origin.x)*sx*scale,ly=(pt.y-origin.y)*sy*scale;
 return{x:pos.x+lx*cs-ly*sn,y:pos.y+lx*sn+ly*cs};
}
function render(c:C,m:Material,index:number,ms:number,source:Quad,target:Quad,reduced:boolean){
 const v=variants[index],a=at(source,.5,.48),b=at(target,.5,.5),w=Math.hypot(source[1].x-source[0].x,source[1].y-source[0].y),h=Math.hypot(source[3].x-source[0].x,source[3].y-source[0].y);
 if(reduced){mapped(c,m.face,(x,y)=>at(ms<v.arriveAt?source:target,x,y));return;}
 if(ms<v.breakAt){
  const t=clamp(ms/v.breakAt),state=pressureState(index,t),skin=m.skins[index],fn=(x:number,y:number)=>charge(source,w,index,t,x,y);
  // Every frame changes the light's shape and location on the original card surface.
  const phase=t*(skin.frames.length-1),lo=Math.floor(phase),hi=Math.min(lo+1,skin.frames.length-1);
  mapped(c,skin.frames[lo],fn,8);
  if(hi!==lo){c.save();c.globalAlpha=phase-lo;mapped(c,skin.frames[hi],fn,8);c.restore();}
  // Tension concentrates along the two shoulders of the same bulging card surface.
  if(state.release>.1){c.save();c.globalAlpha=state.release*.43;c.strokeStyle='#dcecf2';c.lineWidth=Math.max(.5,w*.003);
   for(const edge of [.103,.897]){c.beginPath();for(let j=0;j<=24;j++){const yy=.14+j/24*.70,pp=fn(edge,yy);j?c.lineTo(pp.x,pp.y):c.moveTo(pp.x,pp.y);}c.stroke();}c.restore();}
  // The first short fissures open only at the limit, on the same boundaries that will fracture.
  const strain=smooth(.84,1,t);
  if(strain>0){c.save();c.globalAlpha=strain*.55;c.strokeStyle='#edf9ff';c.lineWidth=Math.max(.35,w*.0022);
   for(const [i,piece]of m.pieces[index].entries()){
    const r=Math.hypot(piece.center.x-.5,(piece.center.y-.5)*.8);
    if(r>.29||r<.10||i%3!==0)continue;
    const a=piece.poly[0],b=piece.poly[1],start=fn(a.x,a.y),end=fn(a.x+(b.x-a.x)*strain,a.y+(b.y-a.y)*strain);
    c.beginPath();c.moveTo(start.x,start.y);c.lineTo(end.x,end.y);c.stroke();
   }c.restore();}
  glow(c,fn(.5,.48),w*(.29+state.release*.18),state.light*.09);return;
 }
 if(ms<v.joinAt){
  const t=clamp((ms-v.breakAt)/(v.joinAt-v.breakAt)),central=smooth(.68,1,t),flash=(1-smooth(0,.10,t))*.16;
  glow(c,a,w*.60,flash+central*.20);
  // Facets turn through individual reflection peaks while retaining their original surface position.
  const pieces=m.pieces[index];
  for(const [i,p]of pieces.entries()){
   const d=delay(index,p.center),q=clamp((t-d)/(1-d)),fn=(x:number,y:number)=>fragmentPoint(source,w,h,index,t,i,p,p.box.x+x*p.box.w,p.box.y+y*p.box.h);
   const release=smooth(0,.16,q),fade=1-smooth(.94,1,q);
   c.save();c.globalAlpha=fade;
   if(release<1){c.globalAlpha=fade*(1-release);mapped(c,p.base,fn);}
   if(release>0){
    c.globalAlpha=fade*release*(.84+.16*p.depth);mapped(c,p.canvas,fn);
    // A narrow moving highlight belongs to the shard, instead of whitening all fragments.
    const spec=Math.pow(Math.max(0,Math.sin(q*5.4+p.depth*2.5)),14);
    if(spec>.015){c.globalAlpha=fade*release*spec*.55;c.globalCompositeOperation='screen';mapped(c,p.base,fn);}
   }
   c.restore();
   // Fracture light only exists at the advancing front; it never forms a permanent wire mesh.
   const front=Math.max(0,1-Math.abs(t-d-.022)/.042);
   if(front>0){c.save();c.globalAlpha=front*.72;c.strokeStyle='#c8f6ff';c.lineWidth=Math.max(.35,w*.0028);c.beginPath();p.poly.forEach((v,j)=>{const pt=charge(source,w,index,1,v.x,v.y);j?c.lineTo(pt.x,pt.y):c.moveTo(pt.x,pt.y);});c.closePath();c.stroke();c.restore();}
  }
  if(central){glow(c,a,w*.23,central*.44);core(c,a,w*.038*central);}
  return;
 }
 if(ms<v.arriveAt){
  const t=clamp((ms-v.joinAt)/(v.arriveAt-v.joinAt)),pos=(q:number)=>{const s=q*q*(3-2*q),p=lerp(a,b,s);p.y+=Math.sin(q*Math.PI)*w*v.curve;return p;},p=pos(t),before=pos(Math.max(0,t-.008));
  // All fragments have already joined. Exactly one light moves to the Shelf.
  const points=Array.from({length:20},(_,i)=>pos(Math.max(0,t-i*.008)));
  for(let i=points.length-1;i>0;i--)path(c,[points[i],points[i-1]],w*.012*(1-i/points.length),.30*(1-i/points.length));
  glow(c,p,w*.27,.40);core(c,p,w*.038,1+Math.sin(t*Math.PI)*.9,Math.atan2(p.y-before.y,p.x-before.x));return;
 }
 const t=clamp((ms-v.arriveAt)/(v.duration-v.arriveAt)),form=smooth(0,.67,t),reveal=smooth(.47,1,t),r=w*.038;
 const fn=(x:number,y:number)=>{const p=at(target,x,y),small={x:b.x+(x-.5)*r*2,y:b.y+(y-.5)*r*2};return lerp(small,p,form);};
 glow(c,b,w*.43,(1-reveal)*.26);
 c.save();c.globalAlpha=1-reveal;mapped(c,m.skins[index].lit,fn,4);c.globalAlpha=(1-reveal)*.65;mapped(c,m.rim,fn,4);c.restore();
 c.save();c.globalAlpha=reveal;mapped(c,m.face,fn,3);c.restore();
 if(t<.22){c.save();c.globalAlpha=1-smooth(0,.22,t);core(c,b,r*(1-t));c.restore();}
}
const buffers=new WeakMap<HTMLCanvasElement,{canvas:HTMLCanvasElement;c:C}>();
export function draw(c:C,m:Material,index:number,ms:number,source:Quad,target:Quad,reduced=false){
 let buffer=buffers.get(c.canvas);if(!buffer){const canvas=document.createElement('canvas');buffer={canvas,c:canvas.getContext('2d',{willReadFrequently:true})!};buffers.set(c.canvas,buffer);}
 const {canvas,c:layer}=buffer;if(canvas.width!==c.canvas.width||canvas.height!==c.canvas.height){canvas.width=c.canvas.width;canvas.height=c.canvas.height;}
 layer.resetTransform();layer.clearRect(0,0,canvas.width,canvas.height);layer.setTransform(c.getTransform());render(layer,m,index,ms,source,target,reduced);
 const v=variants[index],glowAmount=reduced?0:smooth(20,v.breakAt*.66,ms)*(1-smooth(v.arriveAt+70,v.duration,ms));
 c.save();c.resetTransform();
 if(glowAmount){c.globalAlpha=(ms<v.breakAt?.18:.40)*glowAmount;c.filter=`blur(${Math.max(2,Math.hypot(source[1].x-source[0].x,source[1].y-source[0].y )*.063*c.getTransform().a)}px)`;c.drawImage(canvas,0,0);c.globalAlpha=.12*glowAmount;c.filter='blur(2px)';c.drawImage(canvas,0,0);}
 c.filter='none';c.globalAlpha=1;c.drawImage(canvas,0,0);c.restore();
}

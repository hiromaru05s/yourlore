export const CONTACT=1680,DEPART=380;
type Outcome="return";
export type Point={x:number;y:number};
export type Surface=Point&{w:number;h:number;corners?:Point[]};
export type Scene={source:Surface;target:Surface;face:HTMLCanvasElement;targetFace?:HTMLCanvasElement;reduced:boolean;dark:boolean;outcome:Outcome;board?:boolean};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{n=clamp(n);return n*n*(3-2*n)};
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
function path(c:CanvasRenderingContext2D,p:Point[]){c.beginPath();p.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath()}
function stroke(c:CanvasRenderingContext2D,p:Point[],color:string,width:number){c.beginPath();p.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.strokeStyle=color;c.lineWidth=width;c.stroke()}
// Piecewise affine UV mapping: original art and engraved material use precisely the same vertices.
function triangle(c:CanvasRenderingContext2D,img:HTMLCanvasElement,p:Point[],uv:Point[]){
 const [a,b,d]=uv.map(v=>({x:v.x*img.width,y:v.y*img.height})),[A,B,D]=p;
 const det=(b.x-a.x)*(d.y-a.y)-(b.y-a.y)*(d.x-a.x);if(Math.abs(det)<.001)return;
 const xx=((B.x-A.x)*(d.y-a.y)-(D.x-A.x)*(b.y-a.y))/det,xy=((D.x-A.x)*(b.x-a.x)-(B.x-A.x)*(d.x-a.x))/det;
 const yx=((B.y-A.y)*(d.y-a.y)-(D.y-A.y)*(b.y-a.y))/det,yy=((D.y-A.y)*(b.x-a.x)-(B.y-A.y)*(d.x-a.x))/det;
 c.save();path(c,p);c.clip();c.transform(xx,yx,xy,yy,A.x-xx*a.x-xy*a.y,A.y-yx*a.x-yy*a.y);c.drawImage(img,0,0);c.restore();
}
// Correct the flat mesh to the actual projected card corners; never use a pile bounding box.
function correction(r:Surface,u:number,v:number):Point{
 if(!r.corners)return{x:0,y:0};const [a,b,d,e]=r.corners;
 return{x:mix(mix(a.x,b.x,u),mix(e.x,d.x,u),v)-(r.x+(u-.5)*r.w),y:mix(mix(a.y,b.y,u),mix(e.y,d.y,u),v)-(r.y+(v-.5)*r.h)};
}
function projected(s:Scene,p:Point,u:number,v:number,q:number):Point{const a=correction(s.source,u,v),b=correction(s.target,u,v);return{x:p.x+mix(a.x,b.x,q),y:p.y+mix(a.y,b.y,q)}}
function flat(c:CanvasRenderingContext2D,face:HTMLCanvasElement,r:Surface){const uv=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],p=uv.map(v=>{const a=correction(r,v.x,v.y);return{x:r.x+(v.x-.5)*r.w+a.x,y:r.y+(v.y-.5)*r.h+a.y}});triangle(c,face,[p[0],p[1],p[2]],[uv[0],uv[1],uv[2]]);triangle(c,face,[p[0],p[2],p[3]],[uv[0],uv[2],uv[3]])}
const textures=new WeakMap<HTMLCanvasElement,HTMLCanvasElement>();
function material(face:HTMLCanvasElement){
 const cached=textures.get(face);if(cached)return cached;
 const cv=document.createElement('canvas');cv.width=face.width;cv.height=face.height;
 const c=cv.getContext('2d')!;c.drawImage(face,0,0);c.globalCompositeOperation='source-atop';c.fillStyle='#1b0b3a66';c.fillRect(0,0,cv.width,cv.height);c.lineCap='round';
 for(let i=0;i<18;i++){const x=(i*.618033%1)*cv.width,y=(i*.381966%1)*cv.height;c.strokeStyle=i%3?'#c1a1ed6a':'#e5d6fcb9';c.lineWidth=i%3?1:2;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+28,y-26,x-18,y-45,x+15,y-70);c.stroke();}
 textures.set(face,cv);return cv;
}
function shadow(c:CanvasRenderingContext2D,r:Surface,lift:number){c.save();c.translate(r.x,r.y+r.h*.35+lift*.2);c.scale(1,.28);const g=c.createRadialGradient(0,0,0,0,0,r.w*.65);g.addColorStop(0,'#170f3035');g.addColorStop(1,'#170f3000');c.fillStyle=g;c.fillRect(-r.w,-r.w,r.w*2,r.w*2);c.restore()}
/** Frozen approved 01 mesh. Other prototype branches are excluded from runtime. */
export function render(c:CanvasRenderingContext2D,s:Scene,ms:number){
 const t=Math.max(0,ms),raw=clamp((t-DEPART)/(CONTACT-DEPART)),q=smooth(raw),amp=Math.sin(q*Math.PI),unit=Math.min(s.source.w,s.target.w),mat=material(s.face);
 if(s.outcome!=='return'){flat(c,s.face,s.source);if(t>DEPART&&t<1000){c.save();c.strokeStyle='#967057';c.lineWidth=2;c.strokeRect(s.source.x-s.source.w*.44,s.source.y-s.source.h*.44,s.source.w*.88,s.source.h*.88);c.restore()}return}
 if(t>=CONTACT){if(!s.board)flat(c,s.targetFace??s.face,s.target);return}
 if(s.reduced){flat(c,s.face,s.source);return}
 const center={x:mix(s.source.x,s.target.x,q),y:mix(s.source.y,s.target.y,q)};
 shadow(c,{...center,w:mix(s.source.w,s.target.w,q),h:mix(s.source.h,s.target.h,q)},amp*30);
 const charge=smooth(t/DEPART),tint=charge*(.2+amp*.64)*(1-smooth((q-.88)/.12));
 // A mesh is continuous at source, in transit and at contact. All designs converge to exactly the target rectangle.
 const vertex=(u:number,v:number):Point=>{
  let z=q,x=0,y=0;const w=mix(s.source.w,s.target.w,q),h=mix(s.source.h,s.target.h,q);
  {z=clamp(q+(u-.5)*.42*amp);x=mix(s.source.x,s.target.x,z)+(u-.5)*w*(1-.42*amp);y=mix(s.source.y,s.target.y,z)+(v-.5)*h*(1-.69*amp)-Math.sin(z*Math.PI*2)*unit*.62*amp+Math.sin(u*9+v*3-t/260)*unit*.07*amp}
  return projected(s,{x,y},u,v,q);
 };
 const paint=(uv:Point[],p:Point[],shade=0)=>{triangle(c,s.face,p,uv);if(s.targetFace&&q>.78){c.save();c.globalAlpha=smooth((q-.78)/.22);triangle(c,s.targetFace,p,uv);c.restore()}c.save();c.globalAlpha=tint;triangle(c,mat,p,uv);c.restore();if(shade>0){path(c,p);c.fillStyle=`rgba(18,8,34,${shade})`;c.fill()}};
 const nx=24,ny=6;
 const cells=[];for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)cells.push({x,y});
 for(const {x,y}of cells){const uv=[{x:x/nx,y:y/ny},{x:(x+1)/nx,y:y/ny},{x:(x+1)/nx,y:(y+1)/ny},{x:x/nx,y:(y+1)/ny}];const p=uv.map(v=>vertex(v.x,v.y)),shade=0;paint([uv[0],uv[1],uv[2]],[p[0],p[1],p[2]],shade);paint([uv[0],uv[2],uv[3]],[p[0],p[2],p[3]],shade)}
 // Silvery rim, dark thickness, and attached veins are subordinate to the art-bearing main surface.
 for(const edge of [0,1]){const p=Array.from({length:49},(_,i)=>vertex(i/48,edge));stroke(c,p.map(v=>({x:v.x,y:v.y+amp*unit*.025})),'#241036',Math.max(.5,unit*.022)*charge);stroke(c,p,`rgba(221,193,254,${charge*.9})`,Math.max(.6,unit*.012))}
 for(let j=1;j<4;j++){const p=Array.from({length:33},(_,i)=>vertex(i/32,j/4+Math.sin(i*.2+t/220)*.02*amp));stroke(c,p,`rgba(190,152,237,${amp*.6})`,unit*.009)}
}

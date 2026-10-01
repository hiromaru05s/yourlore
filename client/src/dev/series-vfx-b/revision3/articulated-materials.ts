import {begin,native,smooth,type Surface} from './surface';
import {regions,regionPath} from './regions';
type V={x:number;y:number;u:number;v:number;weight:number;inside:boolean};
type P={x:number;y:number};
type Bounds={x:number;y:number;w:number;h:number};
type Prepared={texture:HTMLCanvasElement;vertices:V[];triangles:number[][];bounds:Bounds;scaleX:number;scaleY:number};
const prepared=new WeakMap<Surface,Prepared>();
function distance(x:number,y:number,points:number[][]){let d=Infinity,inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
 const [ax,ay]=points[j],[bx,by]=points[i],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
 d=Math.min(d,Math.hypot(x-ax-t*dx,y-ay-t*dy));if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
 }return inside?d:0;}
function prepare(s:Surface,id:string,family:string){const old=prepared.get(s);if(old)return old;
 const points=regions[id].points,xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),bounds={x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
 const texture=document.createElement('canvas');texture.width=Math.ceil(s.iw*3);texture.height=Math.ceil(s.ih*3);const c=texture.getContext('2d')!;
 const z=Math.max(s.iw/s.img.naturalWidth,s.ih/s.img.naturalHeight),iw=s.img.naturalWidth*z,ih=s.img.naturalHeight*z,ox=(s.iw-iw)*.5,oy=(s.ih-ih)*.22;
 c.drawImage(s.img,ox*3,oy*3,iw*3,ih*3);
 const mask=document.createElement('canvas');mask.width=texture.width;mask.height=texture.height;const mc=mask.getContext('2d')!;mc.scale(mask.width,mask.height);mc.fill(regionPath(s,id)!);c.globalCompositeOperation='destination-in';c.drawImage(mask,0,0);c.globalCompositeOperation='source-over';
 const free=family==='S02'||family==='S03';
 const columns=Math.max(10,Math.ceil(s.iw/5)),rows=Math.max(12,Math.ceil(s.ih/5)),vertices:V[]=[];
 for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++){const nx=x/columns,ny=y/rows,u=(nx*s.iw-ox)/iw,v=(ny*s.ih-oy)/ih;vertices.push({x:nx,y:ny,u,v,inside:distance(u,v,points)>0,weight:free?smooth(.05,.28,(v-bounds.y)/bounds.h):smooth(0,Math.min(bounds.w,bounds.h)*.17,distance(u,v,points))});}
 const triangles:number[][]=[];for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const i=y*(columns+1)+x,j=i+1,k=i+columns+1,l=k+1;for(const t of [[i,j,k],[j,l,k]])if(t.some(n=>vertices[n].weight))triangles.push(t);}
 const result={texture,vertices,triangles,bounds,scaleX:iw/s.iw,scaleY:ih/s.ih};prepared.set(s,result);return result;
}
function triangle(c:CanvasRenderingContext2D,texture:HTMLCanvasElement,a:V,b:V,d:V,pa:P,pb:P,pd:P,shade:number){
 const sx=b.x-a.x,sy=b.y-a.y,tx=d.x-a.x,ty=d.y-a.y,det=sx*ty-tx*sy;
 const ux=pb.x-pa.x,uy=pb.y-pa.y,vx=pd.x-pa.x,vy=pd.y-pa.y;
 const m00=(ux*ty-vx*sy)/det,m01=(vx*sx-ux*tx)/det,m10=(uy*ty-vy*sy)/det,m11=(vy*sx-uy*tx)/det;
 c.save();c.beginPath();c.moveTo(pa.x,pa.y);c.lineTo(pb.x,pb.y);c.lineTo(pd.x,pd.y);c.closePath();c.clip();
 c.transform(m00,m10,m01,m11,pa.x-m00*a.x-m01*a.y,pa.y-m10*a.x-m11*a.y);c.drawImage(texture,0,0,1,1);c.restore();
 if(Math.abs(shade)>.007){c.save();c.beginPath();c.moveTo(pa.x,pa.y);c.lineTo(pb.x,pb.y);c.lineTo(pd.x,pd.y);c.closePath();c.globalAlpha=Math.min(.13,Math.abs(shade));c.globalCompositeOperation=shade>0?'screen':'multiply';c.fillStyle=shade>0?'#ead9ab':'#263b30';c.fill();c.restore();}
}
const bump=(x:number,center:number,width:number)=>Math.exp(-Math.pow((x-center)/width,2));
// All displacement is two dimensional, inside one registered material region.
// Faces/background/container walls remain identical. Boundary vertices are pinned.
function deformation(family:string,id:string,variant:number,x:number,y:number,p:number):[number,number]{
 const tension=smooth(.04,.2,p)*(1-smooth(.23,.34,p)),open=smooth(.22,.46,p)*(1-smooth(.64,.98,p));
 if(family==='S02'){
  if(variant===1){const front=smooth(.16,.68,p),alive=bump(y,front,.42),spread=Math.sin(Math.PI*x)*alive*open;
   return [(x-.48)*(.72*spread-.32*tension),-.34*alive*open+.20*tension*y];}
  // A broad diagonal pleat hinges below the clasp, crosses the hem, then lays flat.
  const fold=bump(x,.1+.85*smooth(.16,.66,p),.28)*Math.sin(Math.PI*y),bend=fold*open;
  return [.38*bend-.16*tension*y,-.32*bend*Math.sin(x*Math.PI)+.12*tension*y];
 }
 if(family==='S03'){
  if(variant===1){const roots=bump(y,.78,.32),rise=bump(y,.85-.7*smooth(.22,.65,p),.3);
   const landing=smooth(.46,.61,p)*(1-smooth(.7,.97,p));return [(x-.5)*(.95*roots*open-.5*tension),-.28*rise*open+.20*roots*landing+.15*tension*roots];}
  // Pressure climbs a central sap column, then divides into the attached roots.
  const travel=smooth(.18,.7,p),column=bump(x,.5+.055*Math.sin(y*6),.24),head=bump(y,1-travel,.25);
  return [(x-.5)*.85*column*head*open,-.55*column*head*open+.15*tension*y];
 }
 if(family==='S16'){
  if(variant===1){const upper=bump(x,.35,.3)*bump(y,.3,.32),lower=bump(x,.62,.34)*bump(y,.72,.3);return [.11*(upper-lower)*open,-.16*lower*open+.05*tension];}
  const dx=x-.5,dy=y-.52,turn=.34*open*(x<.5?1:-1);return [-dy*turn,dx*turn+.03*tension];
 }
 if(family==='S18'){
  const planted=1-smooth(.5,.95,y),torso=bump(x,.47,.48)*planted;
  if(variant===1)return [torso*(.19*open-.07*tension),torso*(-.105*open+.065*tension)];
  const brush=bump(x,.1+.83*smooth(.14,.68,p),.34)*planted;return [-.16*brush*open,.09*brush*open-.03*tension];
 }
 if(family==='S19'){
  if(id==='LAND_GRANT'){const edge=bump(x,variant===1?.2:.8,.4);return [variant===1?.1*edge*open:-.1*edge*open,-.14*edge*open+.02*tension];}
  const hem=smooth(.05,.9,y),fold=bump(x,.28+.48*smooth(.18,.67,p),.3);
  return variant===1?[(x-.5)*.28*hem*open,.12*hem*open-.06*tension*hem]:[.17*fold*hem*open,-.11*fold*open+.035*tension];
 }
 if(family==='S26'){
  const paper=['GUILD_CO','BUYOUT','RICH_HABIT','LAND_GRANT'].includes(id),built=['MARKET_CRISIS','S5','DOMINION','SLUM'].includes(id);
  if(paper){const hinge=Math.sin(Math.PI*x);return variant===1?[-.16*hinge*open,-.15*hinge*open]:[.09*hinge*open,.13*hinge*open-.045*tension];}
  if(built)return variant===1?[(x-.5)*.15*open,-.11*bump(y,.58,.4)*open]:[.10*open*Math.sin(y*Math.PI),.13*open*bump(y,.75,.3)];
  const cloth=smooth(.07,.88,y);return variant===1?[-.14*cloth*open,-.065*bump(x,.25,.35)*open]:[.11*cloth*open,.12*bump(x,.6,.35)*cloth*open-.03*tension];
 }
 if(family==='S27'){
  if(['WINE','BREWING'].includes(id)){
   const wave=bump(x,variant===1?.35+.3*smooth(.2,.65,p):.7-.35*smooth(.2,.65,p),.32),belly=Math.sin(y*Math.PI);
   return variant===1?[.13*wave*belly*open,-.22*wave*open+.05*tension]:[-.15*wave*belly*open,.18*wave*open-.04*tension];
  }
  if(['FARM_KEEPER','TOKEN00','SCARECROW'].includes(id)){const stem=Math.sin(Math.PI*y);return variant===1?[(x-.5)*.23*stem*open,-.12*stem*open]:[.17*stem*open,-.07*stem*open+.035*tension];}
  const fruit=bump(x,.5,.45)*bump(y,.5,.48);return variant===1?[(x-.5)*.3*fruit*open,-.14*fruit*open]:[-(y-.5)*.3*fruit*open,(x-.5)*.23*fruit*open];
 }
 return [0,0];
}
function vein(c:CanvasRenderingContext2D,a:Prepared,s:Surface,family:string,id:string,variant:number,p:number){
 if(family==='S02'||family==='S03')return;
 const path=regionPath(s,id);if(!path)return;
 const b=a.bounds,zx=a.scaleX,zy=a.scaleY,ox=(1-zx)*.5,oy=(1-zy)*.22;
 const pt=(x:number,y:number)=>[(b.x+x*b.w)*zx+ox,(b.y+y*b.h)*zy+oy] as [number,number];
 const liquid=['WINE','BREWING'].includes(id),straw=['FARM_KEEPER','TOKEN00','SCARECROW'].includes(id);if(family==='S27'&&!liquid&&!straw)return;
 const head=smooth(.14,.58,p),tail=smooth(.6,.98,p);if(head<=tail)return;
 c.save();c.clip(path);c.lineCap='round';
 const draw=(branch:number)=>{const r=new Path2D();for(let i=0;i<=24;i++){const t=tail+(head-tail)*i/24;let x:number,y:number;
  if(family==='S02'){if(variant===1){y=t;x=.5+branch*.37*t*t;}else{x=t;y=.23+.58*t+branch*.10*Math.sin(t*Math.PI);}}
  else if(family==='S03'){if(variant===1){y=1-t;x=.5+branch*.42*Math.pow(1-t,2);}else{y=1-t;x=.5+branch*.16*Math.sin(t*Math.PI);}}
  else if(family==='S16'){y=t;x=.5+branch*.24+.12*Math.sin(t*6+branch)*Math.sin(t*Math.PI);}
  else if(family==='S18'){x=t;y=.22+branch*.09+.22*t+.045*Math.sin(t*9);}
  else if(family==='S19'){y=t;x=.5+branch*.22+.06*Math.sin(t*Math.PI+variant)*t;}
  else if(family==='S26'){y=t;x=.48+branch*.18+.1*Math.sin(t*Math.PI)*(variant===1?1:-1);}
  else if(liquid){x=t;y=.5+(variant===1?-1:1)*.23*Math.sin(t*Math.PI)*Math.sin(p*Math.PI);}
  else{y=t;x=.5+branch*.19+.12*t*t;}

  const [xx,yy]=pt(x,y);i?r.lineTo(xx,yy):r.moveTo(xx,yy);}
  c.strokeStyle=liquid?'#422821':family==='S18'?'#332923':family==='S02'?'#38552b':'#343d39';c.lineWidth=.022;c.globalAlpha=.35;c.stroke(r);
  c.strokeStyle=liquid?'#be8b73':family==='S18'?'#a88d64':family==='S02'?'#b9c99a':'#c4bea5';c.lineWidth=.009;c.globalAlpha=.72;c.stroke(r);
  c.strokeStyle='#fff0cb';c.lineWidth=.003;c.globalAlpha=.8;c.stroke(r);
 };
 (liquid?[0]:[-1,0,1]).forEach(draw);c.restore();
}
export function drawArticulated(s:Surface,family:string,id:string,variant:number,p:number){
 const c=begin(s);native(s);const path=regionPath(s,id);if(!path){c.restore();return;}const a=prepare(s,id,family),b=a.bounds,free=family==='S02'||family==='S03';
 if(free){const raised=smooth(.07,.28,p)*(1-smooth(.66,.98,p));c.save();c.clip(path);c.globalCompositeOperation='multiply';c.fillStyle=`rgba(20,29,23,${raised*.3})`;c.fillRect(0,0,1,1);c.restore();}
 c.save();if(!free)c.clip(path);
 const mapped=a.vertices.map(v=>{const [dx,dy]=deformation(family,id,variant,(v.u-b.x)/b.w,(v.v-b.y)/b.h,p);return {x:v.x+dx*b.w*a.scaleX*v.weight,y:v.y+dy*b.h*a.scaleY*v.weight};});
 for(const [ia,ib,ic] of a.triangles){const va=a.vertices[ia],vb=a.vertices[ib],vc=a.vertices[ic],pa=mapped[ia],pb=mapped[ib],pc=mapped[ic],shade=((pb.x-pa.x)-(vb.x-va.x))*8+((pc.y-pa.y)-(vc.y-va.y))*5;triangle(c,a.texture,va,vb,vc,pa,pb,pc,va.inside&&vb.inside&&vc.inside?shade:0);}
 c.restore();vein(c,a,s,family,id,variant,p);c.restore();
}

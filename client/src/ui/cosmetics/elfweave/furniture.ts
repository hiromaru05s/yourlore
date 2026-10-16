import * as T from 'three';

export interface Sculpture{group:T.Group;tick:(t:number,activity?:number)=>void;dispose:()=>void;}
export function disposeObject(group:T.Object3D){const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();group.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());group.removeFromParent();}
export function elfweaveFurniture(grave=false):Sculpture{
 const group=new T.Group(),updates:Array<(t:number,a:number)=>void>=[],theme={metal:'#a0bfb2'};
 const mat=(color:string,metalness=.1,roughness=.55)=>new T.MeshStandardMaterial({color,metalness,roughness});
 const cut=mat('#eef0d6'),dark=mat('#486d5d'),gold=mat(theme.metal,.65,.35),green=mat('#7eaf98'),vein=mat('#e0e6bf');
 const materials=[cut,dark,gold,green,vein];
 const w=grave?1.42:1.28,h=grave?1.98:1.88;
 function mesh(geo:T.BufferGeometry,m:T.Material,parent:T.Object3D=group){const o=new T.Mesh(geo,m);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function path(points:number[][],radius:number,m:T.Material,parent:T.Object3D=group){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number]))),24,radius,6,false),m,parent);}
 function bed(width:number,height:number,y:number,m:T.Material){const s=new T.Shape(),x=width/2,z=height/2,r=.14;s.moveTo(-x+r,-z);s.lineTo(x-r,-z);s.quadraticCurveTo(x,-z,x,-z+r);s.lineTo(x,z-r);s.quadraticCurveTo(x,z,x-r,z);s.lineTo(-x+r,z);s.quadraticCurveTo(-x,z,-x,z-r);s.lineTo(-x,-z+r);s.quadraticCurveTo(-x,-z,-x+r,-z);const g=new T.ExtrudeGeometry(s,{depth:.018,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:2});g.rotateX(-Math.PI/2);const o=mesh(g,m);o.position.y=y;return o;}
 function leaf(length:number,width:number,m:T.Material,parent:T.Object3D){
  const g=new T.BufferGeometry(),p:number[]=[],ids:number[]=[];
  for(let j=0;j<=12;j++)for(let k=0;k<=6;k++){const t=j/12,u=k/6*2-1;p.push(u*width*Math.pow(Math.sin(Math.PI*t),.8),Math.sin(t*Math.PI)*length*.15+u*u*width*.18,-t*length);}
  for(let j=0;j<12;j++)for(let k=0;k<6;k++){const a=j*7+k;ids.push(a,a+1,a+7,a+1,a+8,a+7);}g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ids);g.computeVertexNormals();const mm=m.clone();mm.side=T.DoubleSide;mesh(g,mm,parent);
  path(Array.from({length:9},(_,i)=>{const t=i/8;return[0,.004+Math.sin(t*Math.PI)*length*.15,-t*length];}),.0045,vein,parent);
  for(let j=1;j<5;j++)for(const sign of [-1,1]){const t=j/6;path([[0,Math.sin(t*Math.PI)*length*.15+.004,-t*length],[sign*width*Math.sin(t*Math.PI)*.75,Math.sin((t+.1)*Math.PI)*length*.15+.01,-(t+.1)*length]],.0018,vein,parent);}
 }
 // Grounded shallow tray; the card contact plane stays at the native .08 height.
 bed(w,h,.012,dark);bed(w-.045,h-.045,.039,cut);bed(w-.10,h-.10,.049,green);
 // Quiet grain across the empty floor, with enough local relief to read in light.
 for(let j=0;j<11;j++){const x=-w*.38+j*w*.076;path([[x,.084,-h*.4],[x+.018,.084,-.27],[x-.022,.084,.3],[x+.01,.084,h*.4]],.0025,cut);}
  // Whitewood boughs interlace into two pointed ends. Slim leaves open outwards.
  for(const side of [-1,1])for(const strand of [-1,1]){
   const points=Array.from({length:17},(_,j)=>{const u=j/16,z=(u-.5)*h;return[side*(w*.48+Math.sin(u*Math.PI*3)*.025*strand),.115+Math.cos(u*Math.PI*3)*.022*strand,z];});path(points,.025,strand===1?cut:gold);
  }
  for(const side of [-1,1])for(let j=0;j<5;j++){
   const stem=new T.Group();stem.position.set(side*w*.48,.11,-.72+j*.36);stem.rotation.y=side*(1.15+j*.05);group.add(stem);leaf(.36,.075,j%2?green:cut,stem);
   updates.push(t=>stem.rotation.z=side*(.06+Math.sin(t*.7-j*.45+side)*.10));
  }
  for(const end of [-1,1])for(const side of [-1,1])path([[side*w*.45,.12,end*h*.36],[side*.26,.19,end*(h*.5+.045)],[0,.14,end*(h*.5+.11)]],.021,cut);
  for(const side of [-1,1])path([[0,.088,.71],[side*.27,.088,.32],[side*.25,.088,-.28],[0,.088,-.71]],.008,cut);
  const stem=new T.Group();stem.position.set(0,.083,.35);group.add(stem);leaf(.69,.14,green,stem);updates.push(t=>stem.scale.x=1+Math.sin(t*.7)*.025);
 let disposed=false;
 return {group,tick(t,a=0){updates.forEach(f=>f(t,a));},dispose(){if(disposed)return;disposed=true;disposeObject(group);materials.forEach(m=>m.dispose());}};
}

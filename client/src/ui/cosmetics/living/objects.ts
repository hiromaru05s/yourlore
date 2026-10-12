import * as T from 'three';
import {animatedMaterial,COLORS,tactile,type Variant} from './materials';
export {animatedMaterial,type Variant} from './materials';
export interface LivingObject{root:T.Group;tick:(time:number)=>void;dispose:()=>void;}
function rounded(w:number,h:number,r=.07){const s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
export function makeObject(v:Variant,kind:'sleeve'|'deck'|'shelf'):LivingObject{
 const root=new T.Group(),motions:Array<(t:number)=>void>=[],animated:T.ShaderMaterial[]=[],palette=COLORS[v];
 const finish=v===0?'porcelain':'leather';
 const body=tactile(palette.body,.08,v===0?.28:.58,finish),edge=tactile(palette.edge,.78,.31),dark=tactile(palette.metal,.12,.66,finish),paper=tactile('#c9c3b4',0,.92);
 function mesh(g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0,parent:T.Object3D=root){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 function block(w:number,h:number,d:number,y:number,m:T.Material,r=.07,parent:T.Object3D=root){const g=new T.ExtrudeGeometry(rounded(w,h,r),{depth:d,bevelEnabled:true,bevelSize:.009,bevelThickness:.007,bevelSegments:3,curveSegments:8});g.rotateX(-Math.PI/2);return mesh(g,m,0,y,0,parent);}
 function skin(w:number,h:number,y:number,m:T.Material,parent:T.Object3D=root){const g=new T.ShapeGeometry(rounded(w,h,.06),10),p=g.getAttribute('position'),uv=g.getAttribute('uv');for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/w+.5,p.getY(i)/h+.5);const o=mesh(g,m,0,y,0,parent);o.rotation.x=-Math.PI/2;return o;}
 function art(band=false){const m=animatedMaterial(v,band);animated.push(m);return m;}
 function line(points:number[][],radius=.005,mat:T.Material=edge,parent:T.Object3D=root){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number]))),36,radius,5,false),mat,0,0,0,parent);}
 function sheet(material:T.Material,deform:(u:number,s:number,t:number)=>[number,number,number],du=12,dv=40){
  const g=new T.PlaneGeometry(1,1,du,dv),a=g.getAttribute('position'),uv=g.getAttribute('uv');const o=mesh(g,material);o.frustumCulled=false;
  motions.push(t=>{for(let i=0;i<a.count;i++)a.setXYZ(i,...deform(uv.getX(i),uv.getY(i),t));a.needsUpdate=true;g.computeVertexNormals();});return o;
 }
 function corner(x:number,z:number,side:number,end:number){line([[x-side*.13,.087,z],[x,.087,z],[x,.087,z-end*.15]],.008);}
 if(kind==='sleeve'){
  block(.97,1.516,.013,.010,dark);block(.957,1.503,.005,.030,edge);skin(.943,1.484,.049,art());
 }else{
  const shelf=kind==='shelf',w=shelf?1.24:1.18,h=shelf?1.87:1.80;
  if(v===0){
   // Porcelain cradle: a continuous swept shell, not a rectangular flat frame.
   block(w,h,.025,.017,body,.15);block(1.04,1.64,.015,.055,dark,.09);
   for(const side of [-1,1]){
    sheet(body,(u,s,t)=>{const taper=Math.sin(s*Math.PI),wave=.5+.5*Math.sin(s*5.8-t*1.7+side*.6);return [side*(.505+u*(.125+.055*taper)),.038+u*u*taper*(.10+.14*wave),(s-.5)*h];});
    sheet(dark,(u,s,t)=>{const taper=Math.sin(s*Math.PI),wave=.5+.5*Math.sin(s*5.8-t*1.7+side*.6);const a=.55+u*.075;return [side*(.505+a*(.125+.055*taper)),.043+a*a*taper*(.10+.14*wave),(s-.5)*h];},3,40);
   }
   for(const side of [-1,1])line([[side*.51,.057,.75],[side*.575,.065,.57],[side*.59,.067,.25]],.005);
   if(shelf){const lip=block(.97,.055,.05,.04,body,.025);lip.position.z=.89;}
  }else{
   // Soft leather folio with a living, low-relief fern attached to its binding.
   block(w,h,.025,.02,dark,.09);block(w-.07,h-.065,.018,.052,body,.09);
   for(const side of [-1,1]){
    sheet(body,(u,s,t)=>{const wave=.5+.5*Math.sin(s*6.-t*1.4+side);return [side*(.51+u*.13),.055+u*u*(.06+.06*wave)*Math.sin(s*Math.PI),(s-.5)*h];});
    line([[side*.57,.084,.72],[side*.595,.089,0],[side*.57,.084,-.72]],.004);
   }
   const fern=new T.Group();fern.position.set(-.61,.087,0);root.add(fern);line([[0,0,.62],[-.025,.016,0],[.035,.025,-.62]],.009,edge,fern);
   for(let j=0;j<7;j++)for(const side of [-1,1]){
    const z=.46-j*.15,L=.095*(1-j*.065);const leaf=sheet(j%2?edge:body,(u,s,_t)=>[side*Math.sin(s*Math.PI)*L*(.3+u*.7),.013+Math.sin(s*Math.PI)*.025,z-s*.18],3,12);leaf.removeFromParent();fern.add(leaf);
   }
   motions.push(t=>{fern.rotation.z=.055*Math.sin(t*1.4);fern.rotation.x=.024*Math.sin(t*1.4-.5);});
   for(const side of [-1,1])for(const end of [-1,1])corner(side*.55,end*.79,side,end);
  }
  skin(.96,1.53,.109,art());

 }
 let disposed=false;
 return{root,tick(t){animated.forEach(m=>m.uniforms.time.value=t);motions.forEach(f=>f(t));},dispose(){if(disposed)return;disposed=true;const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();root.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);}});[body,edge,dark,paper].forEach(m=>ms.add(m));gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());root.removeFromParent();}};
}

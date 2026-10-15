import * as T from 'three';
import {COLORS,tactile,type Variant} from './materials';
type Point=[number,number,number];
/** Six independently authored objects. Furniture never samples sleeve artwork. */
export function makeFurniture(v:Variant,grave:boolean){
 const root=new T.Group(),motions:Array<(t:number)=>void>=[],mats=new Set<T.Material>();
 const own=<M extends T.Material>(m:M):M=>{mats.add(m);return m;};
 const body=own(tactile(v,COLORS[v].body)),metal=own(tactile(v,COLORS[v].edge,true)),dark=own(tactile(v,COLORS[v].dark));
 const ivory=own(tactile(1,'#ede4ce')),pearl=own(tactile(1,'#abb9bc')),red=own(tactile(2,'#5e1426'));
 function mesh(g:T.BufferGeometry,m:T.Material,parent:T.Object3D=root){const o=new T.Mesh(g,m);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 function plate(shape:T.Shape,y:number,depth:number,m:T.Material,bevel=.012){const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel*.6,bevelSegments:3,curveSegments:36});g.rotateX(-Math.PI/2);const o=mesh(g,m);o.position.y=y;return o;}
 function oval(rx:number,rz:number,scallop=0,n=10){const s=new T.Shape();for(let i=0;i<=120;i++){const a=i/120*Math.PI*2,r=1+scallop*Math.cos(n*a),x=rx*Math.cos(a)*r,z=rz*Math.sin(a)*r;if(i===0)s.moveTo(x,z);else s.lineTo(x,z);}s.closePath();return s;}
 function rect(w:number,h:number,r:number){const s=new T.Shape(),x=-w/2,z=-h/2;s.moveTo(x+r,z);s.lineTo(x+w-r,z);s.quadraticCurveTo(x+w,z,x+w,z+r);s.lineTo(x+w,z+h-r);s.quadraticCurveTo(x+w,z+h,x+w-r,z+h);s.lineTo(x+r,z+h);s.quadraticCurveTo(x,z+h,x,z+h-r);s.lineTo(x,z+r);s.quadraticCurveTo(x,z,x+r,z);return s;}
 function line(points:Point[],radius=.004,m:T.Material=metal,parent:T.Object3D=root){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(24,points.length*4),radius,6,false),m,parent);}
 function outline(rx:number,rz:number,y:number,m=metal,scallop=0,n=10){return line(Array.from({length:81},(_,i)=>{const a=i/80*Math.PI*2,r=1+scallop*Math.cos(n*a);return [rx*Math.cos(a)*r,y,rz*Math.sin(a)*r]as Point;}),.005,m);}
 // Thick curved shell, with a connected rim and underside, rather than floating planes.
 function shell(fn:(u:number,s:number,t:number)=>Point,m:T.Material,parent:T.Object3D=root,nu=12,ns=32,animate=true){
  const geo=new T.BufferGeometry(),coords=new Float32Array((nu+1)*(ns+1)*2*3),indices:number[]=[],N=(nu+1)*(ns+1);
  for(let layer=0;layer<2;layer++)for(let j=0;j<ns;j++)for(let i=0;i<nu;i++){const a=layer*N+j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;if(layer)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);}
  const edge=(a:number,b:number)=>indices.push(a,a+N,b,b,a+N,b+N);
  for(let i=0;i<nu;i++){edge(i,i+1);edge(ns*(nu+1)+i+1,ns*(nu+1)+i);}
  for(let j=0;j<ns;j++){edge((j+1)*(nu+1),j*(nu+1));edge(j*(nu+1)+nu,(j+1)*(nu+1)+nu);}
  geo.setAttribute('position',new T.BufferAttribute(coords,3));geo.setIndex(indices);const o=mesh(geo,m,parent);o.frustumCulled=false;
  const update=(t:number)=>{for(let l=0;l<2;l++)for(let j=0;j<=ns;j++)for(let i=0;i<=nu;i++){const p=fn(i/nu,j/ns,t),k=(l*N+j*(nu+1)+i)*3;coords[k]=p[0];coords[k+1]=p[1]-l*.012;coords[k+2]=p[2];}geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();};update(0);if(animate)motions.push(update);return o;
 }
 function seam(fn:(s:number,t:number)=>Point,m:T.Material=metal,parent:T.Object3D=root,r=.0035){
  // A narrow ribbon with a physical width gives a stable highlight at board scale.
  return shell((u,s,t)=>{const p=fn(s,t);return [p[0]+(u-.5)*r*2,p[1]+.004,p[2]];},m,parent,1,64);
 }
 function jewel(x:number,y:number,z:number,size:number,m:T.Material=pearl){const o=mesh(new T.SphereGeometry(size,24,12),m);o.position.set(x,y,z);o.scale.y=.48;return o;}
 function enamel(mode:number){
  const m=own(new T.ShaderMaterial({side:T.DoubleSide,toneMapped:false,uniforms:{time:{value:0},mode:{value:mode}},vertexShader:'varying vec3 local;void main(){local=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 local;uniform float time;uniform float mode;
void main(){vec2 p=local.xz;float r=length(p*vec2(1.,.68));vec3 col=vec3(.012,.065,.085);
if(mode<.5){float flow=sin(p.y*18.-time*1.0+p.x*6.);float line=pow(.5+.5*sin(p.x*21.+flow*.2),32.);col=vec3(.015,.10,.14)+vec3(.10,.21,.24)*line*.35;}
else if(mode<1.5){float ripple=pow(.5+.5*sin(r*45.-time*.95+sin(p.x*6.)*.5),18.);col=vec3(.016,.12,.16)+vec3(.10,.32,.36)*ripple*.38+vec3(.015,.035,.04)*cos(p.y*9.+time*.3);}
else if(mode<2.5){float vein=pow(.5+.5*cos(p.x*31.+p.y*4.),28.);col=vec3(.028,.045,.052)+vec3(.18,.15,.095)*vein*.24;}
else if(mode<3.5){float grain=.5+.5*sin(p.x*110.+sin(p.y*23.));col=vec3(.68,.62,.47)+vec3(.09,.11,.13)*grain*.07;}
else if(mode<4.5){float weave=sin(p.x*150.)*sin(p.y*160.);col=vec3(.055,.009,.021)+vec3(.012,.005,.007)*weave;}
else{float a=atan(p.y,p.x),petal=pow(.5+.5*cos(a*8.+r*12.),12.);col=vec3(.055,.006,.018)+vec3(.14,.018,.032)*petal*(.7+.3*sin(time*.65-r*9.));}
gl_FragColor=vec4(col,1.);
#include <colorspace_fragment>
}` }));motions.push(t=>m.uniforms.time.value=t);return m;
 }
 function inset(shape:T.Shape,y:number,m:T.Material){const g=new T.ShapeGeometry(shape,36);g.rotateX(-Math.PI/2);const o=mesh(g,m);o.position.y=y+.018;return o;}
 function feather(length:number,width:number,parent:T.Object3D,m=ivory){
  const fn=(u:number,s:number,_t:number):Point=>[(u-.5)*width*Math.pow(Math.sin(Math.PI*s),.65),.02+Math.sin(s*Math.PI)*.075,s*length];
  shell(fn,m,parent,10,28,false);line([[0,.024,0],[0,.098,length*.5],[0,.024,length]],.004,metal,parent);
  for(let j=1;j<7;j++){const s=j/8,y=.024+Math.sin(s*Math.PI)*.075;for(const sign of [-1,1])line([[0,y,length*s],[sign*width*.28*Math.sin(s*Math.PI),y-.006,length*(s+.04)],[sign*width*.43*Math.sin(s*Math.PI),y-.022,length*(s+.095)]],.0015,metal,parent);}
 }
 if(v===0&&!grave){
  // Tide deck: an open-front, U-shaped glass vessel, with tall rolling side waves.
  plate(rect(1.24,1.92,.25),.012,.025,dark);plate(rect(1.19,1.86,.23),.042,.018,metal);plate(rect(1.15,1.82,.21),.066,.019,body);
  inset(rect(1.01,1.62,.13),.09,enamel(0));
  for(const side of [-1,1]){
   const wave=(u:number,s:number,t:number):Point=>{const end=Math.sin(Math.PI*s),curl=.5+.5*Math.sin(s*6.5-t*.9+side*.5);return [side*(.52+.18*Math.sin(u*Math.PI*.8)*end),.085+end*(u*.13+u*u*(.13+.10*curl)),(s-.5)*1.80];};
   shell(wave,body);for(const u of [.35,.65,.99])seam((s,t)=>wave(u,s,t));
  }
  const back=(u:number,s:number,_t:number):Point=>[(s-.5)*1.10,.08+u*.18,-.83-.07*Math.sin(u*Math.PI/2)];shell(back,body,root,10,24,false);
  line([[-.55,.265,-.9],[0,.295,-.92],[.55,.265,-.9]],.01);
  for(let j=0;j<9;j++){const x=(j-4)*.105;line([[x,.112,-.67],[x*.86,.112,.0],[x*.6,.112,.67]],.0025);}
  jewel(0,.11,.86,.045);line([[-.38,.098,.82],[0,.11,.86],[.38,.098,.82]],.007);
 }else if(v===0){
  // Tide graveyard: broad scalloped water basin, with ripples and shell flutes.
  plate(oval(.76,1.04,.025,8),.012,.025,dark);plate(oval(.735,1.015,.025,8),.044,.018,metal);plate(oval(.71,.99,.025,8),.065,.015,body);
  inset(oval(.65,.92),.085,enamel(1));outline(.71,.99,.10,metal,.025,8);outline(.66,.94,.093,metal);
  for(let j=0;j<24;j++){const a=j/24*Math.PI*2;const wave=(u:number,s:number,t:number):Point=>{const a2=a+(u-.5)*.19,r=.72+s*.28;return [Math.cos(a2)*.73*r,.088+Math.sin(s*Math.PI)*(.025+.008*Math.sin(t*.6-j*.15)),Math.sin(a2)*1.03*r];};shell(wave,j%3===0?metal:body,root,3,12);}
  for(const r of [.30,.49,.69])outline(r,r*1.39,.09,body);
  jewel(0,.10,.99,.048,pearl);
 }else if(v===1&&!grave){
  // Ivory deck: clasped wings along a dark folio cradle, gilded spine at the back.
  plate(rect(1.22,1.90,.08),.012,.026,dark);plate(rect(1.18,1.86,.075),.042,.017,metal);plate(rect(1.13,1.81,.065),.064,.017,ivory);
  inset(rect(1.00,1.61,.055),.087,enamel(2));
  for(const side of [-1,1]){
   line([[side*.52,.10,.77],[side*.56,.16,0],[side*.55,.30,-.78]],.018,metal);
   for(let j=0;j<5;j++){const wing=new T.Group();wing.position.set(side*.53,.085,.48-j*.28);wing.rotation.y=side*.24;root.add(wing);feather(.43,.23,wing);wing.rotation.x=-.8;wing.rotation.z=side*.72;motions.push(t=>{wing.rotation.z=side*(.72+.11*Math.sin(t*.72-j*.35));});}
  }
  const back=new T.Group();back.position.set(0,.09,-.88);back.rotation.x=-Math.PI/2;root.add(back);feather(.28,.19,back);jewel(0,.23,-.89,.065);line([[0,.09,-.87],[0,.22,-.89],[0,.29,-.89]],.012);
  for(const side of [-1,1])line([[side*.41,.110,-.66],[side*.41,.110,.56],[side*.29,.110,.69]],.004);
  line([[-.43,.098,.80],[-.18,.115,.87],[0,.14,.88],[.18,.115,.87],[.43,.098,.80]],.008);
 }else if(v===1){
  // Ivory graveyard: a wide feather fan, low open receiving dish with pearl center.
  const fanShape=(scale=1)=>{const s=new T.Shape();s.moveTo(-.49*scale,-.86*scale);s.quadraticCurveTo(0,-1.02*scale,.49*scale,-.86*scale);s.bezierCurveTo(.65*scale,-.55*scale,.81*scale,.28*scale,.74*scale,.66*scale);s.quadraticCurveTo(0,1.30*scale,-.74*scale,.66*scale);s.bezierCurveTo(-.81*scale,.28*scale,-.65*scale,-.55*scale,-.49*scale,-.86*scale);return s;};
  plate(fanShape(),.012,.025,dark);plate(fanShape(.975),.043,.016,metal);plate(fanShape(.945),.063,.017,ivory);
  inset(fanShape(.89),.087,enamel(3));
  for(let j=-4;j<=4;j++){const a=j*.097,fan=new T.Group();fan.position.set(j*.033,.108,.66);fan.rotation.y=Math.PI-a;fan.scale.y=.15;root.add(fan);feather(1.61,.25,fan);motions.push(t=>{fan.rotation.x=.002*Math.sin(t*.62-j*.22);});}
  line([[-.48,.109,.79],[0,.108,.91],[.48,.109,.79]],.006,metal);
  jewel(0,.112,.82,.065);
 }else if(!grave){
  // Rose deck: close-set upright bud petals, square velvet well, four bronze feet.
  const shape=rect(1.21,1.91,.22);plate(shape,.012,.028,dark);plate(rect(1.17,1.87,.20),.046,.018,metal);plate(rect(1.12,1.82,.18),.068,.016,body);
  inset(rect(.99,1.60,.11),.089,enamel(4));
  for(let side of [-1,1])for(let j=0;j<3;j++){
   const z=-.55+j*.55,pivot=new T.Group();pivot.position.set(side*.53,.085,z);root.add(pivot);
   const petal=(u:number,s:number,_t:number):Point=>[side*(.02+s*.10+Math.sin(s*Math.PI)*.09),s*.32, (u-.5)*.53*Math.pow(Math.sin(s*Math.PI),.5)];
   shell(petal,j===1?red:body,pivot);seam((s,t)=>petal(.02,s,t),metal,pivot);seam((s,t)=>petal(.98,s,t),metal,pivot);
   motions.push(t=>{pivot.rotation.z=side*(.06+.08*Math.sin(t*.65-j*.6));});
  }
  for(const end of [-1,1]){const fn=(u:number,s:number,_t:number):Point=>[(u-.5)*.84*Math.sin(s*Math.PI)**.5,.085+s*.23,end*(.82+Math.sin(s*Math.PI)*.11)];shell(fn,red);seam((s,t)=>fn(.015,s,t));seam((s,t)=>fn(.985,s,t));jewel(0,.16,end*.91,.045,metal);}
  for(const x of [-.44,.44])for(const z of [-.73,.73]){const o=mesh(new T.OctahedronGeometry(.065),metal);o.position.set(x,.034,z);o.scale.set(1,.4,1);}
  for(const z of [-.6,-.3,0,.3,.6])line([[-.36,.111,z],[0,.111,z+.07],[.36,.111,z]],.002,metal);
 }else{
  // Rose graveyard: one open eight-lobed bloom; broad petals form the entire vessel.
  plate(oval(.76,1.06,.055,8),.012,.025,dark);plate(oval(.73,1.03,.055,8),.042,.015,metal);plate(oval(.70,1.00,.055,8),.062,.016,body);
  inset(oval(.60,.87),.085,enamel(5));
  for(let j=0;j<8;j++){const a=j/8*Math.PI*2;
   const bloom=(u:number,s:number,t:number):Point=>{const angle=a+(u-.5)*.81,r=.68+s*(.30+.09*Math.sin(u*Math.PI)),bend=.5+.5*Math.sin(t*.58-j*.32);return [Math.cos(angle)*.75*r,.085+Math.sin(s*Math.PI*.8)*Math.pow(Math.sin(u*Math.PI),.4)*(.075+.025*bend),Math.sin(angle)*1.04*r];};
   shell(bloom,j%2?body:red);seam((s,t)=>bloom(.015,s,t));seam((s,t)=>bloom(.985,s,t));
   seam((u,t)=>bloom(u,.99,t));
  }
  for(let j=0;j<8;j++){const a=j/8*Math.PI*2;line([[Math.cos(a)*.17,.109,Math.sin(a)*.25],[Math.cos(a+.16)*.35,.111,Math.sin(a+.16)*.51],[Math.cos(a+.25)*.54,.109,Math.sin(a+.25)*.78]],.003,metal);}
  outline(.19,.27,.110,metal);jewel(0,.096,0,.10,red);
 }
 root.userData.design=`${['tide-vessel','ivory-folio','rose-bud'][v]}-${grave?'open-grave':'closed-deck'}`;
 return {root,tick(t:number){motions.forEach(f=>f(t));},dispose(){const gs=new Set<T.BufferGeometry>();root.traverse(o=>{if(o instanceof T.Mesh)gs.add(o.geometry);});gs.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());root.removeFromParent();}};
}

import * as T from 'three';
import {sprites} from './assets';
import {DURATION,ease,clamp,type CardId} from './catalog';
import {cardHeight,dropHeight,envelope,CARD_WIDTH,CARD_LENGTH} from './physics';
type C=CanvasRenderingContext2D;
type Update=(ms:number)=>void;
type Study={root:T.Group;fx:T.Group;floor:T.Mesh;updates:Update[];face:T.Mesh;shadow:T.Mesh;contact:T.Mesh};
const TAU=Math.PI*2;
let renderer:T.WebGLRenderer|undefined,scene:T.Scene,camera:T.OrthographicCamera,ground:T.Mesh;
const studies=new Map<string,Study>(),faces=new Map<CanvasImageSource,T.Texture>();
const trackedGeometries=new Set<T.BufferGeometry>(),trackedMaterials=new Set<T.Material>(),trackedTextures=new Set<T.Texture>();
let angle:'oblique'|'side'|'top'='oblique';
export function setCameraAngle(v:typeof angle){angle=v;}
const geometry=<G extends T.BufferGeometry>(g:G)=>{trackedGeometries.add(g);return g;};
function mat(color:string,roughness=.4,metalness=.05){const m=new T.MeshStandardMaterial({color,roughness,metalness,side:T.DoubleSide});trackedMaterials.add(m);return m;}
function basic(color:string,opacity=1){const m=new T.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1,side:T.DoubleSide});trackedMaterials.add(m);return m;}
const V=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
let sphere:T.SphereGeometry,poison:T.MeshStandardMaterial,slime:T.MeshStandardMaterial,rust:T.MeshStandardMaterial,stem:T.MeshStandardMaterial,gill:T.MeshStandardMaterial;
function mesh(g:T.BufferGeometry,m:T.Material,parent:T.Object3D){const o=new T.Mesh(g,m);parent.add(o);return o;}
function orb(parent:T.Object3D,m:T.Material,x:number,y:number,z:number,sx:number,sy=sx,sz=sx){const o=mesh(sphere,m,parent);o.position.set(x,y,z);o.scale.set(sx,sy,sz);return o;}
function texture(image:CanvasImageSource){const t=new T.CanvasTexture(image as HTMLCanvasElement);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;trackedTextures.add(t);return t;}
function init(){if(renderer)return;renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
 scene=new T.Scene();camera=new T.OrthographicCamera(-200,200,180,-180,.1,2400);
 scene.add(new T.HemisphereLight('#fff1d5','#293e32',1.5));const key=new T.DirectionalLight('#fff1ce',2.4);key.position.set(-150,300,170);scene.add(key);const rim=new T.DirectionalLight('#9bdfc6',1.4);rim.position.set(160,150,-160);scene.add(rim);
 sphere=geometry(new T.SphereGeometry(1,28,16));poison=mat('#aab94e',.18,.16);slime=mat('#416c55',.2,.12);rust=mat('#824b2d',.81,.03);stem=mat('#b1ac83',.68);gill=mat('#2c9c83',.46);gill.emissive.set('#0e493a');gill.emissiveIntensity=.45;
 const tox=texture(sprites.toxin);poison.map=tox;poison.bumpMap=tox;poison.bumpScale=.38;
 // Shader variation belongs to the sculpted cap, never a camera-facing sprite.
 rust.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCapLocal;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCapLocal=position;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 vCapLocal;
 float grain(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,41.72)))*43758.5453);}
 float capNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(grain(i),grain(i+vec3(1,0,0)),f.x),mix(grain(i+vec3(0,1,0)),grain(i+vec3(1,1,0)),f.x),f.y),mix(mix(grain(i+vec3(0,0,1)),grain(i+vec3(1,0,1)),f.x),mix(grain(i+vec3(0,1,1)),grain(i+vec3(1,1,1)),f.x),f.y),f.z);}`)
 .replace('#include <color_fragment>',`#include <color_fragment>
 float mott=capNoise(vCapLocal*.19);float fleck=capNoise(vCapLocal*.9);float cracks=abs(sin(atan(vCapLocal.z,vCapLocal.x)*29.+mott*9.));
 diffuseColor.rgb*=.5+.75*mott;
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.09,.17,.12),smoothstep(.56,.66,mott)*.8);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.39,.23,.10),smoothstep(.6,.71,fleck)*.6);
 diffuseColor.rgb*=.8+.2*smoothstep(.02,.18,cracks);`);};

 ground=mesh(geometry(new T.BoxGeometry(265,4,289)),mat('#242d29',.96),scene);ground.position.y=-5;
}
function staticTube(parent:T.Object3D,points:T.Vector3[],radius:number,m:T.Material){return mesh(geometry(new T.TubeGeometry(new T.CatmullRomCurve3(points),28,radius,6,false)),m,parent);}
function tube(parent:T.Object3D,m:T.Material){const n=28,k=8,g=geometry(new T.BufferGeometry()),pos=new Float32Array((n+1)*k*3),uv=new Float32Array((n+1)*k*2),idx:number[]=[];
 for(let i=0;i<=n;i++)for(let j=0;j<k;j++){uv[(i*k+j)*2]=j/k;uv[(i*k+j)*2+1]=i/n;if(i<n){const a=i*k+j,b=i*k+(j+1)%k;idx.push(a,b,a+k,b,b+k,a+k);}}
 g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(idx);const o=mesh(g,m,parent);o.frustumCulled=false;
 return {o,set(points:T.Vector3[],r:number){o.visible=r>.015;if(!o.visible)return;const curve=new T.CatmullRomCurve3(points);for(let i=0;i<=n;i++){const u=i/n,p=curve.getPoint(u),d=curve.getTangent(u),a=new T.Vector3().crossVectors(d,Math.abs(d.y)>.9?V(1,0,0):V(0,1,0)).normalize(),b=new T.Vector3().crossVectors(d,a);const radius=r*(.3+.7*Math.sin(Math.PI*u));for(let j=0;j<k;j++){const q=p.clone().addScaledVector(a,Math.cos(j/k*TAU)*radius).addScaledVector(b,Math.sin(j/k*TAU)*radius);pos.set(q.toArray(),(i*k+j)*3);}}g.attributes.position.needsUpdate=true;g.computeVertexNormals();}};
}
function mushroom(parent:T.Object3D,x:number,z:number,r:number,h:number){const root=new T.Group();root.position.set(x,.7,z);parent.add(root);
 const stalk=mesh(geometry(new T.CylinderGeometry(r*.11,r*.2,h,12,5)),stem,root);stalk.position.y=h/2;
 const head=new T.Group();head.position.y=h;root.add(head);const points=[new T.Vector2(0,r*.52),new T.Vector2(r*.2,r*.5),new T.Vector2(r*.51,r*.35),new T.Vector2(r*.8,r*.15),new T.Vector2(r,0),new T.Vector2(r*.9,-r*.075),new T.Vector2(r*.45,-r*.1),new T.Vector2(0,-r*.07)];
 const shellGeo=geometry(new T.LatheGeometry(points,48)),vertices=shellGeo.attributes.position;
 for(let i=0;i<vertices.count;i++){const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i),a=Math.atan2(z,x),rr=Math.hypot(x,z)/r;const wobble=1+.045*Math.sin(a*5+1)+.025*Math.sin(a*11);vertices.setXYZ(i,x*wobble,y+Math.sin(a*3+.8)*r*.035*rr,z*wobble);}shellGeo.computeVertexNormals();const shell=mesh(shellGeo,rust,head);
 const ribGroup=new T.Group();head.add(ribGroup);for(let i=0;i<24;i++){const a=i/24*TAU;staticTube(ribGroup,[V(Math.cos(a)*r*.14,-r*.1,Math.sin(a)*r*.14),V(Math.cos(a)*r*.62,-r*.085,Math.sin(a)*r*.62),V(Math.cos(a)*r*.93,-r*.025,Math.sin(a)*r*.93)],.35,gill);}
 return {root,head,shell,set(g:number,open=1,sway=0){root.visible=g>.002;root.scale.set(Math.max(.001,Math.sqrt(g)),Math.max(.001,g),Math.max(.001,Math.sqrt(g)));head.scale.set(.42+.58*open,1.3-.3*open,.42+.58*open);root.rotation.z=sway;}};
}
function patch(parent:T.Object3D,x:number,z:number,r:number,m:T.Material){const o=orb(parent,m,x,.8,z,r,1.1,r*.83);return o;}
function roots(parent:T.Object3D){const group=new T.Group();parent.add(group);for(let k=0;k<6;k++){const x=(k%3-1)*30,z=(Math.floor(k/3)*2-1)*50;staticTube(group,[V(0,.9,0),V(x*.3,1,z*.4),V(x+6,1,z*.75),V(x,1,z)],.55,gill);for(let j=0;j<2;j++)staticTube(group,[V(x*.55,1,z*.5),V(x*.55+(j?12:-12),1,z*.6),V(x+(j?10:-13),1,z*.74)],.25,gill);}return group;}
function surfaceGrid(parent:T.Object3D,m:T.Material,w=132,l=202){const g=geometry(new T.PlaneGeometry(w,l,24,32));g.rotateX(-Math.PI/2);const base=(g.attributes.position.array as Float32Array).slice();const o=mesh(g,m,parent);o.frustumCulled=false;
 return {o,set(fn:(x:number,z:number)=>[number,number,number]){const pos=g.attributes.position;for(let i=0;i<pos.count;i++){const bx=base[i*3],bz=base[i*3+2],taper=Math.sqrt(Math.max(.08,1-.92*Math.pow(bz/(l/2),4)));const p=fn(bx*taper,bz);pos.setXYZ(i,...p);}pos.needsUpdate=true;g.computeVertexNormals();}};
}
function build(face:CanvasImageSource,id:CardId,v:number):Study{init();const root=new T.Group(),fx=new T.Group();root.add(fx);scene.add(root);let tex=faces.get(face);if(!tex){tex=texture(face);faces.set(face,tex);}
 const faceMat=new T.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.03,side:T.DoubleSide});trackedMaterials.add(faceMat);const card=mesh(geometry(new T.PlaneGeometry(CARD_WIDTH*1.24,CARD_LENGTH+CARD_WIDTH*.24)),faceMat,root);card.rotation.x=-Math.PI/2;card.position.y=.9;
 const thickness=mesh(geometry(new T.BoxGeometry(142,1.1,222)),mat('#5c5942',.7),root);thickness.position.y=-.05;
 const sh=mesh(geometry(new T.PlaneGeometry(150,232)),basic('#101b13',.23),scene);sh.rotation.x=-Math.PI/2;sh.position.y=-.9;
 const contact=mesh(geometry(new T.PlaneGeometry(144,224)),basic('#192516',.22),scene);contact.rotation.x=-Math.PI/2;contact.position.y=-.8;
 const updates:Update[]=[];const floor=ground;const s={root,fx,floor,updates,face:card,shadow:sh,contact};
 const mycel=roots(fx);updates.push(t=>{const e=envelope(t,660,1020);mycel.visible=e>.001;mycel.scale.set(e,1,e);});

 if(id==='POISON_MASTER'&&v===0){
  const flask=new T.Group();flask.position.set(-29,0,-34);fx.add(flask);const bulb=orb(flask,poison,0,13,0,13,15,13);const glass=mat('#aac495',.1,.2);glass.transparent=true;glass.opacity=.24;glass.depthWrite=false;orb(flask,glass,0,14,0,14,17,14);const neck=mesh(geometry(new T.CylinderGeometry(5,5,15,20,1,true)),glass,flask);neck.position.y=32;const lip=mesh(geometry(new T.TorusGeometry(5,.8,6,24)),mat('#a38b4a',.25,.65),flask);lip.rotation.x=Math.PI/2;lip.position.y=39;
  const stream=tube(fx,poison),pool=patch(fx,-3,-34,37,poison);updates.push(t=>{const e=envelope(t,650,960,2370),tilt=ease(900,1220,t)*1.45*(1-ease(1620,1970,t));flask.visible=e>.001;flask.scale.setScalar(e);flask.rotation.z=-tilt;flask.position.y=8*e;bulb.scale.y=15*(1-.18*ease(1200,1600,t));const mouth=V(Math.sin(tilt)*39*e-29,8*e+Math.cos(tilt)*39*e,-34);const flow=ease(1040,1250,t)*(1-ease(1630,1940,t));stream.set([mouth,V(mouth.x+9,mouth.y*.78,-34),V(mouth.x+14,mouth.y*.38,-32),V(mouth.x+16,1,-30)],3.2*flow);const p=ease(1210,1560,t)*(1-ease(1920,2450,t));pool.position.x=mouth.x+16;pool.position.z=-30;pool.scale.set(31*p,1,25*p);});
 }else if(id==='POISON_MASTER'&&v===1){
  const membraneMat=poison.clone();trackedMaterials.add(membraneMat);membraneMat.transparent=true;membraneMat.opacity=.83;const blob=orb(fx,membraneMat,0,0,0,1);const pool=patch(fx,0,0,40,poison);updates.push(t=>{const e=envelope(t,690,1220),collapse=ease(1340,1900,t);blob.visible=e>.001;blob.position.y=1;blob.scale.set(53*e,32*e*(1-collapse)+.4,71*e);const p=ease(1490,1900,t)*(1-ease(1950,2470,t));pool.scale.set(61*p,1,82*p);});
 }else if(id==='POISON_MASTER'&&v===2){
  const arms=[tube(fx,poison),tube(fx,poison)],drop=orb(fx,poison,0,0,0,1),pool=patch(fx,0,0,40,poison);updates.push(t=>{const g=ease(650,1120,t)*(1-ease(1170,1490,t));arms.forEach((a,i)=>{const sign=i?1:-1;a.set([V(sign*48,1,sign*27),V(sign*31,6,sign*17),V(sign*13,17,sign*6),V(0,32,0)],5*g);});const e=ease(900,1220,t)*(1-ease(1590,1830,t));drop.visible=e>.001;drop.position.y=t<1240?32*ease(900,1240,t):dropHeight(t,1240,380,32)+1;drop.scale.set(13*e,(t<1610?15:2)*e,13*e);const p=ease(1610,1840,t)*(1-ease(1930,2460,t));pool.scale.set(57*p,.8,73*p);});
 }else if(id==='POISON_MASTER'&&v===3){
  const sheet=surfaceGrid(fx,poison);updates.push(t=>{const e=envelope(t,660,1080),curl=ease(1020,1550,t)*(1-ease(1770,2220,t));sheet.o.visible=e>.001;sheet.set((x,z)=>{const edge=Math.pow(Math.abs(x)/66,2);return[x*e,1+Math.sin(edge*Math.PI/2)*33*curl*e,z*e];});});
 }else if(id==='RUST_SLUG'&&v===0){
  const body=new T.Group();fx.add(body);const skin=mat('#a7ac8b',.3);const segments:T.Mesh[]=[];for(let j=0;j<15;j++){const u=j/14;segments.push(orb(body,skin,(u-.5)*88,6+Math.sin(u*Math.PI)*5,0,7,6+Math.sin(u*Math.PI)*5,5+Math.sin(u*Math.PI)*10));}const feelers=[-1,1].map(sign=>staticTube(body,[V(39,9,sign*5),V(49,18,sign*9),V(54,24,sign*12)],.85,skin));feelers.forEach((_,i)=>orb(body,mat('#203f31'),54,24,i?12:-12,1.8));const caps=[mushroom(body,-19,-1,14,19),mushroom(body,-3,3,11,22),mushroom(body,10,-4,7,16)];const trail=patch(fx,-25,0,35,slime);updates.push(t=>{const e=envelope(t,660,1030);body.visible=e>.001;body.scale.set(e,e,e);body.position.x=-22+40*ease(830,1700,t);segments.forEach((o,j)=>{o.scale.y=(6+Math.sin(j/14*Math.PI)*5)*(1+.085*Math.sin(t*.009-j*.65));});caps.forEach((m,j)=>m.set(1,1,Math.sin(t*.008-j)*.025));trail.scale.set(38*e,.65,18*e);trail.position.x=body.position.x-23;});
 }else if(id==='RUST_SLUG'&&v===1){
  const bed=orb(fx,rust,0,1,0,42,6,64);const caps=Array.from({length:5},(_,i)=>mushroom(fx,(i%2?1:-1)*(16+i*3),-53+i*26,13+i*2,14+i*3));updates.push(t=>{const e=envelope(t);bed.scale.set(43*e,5*e,67*e);caps.forEach((m,i)=>m.set(envelope(t,680+i*62,1170+i*35),ease(950+i*45,1340+i*35,t)));});
 }else if(id==='RUST_SLUG'&&v===2){
  const sheet=surfaceGrid(fx,slime);updates.push(t=>{const e=envelope(t,660,930),front=-60+120*ease(860,1760,t);sheet.o.visible=e>.001;sheet.set((x,z)=>{const hump=Math.exp(-Math.pow((x-front)/20,2))*Math.pow(Math.cos(z/104*Math.PI/2),2);return[x*e,1+18*hump*e,z*e];});});
 }else if(id==='RUST_SLUG'&&v===3){
  const shells=[-1,1].map(sign=>{const m=surfaceGrid(fx,rust,66,180);return{m,sign};});updates.push(t=>{const e=envelope(t,660,1050),open=ease(1080,1660,t);shells.forEach(({m,sign})=>{m.o.visible=e>.001;m.set((x,z)=>{const u=(x+33)/66;return[sign*(u*62+open*16)*e,1+Math.sin(u*Math.PI)*22*(1-open*.75)*Math.cos(z/185*Math.PI)*e,z*e];});});});
 }else{
  const configs=v===0?Array.from({length:6},(_,i)=>[(i%3-1)*31,(Math.floor(i/3)*2-1)*51,9+i%3*3,11+i%2*5]):v===1?[[0,0,48,48]]:v===2?[[0,0,40,35]]:[[-31,-44,17,24],[27,4,26,36],[-14,53,32,42]];
  const caps=configs.map(([x,z,r,h])=>mushroom(fx,x,z,r,h));updates.push(t=>caps.forEach((m,i)=>{const start=v===3?690+i*160:710+i*42;const e=envelope(t,start,start+440,2440+i*45);m.set(e,ease(start+190,start+660,t),Math.sin((t-start)*.008)*.035*e);}));
  if(v===2){const drops=Array.from({length:12},()=>orb(fx,gill,0,0,0,1));updates.push(t=>drops.forEach((o,j)=>{const start=1180+j*43,u=clamp((t-start)/430),a=j/12*TAU;o.visible=t>start&&u<1;o.position.set(Math.cos(a)*28,dropHeight(t,start,430,31)+1,Math.sin(a)*28);o.scale.setScalar(1.1*(1-.45*u));}));}
 }
 root.visible=false;sh.visible=false;contact.visible=false;return s;
}
function get(face:CanvasImageSource,id:CardId,v:number){const key=id+v;let s=studies.get(key);if(!s){s=build(face,id,v);studies.set(key,s);}return s;}
function show(s:Study,t:number,reduced:boolean,board=false){studies.forEach(x=>{x.root.visible=false;x.shadow.visible=false;x.contact.visible=false;});s.root.visible=true;s.fx.visible=!reduced&&t>=640&&t<DURATION;s.updates.forEach(fn=>fn(t));const h=cardHeight(t,reduced);s.root.position.y=h;s.shadow.visible=true;s.contact.visible=true;s.shadow.scale.set(1+h*.003,1+h*.003,1);(s.shadow.material as T.MeshBasicMaterial).opacity=.24/(1+h*.04);(s.contact.material as T.MeshBasicMaterial).opacity=.17*(1-h/62);s.floor.visible=!board;}
function normalCamera(width:number,height:number){(ground.material as T.MeshStandardMaterial).color.set(document.body.classList.contains('light')?'#ccc9bc':'#242d29');const aspect=width/height;camera.left=-190*aspect;camera.right=190*aspect;camera.top=190;camera.bottom=-190;camera.near=.1;camera.far=2400;camera.up.set(0,1,0);if(angle==='side')camera.position.set(340,180,420);else if(angle==='top'){camera.position.set(0,720,.01);}else camera.position.set(270,420,430);camera.lookAt(0,7,0);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();}
export function render(c:C,face:CanvasImageSource,id:CardId,v:number,t:number,width=480,height=440,reduced=false){const s=get(face,id,v);show(s,t,reduced);normalCamera(width,height);renderer!.setSize(width,height,false);renderer!.render(scene,camera);c.clearRect(0,0,width,height);c.drawImage(renderer!.domElement,0,0);}
/** Exact CSS perspective projection. World X,Z lie on the card; world Y is height. */
export function boardProjection(matrix:DOMMatrix,width:number,height:number){const css=new T.Matrix4().fromArray(matrix.toFloat64Array());const swap=new T.Matrix4().set(1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,0,1);const clip=new T.Matrix4().set(2/width,0,0,-1, 0,-2/height,0,1, 0,0,-1/5000,0, 0,0,0,1);return clip.multiply(css).multiply(swap);}
export function renderBoard(c:C,face:CanvasImageSource,id:CardId,v:number,t:number,matrix:DOMMatrix,width:number,height:number,reduced=false){const s=get(face,id,v);show(s,t,reduced,true);camera.position.set(0,900,292);camera.up.set(0,1,0);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);camera.projectionMatrix.copy(boardProjection(matrix,width,height)).multiply(camera.matrixWorld);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();renderer!.setSize(width,height,false);renderer!.render(scene,camera);c.drawImage(renderer!.domElement,0,0);}
export function disposeRenderer(){studies.clear();faces.clear();trackedGeometries.forEach(g=>g.dispose());trackedMaterials.forEach(m=>m.dispose());trackedTextures.forEach(t=>t.dispose());trackedGeometries.clear();trackedMaterials.clear();trackedTextures.clear();renderer?.dispose();renderer?.forceContextLoss();renderer=undefined;}
export function rendererState(){return{studies:studies.size,geometries:trackedGeometries.size,textures:trackedTextures.size,planeNormal:[0,1,0],cardHeight:cardHeight(640),gravity:[0,-1,0]};}

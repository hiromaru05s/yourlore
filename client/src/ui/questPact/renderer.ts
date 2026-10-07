import * as T from 'three';
import {PactStage as StudioRenderer} from './stage';
import {pactTexture,sealTexture} from './textures';
import {smooth,DURATION} from './timing';
type Part={node:T.Object3D;role:string;i:number};
export class QuestPactRenderer extends StudioRenderer {
 private faceMesh!:T.Mesh;private pact=new T.Group();private cover=new T.Group();private pieces:Part[]=[];private active=-1;private overlayMode:boolean;
 private faceTex:T.CanvasTexture;private vellum=pactTexture();private writing=pactTexture(true);private sigil=sealTexture();private magic=new T.PointLight(0xa557ff,0,5,2);
 constructor(face:HTMLCanvasElement,overlay=false){super(face,overlay);this.overlayMode=overlay;this.faceTex=new T.CanvasTexture(face);this.faceTex.colorSpace=T.SRGBColorSpace;this.faceTex.anisotropy=8;this.root.add(this.pact);this.magic.position.set(0,0,1.7);this.root.add(this.magic);this.renderer.toneMappingExposure=.92;this.scene.traverse(o=>{if(o instanceof T.DirectionalLight){o.intensity*=.68;o.color.set(o.position.x<0?'#e9d9ff':'#ab7de4');}if(o instanceof T.HemisphereLight)o.intensity=.7;if(o instanceof T.PointLight&&o!==this.magic)o.intensity=0;});}
 private pactMaterial(c:string,metal=.2,rough=.38){return new T.MeshPhysicalMaterial({color:c,metalness:metal,roughness:rough,clearcoat:.7,side:T.DoubleSide});}
 private mesh(g:T.BufferGeometry,m:T.Material,parent:T.Object3D=this.pact){const o=new T.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 private box(w:number,h:number,d:number,c:string,x=0,y=0,z=0,parent:T.Object3D=this.pact){const m=this.mesh(new T.BoxGeometry(w,h,d),this.pactMaterial(c,.65,.27),parent);m.position.set(x,y,z);return m;}
 private bit(n:T.Object3D,role:string,i=0){this.pieces.push({node:n,role,i});return n;}
 private sheet(w:number,h:number,parent:T.Object3D=this.pact,uv?:[number,number,number,number]){
  const group=new T.Group();parent.add(group);const g=new T.PlaneGeometry(w,h,36,48);if(uv){const a=g.getAttribute('uv');for(let k=0;k<a.count;k++)a.setXY(k,uv[0]+a.getX(k)*uv[2],uv[1]+a.getY(k)*uv[3]);}
  const base=this.mesh(g,new T.MeshPhysicalMaterial({map:this.vellum,color:'#ab96c4',metalness:.05,roughness:.86,clearcoat:.08,envMapIntensity:.25,side:T.DoubleSide}),group);
  const ink=this.mesh(g,new T.MeshBasicMaterial({map:this.writing,color:'#d2a0ff',transparent:true,opacity:.9,depthWrite:false,side:T.DoubleSide,toneMapped:false,blending:T.AdditiveBlending}),group);ink.position.z=.008;ink.castShadow=false;
  group.userData={geometry:g,base:new Float32Array(g.getAttribute('position').array),ink:ink.material,baseMesh:base};return group;
 }
 private mark(parent:T.Object3D=this.pact,size=1){const m=this.mesh(new T.PlaneGeometry(size,size),new T.MeshBasicMaterial({map:this.sigil,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,color:'#d9b7ff',blending:T.AdditiveBlending}),parent);m.castShadow=false;return m;}
 private clearPact(){const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();this.pact.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());this.pact.clear();this.pieces=[];}
 private assemble(v:number){
  this.clearPact();this.active=v;this.cover=new T.Group();this.cover.position.set(-.91,0,.12);this.pact.add(this.cover);
  const face=this.mesh(new T.PlaneGeometry(2,3,32,36),new T.MeshPhysicalMaterial({map:this.faceTex,transparent:true,alphaTest:.05,roughness:.6,side:T.FrontSide}),this.cover);face.position.set(.91,0,.019);this.faceMesh=face;face.userData.rest=new Float32Array(face.geometry.getAttribute('position').array);
  const inside=this.sheet(1.73,2.57,this.cover);inside.position.set(.87,0,-.027);inside.rotation.y=Math.PI;(inside.userData.ink as T.Material).opacity=.26;this.bit(inside,'inside');
  const binding=new T.Group();this.pact.add(binding);this.bit(binding,'binding');this.box(1.82,2.69,.11,'#21152f',0,0,-.11,binding);this.box(.11,2.7,.15,'#714887',-.94,0,-.02,binding);
  for(let i=0;i<6;i++)this.box(1.74,2.57,.009,i%2?'#695674':'#9a80a8',0,0,-.047+i*.011,binding);
  const right=this.sheet(1.72,2.55,binding);right.position.z=.037;(right.userData.ink as T.Material).opacity=.38;
  for(const y of [-1.31,1.31])this.box(1.81,.019,.06,'#baa0d4',0,y,-.055,binding);
  if(v===0){const contract=this.sheet(1.65,2.46);this.bit(contract,'contract');for(let j=0;j<5;j++){const x=-.55+j*.275;const curve=new T.CatmullRomCurve3([new T.Vector3(x,.56,.27),new T.Vector3(x*.92,.1,.26),new T.Vector3(x*.5,-.16,.27),new T.Vector3(0,-.43,.29)]);const vein=this.mesh(new T.TubeGeometry(curve,36,.012,6,false),new T.MeshBasicMaterial({color:'#bd76fa',transparent:true,opacity:.7,toneMapped:false}));this.bit(vein,'inkFeed',j);}const pool=this.mesh(new T.SphereGeometry(.48,72,40),this.pactMaterial('#341046',.62,.12));this.bit(pool,'pool');pool.userData.base=new Float32Array(pool.geometry.getAttribute('position').array);const seal=this.mark(undefined,1.03);this.bit(seal,'seal');
   const stamp=new T.Group();this.pact.add(stamp);const head=this.mesh(new T.CylinderGeometry(.39,.44,.15,8),this.pactMaterial('#21102f',.5,.34),stamp);head.rotation.x=Math.PI/2;const handle=this.mesh(new T.OctahedronGeometry(.22,0),this.pactMaterial('#9361cc',.55,.12),stamp);handle.position.z=.29;handle.scale.z=1.7;const imprint=this.mark(stamp,.72);imprint.position.z=.09;this.bit(stamp,'stamp');
  }

 }
 // Visibility only culls geometry after its continuous material envelope reaches zero.
 private coat(n:T.Object3D,amount:number){n.traverse(o=>{if(!(o instanceof T.Mesh||o instanceof T.Line))return;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.opacity=m.userData.restOpacity*amount;}});n.visible=amount>0.00001;}
 private finishMaterials(){this.pact.traverse(o=>{if(o===this.faceMesh)return;if(o instanceof T.Mesh||o instanceof T.Line){for(const m of Array.isArray(o.material)?o.material:[o.material]){m.userData.restOpacity=m.opacity;m.transparent=true;}}});}
 cardBounds(){this.scene.updateMatrixWorld(true);const points=[[-1,-1.5],[1,-1.5],[-1,1.5],[1,1.5]].map(([x,y])=>this.faceMesh.localToWorld(new T.Vector3(x,y,0)).project(this.camera));const xs=points.map(p=>(p.x+1)/2),ys=points.map(p=>(1-p.y)/2);const left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top;return{left,top,width,height,cx:left+width/2,cy:top+height/2};}
 private warpSurface(n:T.Object3D,fn:(x:number,y:number,k:number)=>[number,number,number]){const g=n.userData.geometry as T.BufferGeometry,p=g.getAttribute('position') as T.BufferAttribute,b=n.userData.base as Float32Array;for(let k=0;k<p.count;k++){const r=fn(b[k*3],b[k*3+1],k);p.setXYZ(k,...r);}p.needsUpdate=true;g.computeVertexNormals();}
 draw(v:number,t:number,opts:{dark?:boolean;reduced?:boolean;still?:boolean}={}){
  if(this.renderer.getContext().isContextLost())throw new Error('Quest context lost');
  v=0;if(v!==this.active){this.assemble(v);this.finishMaterials();}t=opts.reduced?DURATION:Math.max(0,Math.min(DURATION,t));
  const open=smooth(420,1330,t)*(1-smooth(3530,4510,t)),lift=smooth(1050,1520,t)*(1-smooth(2770,3420,t)),pulse=Math.sin(smooth(1750,2320,t)*Math.PI);
  const body=smooth(200,980,t)*(1-smooth(4310,4720,t)),surface=smooth(760,1370,t)*(1-smooth(3650,4470,t)),ink=smooth(850,1550,t)*(1-smooth(3160,4100,t));
  this.root.position.set(.58*open,.05*Math.sin(t*.002)*open,0);this.root.scale.setScalar(1-.10*open);this.pact.rotation.set(-.12-.10*open,-.12+.05*open,.014*Math.sin(t*.001)*open);this.cover.rotation.y=-Math.PI*.90*open;this.magic.intensity=ink*(.25+pulse*.25);
  const pos=this.faceMesh.geometry.getAttribute('position') as T.BufferAttribute,rest=this.faceMesh.userData.rest;
  const flex=Math.sin(open*Math.PI)*.085;for(let k=0;k<pos.count;k++){const x=rest[k*3],y=rest[k*3+1];pos.setXYZ(k,x,y,flex*Math.pow((x+1)/2,1.4)*(1-.06*y*y));}pos.needsUpdate=true;this.faceMesh.geometry.computeVertexNormals();
  for(const {node:n,role,i}of this.pieces){n.visible=true;
   if(role==='binding'||role==='inside'){this.coat(n,body);if(role==='binding')n.scale.z=.06+.94*smooth(150,710,t)*(1-smooth(4280,4750,t));n.traverse(o=>{if(o instanceof T.Mesh&&o.material instanceof T.MeshBasicMaterial)o.material.opacity=o.material.userData.restOpacity*ink*.65;});continue;}
   this.coat(n,1);
   if(role==='contract'){n.position.set(0,0,.07+lift*.12);this.warpSurface(n,(x,y)=>[x,y,.06*Math.sin(y*2+t*.002)*lift]);(n.userData.ink as T.MeshBasicMaterial).opacity=.2+.7*smooth(1050,1700,t);}
   if(role==='inkFeed'){const a=smooth(980+i*45,1410+i*45,t),fade=1-smooth(1590,1800,t);n.visible=a>0&&fade>0;const m=n as T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>;m.geometry.setDrawRange(0,Math.floor(a*m.geometry.index!.count/6)*6);m.material.opacity=fade*.8;}
   if(role==='pool'){const a=smooth(990,1530,t)*(1-smooth(2630,3110,t)),press=smooth(1710,1820,t);n.position.set(0,-.43,.22+.03*a);n.scale.set(a*(1+.13*press),a*.86,a*(.38-.23*press));const g=(n as T.Mesh).geometry,p=g.getAttribute('position')as T.BufferAttribute,b=n.userData.base;for(let k=0;k<p.count;k++){const x=b[k*3],y=b[k*3+1],z=b[k*3+2],r=1+.05*Math.sin(Math.atan2(y,x)*9+t*.002)*(1-.8*press);p.setXYZ(k,x*r,y*r,z);}p.needsUpdate=true;g.computeVertexNormals();}
   if(role==='seal'){const a=smooth(1800,1960,t)*(1-smooth(2680,3040,t));n.visible=a>.001;n.position.set(0,-.43,.31);n.scale.setScalar(a);}
   if(role==='stamp'){const arrive=smooth(1260,1670,t),press=smooth(1670,1810,t),depart=smooth(1930,2320,t);n.visible=t>1250&&t<2320;n.position.set(.20*(1-arrive)+depart*.35,-.43+.25*(1-arrive),1.48-arrive*.72-press*.40+depart*1.3);n.rotation.y=(1-arrive)*.35+depart*.6;n.scale.setScalar(Math.max(.001,(1-depart)*smooth(1260,1430,t)));}
   const roleVisible=n.visible;n.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){for(const m of Array.isArray(o.material)?o.material:[o.material]){m.opacity*=surface;if(m instanceof T.MeshBasicMaterial&&m.blending===T.AdditiveBlending)m.opacity*=.56*ink;}}});n.visible=roleVisible&&surface>0.00001;
  }
  this.renderer.setClearColor(opts.dark?0x100b1a:0xeae5f0,this.overlayMode?0:1);this.renderer.render(this.scene,this.camera);
 }
 resize(w:number,h:number){super.resize(w,h);this.camera.position.z=w/h<1?11.0:8.5;this.camera.updateProjectionMatrix();}
 dispose(){this.clearPact();[this.faceTex,this.vellum,this.writing,this.sigil].forEach(t=>t.dispose());super.dispose();}
}

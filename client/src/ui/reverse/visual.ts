import {createWebGLRenderer} from '../webglRenderer';
import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {LAUNCH,HIT,ease,trajectory,facing,radius} from './motion';
import type {P,MotionScene} from './motion';
import {sigilTexture,smokeMaterial} from './sigil';
export class ReverseFlow {
 renderer:T.WebGLRenderer;scene=new T.Scene();camera=new T.OrthographicCamera(0,720,0,440,.1,2000);environment:T.WebGLRenderTarget;
 body=new T.MeshPhysicalMaterial({color:0x050409,metalness:.12,roughness:.24,clearcoat:.65,clearcoatRoughness:.16});
 edge=new T.MeshStandardMaterial({color:0x29232d,metalness:.25,roughness:.38});
 circleMaterials=[1].map(v=>new T.MeshBasicMaterial({map:sigilTexture(v),transparent:true,opacity:0,depthWrite:false,depthTest:false,side:T.DoubleSide}));
 sigil:T.Mesh;impactMist=new T.Mesh(new T.PlaneGeometry(2,2),smokeMaterial());
 fluid:T.Mesh;fluidRest:Float32Array;tubes:T.Mesh[]=[];strikes:T.Mesh[]=[];geometries=new Set<T.BufferGeometry>();w=0;h=0;
 constructor(){
  this.renderer=createWebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.85;this.camera.position.z=700;
  const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(this.renderer);this.environment=pmrem.fromScene(room,.1);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.35;room.dispose();pmrem.dispose();
  const key=new T.DirectionalLight(0xdad0d7,2);key.position.set(-200,-300,500);const rim=new T.DirectionalLight(0x9b9cb8,1.5);rim.position.set(200,150,240);this.scene.add(key,rim,new T.AmbientLight(0x9b8eaa,.3));
  this.sigil=new T.Mesh(new T.PlaneGeometry(2,2),this.circleMaterials[0]);this.sigil.renderOrder=1;this.scene.add(this.sigil);
  this.impactMist.renderOrder=8;this.scene.add(this.impactMist);
  this.fluid=new T.Mesh(new T.SphereGeometry(1,32,24),this.body);this.fluidRest=new Float32Array(this.fluid.geometry.attributes.position.array as Float32Array);this.scene.add(this.fluid);
  for(let i=0;i<4;i++){const m=new T.Mesh(this.tubeGeo(),i===6?this.edge:this.body);this.tubes.push(m);this.scene.add(m)}
  for(let i=0;i<8;i++){const m=new T.Mesh(this.tubeGeo(),this.body);this.strikes.push(m);this.scene.add(m)}
  this.scene.traverse(o=>{if(o instanceof T.Mesh)this.geometries.add(o.geometry)});this.renderer.compile(this.scene,this.camera);
 }
 tubeGeo(){const g=new T.BufferGeometry(),n=56,k=8;g.setAttribute('position',new T.BufferAttribute(new Float32Array((n+1)*(k+1)*3),3));g.setAttribute('normal',new T.BufferAttribute(new Float32Array((n+1)*(k+1)*3),3));const index=[];for(let i=0;i<n;i++)for(let j=0;j<k;j++){const a=i*(k+1)+j,b=a+k+1;index.push(a,b,a+1,b,b+1,a+1)}g.setIndex(index);return g}
 tube(m:T.Mesh,points:(u:number)=>P,radius:number,depth=.45){const g=m.geometry,p=g.attributes.position,norm=g.attributes.normal,N=56,K=8;for(let i=0;i<=N;i++){const u=i/N,a=points(u),b=points(Math.min(1,u+.001)),d=points(Math.max(0,u-.001)),dx=b.x-d.x,dy=b.y-d.y,l=Math.hypot(dx,dy)||1,w=radius*Math.pow(Math.sin(Math.PI*u),.55);for(let j=0;j<=K;j++){const angle=j/K*Math.PI*2,nx=-dy/l*Math.cos(angle),ny=dx/l*Math.cos(angle),nz=Math.sin(angle),idx=i*(K+1)+j;p.setXYZ(idx,a.x+nx*w,a.y+ny*w,a.z+nz*w*depth);norm.setXYZ(idx,nx,ny,nz/depth)}}p.needsUpdate=true;norm.needsUpdate=true;g.computeBoundingSphere()}
 draw(s:MotionScene,_variant:number,t:number,w:number,h:number,reduced:boolean){
  if(w!==this.w||h!==this.h){this.w=w;this.h=h;this.renderer.setSize(w,h,false);this.camera.right=w;this.camera.bottom=h;this.camera.updateProjectionMatrix()}
  const z=Math.max(.5,s.scale),r=radius(s.original,z),charge=ease(t/420),circle=charge*(1-ease((t-1050)/600)),fade=1-ease((t-HIT-80)/620),p=trajectory(s,1,Math.min(t,HIT));
  this.circleMaterials[0].opacity=circle*.98;this.sigil.visible=circle>0;this.sigil.position.set(s.original.x,s.original.y,6);this.sigil.rotation.set(reduced?0:.13,reduced?0:-.08,reduced?0:-t*.000045);this.sigil.scale.set(r*1.3,r*1.3,1);
  const angle=facing(s,1,Math.max(t,LAUNCH+4)),seed=t<LAUNCH?4+charge*12:1;
  this.fluid.visible=!reduced&&t>150&&t<HIT+300;this.fluid.position.set(p.x,p.y,p.z);this.fluid.rotation.set(.4,0,angle);this.fluid.scale.set((t<LAUNCH?seed:22)*z*fade,(t<LAUNCH?seed:11)*z*fade,9*z*fade);
  if(this.fluid.visible){const attr=this.fluid.geometry.attributes.position;for(let i=0;i<attr.count;i++){const x=this.fluidRest[i*3],y=this.fluidRest[i*3+1],zz=this.fluidRest[i*3+2],d=1+.075*Math.sin(x*7+y*4+t*.007)*Math.cos(zz*5+t*.003);attr.setXYZ(i,x*d,y*d,zz*d)}attr.needsUpdate=true;this.fluid.geometry.computeVertexNormals()}
  const head=Math.min(t,HIT),tailTime=Math.max(LAUNCH,head-800+Math.max(0,t-HIT)*1.8);
  this.tubes.forEach((m,j)=>{
   m.visible=!reduced&&t>LAUNCH&&t<HIT+400;if(!m.visible)return;
   const taper=1-ease((t-HIT)/400),width=(j?3.1:9)*z*taper;
   this.tube(m,u=>{const q=trajectory(s,1,tailTime+(head-tailTime)*u),envelope=Math.sin(Math.PI*u);q.x+=Math.sin(u*10+j*2+t*.004)*envelope*(j?11:4)*z;q.z+=Math.cos(u*10+j*2+t*.004)*envelope*9*z;return q},width,.8);
  });
  const impact=t-HIT,hit=ease(impact/120),end=1-ease((impact-100)/600);
  this.impactMist.visible=impact>=0&&impact<700;this.impactMist.position.set(s.destination.x,s.destination.y,15);const spread=35*(.35+.65*hit)*end;
  this.impactMist.scale.set(spread,spread,1);this.impactMist.material.uniforms.clock.value=reduced?.5:t/350;this.impactMist.material.uniforms.strength.value=1.5;
  this.strikes.forEach((m,i)=>{m.visible=!reduced&&impact>=0&&impact<600;if(!m.visible)return;const a=i/8*Math.PI*2+.2,extent=45*z*hit;this.tube(m,u=>{const rad=u*extent;return{x:s.destination.x+Math.cos(a)*rad,y:s.destination.y+Math.sin(a)*rad,z:8+Math.sin(u*Math.PI)*14*z}},4.2*z*end,.7)});
  this.renderer.render(this.scene,this.camera);return this.renderer.domElement;
 }
 dispose(){this.geometries.forEach(g=>g.dispose());[this.body,this.edge,this.impactMist.material,...this.circleMaterials].forEach(m=>m.dispose());this.circleMaterials.forEach(m=>m.map?.dispose());this.environment.dispose();this.renderer.dispose();this.renderer.forceContextLoss()}
}
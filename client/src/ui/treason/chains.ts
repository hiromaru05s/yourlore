import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';

export const BREAK=2020;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x)};
class LinkCurve extends T.Curve<T.Vector3>{
 constructor(){super()}
 getPoint(t:number,out=new T.Vector3()){
  // A forged oblong: two parallel shanks and semicircular crowns.
  const r=2.45,L=3.15,p=4*L+2*Math.PI*r;let s=t*p;
  if(s<2*L)return out.set(-L+s,r,0);s-=2*L;
  if(s<Math.PI*r){const a=Math.PI/2-s/r;return out.set(L+r*Math.cos(a),r*Math.sin(a),0)}s-=Math.PI*r;
  if(s<2*L)return out.set(L-s,-r,0);s-=2*L;
  const a=-Math.PI/2-s/r;return out.set(-L+r*Math.cos(a),r*Math.sin(a),0);
 }
}
type Run={points:T.Vector3[];start:number;duration:number;count:number};
export type Anchor={x:number;y:number;w:number;h:number;tilt?:number;basis?:number[]};
type Rig={group:T.Group;metal:T.InstancedMesh;seams:T.InstancedMesh;runs:Run[];occluder:T.Mesh;receiver:T.Mesh;anchor:Anchor};
export class Chains{
 readonly renderer:T.WebGLRenderer;readonly canvas:HTMLCanvasElement;
 private scene=new T.Scene();private camera=new T.OrthographicCamera();private rigs:Rig[]=[];
 private geometry=new T.TubeGeometry(new LinkCurve(),28,1.14,6,true);
 private seamGeo=new T.BoxGeometry(.68,2.16,2.10);
 private material=new T.MeshStandardMaterial({color:0x343a42,metalness:.91,roughness:.36,envMapIntensity:.85});
 private seamMat=new T.MeshStandardMaterial({color:0x34373a,metalness:.8,roughness:.46});
 private blocker=new T.MeshBasicMaterial({colorWrite:false,side:T.DoubleSide});
 private shadow=new T.ShadowMaterial({opacity:.48,side:T.DoubleSide});
 private plane=new T.PlaneGeometry(1,1);private env:T.WebGLRenderTarget;
 private light:T.DirectionalLight;private matrix=new T.Matrix4();private dummy=new T.Object3D();
 private tangent=new T.Vector3();private point=new T.Vector3();private axis=new T.Vector3(1,0,0);private roll=new T.Quaternion();
 constructor(){
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});this.canvas=this.renderer.domElement;this.canvas.className='treason-chains';this.canvas.dataset.variant='03';this.canvas.style.cssText='position:fixed;inset:0;z-index:8002;pointer-events:none';this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  const pmrem=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.env=pmrem.fromScene(room,.04);this.scene.environment=this.env.texture;room.dispose();pmrem.dispose();
  this.scene.add(new T.HemisphereLight(0xdce9ff,0x302a25,1.2));
  this.light=new T.DirectionalLight(0xfff1d7,3.1);this.light.castShadow=true;this.light.shadow.mapSize.set(2048,2048);this.light.shadow.bias=-.00003;this.light.shadow.normalBias=.2;this.light.shadow.radius=2;this.scene.add(this.light,this.light.target);
  const rim=new T.DirectionalLight(0xb8d2ff,1.8);rim.position.set(800,-500,450);this.scene.add(rim);
  document.body.append(this.canvas);this.resize();
 }
 resize(){const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h);this.camera.left=0;this.camera.right=w;this.camera.top=h;this.camera.bottom=0;this.camera.near=.1;this.camera.far=4000;this.camera.position.set(0,0,1500);this.camera.updateProjectionMatrix();this.light.position.set(w*.1,h*.9,850);this.light.target.position.set(w*.5,h*.5,0);const s=Math.max(w,h);Object.assign(this.light.shadow.camera,{left:-s,right:s,top:s,bottom:-s,near:1,far:3000});this.light.shadow.camera.updateProjectionMatrix();}
 private runs(h:number):Run[]{
  const samples:T.Vector3[]=[];
  for(let i=0;i<=360;i++){const t=i/360,a=t*Math.PI*5.25;samples.push(new T.Vector3(46*Math.sin(a),-h*.4+t*h*.8,4.4*Math.cos(a)));}
  const path=new T.CatmullRomCurve3(samples),count=Math.ceil(path.getLength()/8.15),points=path.getSpacedPoints(count);
  return[{points,start:150,duration:1200,count}];
 }
 configure(anchors:Anchor[]){
  this.clear();for(const anchor of anchors){const h=100*anchor.h/anchor.w,runs=this.runs(h),count=runs.reduce((n,r)=>n+r.count,0),group=new T.Group(),metal=new T.InstancedMesh(this.geometry,this.material,count),seams=new T.InstancedMesh(this.seamGeo,this.seamMat,count);
   metal.instanceMatrix.setUsage(T.DynamicDrawUsage);seams.instanceMatrix.setUsage(T.DynamicDrawUsage);metal.castShadow=true;metal.frustumCulled=seams.frustumCulled=false;
   const occluder=new T.Mesh(this.plane,this.blocker);occluder.scale.set(100,h,1);occluder.renderOrder=-2;
   const receiver=new T.Mesh(this.plane,this.shadow);receiver.scale.copy(occluder.scale);receiver.position.z=.12;receiver.receiveShadow=true;receiver.renderOrder=1;
   group.add(occluder,receiver,metal,seams);this.scene.add(group);this.rigs.push({group,metal,seams,runs,occluder,receiver,anchor});
  }
 }
 updateAnchors(anchors:Anchor[]){anchors.forEach((a,i)=>{if(this.rigs[i])this.rigs[i].anchor=a})}
 paint(ms:number,reduced=false){
  for(const rig of this.rigs){const {group,anchor,metal,seams,runs}=rig;group.visible=!reduced&&ms>100&&ms<BREAK+240;if(!group.visible)continue;
   group.position.set(anchor.x,innerHeight-anchor.y,10);group.scale.setScalar(anchor.w/100);group.rotation.x=anchor.tilt??0;if(anchor.basis){const [a,b,c,d]=anchor.basis,scale=anchor.w/100;group.matrixAutoUpdate=false;group.matrix.set(a,c,0,anchor.x,b,d,.309*scale,innerHeight-anchor.y,0,0,.951*scale,10,0,0,0,1)}
   const tighten=smooth(1300,1630,ms),exit=smooth(BREAK,BREAK+240,ms),settle=Math.sin((ms-1450)*.055)*Math.exp(-Math.max(0,ms-1450)/95)*smooth(1440,1460,ms)*(1-smooth(1740,1800,ms));
   let index=0;
   for(const run of runs){const feed=smooth(run.start,run.start+run.duration,ms);const visible=Math.floor(feed*run.count);for(let i=0;i<run.count;i++,index++){
    const route=Math.max(0,Math.min(run.count-.001,feed*run.count-i)),j=Math.floor(route),fraction=route-j,a=run.points[j],b=run.points[j+1];this.point.lerpVectors(a,b,fraction);this.tangent.subVectors(b,a).normalize();
    const slack=(1-tighten)*(.055+.035*Math.sin(i*.55)),lead=i>visible-4?Math.max(0,1-(visible-i)/4):0;
    this.point.x*=1+slack+exit*.22;this.point.y*=1+slack;this.point.z+=lead*(1-feed)*16+Math.max(0,this.point.z)*(1-tighten)*.3;
    this.point.y-=exit*22;this.point.x+=settle*.22;
    this.dummy.position.copy(this.point);this.dummy.quaternion.setFromUnitVectors(this.axis,this.tangent);this.roll.setFromAxisAngle(this.axis,(i%2?Math.PI/2:0)+Math.sin(i*.71)*.13+(1-tighten)*Math.sin(ms*.006+i)*.11);this.dummy.quaternion.multiply(this.roll);
    const s=i<visible?Math.min(1,(feed*run.count-i)*2)*(1-exit):0;this.dummy.scale.setScalar(s);this.dummy.updateMatrix();metal.setMatrixAt(index,this.dummy.matrix);
    this.matrix.makeTranslation(0,2.45,0);this.matrix.premultiply(this.dummy.matrix);seams.setMatrixAt(index,this.matrix);
   }}metal.instanceMatrix.needsUpdate=true;seams.instanceMatrix.needsUpdate=true;
  }this.renderer.render(this.scene,this.camera);
 }
 clear(){for(const r of this.rigs){this.scene.remove(r.group);r.metal.dispose();r.seams.dispose()}this.rigs=[];}
 dispose(){this.clear();this.geometry.dispose();this.seamGeo.dispose();this.material.dispose();this.seamMat.dispose();this.blocker.dispose();this.shadow.dispose();this.plane.dispose();this.env.dispose();this.light.shadow.map?.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.canvas.remove()}
 get stats(){return{rigs:this.rigs.length,links:this.rigs.reduce((n,r)=>n+r.metal.count,0),drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles}}
}

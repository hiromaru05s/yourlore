import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
const TURN_START=800, RELEASE=4600, CLEAR=5900;
export type Rect={x:number;y:number;w:number;h:number};
export type Target={rect:Rect;small?:boolean};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{n=clamp(n);return n*n*(3-2*n)};
const ease=(n:number)=>1-Math.pow(1-clamp(n),3);
type Model={root:T.Group;pose:(age:number,release:number)=>void};
function mesh(p:T.Object3D,g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
function box(p:T.Object3D,w:number,h:number,d:number,m:T.Material,x=0,y=0,z=0,r=2){return mesh(p,new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/3,h/3,d/3)),m,x,y,z)}
function cylinder(p:T.Object3D,r:number,h:number,m:T.Material,x=0,y=0,z=0){const o=mesh(p,new T.CylinderGeometry(r,r,h,48),m,x,y,z);o.rotation.x=Math.PI/2;return o;}
function torus(p:T.Object3D,r:number,tube:number,m:T.Material,x=0,y=0,z=0){return mesh(p,new T.TorusGeometry(r,tube,10,48),m,x,y,z)}
function wear(){const cv=document.createElement('canvas');cv.width=cv.height=256;const c=cv.getContext('2d')!;c.fillStyle='#999';c.fillRect(0,0,256,256);let seed=57;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};for(let i=0;i<2000;i++){const v=Math.floor(100+rand()*100);c.fillStyle=`rgb(${v},${v},${v})`;c.fillRect(rand()*256,rand()*256,1+rand()*5,1)}for(let i=0;i<50;i++){c.strokeStyle='#666';c.lineWidth=.4;c.beginPath();const x=rand()*256,y=rand()*256;c.moveTo(x,y);c.lineTo(x+4+rand()*35,y+rand()*4);c.stroke()}const tex=new T.CanvasTexture(cv);tex.wrapS=tex.wrapT=T.RepeatWrapping;return tex;}
function irisModel(steel:T.Material,gold:T.Material,dark:T.Material):Model{
 const root=new T.Group(),housing=new T.Group();root.add(housing);const moving:T.Group[]=[];
 const ringShape=new T.Shape();ringShape.absarc(0,0,44,0,Math.PI*2,false);const hole=new T.Path();hole.absarc(0,0,33,0,Math.PI*2,true);ringShape.holes.push(hole);
 const ringGeo=new T.ExtrudeGeometry(ringShape,{depth:12,steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:1.3,bevelThickness:1.3,curveSegments:64});mesh(housing,ringGeo,dark,0,0,1);torus(housing,42,2.2,gold,0,0,14);torus(housing,34.5,1.8,steel,0,0,14);
 for(let i=0;i<6;i++){const a=i*Math.PI/3;const pivot=new T.Group();pivot.position.set(Math.cos(a)*32,Math.sin(a)*32,10+i*.18);pivot.rotation.z=a;housing.add(pivot);
 const shape=new T.Shape();shape.moveTo(4,-8);shape.bezierCurveTo(-9,-19,-31,-22,-34,-4);shape.lineTo(-30,15);shape.quadraticCurveTo(-10,13,4,4);shape.closePath();mesh(pivot,new T.ExtrudeGeometry(shape,{depth:2.8,bevelEnabled:true,bevelSize:.7,bevelThickness:.6,bevelSegments:2,steps:1}),i%2?steel:gold);moving.push(pivot);
 cylinder(housing,2.4,2.5,gold,Math.cos(a)*39,Math.sin(a)*39,17);box(housing,2.5,7,2,dark,Math.cos(a)*39,Math.sin(a)*39,19,.4).rotation.z=a;
 }
 return{root,pose(age,rel){const raise=ease(age/380),close=smooth((age-200)/850),open=smooth(rel);housing.scale.setScalar(Math.max(.001,raise*(1-smooth((rel-.55)/.45))));housing.rotation.set(.22,-.22,(1-close)*-.22+open*.15);housing.position.z=(1-raise)*-6;moving.forEach((pivot,i)=>{pivot.rotation.z=i*Math.PI/3+(1-close+open*close)*1.2;});}};
}
export class MarketCrashIris{
 readonly canvas:HTMLCanvasElement;private renderer:T.WebGLRenderer;private scene=new T.Scene();private camera=new T.OrthographicCamera();private roots:Model[]=[];private environment:T.WebGLRenderTarget;private texture:T.Texture;private lights:T.DirectionalLight[]=[];private width=0;private height=0;
 constructor(canvas?:HTMLCanvasElement){
 this.renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});this.canvas=this.renderer.domElement;this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;
 this.camera.position.set(0,0,1000);this.camera.near=.1;this.camera.far=2000;
 const pm=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pm.fromScene(room,.035);pm.dispose();room.dispose();this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.75;
 this.scene.add(new T.HemisphereLight(0xe4efff,0x392a20,1.8));
 const key=new T.DirectionalLight(0xffe4bb,3.7);key.position.set(-350,450,800);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-1000,right:1000,top:1000,bottom:-1000,near:10,far:2500});key.shadow.bias=-.0001;key.shadow.normalBias=.3;key.shadow.radius=3;this.scene.add(key);this.lights.push(key);
 const rim=new T.DirectionalLight(0xb2d5ff,2);rim.position.set(450,-150,350);this.scene.add(rim);this.lights.push(rim);
 this.texture=wear();const steel=new T.MeshStandardMaterial({color:0x6f7c88,metalness:.88,roughness:.3,bumpMap:this.texture,bumpScale:.2});const gold=new T.MeshStandardMaterial({color:0x9f7841,metalness:.84,roughness:.3,bumpMap:this.texture,bumpScale:.17});const dark=new T.MeshStandardMaterial({color:0x202932,metalness:.65,roughness:.45});
 for(let slot=0;slot<2;slot++){const m=irisModel(steel,gold,dark);this.roots.push(m);const shadow=new T.Mesh(new T.PlaneGeometry(155,185),new T.ShadowMaterial({opacity:.38}));shadow.receiveShadow=true;shadow.position.z=-1;m.root.add(shadow);this.scene.add(m.root);m.root.visible=false}

 this.roots.flat().forEach(m=>m.root.visible=true);this.renderer.compile(this.scene,this.camera);this.roots.flat().forEach(m=>m.root.visible=false);
 }
 draw(targets:Target[],time:number,width:number,height:number,reduced=false,dark=false){
 if(width!==this.width||height!==this.height){this.width=width;this.height=height;this.renderer.setSize(width,height,false);Object.assign(this.camera,{left:-width/2,right:width/2,top:height/2,bottom:-height/2});this.camera.updateProjectionMatrix()}
 this.roots.flat().forEach(m=>m.root.visible=false);this.renderer.toneMappingExposure=dark?1.05:1.15;
 if(time>=TURN_START&&time<CLEAR&&!(reduced&&time>=RELEASE))for(let i=0;i<Math.min(2,targets.length);i++){const {rect:r,small}=targets[i],model=this.roots[i];model.root.visible=true;const scale=Math.min(r.w/100,r.h/(small?100:150));model.root.position.set(r.x-width/2,height/2-r.y,0);model.root.scale.setScalar(scale*(small?1.05:1.12));model.pose(reduced?1600:Math.min(1600,time-TURN_START),time>=RELEASE?clamp((time-RELEASE)/1200):0)}
 this.renderer.render(this.scene,this.camera);
 }
 clear(){this.roots.flat().forEach(m=>m.root.visible=false);this.renderer.clear()}
 dispose(){const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();this.scene.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m)}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());this.texture.dispose();this.environment.dispose();this.lights.forEach(l=>l.shadow?.dispose());this.renderer.dispose();this.renderer.forceContextLoss()}
}

import * as T from 'three';
import {makeShields,moveShield,type ShieldRig} from './shields';
import {pulse,pose,DURATION,SELECTED_SHIELD} from './timing';
type C=CanvasRenderingContext2D;
const W=180,H=270;
const shape=(points:number[][])=>{const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;};
const geom=(points:number[][],depth=5)=>new T.ExtrudeGeometry(shape(points),{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:1.6,bevelThickness:1.2,curveSegments:8});
const rect=(w:number,h:number,d=4)=>geom([[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]],d);
export class Renderer {
 readonly gpu=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
 private environment:T.CubeTexture;private scene=new T.Scene();private camera=new T.OrthographicCamera();private root=new T.Group();private body=new T.Group();
 private variants=[new T.Group()];
 private currentFace:HTMLCanvasElement|undefined;private surfaces=new Map<HTMLCanvasElement,T.CanvasTexture>();private edges=new Map<HTMLCanvasElement,T.CanvasTexture>();private backing!:T.Mesh;private face:T.Mesh;private relief:T.Mesh;private ground:T.Mesh;
 private shields:ShieldRig[];readonly ready=Promise.resolve();
 private shadowMat=new T.ShadowMaterial({opacity:.28});private disposed=false;
 constructor(){
  this.gpu.setPixelRatio(1);this.gpu.setSize(720,580);this.gpu.outputColorSpace=T.SRGBColorSpace;this.gpu.toneMapping=T.ACESFilmicToneMapping;this.gpu.toneMappingExposure=1.05;
  const lights=Array.from({length:6},(_,i)=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d')!,g=x.createLinearGradient(0,0,128,128);g.addColorStop(0,i===2?'#fff4d7':'#78848d');g.addColorStop(.33,'#e1ded2');g.addColorStop(.46,'#343e47');g.addColorStop(.66,'#6f7f8a');g.addColorStop(.78,'#eaf2f4');g.addColorStop(1,'#504b43');x.fillStyle=g;x.fillRect(0,0,128,128);x.fillStyle='#ffffed';x.fillRect(30+i*3,12,12,104);return c;});this.environment=new T.CubeTexture(lights);this.environment.colorSpace=T.SRGBColorSpace;this.environment.needsUpdate=true;this.scene.environment=this.environment;
  this.gpu.shadowMap.enabled=true;this.gpu.shadowMap.type=T.PCFSoftShadowMap;
  this.scene.add(new T.HemisphereLight(0xe8f1ff,0x777066,1.2));
  const sun=new T.DirectionalLight(0xffefd2,2.1);sun.position.set(-210,260,550);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-230;sun.shadow.camera.right=230;sun.shadow.camera.top=260;sun.shadow.camera.bottom=-220;sun.shadow.camera.near=1;sun.shadow.camera.far=1300;sun.shadow.bias=-.0005;sun.shadow.normalBias=.5;sun.shadow.radius=3;this.scene.add(sun);
  const rim=new T.DirectionalLight(0xc8defa,1.2);rim.position.set(210,-90,220);this.scene.add(rim);
  this.scene.add(this.root);this.root.add(this.body);this.body.add(...this.variants);
  this.ground=new T.Mesh(new T.PlaneGeometry(680,680),this.shadowMat);this.ground.position.z=-3;this.ground.receiveShadow=true;this.scene.add(this.ground);
  const backing=this.backing=new T.Mesh(rect(155,241,1),new T.MeshStandardMaterial({color:0x534b3e,roughness:.8}));backing.position.z=-2;backing.castShadow=true;this.body.add(backing);
  this.face=new T.Mesh(new T.PlaneGeometry(W*1.24,H+W*.24),new T.MeshBasicMaterial({transparent:true,alphaTest:.02}));this.face.position.z=3;this.face.castShadow=true;this.face.receiveShadow=true;this.body.add(this.face);
  this.relief=new T.Mesh(new T.PlaneGeometry(W*1.24,H+W*.24),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,color:0xffe8b6,blending:T.AdditiveBlending}));this.relief.position.z=3.2;this.body.add(this.relief);
  this.shields=makeShields(this.variants,[SELECTED_SHIELD]);

 }
 private setFace(canvas:HTMLCanvasElement){
  if(this.currentFace===canvas)return;this.currentFace=canvas;
  let texture=this.surfaces.get(canvas);if(!texture){texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,this.gpu.capabilities.getMaxAnisotropy());this.surfaces.set(canvas,texture);}
  (this.face.material as T.MeshBasicMaterial).map=texture;(this.face.material as T.MeshBasicMaterial).needsUpdate=true;
  let edge=this.edges.get(canvas);if(!edge){const image=document.createElement('canvas');image.width=270;image.height=405;const c=image.getContext('2d')!;c.drawImage(canvas,0,0,270,405);const pixels=c.getImageData(0,0,270,405),src=new Uint8ClampedArray(pixels.data);for(let y=1;y<404;y++)for(let x=1;x<269;x++){const i=(y*270+x)*4;let contrast=0;for(let k=0;k<3;k++)contrast+=Math.abs(src[i-4+k]-src[i+4+k])+Math.abs(src[i-1080+k]-src[i+1080+k]);pixels.data[i]=255;pixels.data[i+1]=235;pixels.data[i+2]=187;pixels.data[i+3]=Math.min(src[i+3],contrast*.55);}c.putImageData(pixels,0,0);edge=new T.CanvasTexture(image);edge.colorSpace=T.SRGBColorSpace;this.edges.set(canvas,edge);}
  (this.relief.material as T.MeshBasicMaterial).map=edge;(this.relief.material as T.MeshBasicMaterial).needsUpdate=true;
 }
 private update(v:number,ms:number,reduced:boolean){
  const m=pose(v,ms,reduced),t=m.t;this.body.position.set(0,m.advance,m.lift);this.body.scale.setScalar(m.scale);this.body.rotation.set(m.tilt,0,0);
  this.variants.forEach(g=>g.visible=ms>0&&ms<DURATION&&!reduced);
  (this.relief.material as T.MeshBasicMaterial).opacity=reduced?.18*m.strength:.1*pulse(0,180,540,930,t);
  moveShield(this.shields[0],t);

 }
 /** Full board projection: same world-to-screen matrix as the native card. */
 renderBoard(ctx:C,face:HTMLCanvasElement,ms:number,width:number,height:number,matrix:DOMMatrix,reduced=false,drawSource=false){
  if(this.disposed)return;this.backing.visible=this.face.visible=drawSource;this.setFace(face);this.update(0,ms,reduced);this.root.rotation.z=0;this.ground.visible=true;if(this.gpu.domElement.width!==width||this.gpu.domElement.height!==height)this.gpu.setSize(width,height,false);
  const fromWorld=new T.Matrix4().set(1,0,0,90,0,-1,0,135,0,0,1,0,0,0,0,1);
  const dom=new T.Matrix4().fromArray(Array.from(matrix.toFloat64Array()));
  // CSS pixel coordinates to WebGL clip coordinates, with depth retained for occlusion.
  const clip=new T.Matrix4().set(2/width,0,0,-1,0,-2/height,0,1,0,0,-1/2000,0,0,0,0,1);
  this.camera.position.set(0,0,0);this.camera.rotation.set(0,0,0);this.camera.updateMatrixWorld();this.camera.projectionMatrix.copy(clip.multiply(dom).multiply(fromWorld));this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
  this.gpu.render(this.scene,this.camera);ctx.drawImage(this.gpu.domElement,0,0,width,height);
 }
 releaseFace(face:HTMLCanvasElement){this.surfaces.get(face)?.dispose();this.edges.get(face)?.dispose();this.surfaces.delete(face);this.edges.delete(face);if(this.currentFace===face)this.currentFace=undefined;}
 get stats(){return{textures:this.gpu.info.memory.textures,geometries:this.gpu.info.memory.geometries,calls:this.gpu.info.render.calls,triangles:this.gpu.info.render.triangles};}
 dispose(){if(this.disposed)return;this.disposed=true;const geoms=new Set<T.BufferGeometry>(),mats=new Set<T.Material>(),textures=new Set<T.Texture>();this.scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){geoms.add(o.geometry);const mm=Array.isArray(o.material)?o.material:[o.material];mm.forEach(m=>{mats.add(m);for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);});}});this.surfaces.forEach(t=>textures.add(t));this.edges.forEach(t=>textures.add(t));geoms.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());this.environment.dispose();this.gpu.dispose();this.gpu.forceContextLoss();this.surfaces.clear();this.edges.clear();}
}

import * as T from 'three';
import {RichVariants} from './richVariants';
import {pulse,pose,DURATION} from './catalog';
type C=CanvasRenderingContext2D;
const W=180,H=270;
const shape=(points:number[][])=>{const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;};
const geom=(points:number[][],depth=5)=>new T.ExtrudeGeometry(shape(points),{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:1.6,bevelThickness:1.2,curveSegments:8});
const rect=(w:number,h:number,d=4)=>geom([[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]],d);
export class Renderer {
 readonly gpu=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
 private environment:T.CubeTexture;private scene=new T.Scene();private camera=new T.OrthographicCamera();private root=new T.Group();private body=new T.Group();
 private variants=[new T.Group(),new T.Group(),new T.Group(),new T.Group()];
 private currentFace:HTMLCanvasElement|undefined;private surfaces=new Map<HTMLCanvasElement,T.CanvasTexture>();private edges=new Map<HTMLCanvasElement,T.CanvasTexture>();private backing!:T.Mesh;private face:T.Mesh;private relief:T.Mesh;private ground:T.Mesh;
 private steel=new T.MeshStandardMaterial({color:0x667988,metalness:.55,roughness:.29});
 private silver=new T.MeshStandardMaterial({color:0xcbd5d6,metalness:.62,roughness:.24});
 private gold=new T.MeshStandardMaterial({color:0xb69051,metalness:.55,roughness:.35});
 private dark=new T.MeshStandardMaterial({color:0x263a49,metalness:.45,roughness:.38});



 private left=new T.Group();private right=new T.Group();private boss=new T.Group();
 private rich:RichVariants;readonly ready:Promise<void>;
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
  this.makeShield();this.rich=new RichVariants(this.variants);this.ready=this.rich.ready;

 }
 private mesh(g:T.BufferGeometry,m:T.Material,parent:T.Object3D,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 private makeShield(){
  const group=this.variants[0];group.add(this.left,this.right,this.boss);
  for(const [side,rig]of [[-1,this.left],[1,this.right]] as const){
   const curve=(x:number,y:number)=>13*(1-Math.min(1,Math.abs(x)/68)**1.4)*(1-.38*(y/85)**2);
   const bent=(points:number[][],depth:number)=>{const g=geom(points,depth),a=g.attributes.position;for(let i=0;i<a.count;i++)a.setZ(i,a.getZ(i)+curve(a.getX(i),a.getY(i)));a.needsUpdate=true;g.computeVertexNormals();return g;};
   const points=[[0,78],[side*64,58],[side*58,-17],[0,-74]];this.mesh(bent(points,7),this.steel,rig);
   this.mesh(bent(points.map(([x,y])=>[x*.91,y*.90]),1.6),this.dark,rig,0,0,8);
   this.mesh(bent([[0,69],[side*9,65],[side*9,-51],[0,-62]],2),this.silver,rig,0,0,10);
   const line=new T.CatmullRomCurve3([new T.Vector3(side*10,53,11+curve(side*10,53)),new T.Vector3(side*47,42,11+curve(side*47,42)),new T.Vector3(side*40,-9,11+curve(side*40,-9)),new T.Vector3(side*9,-46,11+curve(side*9,-46))]);this.mesh(new T.TubeGeometry(line,20,1,5,false),this.gold,rig);
   for(const [x,y]of [[side*53,46],[side*47,-14]])this.mesh(new T.SphereGeometry(2.4,8,6),this.silver,rig,x,y,11+curve(x,y));
   const hinge=this.mesh(new T.CylinderGeometry(3,3,52,10),this.gold,rig,side*59,20,3);hinge.rotation.z=.05*side;
  }
  this.mesh(new T.SphereGeometry(10,16,10),this.silver,this.boss,0,0,0).scale.set(1,1,.38);
  this.mesh(geom([[0,16],[5,0],[0,-18],[-5,0]],2),this.gold,this.boss,0,0,3);
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
  this.variants.forEach((g,i)=>g.visible=i===v&&ms>0&&ms<DURATION&&!reduced);
  (this.relief.material as T.MeshBasicMaterial).opacity=reduced?.18*m.strength:.1*pulse(0,180,540,930,t);
  const open=pulse(80,390,670,960,t),hold=pulse(20,180,800,1000,t);
  if(v===0){
   for(const [sign,rig]of [[-1,this.left],[1,this.right]] as const){rig.position.set(sign*78*(1-open),26+86*(1-open),4+open*40);rig.rotation.set(.05*open,sign*(1-open)*1.48,sign*.06*(1-open));rig.scale.setScalar(.08+.92*hold);}
   this.boss.position.set(0,26,71);this.boss.scale.setScalar(pulse(280,420,650,870,t));
  }
  this.rich.update(v,t);

 }
 render(ctx:C,face:HTMLCanvasElement,v:number,ms:number,width:number,height:number,reduced=false,dark=false){
  if(this.disposed)return;this.backing.visible=this.face.visible=true;this.setFace(face);this.update(v,ms,reduced);this.root.rotation.z=0;this.ground.visible=true;this.shadowMat.opacity=dark?.43:.28;
  if(this.gpu.domElement.width!==width||this.gpu.domElement.height!==height)this.gpu.setSize(width,height,false);const range=193;this.camera.left=-range*width/height;this.camera.right=range*width/height;this.camera.top=range;this.camera.bottom=-range;this.camera.near=1;this.camera.far=1800;
  this.camera.position.set(0,-300,850);this.camera.up.set(0,1,0);this.camera.lookAt(0,0,0);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();this.gpu.render(this.scene,this.camera);ctx.clearRect(0,0,width,height);ctx.drawImage(this.gpu.domElement,0,0,width,height);
 }
 /** Full board projection: same world-to-screen matrix as the native card. */
 renderBoard(ctx:C,face:HTMLCanvasElement,v:number,ms:number,width:number,height:number,matrix:DOMMatrix,reduced=false,drawSource=false){
  if(this.disposed)return;this.backing.visible=this.face.visible=drawSource;this.setFace(face);this.update(v,ms,reduced);this.root.rotation.z=0;this.ground.visible=true;if(this.gpu.domElement.width!==width||this.gpu.domElement.height!==height)this.gpu.setSize(width,height,false);
  const fromWorld=new T.Matrix4().set(1,0,0,90,0,-1,0,135,0,0,1,0,0,0,0,1);
  const dom=new T.Matrix4().fromArray(Array.from(matrix.toFloat64Array()));
  // CSS pixel coordinates to WebGL clip coordinates, with depth retained for occlusion.
  const clip=new T.Matrix4().set(2/width,0,0,-1,0,-2/height,0,1,0,0,-1/2000,0,0,0,0,1);
  this.camera.position.set(0,0,0);this.camera.rotation.set(0,0,0);this.camera.updateMatrixWorld();this.camera.projectionMatrix.copy(clip.multiply(dom).multiply(fromWorld));this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
  this.gpu.render(this.scene,this.camera);ctx.drawImage(this.gpu.domElement,0,0,width,height);
 }
 get stats(){return{textures:this.gpu.info.memory.textures,geometries:this.gpu.info.memory.geometries,calls:this.gpu.info.render.calls,triangles:this.gpu.info.render.triangles};}
 dispose(){if(this.disposed)return;this.disposed=true;const geoms=new Set<T.BufferGeometry>(),mats=new Set<T.Material>(),textures=new Set<T.Texture>();this.scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){geoms.add(o.geometry);const mm=Array.isArray(o.material)?o.material:[o.material];mm.forEach(m=>{mats.add(m);if((m as T.MeshStandardMaterial).map)textures.add((m as T.MeshStandardMaterial).map!);});}});this.surfaces.forEach(t=>textures.add(t));this.edges.forEach(t=>textures.add(t));geoms.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());this.environment.dispose();this.gpu.dispose();this.gpu.forceContextLoss();this.surfaces.clear();this.edges.clear();}
}

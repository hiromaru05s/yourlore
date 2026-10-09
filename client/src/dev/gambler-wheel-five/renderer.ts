import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {DURATION,clamp,ramp} from './catalog';
import {SolidRegion,motion,regions} from './geometry';
import {wheelTexture,surfaceMaterial} from './material';

type Rig={root:T.Group;pieces:SolidRegion[];face:T.CanvasTexture;wheel:T.CanvasTexture;surface:ReturnType<typeof surfaceMaterial>;body:T.MeshStandardMaterial;back:T.MeshStandardMaterial};
export class Renderer {
 renderer:T.WebGLRenderer;scene=new T.Scene();camera=new T.OrthographicCamera(-3,3,2.269230769,-2.269230769,.1,40);
 rigs=new Map<string,Rig>();environment:T.WebGLRenderTarget;ground:T.Mesh;disposed=false;
 constructor(){
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});this.renderer.setSize(780,590);this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.setClearColor(0,0);
  this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  const pmrem=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.055);this.scene.environment=this.environment.texture;room.dispose();pmrem.dispose();
  this.camera.position.set(0,0,14);this.camera.lookAt(0,0,0);
  this.scene.add(new T.HemisphereLight(0xfff0d6,0x34334b,.7));
  const key=new T.DirectionalLight(0xffedd2,2.4);key.position.set(-3,4,7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;key.shadow.camera.near=.1;key.shadow.camera.far=20;key.shadow.bias=-.0002;key.shadow.normalBias=.009;key.shadow.radius=3;this.scene.add(key);
  const fill=new T.DirectionalLight(0xa3c1e2,1.1);fill.position.set(4,-2,4);this.scene.add(fill);
  this.ground=new T.Mesh(new T.PlaneGeometry(12,10),new T.ShadowMaterial({opacity:.29}));this.ground.position.z=-.09;this.ground.receiveShadow=true;this.scene.add(this.ground);
 }
 private rig(face:HTMLCanvasElement,style:number,legend:boolean){
  const id=`${style}:${legend}`;const found=this.rigs.get(id);if(found)return found;
  const texture=new T.CanvasTexture(face);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
  const wheel=wheelTexture(style,legend),surface=surfaceMaterial(texture,wheel,legend);
  const body=new T.MeshStandardMaterial({color:style===1?0xb0a085:style===4?0x34303e:legend?0xc5a260:0xa48551,metalness:style===1?.5:.83,roughness:style===2?.19:.3,envMapIntensity:1.05,side:T.DoubleSide});
  const back=new T.MeshStandardMaterial({map:wheel,color:0x806d55,metalness:.68,roughness:.4,envMapIntensity:.6});
  const root=new T.Group();const pieces=regions(style).map(region=>new SolidRegion(region,surface.material,body,back));pieces.forEach(p=>root.add(p.mesh));this.scene.add(root);
  const result={root,pieces,face:texture,wheel,surface,body,back};this.rigs.set(id,result);return result;
 }
 draw(canvas:HTMLCanvasElement,face:HTMLCanvasElement,style:number,ms:number,legend=false,reduced=false,transparent=false,dark=false){
  if(this.disposed)return;style=Math.max(0,Math.min(4,style));const rig=this.rig(face,style,legend);for(const r of this.rigs.values())r.root.visible=r===rig;
  const t=clamp(ms/DURATION),f={...motion(style,t,reduced),legend};rig.pieces.forEach(p=>p.update(f));
  rig.surface.uniforms.material.value=reduced?0:ramp(t,.055,.30)*(1-ramp(t,.77,.98));
  const formed=f.morph,anticipation=ramp(t,0,.1)*(1-ramp(t,.1,.26));
  rig.root.position.set(0,.025*formed,.018+formed*.29-anticipation*.01);
  rig.root.rotation.set(-.32*formed,.14*formed,0);
  if(style===0){rig.root.position.z+=.10*Math.sin(Math.PI*ramp(t,.04,.44))*(1-ramp(t,.65,.95));rig.root.rotation.x=-.42*formed;}
  if(style===1){rig.root.rotation.x=-.36*formed;rig.root.rotation.y=-.25*formed;}
  if(style===2){rig.root.rotation.x=-.24*formed;rig.root.rotation.y=Math.sin(t*6)*.15*formed;}
  if(style===3){rig.root.rotation.x=-.48*formed;rig.root.rotation.y=-.2*formed;}
  if(style===4){rig.root.rotation.x=reduced?0:Math.PI*2*ramp(t,.33,.73);rig.root.rotation.y=-.25*formed;rig.root.position.z+=.26*formed;rig.pieces[0].mesh.rotation.z=.16*formed;}
  const contact=reduced?0:ramp(t,.86,.91)*(1-ramp(t,.91,1));rig.root.scale.set(1+.008*contact,1-.012*contact,1);
  this.renderer.render(this.scene,this.camera);
  if(canvas.width!==780||canvas.height!==590){canvas.width=780;canvas.height=590}const c=canvas.getContext('2d')!;c.clearRect(0,0,780,590);
  if(!transparent){const bg=c.createRadialGradient(390,240,20,390,290,460);bg.addColorStop(0,dark?'#2a2831':'#fffdf8');bg.addColorStop(1,dark?'#14141a':'#d9d1c4');c.fillStyle=bg;c.fillRect(0,0,780,590)}
  c.drawImage(this.renderer.domElement,0,0);
 }
 get stats(){return {rigs:this.rigs.size,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,drawCalls:this.renderer.info.render.calls}}
 dispose(){if(this.disposed)return;this.disposed=true;for(const r of this.rigs.values()){r.pieces.forEach(p=>p.dispose());r.face.dispose();r.wheel.dispose();r.surface.material.dispose();r.body.dispose();r.back.dispose()}this.rigs.clear();this.ground.geometry.dispose();(this.ground.material as T.Material).dispose();this.environment.dispose();this.renderer.dispose();this.renderer.forceContextLoss()}
}

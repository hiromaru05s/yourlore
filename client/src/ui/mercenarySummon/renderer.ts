import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {contactDust} from './contactDust';
import {summonSurface} from './summonSurface';
import {DURATION,designs,ease,motion} from './catalog';
type C=CanvasRenderingContext2D;export type View='oblique'|'top'|'side';
const NX=32,NY=48;
export class Renderer{
 tier=2;view:View='oblique';private disposed=false;
 private gl:T.WebGLRenderer;private scene=new T.Scene();private cam=new T.OrthographicCamera(-235,235,285,-285,.1,2400);private boardCam=new T.Camera();
 private surface=summonSurface();private card=new T.Mesh(new T.PlaneGeometry(223.2,313.2,NX,NY),this.surface.mat);
 private shade=new T.Mesh(new T.PlaneGeometry(255,345),new T.MeshBasicMaterial({transparent:true,depthWrite:false}));
 private contactShadow=new T.Mesh(new T.PlaneGeometry(223,310),new T.MeshBasicMaterial({transparent:true,depthWrite:false}));
 private ground=new T.Mesh(new T.PlaneGeometry(680,680),contactDust());
 private environment:T.WebGLRenderTarget;private textures=new Map<HTMLCanvasElement,T.CanvasTexture>();
 private table=new T.Mesh(new T.PlaneGeometry(6000,6000),new T.MeshStandardMaterial({color:'#d9d4c7',roughness:1}));
 private sparks=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:'#706352',roughness:.78}),36);private helper=new T.Object3D();
 constructor(){
  this.gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.gl.setPixelRatio(1);this.gl.setSize(470,570,false);this.gl.outputColorSpace=T.SRGBColorSpace;this.gl.toneMapping=T.ACESFilmicToneMapping;this.gl.toneMappingExposure=1;
  const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(this.gl);this.environment=pmrem.fromScene(room,.04);this.scene.environment=this.environment.texture;room.dispose();pmrem.dispose();
  this.scene.add(new T.HemisphereLight('#fff5e4','#1b2636',.9));const key=new T.DirectionalLight('#fff0d5',1.9);key.position.set(-130,120,320);this.scene.add(key);const fill=new T.DirectionalLight('#b9cdeb',.7);fill.position.set(200,-120,130);this.scene.add(fill);
  const sh=document.createElement('canvas');sh.width=256;sh.height=350;const sx=sh.getContext('2d')!;sx.filter='blur(12px)';sx.fillStyle='#14110e';sx.fillRect(38,42,180,265);this.shade.material.map=new T.CanvasTexture(sh);this.shade.position.z=.04;
  const near=document.createElement('canvas');near.width=256;near.height=350;const nc=near.getContext('2d')!;nc.filter='blur(3px)';nc.fillStyle='#171613';nc.beginPath();nc.roundRect(26,25,204,300,10);nc.fill();this.contactShadow.material.map=new T.CanvasTexture(near);this.contactShadow.position.z=.06;
  this.ground.position.z=.12;this.table.position.z=-.1;
  this.sparks.frustumCulled=false;this.card.frustumCulled=false;this.scene.add(this.card,this.shade,this.contactShadow,this.ground,this.table,this.sparks);
 }
 private prepare(face:HTMLCanvasElement,v:number,t:number,reduced:boolean){
  let tex=this.textures.get(face);if(!tex){tex=new T.CanvasTexture(face);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;this.textures.set(face,tex);}if(this.surface.mat.map!==tex){this.surface.mat.map=tex;this.surface.mat.needsUpdate=true;}
  const hit=designs[v].hit,h=reduced?0:motion(v,t).lift*180,live=!reduced&&(v===1?t>=0:t>0)&&t<DURATION;
  const progress=ease(220,hit+80,t),cover=(v===1?1:ease(0,260,t))*(1-ease(hit-90,hit+200,t));
  this.surface.uniforms.phase.value=progress;this.surface.uniforms.mode.value=v;this.surface.uniforms.rank.value=this.tier;this.surface.uniforms.strength.value=live?cover:0;
  this.card.position.set(0,0,h+.7);this.shade.scale.set(1+h*.002,1+h*.002,1);this.shade.material.opacity=.20*ease(0,24,h);this.contactShadow.material.opacity=.3*(1-ease(0,25,h));
  // Deformation is the captured face itself. Its border remains on a single plane at contact.
  const a=this.card.geometry.attributes.position,amount=live?ease(100,430,t)*(1-ease(hit-380,hit-30,t)):0;
  for(let yy=0;yy<=NY;yy++)for(let xx=0;xx<=NX;xx++){
   const x=(xx/NX-.5)*223.2,y=(.5-yy/NY)*313.2,u=x/180,q=y/270;
   const edge=Math.max(0,1-(Math.abs(u)*2)**8)*Math.max(0,1-(Math.abs(q)*2)**8);
   let dz=0,dx=0;
   
   dz=(Math.sin(u*17+q*11+t*.003)+1)*1.4;
   a.setXYZ(yy*(NX+1)+xx,x+dx*edge*amount,y,dz*edge*amount);
  }a.needsUpdate=true;this.card.geometry.computeVertexNormals();
  const age=(t-hit)/1000;this.ground.visible=live&&age>0&&age<1.8;
  if(this.ground.visible){this.ground.material.uniforms.age.value=age;this.ground.material.uniforms.kind.value=[4,1,0,3,2,0][v];this.ground.material.uniforms.opacity.value=[.60,.77,.28,.35,.66,.22][v]*(.70+this.tier*.15);}
  this.sparks.count=0;
  if(live&&age>0&&age<1.1&&(v===0||v===1||v===4)){
   const count=12+this.tier*6;for(let i=0;i<count;i++){
    const seed=(Math.sin(i*51.71)*4173.31)%1,r=Math.abs(seed),s=i%2?1:-1,edge=i%4,a=Math.max(0,age-r*.025),go=1-Math.exp(-a*4.8),distance=go*(13+r*30),z=Math.max(0,(32+r*48)*a-180*a*a);
    this.helper.position.set(edge<2?s*(89+distance):(r-.5)*170,edge<2?(r-.5)*258:s*(134+distance),z+.6);
    this.helper.rotation.set(i+a*5,i*.8+a*3,i*.3+a*4);const size=(v===4?1.6:1)*(1-ease(.4,1.05,age));this.helper.scale.set(size*(1+r*2),size*(.4+r),size*.32);this.helper.updateMatrix();this.sparks.setMatrixAt(i,this.helper.matrix);
   }this.sparks.count=count;this.sparks.instanceMatrix.needsUpdate=true;
  }
 }
 draw(c:C,face:HTMLCanvasElement,v:number,t:number,x:number,y:number,w:number,reduced=false){
  if(this.disposed)return;this.prepare(face,v,t,reduced);this.table.visible=false;const cam=this.cam;cam.up.set(0,0,1);
  if(this.view==='top'){cam.up.set(0,1,0);cam.position.set(0,0,1000);}else if(this.view==='side')cam.position.set(220,-950,320);else cam.position.set(120,-750,920);cam.lookAt(0,0,18);cam.updateMatrixWorld();
  if(this.gl.domElement.width!==470||this.gl.domElement.height!==570)this.gl.setSize(470,570,false);this.gl.render(this.scene,cam);c.drawImage(this.gl.domElement,x-w*235/180,y-w*285/180,w*470/180,w*570/180);
 }
 drawBoard(c:C,face:HTMLCanvasElement,v:number,t:number,matrix:DOMMatrix,width:number,height:number,reduced=false){
  if(this.disposed)return;this.prepare(face,v,t,reduced);this.table.visible=false;if(this.gl.domElement.width!==width||this.gl.domElement.height!==height)this.gl.setSize(width,height,false);
  const screen=new T.Matrix4().set(2/width,0,0,-1,0,-2/height,0,1,0,0,-1/2000,0,0,0,0,1);this.boardCam.projectionMatrix.copy(screen.multiply(new T.Matrix4().fromArray(Array.from(matrix.toFloat64Array()))));this.boardCam.projectionMatrixInverse.copy(this.boardCam.projectionMatrix).invert();this.boardCam.updateMatrixWorld();this.gl.render(this.scene,this.boardCam);c.drawImage(this.gl.domElement,0,0,width,height);
 }
 releaseFace(face:HTMLCanvasElement){this.textures.get(face)?.dispose();this.textures.delete(face);}
 get status(){return{renderer:'card-surface-material',contexts:1,textures:this.textures.size,sheets:0,links:0,disposed:this.disposed};}
 dispose(){if(this.disposed)return;this.disposed=true;this.scene.traverse(o=>{const m=o as T.Mesh;if(m.geometry)m.geometry.dispose();});this.surface.mat.dispose();this.textures.forEach(t=>t.dispose());this.shade.material.map?.dispose();this.contactShadow.material.map?.dispose();[this.shade.material,this.contactShadow.material,this.ground.material,this.table.material,this.sparks.material].forEach(m=>m.dispose());this.environment.dispose();this.gl.dispose();this.gl.forceContextLoss();}
}

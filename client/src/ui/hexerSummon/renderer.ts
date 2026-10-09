import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {motion,ease,type Id} from './catalog';
import {ArcaneStudies} from './arcane';
type C=CanvasRenderingContext2D;
/** All six mechanisms use the same card, board normal and contact clock. */
export class Renderer{
 private gl:T.WebGLRenderer;private scene=new T.Scene();private camera=new T.OrthographicCamera(-245,245,290,-290,.1,2000);private boardCamera=new T.Camera();private studies=new ArcaneStudies();
 private faceMat=new T.MeshBasicMaterial({transparent:true,alphaTest:.02,side:T.DoubleSide,toneMapped:false});private face=new T.Mesh(new T.PlaneGeometry(223.2,313.2),this.faceMat);
 private body=new T.Mesh(new T.BoxGeometry(178,268,1.6),new T.MeshStandardMaterial({color:0x393035,roughness:.65,metalness:.3}));
 private shadowMat=new T.MeshBasicMaterial({transparent:true,depthWrite:false});private shadow=new T.Mesh(new T.PlaneGeometry(242,332),this.shadowMat);
 private receiver=new T.Mesh(new T.PlaneGeometry(176,266),new T.ShadowMaterial({opacity:.36,transparent:true,depthWrite:false}));
 private faceCache=new Map<HTMLCanvasElement,T.Texture>();private disposed=false;private environment:T.WebGLRenderTarget;
 constructor(){
 this.gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.gl.setSize(600,700,false);this.gl.setClearColor(0,0);this.gl.outputColorSpace=T.SRGBColorSpace;this.gl.toneMapping=T.ACESFilmicToneMapping;this.gl.toneMappingExposure=1.05;
 const pmrem=new T.PMREMGenerator(this.gl),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.035);this.scene.environment=this.environment.texture;room.dispose();pmrem.dispose();this.scene.environmentIntensity=.78;
 this.scene.add(new T.HemisphereLight(0xe8dced,0x342435,1.55));const key=new T.DirectionalLight(0xffe3d2,2.8);key.position.set(-125,190,330);key.castShadow=true;Object.assign(key.shadow.camera,{left:-200,right:200,top:240,bottom:-240,near:1,far:700});key.shadow.mapSize.set(256,256);key.shadow.bias=-.001;key.shadow.normalBias=.1;this.scene.add(key);const rim=new T.DirectionalLight(0xc795e7,1.5);rim.position.set(180,20,130);this.scene.add(rim);
 this.gl.shadowMap.enabled=true;this.gl.shadowMap.type=T.PCFShadowMap;this.receiver.receiveShadow=true;this.scene.add(this.face,this.body,this.shadow,this.receiver,this.studies.group);
 const c=document.createElement('canvas');c.width=256;c.height=356;let x=c.getContext('2d')!;x.filter='blur(14px)';x.fillStyle='#110b19';x.fillRect(39,37,180,280);this.shadowMat.map=new T.CanvasTexture(c);this.shadow.position.z=.1;
 }
 private prepare(face:HTMLCanvasElement,id:Id,v:number,ms:number,reduced:boolean){
 const m=motion(id,ms,reduced),{t,level,height}=m;let tex=this.faceCache.get(face);if(!tex){tex=new T.CanvasTexture(face);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;this.faceCache.set(face,tex);if(this.faceCache.size>10){const oldest=this.faceCache.keys().next().value!;this.faceCache.get(oldest)!.dispose();this.faceCache.delete(oldest);}}
 if(this.faceMat.map!==tex){this.faceMat.map=tex;this.faceMat.needsUpdate=true;}this.face.position.z=height+2;this.body.position.z=height+.8;this.receiver.position.z=height+2.1;
 this.shadow.scale.set(1+height*.003,1+height*.002,1);this.shadowMat.opacity=.35-height*.003;this.receiver.visible=!reduced&&t>.05&&t<.94;
 this.studies.draw(v,reduced?1:t,height,level,tex);
 // A fracture opens the mapped face, while the dark substrate remains behind it.
 this.faceMat.opacity=v===3&&!reduced?1-(.22+.78*ease(0,.35,t))*(1-ease(.63,.81,t))*.88:1;
 }
 draw(c:C,face:HTMLCanvasElement,id:Id,v:number,ms:number,w:number,h:number,reduced=false,angle='oblique'){
 if(this.disposed)return;this.gl.shadowMap.enabled=true;this.prepare(face,id,v,ms,reduced);const rw=Math.min(600,Math.ceil(w/32)*32),rh=Math.min(700,Math.ceil(h/32)*32);if(this.gl.domElement.width!==rw||this.gl.domElement.height!==rh)this.gl.setSize(rw,rh,false);
 const aspect=w/h;this.camera.left=-207*aspect;this.camera.right=207*aspect;this.camera.top=207;this.camera.bottom=-207;this.camera.up.set(0,0,1);
 if(angle==='top'){this.camera.up.set(0,1,0);this.camera.position.set(0,0,900);}else if(angle==='side')this.camera.position.set(110,-900,360);else this.camera.position.set(90,-800,1000);
 this.camera.lookAt(0,0,22);this.camera.updateProjectionMatrix();this.gl.render(this.scene,this.camera);c.drawImage(this.gl.domElement,0,0,w,h);
 }
 drawBatch(items:{canvas:HTMLCanvasElement;v:number}[],face:HTMLCanvasElement,id:Id,ms:number,reduced:boolean,angle:string){
 if(this.disposed||!items.length)return;this.gl.shadowMap.enabled=false;const tw=320,th=370,cols=3,rows=Math.ceil(items.length/cols),aw=tw*cols,ah=th*rows;
 if(this.gl.domElement.width!==aw||this.gl.domElement.height!==ah)this.gl.setSize(aw,ah,false);
 this.gl.setScissorTest(true);
 for(let i=0;i<items.length;i++){const item=items[i];this.prepare(face,id,item.v,ms,reduced);this.receiver.visible=false;const aspect=item.canvas.width/item.canvas.height;this.camera.left=-207*aspect;this.camera.right=207*aspect;this.camera.top=207;this.camera.bottom=-207;this.camera.up.set(0,0,1);if(angle==='top'){this.camera.up.set(0,1,0);this.camera.position.set(0,0,900);}else if(angle==='side')this.camera.position.set(110,-900,360);else this.camera.position.set(90,-800,1000);this.camera.lookAt(0,0,22);this.camera.updateProjectionMatrix();const x=i%cols*tw,y=(rows-1-Math.floor(i/cols))*th;this.gl.setViewport(x,y,tw,th);this.gl.setScissor(x,y,tw,th);this.gl.render(this.scene,this.camera);}
 this.gl.setScissorTest(false);this.gl.setViewport(0,0,aw,ah);
 const copy=this.atlas;if(copy.width!==aw||copy.height!==ah){copy.width=aw;copy.height=ah;}const cx=copy.getContext('2d')!;cx.clearRect(0,0,aw,ah);cx.drawImage(this.gl.domElement,0,0);
 items.forEach((item,i)=>{const c=item.canvas,x=c.getContext('2d')!;x.clearRect(0,0,c.width,c.height);x.drawImage(copy,i%cols*tw,Math.floor(i/cols)*th,tw,th,0,0,c.width,c.height);});
 }
 private atlas=document.createElement('canvas');
 drawBoard(c:C,face:HTMLCanvasElement,id:Id,v:number,ms:number,matrix:DOMMatrix,w:number,h:number,reduced=false){
 if(this.disposed)return;this.gl.shadowMap.enabled=true;this.prepare(face,id,v,ms,reduced);if(this.gl.domElement.width!==w||this.gl.domElement.height!==h)this.gl.setSize(w,h,false);const screen=new T.Matrix4().set(2/w,0,0,-1,0,-2/h,0,1,0,0,-1/2000,0,0,0,0,1);this.boardCamera.projectionMatrix.copy(screen.multiply(new T.Matrix4().fromArray(Array.from(matrix.toFloat64Array()))));this.boardCamera.projectionMatrixInverse.copy(this.boardCamera.projectionMatrix).invert();this.gl.render(this.scene,this.boardCamera);c.drawImage(this.gl.domElement,0,0,w,h);
 }
 releaseFace(face:HTMLCanvasElement){const tex=this.faceCache.get(face);if(tex){tex.dispose();this.faceCache.delete(face);}}
 get status(){return {revision:2,disposed:this.disposed,geometries:this.gl.info.memory.geometries,textures:this.gl.info.memory.textures,faces:this.faceCache.size};}
 dispose(){if(this.disposed)return;this.disposed=true;this.studies.dispose();this.face.geometry.dispose();this.body.geometry.dispose();this.shadow.geometry.dispose();this.receiver.geometry.dispose();this.faceMat.dispose();this.body.material.dispose();this.receiver.material.dispose();this.shadowMat.map?.dispose();this.shadowMat.dispose();this.faceCache.forEach(t=>t.dispose());this.environment.dispose();this.gl.dispose();this.gl.forceContextLoss();}
}

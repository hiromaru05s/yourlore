import * as T from 'three';
import {OrganicStudies} from './organicStudies';
import {Renderer as ApprovedHalf} from './renderer';
import {ease,CONTACT,type Id} from './richCatalog';
type C=CanvasRenderingContext2D;
export type View='oblique'|'side'|'top';
/** Local X/Y lie on the board. Z is height; the underside is z=height. */
export function physics(ms:number){const release=1720,duration=CONTACT-release,u=Math.max(0,Math.min(1,(ms-release)/duration));const height=ms<=0||ms>=CONTACT?0:76*ease(0,400,ms)*(1-u*u);return {height,velocity:ms>release&&ms<CONTACT?-152*u/duration:0,release,contact:CONTACT,underside:height,face:height+1.8};}

export class StudyRenderer{
 private gl:T.WebGLRenderer;private scene=new T.Scene();private camera=new T.OrthographicCamera(-300,300,400,-400,.1,2000);

 private cardMat=new T.MeshBasicMaterial({transparent:true,alphaTest:.01,side:T.DoubleSide,toneMapped:false});private card=new T.Mesh(new T.PlaneGeometry(223.2,323.2),this.cardMat);
 private textures=new Map<HTMLCanvasElement,T.CanvasTexture>();private half:ApprovedHalf|null=null;private disposed=false;
 private body=new T.Mesh(new T.BoxGeometry(180,280,1.8),new T.MeshStandardMaterial({color:0x50472f,roughness:.79}));
 private shadowMat=new T.MeshBasicMaterial({transparent:true,depthWrite:false});private shadow=new T.Mesh(new T.PlaneGeometry(260,360),this.shadowMat);
 private table=new T.Group();private previewCamera=new T.OrthographicCamera(-300,300,400,-400,.1,2200);
 private studies=new OrganicStudies();private faceShadow=new T.Mesh(new T.PlaneGeometry(180,280),new T.ShadowMaterial({opacity:.26,transparent:true,depthWrite:false}));
 private glow=new T.PointLight(0xbacb80,0,340,1.3);
 constructor(){this.gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,premultipliedAlpha:true,powerPreference:'high-performance'});this.gl.setSize(600,800,false);this.gl.setPixelRatio(1);this.gl.setClearColor(0,0);this.gl.outputColorSpace=T.SRGBColorSpace;this.gl.toneMapping=T.ACESFilmicToneMapping;this.gl.toneMappingExposure=1.08;this.gl.shadowMap.enabled=false;this.gl.shadowMap.type=T.PCFShadowMap;this.camera.position.set(0,0,900);this.camera.lookAt(0,0,0);
  this.scene.add(new T.AmbientLight(0xffffff,.75));this.scene.add(new T.HemisphereLight(0xf4f2dc,0x273226,2.1));const key=new T.DirectionalLight(0xfff7dc,2.7);key.position.set(-180,300,360);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-300,right:300,top:400,bottom:-250,near:1,far:1100});key.shadow.bias=-.002;key.shadow.normalBias=.12;key.shadow.radius=2;this.scene.add(key);const fill=new T.DirectionalLight(0xc4d9d5,.8);fill.position.set(240,60,-100);this.scene.add(fill);
  this.scene.add(this.studies.group,this.card,this.glow,this.body,this.shadow,this.table,this.faceShadow);this.faceShadow.receiveShadow=true;
  const sc=document.createElement('canvas');sc.width=256;sc.height=356;const sx=sc.getContext('2d')!;sx.filter='blur(13px)';sx.fillStyle='#111c14';sx.fillRect(37,37,182,282);this.shadowMat.map=new T.CanvasTexture(sc);this.shadow.position.z=.06;
  const bed=new T.Mesh(new T.BoxGeometry(420,520,7),new T.MeshStandardMaterial({color:0xb9c0aa,roughness:.97}));bed.position.z=-3.5;this.table.add(bed);
  const edge=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(420,520,7)),new T.LineBasicMaterial({color:0x89957c,transparent:true,opacity:.35}));edge.position.z=-3.5;this.table.add(edge);
  // Sparse board seams establish the horizontal plane without decorative rings.
  const lines:number[]=[];for(const x of [-140,140])lines.push(x,-260,.08,x,260,.08);for(const y of [-210,210])lines.push(-210,y,.08,210,y,.08);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(lines,3));this.table.add(new T.LineSegments(geo,new T.LineBasicMaterial({color:0x8f9b82,transparent:true,opacity:.28})));
this.glow.position.set(0,0,95);
 }
 private prepare(face:HTMLCanvasElement,id:Id,v:number,ms:number,reduced:boolean){
  this.studies.group.visible=false;
  let tex=this.textures.get(face);if(!tex){tex=new T.CanvasTexture(face);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;this.textures.set(face,tex);}this.cardMat.map=tex;this.cardMat.needsUpdate=true;
  const active=!reduced&&id!=='VITAL2'&&id!=='VITAL3',h=active?physics(ms).height:0;
  this.gl.shadowMap.enabled=active&&ms>0&&ms<3850&&id!=='HALF_ELF';this.faceShadow.visible=this.gl.shadowMap.enabled;this.faceShadow.position.set(0,0,h+1.92);
  this.card.position.set(0,0,h+1.86);this.card.rotation.set(0,0,0);this.body.position.set(0,0,h+.9);
  this.shadow.scale.set(1+h*.0023,1+h*.0019,1);this.shadowMat.opacity=.26-h*.0015;this.shadow.visible=true;
  if(active&&id!=='HALF_ELF'){this.studies.draw(id,v,ms,h);}
  this.glow.intensity=active?ease(300,800,ms)*(1-ease(1450,2050,ms))*.22:0;this.glow.position.set(0,0,h+55);
 }
 draw(c:C,face:HTMLCanvasElement,id:Id,v:number,ms:number,x:number,y:number,w:number,reduced=false,view:View='oblique'){
  if(this.disposed)return;
  // Approved Half Elf remains an unchanged reference; the five rich studies use the new physical scene.
  if(id==='HALF_ELF'){this.half??=new ApprovedHalf();this.half.draw(c,face,id,0,ms,x,y,w,reduced);return;}
  this.prepare(face,id,v,ms,reduced);this.table.visible=true;
  this.gl.setSize(600,800,false);const cam=this.previewCamera;
  cam.up.set(0,0,1);if(view==='side')cam.position.set(420,-900,260);else if(view==='top'){cam.up.set(0,1,0);cam.position.set(0,0,1000);}else cam.position.set(230,-970,650);cam.lookAt(0,0,25);cam.updateMatrixWorld();
  this.gl.render(this.scene,cam);c.drawImage(this.gl.domElement,x-w*300/180,y-w*400/180,w*600/180,w*800/180);
 }
 /** Project the 3D scene with exactly the DOM board matrix. Height is projected once, along board normal. */
 drawBoard(c:C,face:HTMLCanvasElement,id:Id,v:number,ms:number,matrix:DOMMatrix,width:number,height:number,reduced=false){
  if(this.disposed)return;this.prepare(face,id,v,ms,reduced);this.table.visible=false;this.gl.setSize(width,height,false);
  const screen=new T.Matrix4().set(2/width,0,0,-1,0,-2/height,0,1,0,0,-1/2000,0,0,0,0,1);
  this.camera.position.set(0,0,0);this.camera.rotation.set(0,0,0);this.camera.updateMatrixWorld();this.camera.projectionMatrix.copy(screen.multiply(new T.Matrix4().fromArray(Array.from(matrix.toFloat64Array()))));this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
  this.gl.render(this.scene,this.camera);c.drawImage(this.gl.domElement,0,0,width,height);
 }
 get status(){return{renderer:'webgl-physical',disposed:this.disposed,textures:this.textures.size,geometries:160,physics:'board-normal / back-face contact'};}
 dispose(){if(this.disposed)return;this.disposed=true;this.half?.dispose();this.studies.dispose();this.faceShadow.geometry.dispose();this.faceShadow.material.dispose();this.textures.forEach(t=>t.dispose());this.card.geometry.dispose();this.cardMat.dispose();this.body.geometry.dispose();this.body.material.dispose();this.shadow.geometry.dispose();this.shadowMat.map?.dispose();this.shadowMat.dispose();this.table.traverse(o=>{const m=o as T.Mesh;if(m.geometry)m.geometry.dispose();if(m.material)(m.material as T.Material).dispose();});this.gl.dispose();this.gl.forceContextLoss();}
}

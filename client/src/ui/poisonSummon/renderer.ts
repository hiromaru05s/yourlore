import {createWebGLRenderer} from '../webglRenderer';
import * as T from 'three';
import type {CardId} from './selection';
import {cardHeight} from './selection';
import {createEmergence} from './emergence';
type C=CanvasRenderingContext2D;
type Study={face:CanvasImageSource;root:T.Group;shadow:T.Mesh;contact:T.Mesh;floor:T.Mesh;effect:ReturnType<typeof createEmergence>};
let renderer:T.WebGLRenderer|undefined,scene:T.Scene,camera:T.OrthographicCamera,ground:T.Mesh;
let faceSerial=0;const faceKeys=new WeakMap<object,number>();
const studies=new Map<string,Study>(),faces=new Map<CanvasImageSource,T.Texture>();
const trackedGeometries=new Set<T.BufferGeometry>(),trackedMaterials=new Set<T.Material>(),trackedTextures=new Set<T.Texture>();
let angle:'oblique'|'side'|'top'='oblique';
export function setCameraAngle(v:typeof angle){angle=v;}
function init(){if(renderer)return;renderer=createWebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
 scene=new T.Scene();camera=new T.OrthographicCamera(-200,200,180,-180,.1,2400);
 scene.add(new T.HemisphereLight('#fff1d5','#293e32',1.5));const key=new T.DirectionalLight('#fff1ce',2.4);key.position.set(-150,300,170);scene.add(key);
 const g=new T.BoxGeometry(265,4,289),m=new T.MeshStandardMaterial({color:'#242d29',roughness:.96});trackedGeometries.add(g);trackedMaterials.add(m);ground=new T.Mesh(g,m);ground.position.y=-5;scene.add(ground);
}
function shadow(w:number,h:number,opacity:number,y:number){const g=new T.PlaneGeometry(w,h),m=new T.MeshBasicMaterial({color:'#172119',transparent:true,opacity,depthWrite:false});trackedGeometries.add(g);trackedMaterials.add(m);const o=new T.Mesh(g,m);o.rotation.x=-Math.PI/2;o.position.y=y;scene.add(o);return o;}
function get(face:CanvasImageSource,id:CardId,v:number){init();if(!faceKeys.has(face))faceKeys.set(face,++faceSerial);const key=id+v+':'+faceKeys.get(face);let s=studies.get(key);if(s)return s;let tex=faces.get(face);if(!tex){tex=new T.CanvasTexture(face as HTMLCanvasElement);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;faces.set(face,tex);trackedTextures.add(tex);}
 const effect=createEmergence(tex,id,v);trackedGeometries.add(effect.geometry);trackedMaterials.add(effect.material);
 const root=new T.Group();root.add(effect.mesh);scene.add(root);
 s={face,root,effect,shadow:shadow(150,232,.23,-.9),contact:shadow(144,224,.2,-.8),floor:ground};studies.set(key,s);return s;
}
function show(s:Study,t:number,reduced:boolean,board=false){studies.forEach(x=>{x.root.visible=false;x.shadow.visible=false;x.contact.visible=false;});s.root.visible=true;s.effect.update(t,reduced);const h=cardHeight(t,reduced);s.root.position.y=h;s.shadow.visible=true;s.contact.visible=true;s.shadow.scale.set(1+h*.003,1+h*.003,1);(s.shadow.material as T.MeshBasicMaterial).opacity=.24/(1+h*.04);(s.contact.material as T.MeshBasicMaterial).opacity=.17*(1-h/62);s.floor.visible=!board;}
function normalCamera(width:number,height:number){(ground.material as T.MeshStandardMaterial).color.set(document.body.classList.contains('light')?'#ccc9bc':'#242d29');const aspect=width/height;camera.left=-190*aspect;camera.right=190*aspect;camera.top=190;camera.bottom=-190;camera.near=.1;camera.far=2400;camera.up.set(0,1,0);if(angle==='side')camera.position.set(340,180,420);else if(angle==='top'){camera.position.set(0,720,.01);}else camera.position.set(270,420,430);camera.lookAt(0,7,0);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();}
export function render(c:C,face:CanvasImageSource,id:CardId,v:number,t:number,width=480,height=440,reduced=false){const s=get(face,id,v);show(s,t,reduced);normalCamera(width,height);renderer!.setSize(width,height,false);renderer!.render(scene,camera);c.clearRect(0,0,width,height);c.drawImage(renderer!.domElement,0,0);}
/** Exact CSS perspective projection. World X,Z lie on the card; world Y is height. */
export function boardProjection(matrix:DOMMatrix,width:number,height:number){const css=new T.Matrix4().fromArray(matrix.toFloat64Array());const swap=new T.Matrix4().set(1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,0,1);const clip=new T.Matrix4().set(2/width,0,0,-1, 0,-2/height,0,1, 0,0,-1/5000,0, 0,0,0,1);return clip.multiply(css).multiply(swap);}
export function renderBoard(c:C,face:CanvasImageSource,id:CardId,v:number,t:number,matrix:DOMMatrix,width:number,height:number,reduced=false){const s=get(face,id,v);show(s,t,reduced,true);camera.position.set(0,900,292);camera.up.set(0,1,0);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);camera.projectionMatrix.copy(boardProjection(matrix,width,height)).multiply(camera.matrixWorld);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();renderer!.setSize(width,height,false);renderer!.render(scene,camera);c.drawImage(renderer!.domElement,0,0);}
export function disposeRenderer(){studies.clear();faces.clear();trackedGeometries.forEach(g=>g.dispose());trackedMaterials.forEach(m=>m.dispose());trackedTextures.forEach(t=>t.dispose());trackedGeometries.clear();trackedMaterials.clear();trackedTextures.clear();renderer?.dispose();renderer?.forceContextLoss();renderer=undefined;}
export function rendererState(){return{studies:studies.size,geometries:trackedGeometries.size,textures:trackedTextures.size,planeNormal:[0,1,0],cardHeight:cardHeight(640),gravity:[0,-1,0]};}

/** Release only this summon; other simultaneous surfaces retain their resources. */
export function releaseFace(face:CanvasImageSource){
 for(const [key,s]of studies){if(s.face!==face)continue;
  for(const mesh of [s.effect.mesh,s.shadow,s.contact]){mesh.geometry.dispose();trackedGeometries.delete(mesh.geometry);const material=mesh.material as T.Material;material.dispose();trackedMaterials.delete(material);}
  scene.remove(s.root,s.shadow,s.contact);studies.delete(key);
 }
 const tex=faces.get(face);if(tex){tex.dispose();trackedTextures.delete(tex);faces.delete(face);}
 if(!studies.size)disposeRenderer();
}

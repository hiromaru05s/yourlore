import {createWebGLRenderer} from '../webglRenderer';
import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {velvet} from './material';
import {DURATION,ramp} from './timing';

/** Selected 02 only. The native card owns its frame, art, text and silhouette. */
export class CasinoRenderer {
 readonly renderer:T.WebGLRenderer;readonly scene=new T.Scene();
 readonly camera=new T.OrthographicCamera(-2.8,2.8,2.8,-2.8,.1,30);
 private environment:T.WebGLRenderTarget;private ground:T.Mesh;
 private body=new T.Group();private resources:Array<{dispose:()=>void}>=[];
 private animate:(t:number)=>void=()=>{};private disposed=false;
 private track<A extends {dispose:()=>void}>(item:A):A{this.resources.push(item);return item;}
 constructor(){
 this.renderer=createWebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});this.renderer.setSize(560,560);this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.setClearColor(0,0);this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.86;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
 this.camera.position.set(0,0,12);this.camera.lookAt(0,0,0);
 const pmrem=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.045);this.scene.environment=this.environment.texture;room.dispose();pmrem.dispose();
 this.scene.add(new T.HemisphereLight(0xfff1d5,0x26334a,.55));const key=new T.DirectionalLight(0xffe6c5,1.8);key.position.set(-3,4,11);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:20});key.shadow.bias=-.0002;key.shadow.normalBias=.012;this.scene.add(key);const fill=new T.DirectionalLight(0xb8d4f5,.7);fill.position.set(4,-2,4);this.scene.add(fill);
 this.ground=new T.Mesh(new T.PlaneGeometry(12,12),new T.ShadowMaterial({opacity:.20}));this.ground.position.z=-.065;this.ground.receiveShadow=true;this.scene.add(this.ground);

 this.scene.add(this.body);
 const texture=this.track(velvet());
 const metal=this.track(new T.MeshStandardMaterial({color:'#bb8c45',metalness:.84,roughness:.26}));
 const clothMat=this.track(new T.MeshPhysicalMaterial({map:texture,color:'#d896a2',roughness:.9,metalness:0,sheen:1,sheenColor:new T.Color('#f08396'),sheenRoughness:.45,side:T.DoubleSide}));
 const sheets=[-1,1].map(sign=>{const geometry=this.track(new T.PlaneGeometry(1.01,2.98,40,60));const mesh=new T.Mesh(geometry,clothMat);mesh.castShadow=true;mesh.receiveShadow=true;this.body.add(mesh);const back=new T.Mesh(geometry,this.track(new T.MeshStandardMaterial({color:'#2a0a18',roughness:.94,side:T.BackSide})));this.body.add(back);const braid=new T.Mesh(this.track(new T.TubeGeometry(new T.LineCurve3(new T.Vector3(),new T.Vector3(0,3,0)),60,.013,5,false)),metal);this.body.add(braid);return{sign,geometry,mesh,back,braid}});
 this.animate=t=>{
  // The card and its frame stay fixed. Only the cloth gathers toward the
  // inner rails, then compresses behind them; no second face crossfade.
  for(const sheet of sheets){
   const a=sheet.geometry.attributes.position;
   for(let i=0;i<a.count;i++){
    const col=i%41,row=Math.floor(i/41),u=col/40,v=row/60,y=1.5-v*3;
    const opening=ramp(t,220+v*180,1500+v*180);
    const tuck=ramp(t,1540+v*130,2290+v*130);
    const gathered=opening*(.64+.31*Math.sin(v*Math.PI));
    const seam=gathered+(1.035-gathered)*tuck,span=1.04-seam;
    const x=sheet.sign*(seam+u*span);
    const fullness=(1-tuck)*Math.min(1,span*3);
    const pleat=Math.sin(u*Math.PI*10)*(.032+.055*opening);
    const billow=.10*Math.sin(u*Math.PI)*Math.sin(opening*Math.PI);
    const z=.065+(pleat+billow+.026*Math.sin(v*8-t*.003)*opening)*fullness;
    a.setXYZ(i,x,y,z);
   }
   a.needsUpdate=true;sheet.geometry.computeVertexNormals();
   sheet.back.position.z=-.012;
   sheet.mesh.visible=sheet.back.visible=sheet.braid.visible=t<2420;
   const b=sheet.braid.geometry.attributes.position;
   for(let j=0;j<=60;j++){
    const k=j*41,radius=.012*(1-ramp(t,1670,2420));
    for(let q=0;q<=5;q++){
     const angle=q/5*Math.PI*2;
     b.setXYZ(j*6+q,a.getX(k)+Math.cos(angle)*radius,a.getY(k),a.getZ(k)+.012+Math.sin(angle)*radius);
    }
   }
   b.needsUpdate=true;sheet.braid.geometry.computeVertexNormals();
  }
 };

 }
 draw(canvas:HTMLCanvasElement,ms:number){
  if(this.disposed||this.renderer.getContext().isContextLost())throw Error('Casino renderer unavailable');
  const t=Math.max(0,Math.min(DURATION,ms));
  this.animate(t);
  this.body.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=t<2150;});
  this.renderer.render(this.scene,this.camera);
  if(canvas.width!==560||canvas.height!==560)canvas.width=canvas.height=560;
  const ctx=canvas.getContext('2d')!;ctx.clearRect(0,0,560,560);ctx.drawImage(this.renderer.domElement,0,0);
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;
  this.resources.forEach(r=>r.dispose());this.environment.dispose();
  this.ground.geometry.dispose();(this.ground.material as T.Material).dispose();
  this.renderer.dispose();this.renderer.forceContextLoss();
 }
}

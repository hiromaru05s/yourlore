import * as T from 'three';
import {ease} from './motion';
import {royalPose,windowAt,type RoyalId} from './motion';
import {RoyalOrnaments} from './royal-ornaments';

const SEGMENTS=64,SIDES=16;
export function tongueSpine(time:number,_index:number,reduced=false,id:RoyalId='MIMIC_KING'){
 const p=royalPose(time,id,reduced),second=id==='MIMIC_KING2';
 const reach=windowAt(time,second?800:1050,second?1170:1450,2290,2630)*ease(0,35,p.gap);
 const curl=ease(1270,1930,time),length=(second?170:132)*reach*(reduced?.58:1),points:T.Vector3[]=[];
 let x=90,y=142+(p.gap-130)*.12,z=10;
 for(let i=0;i<=SEGMENTS;i++){
  const u=i/SEGMENTS;points.push(new T.Vector3(x,-y,z));
  let angle=second?-.35-curl*5.9*u*u:.18+curl*3.5*u*u;
  if(reduced)angle*=.6;
  x+=Math.sin(angle)*length/SEGMENTS;y+=Math.cos(angle)*length/SEGMENTS;z=10+Math.sin(u*Math.PI)*reach*(second?38:28);
 }
 return{points,reach,curl,length};
}

export class RoyalMatter{
 readonly canvas:HTMLCanvasElement;
 private renderer:T.WebGLRenderer;
 private scene=new T.Scene();
 private camera=new T.OrthographicCamera(-125,305,260,-430,.1,1000);
 private meshes:T.Mesh<T.BufferGeometry,T.MeshPhysicalMaterial>[]=[];
 private texture:T.Texture;
 private disposed=false;
 readonly ready:Promise<void>;
 private ornaments:RoyalOrnaments;
 constructor(private id:RoyalId){
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:false});
  this.renderer.setSize(430,690,false);this.renderer.setPixelRatio(2);this.renderer.setClearColor(0,0);
  this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;
  this.canvas=this.renderer.domElement;this.canvas.dataset.dynamicTongues='royal-mesh';
  this.canvas.style.cssText='position:absolute;width:430px;height:690px;left:-125px;top:-260px;z-index:3;pointer-events:none;';
  this.camera.position.z=500;this.scene.add(new T.HemisphereLight(0xffe2c4,0x27121b,2));
  const key=new T.DirectionalLight(0xffdec5,3.2);key.position.set(-100,180,220);this.scene.add(key);
  const fill=new T.DirectionalLight(0x9eadd0,.55);fill.position.set(150,-50,130);this.scene.add(fill);
  this.texture=new T.Texture();
  this.ready=new Promise<void>((resolve,reject)=>{
   new T.TextureLoader().load('/art/vfx/mimic-mouth-r2/01-reference-ivory.png',texture=>{
    if(this.disposed){texture.dispose();resolve();return;}
    this.texture.dispose();this.texture=texture;texture.colorSpace=T.SRGBColorSpace;
    // Reuse only the fleshy central patch of the approved tongue atlas, never its silhouette.
    texture.offset.set(.435,.16);texture.repeat.set(.125,.14);texture.anisotropy=4;
    this.meshes.forEach(m=>{m.material.map=texture;m.material.bumpMap=texture;m.material.needsUpdate=true;});resolve();
   },undefined,reject);
  }).then(()=>this.ornaments.ready).then(()=>{if(!this.disposed){this.draw(1400,100);this.draw(0,0);}});
  for(let j=0;j<1;j++){
   const count=(SEGMENTS+1)*(SIDES+1),geometry=new T.BufferGeometry();
   geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(count*3),3).setUsage(T.DynamicDrawUsage));
   const uv=new Float32Array(count*2),color=new Float32Array(count*3),indices:number[]=[];
   for(let i=0;i<=SEGMENTS;i++)for(let k=0;k<=SIDES;k++){
    const v=i*(SIDES+1)+k,u=i/SEGMENTS;
    uv[v*2]=k/SIDES;uv[v*2+1]=u;
    const shade=.28+.72*ease(0,.18,u);color.set([shade,shade,shade],v*3);
    if(i<SEGMENTS&&k<SIDES){const a=v,b=v+SIDES+1;indices.push(a,b,a+1,b,b+1,a+1);}
   }
   geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.setAttribute('color',new T.BufferAttribute(color,3));geometry.setIndex(indices);
   const material=new T.MeshPhysicalMaterial({color:0xb29b91,roughness:.57,metalness:0,clearcoat:.15,clearcoatRoughness:.4,bumpScale:.25,vertexColors:true,side:T.DoubleSide});
   const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;this.scene.add(mesh);this.meshes.push(mesh);
  }
  this.ornaments=new RoyalOrnaments(this.scene,id);
 }
 draw(time:number,gap:number,reduced=false){
  if(this.disposed)return;
  for(let index=0;index<1;index++){
   const {points,reach}=tongueSpine(time,index,reduced,this.id),mesh=this.meshes[index];mesh.visible=reach>.015&&gap>3;
   if(!mesh.visible)continue;
   const positions=mesh.geometry.getAttribute('position')as T.BufferAttribute;
   const rootShift=0;
   for(let i=0;i<=SEGMENTS;i++){
    const u=i/SEGMENTS,point=points[i];
    const tangent=points[Math.min(SEGMENTS,i+1)].clone().sub(points[Math.max(0,i-1)]).normalize();
    const across=new T.Vector3(-tangent.y,tangent.x,0).normalize();
    const depth=new T.Vector3().crossVectors(tangent,across).normalize();
    const radius=(this.id==='MIMIC_KING2'?19:18)*Math.pow(1-u,.58)*ease(0,.1,u)*Math.min(1,reach*4)+.16;
    for(let k=0;k<=SIDES;k++){
     const angle=k/SIDES*Math.PI*2;
     const ridge=1-.13*Math.exp(-Math.pow(Math.cos(angle)/.2,2));
     const v=point.clone().addScaledVector(across,Math.cos(angle)*radius).addScaledVector(depth,Math.sin(angle)*radius*.47*ridge);
     positions.setXYZ(i*(SIDES+1)+k,v.x,v.y-rootShift,v.z);
    }
   }
   positions.needsUpdate=true;mesh.geometry.computeVertexNormals();
  }
  this.ornaments.draw(time,royalPose(time,this.id,reduced),reduced,tongueSpine(time,0,reduced,this.id).points);this.renderer.render(this.scene,this.camera);
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.ornaments.dispose();this.meshes.forEach(m=>{m.geometry.dispose();m.material.dispose();});this.texture.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.canvas.remove();}
}

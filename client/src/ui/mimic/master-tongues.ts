import * as T from 'three';
import {ease} from './motion';

const SEGMENTS=64,SIDES=16;
export function tongueSpine(time:number,index:number,reduced=false){
 const delay=index*105,reach=ease(960+delay,1280+delay,time)*(1-ease(1670+delay,2030+delay,time));
 const sign=index===0?-1:1;
 const curl=ease(1130+delay,1500+delay,time)*(1-ease(1770+delay,2080+delay,time));
 const length=(index===0?122:110)*reach*(reduced?.58:1);
 const points:T.Vector3[]=[];let x=index===0?81:102,y=index===0?137:142,z=index===0?2:-1;
 for(let i=0;i<=SEGMENTS;i++){
  const u=i/SEGMENTS;
  points.push(new T.Vector3(x,-y,z));
  // Constant arc-length integration makes the flesh bend instead of stretching a picture.
  const wave=reduced?0:Math.sin((time-1050-delay)*.006-u*5.5)*u*.48*reach;
  const angle=sign*(.18+.68*u+curl*3.0*u*u)+wave;
  const dz=(reduced?3:10)*Math.sin(u*Math.PI)*reach;
  x+=Math.sin(angle)*length/SEGMENTS;y+=Math.cos(angle)*length/SEGMENTS;z=dz+(index===0?2:-1);
 }
 return {points,reach,curl,length};
}

export class DynamicTongues{
 readonly canvas:HTMLCanvasElement;
 private renderer:T.WebGLRenderer;
 private scene=new T.Scene();
 private camera=new T.OrthographicCamera(-30,210,60,-340,.1,1000);
 private meshes:T.Mesh<T.BufferGeometry,T.MeshPhysicalMaterial>[]=[];
 private texture:T.Texture;
 private disposed=false;
 readonly ready:Promise<void>;
 constructor(){
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:false});
  this.renderer.setSize(240,400,false);this.renderer.setPixelRatio(2);this.renderer.setClearColor(0,0);
  this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;
  this.canvas=this.renderer.domElement;this.canvas.dataset.dynamicTongues='two-independent-meshes';
  this.canvas.style.cssText='position:absolute;width:240px;height:400px;left:-30px;top:-60px;z-index:3;pointer-events:none;';
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
  }).then(()=>{if(!this.disposed){this.draw(1400,100);this.draw(0,0);}});
  for(let j=0;j<2;j++){
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
 }
 draw(time:number,gap:number,reduced=false){
  if(this.disposed)return;
  for(let index=0;index<2;index++){
   const {points,reach}=tongueSpine(time,index,reduced),mesh=this.meshes[index];mesh.visible=reach>.015&&gap>3;
   if(!mesh.visible)continue;
   const positions=mesh.geometry.getAttribute('position')as T.BufferAttribute;
   const rootShift=(gap-100)*.12;
   for(let i=0;i<=SEGMENTS;i++){
    const u=i/SEGMENTS,point=points[i];
    const tangent=points[Math.min(SEGMENTS,i+1)].clone().sub(points[Math.max(0,i-1)]).normalize();
    const across=new T.Vector3(-tangent.y,tangent.x,0).normalize();
    const depth=new T.Vector3().crossVectors(tangent,across).normalize();
    const radius=(index===0?12.5:11.5)*Math.pow(1-u,.58)*ease(0,.1,u)*Math.min(1,reach*4)+.16;
    for(let k=0;k<=SIDES;k++){
     const angle=k/SIDES*Math.PI*2;
     const ridge=1-.13*Math.exp(-Math.pow(Math.cos(angle)/.2,2));
     const v=point.clone().addScaledVector(across,Math.cos(angle)*radius).addScaledVector(depth,Math.sin(angle)*radius*.47*ridge);
     positions.setXYZ(i*(SIDES+1)+k,v.x,v.y-rootShift,v.z);
    }
   }
   positions.needsUpdate=true;mesh.geometry.computeVertexNormals();
  }
  this.renderer.render(this.scene,this.camera);
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.meshes.forEach(m=>{m.geometry.dispose();m.material.dispose();});this.texture.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.canvas.remove();}
}

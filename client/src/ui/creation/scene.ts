import {createWebGLRenderer} from '../webglRenderer';
import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const NX=48,NY=48;
const phase=(t:number,a:number,b:number)=>Math.max(0,Math.min(1,(t-a)/(b-a)));
const ease=(x:number)=>x*x*(3-2*x);
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
type Sheet={mesh:T.Mesh<T.PlaneGeometry,T.MeshPhysicalMaterial>;back:T.Mesh<T.PlaneGeometry,T.MeshPhysicalMaterial>;rim:T.Mesh<T.PlaneGeometry,T.MeshPhysicalMaterial>;progress:{value:number};kind:{value:number};clock:{value:number};birth:{value:number};tint:{value:T.Color}};
export type CreationLayout={source:DOMRect;grave:DOMRect;rift:DOMRect;width:number;height:number};
/** Selected 01: same 48x48 nacre sheet, physical rim and matched shadow reveal as the approved study. */
export class NacreScene {
 renderer:T.WebGLRenderer;scene=new T.Scene();camera=new T.PerspectiveCamera();environment:T.WebGLRenderTarget;
 faces=new Map<string,T.CanvasTexture>();geometries=new Set<T.BufferGeometry>();materials=new Set<T.Material>();effect=new T.Group();
 source=new T.Group();sheetFace:Sheet;sourcePos=V();gravePos=V();riftPos=V();unit=1;arrivalScale=1;noise:T.DataTexture;
 constructor(face:HTMLCanvasElement,readonly layout:CreationLayout,readonly copy:boolean){
  this.renderer=createWebGLRenderer({alpha:true,antialias:true});this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(layout.width,layout.height);this.renderer.setClearColor(0,0);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  const pm=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pm.fromScene(room,.04);pm.dispose();room.dispose();this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.5;
  const data=new Uint8Array(128*128*4);for(let i=0;i<128*128;i++){const x=i%128,y=Math.floor(i/128),v=128+Math.sin(x*91.1+y*73.7)*17+Math.sin(x*.2+y*.35)*13;data[i*4]=data[i*4+1]=data[i*4+2]=v;data[i*4+3]=255;}this.noise=new T.DataTexture(data,128,128);this.noise.wrapS=this.noise.wrapT=T.RepeatWrapping;this.noise.needsUpdate=true;
  const texture=new T.CanvasTexture(face);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;this.faces.set('face',texture);
  const {width:w,height:h,source,grave,rift}=layout,f=h*2;this.camera.aspect=w/h;this.camera.fov=2*Math.atan(h/(2*f))*180/Math.PI;this.camera.near=f*.25;this.camera.far=f*4;this.camera.position.set(0,f*Math.cos(.30),f*Math.sin(.30));this.camera.lookAt(0,0,0);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
  const project=(r:DOMRect)=>{const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((r.x+r.width/2)/w*2-1,1-(r.y+r.height/2)/h*2),this.camera);return ray.ray.intersectPlane(new T.Plane(V(0,1,0),0),V())!;};
  this.unit=source.width;this.sourcePos.copy(project(source));this.gravePos.copy(project(grave));this.riftPos.copy(project(rift));this.arrivalScale=grave.width/this.unit;
  this.scene.add(this.effect,this.source);const U=this.unit;
  const key=new T.DirectionalLight(0xffefd9,2.2);key.position.set(-5*U,10*U,3*U);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-9*U,right:9*U,top:8*U,bottom:-8*U,near:.1,far:40*U});key.shadow.normalBias=.025*U;key.shadow.bias=-.0002;key.shadow.radius=3;
  const fill=new T.DirectionalLight(0xa3d7f4,.9);fill.position.set(4*U,5*U,-5*U);this.scene.add(key,key.target,fill,new T.HemisphereLight(0xe9e8f2,0x444050,.8));
  const shadow=this.mesh(new T.PlaneGeometry(w*4,h*4),this.mat(new T.ShadowMaterial({opacity:.25})));shadow.rotation.x=-Math.PI/2;shadow.position.y=-.04*U;shadow.castShadow=false;shadow.receiveShadow=true;
  const body=this.mesh(new T.BoxGeometry(1,.029,1.55),this.mat(new T.MeshStandardMaterial({color:0x645961,metalness:.3,roughness:.4})),this.source);body.position.y=.025;
  const faceMesh=this.mesh(new T.PlaneGeometry(1,1.55),this.mat(new T.MeshStandardMaterial({map:texture,color:0xffffff,roughness:.62,metalness:.02,transparent:true})),this.source);faceMesh.rotation.x=-Math.PI/2;faceMesh.position.y=.043;
  this.sheetFace=this.sheet('face');this.sheetFace.mesh.material.metalness=.34;this.sheetFace.mesh.material.roughness=.27;this.sheetFace.tint.value.set('#9ce4d6');
 }
 mat<M extends T.Material>(m:M){this.materials.add(m);return m;}
 mesh<G extends T.BufferGeometry,M extends T.Material>(g:G,m:M,parent:T.Object3D=this.effect){this.geometries.add(g);const mesh=new T.Mesh(g,m);mesh.castShadow=true;mesh.receiveShadow=false;parent.add(mesh);return mesh;}
 sheet(id:string):Sheet{
  const progress={value:0},kind={value:0},clock={value:0},birth={value:0},tint={value:new T.Color('#c3f0db')};
  const createMat=(back=false)=>{const m=this.mat(new T.MeshPhysicalMaterial({map:this.faces.get(id),color:0xffffff,metalness:.2,roughness:.3,clearcoat:1,clearcoatRoughness:.15,side:T.DoubleSide,bumpMap:this.noise,bumpScale:.008}));m.onBeforeCompile=s=>{Object.assign(s.uniforms,{uProgress:progress,uKind:kind,uClock:clock,uBirth:birth,uTint:tint,uBack:{value:back?1:0}});s.vertexShader='varying vec2 vSheetUv;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvSheetUv=uv;');s.fragmentShader='varying vec2 vSheetUv;uniform float uProgress,uKind,uClock,uBirth,uBack;uniform vec3 uTint;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec2 uv=vSheetUv;vec4 face=texture2D(map,uv);float x=uv.x;float wave=sin(uv.y*19.0+x*11.0)*.04+sin(uv.y*37.0-x*7.0)*.018;float boundary=x;float born=smoothstep(boundary,boundary+.12,uProgress*1.16);if(uProgress<.999&&boundary>uProgress*1.16)discard;float edge=1.0-smoothstep(.0,.027,abs(boundary-uProgress*1.16));float veins=pow(max(0.0,sin(uv.y*66.0+sin(uv.x*14.0)*2.0)),32.0)*(.35+.65*pow(sin(uv.x*23.0),2.0));float relief=pow(max(0.0,sin(uv.x*32.0+uv.y*14.0)),44.0);vec3 substrate=mix(vec3(.045,.066,.082),uTint*.5,.65);vec3 color=mix(substrate,face.rgb,smoothstep(.05,.85,born)*smoothstep(.20,.92,uProgress));color=mix(color,substrate,uBack*.62);diffuseColor.rgb*=color;diffuseColor.a*=face.a;`);
  s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>\ntotalEmissiveRadiance+=uTint*(edge*.7+(veins*.2+relief*.1)*uBirth)*(1.0-uBack*.5);`);
  };m.customProgramCacheKey=()=>`creation-sheet-${back}`;return m;};
  const g=new T.PlaneGeometry(1,1,NX,NY),b=g.clone();(g.getAttribute('position') as T.BufferAttribute).setUsage(T.DynamicDrawUsage);(b.getAttribute('position') as T.BufferAttribute).setUsage(T.DynamicDrawUsage);const mesh=this.mesh(g,createMat()),back=this.mesh(b,createMat(true)),rim=this.mesh(new T.PlaneGeometry(1,1,NX*4,1),createMat(true));for(const item of [mesh,back,rim]){const depth=this.mat(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:this.faces.get(id),alphaTest:.1,side:T.DoubleSide}));depth.onBeforeCompile=shader=>{Object.assign(shader.uniforms,{uProgress:progress,uKind:kind});shader.vertexShader='varying vec2 vCreationUv;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvCreationUv=uv;');shader.fragmentShader='varying vec2 vCreationUv;uniform float uProgress,uKind;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
float x=vCreationUv.x;float wave=sin(vCreationUv.y*19.0+x*11.0)*.04+sin(vCreationUv.y*37.0-x*7.0)*.018;float boundary=x;if(uProgress<.999&&boundary>uProgress*1.16)discard;`);};depth.customProgramCacheKey=()=> 'creation-depth';item.customDepthMaterial=depth;}
mesh.frustumCulled=back.frustumCulled= rim.frustumCulled=false;return{mesh,back,rim,progress,kind,clock,birth,tint};
 }
 deform(s:Sheet,f:number,from:T.Vector3,to:T.Vector3,travel:number,final:T.Vector3){
  const pos=s.mesh.geometry.getAttribute('position') as T.BufferAttribute,back=s.back.geometry.getAttribute('position') as T.BufferAttribute;
  const sign=to.x>=from.x?1:-1;const uSize=this.unit,travelEase=ease(travel);
  for(let y=0;y<=NY;y++)for(let x=0;x<=NX;x++){
   const u=x/NX,v=y/NY,k=y*(NX+1)+x,flat=V(to.x+(u-.5)*uSize,to.y+.11*uSize,to.z+(v-.5)*1.55*uSize);let p=flat.clone();
   {const peel=ease(phase(f,0,.86));p.x=mix(from.x+(u-.5)*uSize,flat.x,peel);p.z=mix(from.z+(v-.5)*1.55*uSize,flat.z,peel);const curl=Math.sin(Math.PI*phase(u,Math.max(0,f-.5),Math.min(1,f+.3)));p.y+=(Math.sin(peel*Math.PI)*(.16+.38*curl))*uSize;p.x+=sign*Math.sin(u*Math.PI)*Math.sin(peel*Math.PI)*.14*uSize;}
   if(travel>0){const end=V(final.x+(u-.5)*uSize*this.arrivalScale,final.y+.15*uSize,final.z+(v-.5)*1.55*uSize*this.arrivalScale);p.lerp(end,travelEase);const arc=Math.sin(travelEase*Math.PI);p.y+=arc*.36*uSize;}
   pos.setXYZ(k,p.x,p.y,p.z);back.setXYZ(k,p.x,p.y-.016*uSize,p.z);
  }
  pos.needsUpdate=back.needsUpdate=true;s.mesh.geometry.computeVertexNormals();s.back.geometry.computeVertexNormals();
  const rp=s.rim.geometry.getAttribute('position') as T.BufferAttribute,ru=s.rim.geometry.getAttribute('uv') as T.BufferAttribute;
  for(let i=0;i<=NX*4;i++){let x=0,y=0;if(i<=NX){x=i;}else if(i<=NX*2){x=NX;y=i-NX;}else if(i<=NX*3){x=NX*3-i;y=NY;}else{y=NX*4-i;}const k=y*(NX+1)+x;for(let row=0;row<2;row++){const ri=row*(NX*4+1)+i,p=row?back:pos;rp.setXYZ(ri,p.getX(k),p.getY(k),p.getZ(k));ru.setXY(ri,x/NX,1-y/NY);}}
  rp.needsUpdate=ru.needsUpdate=true;s.rim.geometry.computeVertexNormals();
 } draw(ms:number){
  const U=this.unit,s=this.sheetFace,from=this.sourcePos,sign=from.x>0?-1:1;
  const to=from.clone().add(V(sign*1.55*U,0,.18*U));to.x=Math.max(-this.layout.width*.38,Math.min(this.layout.width*.38,to.x));
  const f=ease(Math.pow(phase(ms,250,1500),.88)),travel=phase(ms,1500,1950);
  s.progress.value=f;s.birth.value=Math.sin(f*Math.PI);s.mesh.visible=s.back.visible=s.rim.visible=ms>=250;
  this.deform(s,f,from,to,travel,this.gravePos);
  // Hold the new face at contact until the authoritative pile is uncovered.
  this.source.visible=this.copy||ms<2180;const exit=this.copy?0:ease(phase(ms,1750,2180));this.source.position.copy(from).lerp(this.riftPos,exit);this.source.position.y+=.08*U+Math.sin(exit*Math.PI)*.18*U;this.source.scale.setScalar(U*mix(1,.04,Math.pow(exit,4)));
  this.renderer.render(this.scene,this.camera);
 }
 dispose(){this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.faces.forEach(t=>t.dispose());this.noise.dispose();this.environment.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}

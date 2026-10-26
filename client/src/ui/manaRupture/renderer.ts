import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {fractureSurface,random,smooth,SIZE,type FragmentSet} from './fragments';
import {fullscreenVertex,volumeVertex,volumeFragment,mergeFragment,blurFragment,outputFragment} from './shaders';
export {SIZE};
export const DURATION=3550;
export interface SurfaceAnchor{x:number;y:number;width:number;height:number}
const quad=new T.PlaneGeometry(2,2);
/** Real perspective geometry, alpha-clipped thick fragments, depth-tested volume light and HDR bloom. */
export class ManaRuptureRenderer{
 private gpu:T.WebGLRenderer;private scene=new T.Scene();private root=new T.Group();
 private camera=new T.PerspectiveCamera(38,1,.02,100);private volumeScene=new T.Scene();private volumeRoot=new T.Group();
 private screenScene=new T.Scene();private screenCamera=new T.Camera();private screen:T.Mesh<T.PlaneGeometry,T.Material>=new T.Mesh(quad,new T.MeshBasicMaterial());
 private sourceTexture:T.CanvasTexture;private crackTexture:T.CanvasTexture;private fracture:FragmentSet;
 private opaque:T.WebGLRenderTarget;private volume:T.WebGLRenderTarget;private hdr:T.WebGLRenderTarget;
 private bloom:{a:T.WebGLRenderTarget;b:T.WebGLRenderTarget}[]=[];
 private volumeMaterial:T.ShaderMaterial;private merge:T.ShaderMaterial;private blur:T.ShaderMaterial;private output:T.ShaderMaterial;
 private original:T.Mesh;private originalMaterial:T.MeshBasicMaterial;
 private seamUniforms={faultMap:{value:null as T.Texture|null},clock:{value:0}};
 private coreLight=new T.PointLight(0x84dfff,0,4,2);private environment:T.WebGLRenderTarget;
 private dimensions={w:0,h:0,d:0};private disposed=false;private specks:T.LineSegments;private speckMaterial:T.LineBasicMaterial;
 private emitters:{piece:FragmentSet['pieces'][number];root:T.Vector3;direction:T.Vector3}[]=[];
 constructor(private source:HTMLCanvasElement,readonly canvas:HTMLCanvasElement){
  this.gpu=new T.WebGLRenderer({canvas,alpha:true,premultipliedAlpha:false,antialias:false,powerPreference:'high-performance'});this.gpu.setClearColor(0x000000,0);this.gpu.outputColorSpace=T.LinearSRGBColorSpace;this.gpu.toneMapping=T.NoToneMapping;
  this.camera.position.set(0,0,6);this.camera.lookAt(0,0,0);
  this.sourceTexture=new T.CanvasTexture(source);this.sourceTexture.colorSpace=T.SRGBColorSpace;this.sourceTexture.minFilter=T.LinearFilter;this.sourceTexture.magFilter=T.LinearFilter;
  this.fracture=fractureSurface(source,this.sourceTexture);this.crackTexture=new T.CanvasTexture(this.fracture.cracks);this.crackTexture.minFilter=T.LinearFilter;this.seamUniforms.faultMap.value=this.crackTexture;
  this.originalMaterial=new T.MeshBasicMaterial({map:this.sourceTexture,alphaTest:.08});
  this.originalMaterial.onBeforeCompile=shader=>{Object.assign(shader.uniforms,this.seamUniforms);shader.fragmentShader='uniform sampler2D faultMap;uniform float clock;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`float f=texture2D(faultMap,vMapUv).r;float reveal=smoothstep(25.+length(vMapUv-.5)*100.,210.+length(vMapUv-.5)*200.,clock);float pressure=smoothstep(280.,1480.,clock);float cut=smoothstep(.98-pressure*.54,1.,f)*reveal;diffuseColor.a*=1.-cut;\n#include <alphatest_fragment>`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float glow=pow(f,1.6)*reveal*(.08+pressure*pressure*3.2);outgoingLight+=vec3(.22,.66,1.)*glow;\n#include <opaque_fragment>`);
  };
  this.original=new T.Mesh(new T.PlaneGeometry(1,1),this.originalMaterial);this.root.add(this.original);
  for(const piece of this.fracture.pieces)this.root.add(piece.node);
  this.scene.add(this.root);this.scene.add(new T.HemisphereLight(0xdaebff,0x132032,1.2));
  const key=new T.DirectionalLight(0xffefdc,1.4);key.position.set(-2,4,5);this.scene.add(key);const rim=new T.DirectionalLight(0x8acfff,.8);rim.position.set(4,-1,1);this.scene.add(rim);
  this.coreLight.position.set(0,0,.2);this.root.add(this.coreLight);
  const pmrem=new T.PMREMGenerator(this.gpu),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.025);this.scene.environment=this.environment.texture;room.dispose();pmrem.dispose();
  this.opaque=this.target();this.opaque.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);this.volume=this.target(false);this.hdr=this.target(false);for(let i=0;i<3;i++)this.bloom.push({a:this.target(false),b:this.target(false)});
  const roots=Array.from({length:6},()=>new T.Vector3()),directions=Array.from({length:6},()=>new T.Vector3(0,0,1));
  this.emitters=this.fracture.pieces.filter(p=>p.leak).filter((_,i)=>i%3===0).slice(0,6).map((piece,i)=>({piece,root:roots[i],direction:directions[i]}));
  this.volumeMaterial=new T.ShaderMaterial({vertexShader:volumeVertex,fragmentShader:volumeFragment,depthTest:false,depthWrite:false,side:T.FrontSide,uniforms:{eye:{value:new T.Vector3()},anchor:{value:new T.Vector3()},worldScale:{value:1},viewProjection:{value:new T.Matrix4()},resolution:{value:new T.Vector2(1,1)},opaqueDepth:{value:this.opaque.depthTexture},time:{value:0},charge:{value:0},release:{value:0},decay:{value:0},jets:{value:roots},directions:{value:directions}}});
  const box=new T.BoxGeometry(3,3,2);box.translate(0,0,.1);this.volumeRoot.add(new T.Mesh(box,this.volumeMaterial));this.volumeScene.add(this.volumeRoot);
  this.merge=this.pass(mergeFragment,{base:{value:this.opaque.texture},volume:{value:this.volume.texture}});
  this.blur=this.pass(blurFragment,{image:{value:null},direction:{value:new T.Vector2()},threshold:{value:0}});
  this.output=this.pass(outputFragment,{hdr:{value:this.hdr.texture},bloom0:{value:this.bloom[0].b.texture},bloom1:{value:this.bloom[1].b.texture},bloom2:{value:this.bloom[2].b.texture}});
  this.screen.material.dispose();this.screen.material=this.output;this.screen.frustumCulled=false;this.screenScene.add(this.screen);
  const dust=new T.BufferGeometry();dust.setAttribute('position',new T.BufferAttribute(new Float32Array(42*6),3));this.speckMaterial=new T.LineBasicMaterial({color:0xa8e8ff,transparent:true,opacity:0,toneMapped:false,depthWrite:false});this.specks=new T.LineSegments(dust,this.speckMaterial);this.specks.frustumCulled=false;this.root.add(this.specks);
 }
 get count(){return this.fracture.pieces.length;}
 updateSurface(image:HTMLCanvasElement){const c=this.source.getContext('2d')!;c.clearRect(0,0,SIZE,SIZE);c.drawImage(image,0,0);this.sourceTexture.needsUpdate=true;image.width=image.height=1;}
 private target(depth=true){return new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,format:T.RGBAFormat,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:depth,stencilBuffer:false});}
 private pass(fragmentShader:string,uniforms:Record<string,T.IUniform>){return new T.ShaderMaterial({vertexShader:fullscreenVertex,fragmentShader,uniforms,depthTest:false,depthWrite:false,blending:T.NoBlending});}
 private renderPass(material:T.ShaderMaterial,target:T.WebGLRenderTarget|null){this.screen.material=material;this.gpu.setRenderTarget(target);this.gpu.clear();this.gpu.render(this.screenScene,this.screenCamera);}
 private resize(w:number,h:number){const d=Math.min(devicePixelRatio,1.2);if(this.dimensions.w===w&&this.dimensions.h===h&&this.dimensions.d===d)return;this.dimensions={w,h,d};this.gpu.setPixelRatio(d);this.gpu.setSize(w,h,false);const x=Math.round(w*d),y=Math.round(h*d);for(const rt of [this.opaque,this.hdr])rt.setSize(x,y);this.volume.setSize(Math.max(1,Math.round(x*.5)),Math.max(1,Math.round(y*.5)));this.bloom.forEach((level,i)=>{const div=2**(i+1);level.a.setSize(Math.max(1,Math.round(x/div)),Math.max(1,Math.round(y/div)));level.b.setSize(level.a.width,level.a.height);});this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.volumeMaterial.uniforms.resolution.value.set(this.volume.width,this.volume.height);}
 private distance(t:number){if(t<1400)return 0;if(t<1880)return ((t-1400)/480)**1.65*.065;if(t<2290)return .065+((t-1880)/410)**3.3*1.35;return 1.415+(t-2290)/1000*3.1;}
 draw(w:number,h:number,t:number,a:SurfaceAnchor){
  if(this.disposed)return;this.resize(w,h);const height=12*Math.tan(T.MathUtils.degToRad(19)),scale=a.width/h*height;
  this.root.position.set((a.x-w/2)/h*height,(h/2-a.y)/h*height,0);this.root.scale.setScalar(scale);this.volumeRoot.position.copy(this.root.position);this.volumeRoot.scale.copy(this.root.scale);
  const charge=smooth(280,1490,t),release=smooth(1860,2290,t),decay=smooth(2300,2940,t),distance=this.distance(t);
  this.seamUniforms.clock.value=t;this.original.visible=t<1420;
  this.root.rotation.z=Math.sin(t*.049)*charge*(1-smooth(1280,1440,t))*.0015;
  const inward=a.y<h/2?-1:1;
  for(const p of this.fracture.pieces){p.node.visible=t>=1420&&t<3150;const r=Math.hypot(p.center.x,p.center.y)||.1,dx=p.center.x/r,dy=p.center.y/r,spread=distance*(.55+p.seed*.72),fade=smooth(2600+p.seed*200,3040+p.seed*240,t);
   const vx=dx*.75+(random(p.seed*71)-.5)*.22,vy=dy*.55+(random(p.seed*51)-.5)*.26+inward*.38,vz=(random(p.seed*137)-.36)*1.5;
   p.node.position.set(p.center.x+vx*spread,p.center.y+vy*spread-distance*distance*.035,p.center.z+vz*spread);
   p.node.rotation.set((random(p.seed*31)-.5)*distance*5,(random(p.seed*41)-.5)*distance*6,(p.seed-.5)*distance*3);
   // Actual body thickness, perspective shortening and reflected light replace scaled cutout tiles.
   p.node.scale.setScalar(Math.max(.001,1-fade**1.5));p.front.emissiveIntensity=.55+release*.12; p.edge.emissive.setRGB(.015,.14,.26);p.edge.emissiveIntensity=charge*(1-decay)*1.3;
   p.front.roughness=.4+fade*.22;p.back.roughness=.29+fade*.2;
  }
  this.root.updateMatrixWorld(true);this.volumeRoot.updateMatrixWorld(true);this.camera.updateMatrixWorld();
  this.emitters.forEach(({piece,root,direction})=>{root.copy(piece.leak!).applyEuler(piece.node.rotation).add(piece.node.position);direction.copy(root).setZ(.43+piece.seed*.36).normalize();});
  this.coreLight.intensity=(charge*.025+Math.exp(-(((t-2150)/105)**2))*.6)*(1-decay);this.coreLight.distance=2.5;
  this.speckMaterial.opacity=smooth(2070,2240,t)*(1-smooth(2570,2900,t))*.8;
  const points=this.specks.geometry.getAttribute('position') as T.BufferAttribute;
  for(let i=0;i<42;i++){const seed=random(i+83),angle=seed*Math.PI*2,z=(random(i+19)-.4),r=distance*(.65+random(i+41)*.9),tail=.018+release*.065;for(let j=0;j<2;j++){const d=r-j*tail;points.setXYZ(i*2+j,Math.cos(angle)*d,Math.sin(angle)*d*.8-distance*distance*.03,z*d);}}points.needsUpdate=true;
  const u=this.volumeMaterial.uniforms;u.eye.value.copy(this.camera.position).sub(this.root.position).divideScalar(scale);u.anchor.value.copy(this.root.position);u.worldScale.value=scale;u.viewProjection.value.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);u.time.value=t;u.charge.value=charge;u.release.value=release;u.decay.value=decay;
  this.gpu.setRenderTarget(this.opaque);this.gpu.clear();this.gpu.render(this.scene,this.camera);
  this.gpu.setRenderTarget(this.volume);this.gpu.clear();this.gpu.render(this.volumeScene,this.camera);
  this.renderPass(this.merge,this.hdr);
  for(let i=0;i<3;i++){const level=this.bloom[i];this.blur.uniforms.image.value=i===0?this.hdr.texture:this.bloom[i-1].b.texture;this.blur.uniforms.threshold.value=i===0?1.05:0;this.blur.uniforms.direction.value.set(1.8/level.a.width,0);this.renderPass(this.blur,level.a);this.blur.uniforms.image.value=level.a.texture;this.blur.uniforms.threshold.value=0;this.blur.uniforms.direction.value.set(0,1.8/level.a.height);this.renderPass(this.blur,level.b);}
  this.renderPass(this.output,null);
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.fracture.dispose();this.sourceTexture.dispose();this.crackTexture.dispose();this.original.geometry.dispose();this.originalMaterial.dispose();this.volumeRoot.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});this.specks.geometry.dispose();this.speckMaterial.dispose();for(const material of [this.volumeMaterial,this.merge,this.blur,this.output])material.dispose();for(const rt of [this.opaque,this.volume,this.hdr,...this.bloom.flatMap(l=>[l.a,l.b])])rt.dispose();this.environment.dispose();this.gpu.dispose();this.gpu.forceContextLoss();this.source.width=this.source.height=1;}
}

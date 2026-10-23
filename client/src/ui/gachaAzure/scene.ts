import {createWebGLRenderer} from '../webglRenderer';
import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {BokehPass} from 'three/examples/jsm/postprocessing/BokehPass.js';
import {ContactShadowPass,OpaqueScenePass,TransparentScenePass} from './contactShadow';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {arcaneLibrary} from './library';
import {themes} from './script';
import {storyTime} from './timing';
import {introState} from './intro';
import {flightPoint,flightRotation,openingCenterOffset} from './kinematics';
import {ManaWake} from './manaWake';
import {type RewardKind} from './rewards';
import {Radiance,revelations} from './radiance';
import {makeBook,type Grimoire} from './book';
import {loadCover,glowMap} from './materials';
export const studies=revelations;
export const clamp=(x:number)=>Math.min(1,Math.max(0,x));
export const smooth=(a:number,b:number,t:number)=>{const p=clamp((t-a)/(b-a));return p*p*p*(10+p*(-15+p*6))};
export const sleeveUrl=(key:string)=>['compass','prism'].includes(key)?`/frames/sleeve_${key}.webp`:`/cosmetics/v2/sleeve-${key}.webp`;
export type Rarity='R'|'SR'|'SSR';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),lerp=T.MathUtils.lerp;
export class LibraryScene{
 renderer:T.WebGLRenderer;scene=new T.Scene();camera=new T.PerspectiveCamera(40,1,.1,90);composer:EffectComposer;bokeh:BokehPass;contact:ContactShadowPass;bloom:UnrealBloomPass;ready:Promise<void>;books:Grimoire[]=[];variant=0;rarity:Rarity='SSR';width=1;height=1;
 hideRewardModels=false;
 private disposed=false;featuredSleeve='ivory';
 radiance!:Radiance;count=1;rewardKind:RewardKind='sleeve';introLight:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>;env:T.WebGLRenderTarget;mana=new T.PointLight('#90d8ff',0,7,2);wake:ManaWake;dust:T.Points;halo:T.Sprite;lastT=0;library:ReturnType<typeof arcaneLibrary>;
 constructor(public canvas:HTMLCanvasElement,options:{hideRewardModels?:boolean}={}){
  this.hideRewardModels=!!options.hideRewardModels;
  this.renderer=createWebGLRenderer({canvas,alpha:false,antialias:true,preserveDrawingBuffer:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.92;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;
  const pmrem=new T.PMREMGenerator(this.renderer),envRoom=new RoomEnvironment();this.env=pmrem.fromScene(envRoom,.04);envRoom.dispose();pmrem.dispose();this.scene.environment=this.env.texture;this.scene.environmentIntensity=.32;
  this.scene.background=new T.Color('#283c48');this.scene.fog=new T.FogExp2('#536d78',.013);
  const ambient=new T.HemisphereLight('#d4e8f1','#253440',.40);this.scene.add(ambient);
  const sun=new T.DirectionalLight('#fff1d5',2.8);sun.position.set(-10,12,5);sun.target.position.set(0,2,-7);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-10,right:10,top:13,bottom:-9,near:1,far:45});sun.shadow.bias=-.0002;sun.shadow.normalBias=.006;sun.shadow.radius=3;this.scene.add(sun,sun.target);
  const rim=new T.DirectionalLight('#accadd',1.15);rim.position.set(7,6,-10);this.scene.add(rim,this.mana);this.library=arcaneLibrary(this.scene);
  this.camera.position.set(0,3.4,11);this.camera.lookAt(0,3.1,-8);
  const renderTarget=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType});renderTarget.samples=4;this.composer=new EffectComposer(this.renderer,renderTarget);this.composer.addPass(new OpaqueScenePass(this.scene,this.camera));this.contact=new ContactShadowPass(this.scene,this.camera);this.composer.addPass(this.contact);this.composer.addPass(new TransparentScenePass(this.scene,this.camera));this.bokeh=new BokehPass(this.scene,this.camera,{focus:14,aperture:.00045,maxblur:.009});(this.bokeh as unknown as {_materialDepth:T.MeshDepthMaterial})._materialDepth.side=T.DoubleSide;this.composer.addPass(this.bokeh);this.bloom=new UnrealBloomPass(new T.Vector2(1024,640),.18,.65,1.2);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
  const gmap=glowMap();this.halo=new T.Sprite(new T.SpriteMaterial({map:gmap,color:'#8dd2ff',transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}));this.scene.add(this.halo);
  this.introLight=new T.Mesh(new T.PlaneGeometry(1,1),new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending:T.AdditiveBlending,uniforms:{alpha:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float alpha;void main(){float x=pow(max(0.,sin(vUv.x*3.14159)),.7);float y=abs(vUv.y-.5)*2.;float core=exp(-y*y*160.);float veil=exp(-y*y*9.)*.18;gl_FragColor=vec4(vec3(.55,.82,1.)*(2.+core*2.),(core+veil)*x*alpha);}`}));
  this.introLight.renderOrder=20;this.scene.add(this.introLight);
  const pos=[];for(let i=0;i<140;i++)pos.push(Math.sin(i*47.83)*7,1+(Math.cos(i*13.43)+1)*4.5,-10+Math.sin(i*5.43)*15);const pg=new T.BufferGeometry();pg.setAttribute('position',new T.Float32BufferAttribute(pos,3));this.dust=new T.Points(pg,new T.PointsMaterial({map:gmap,color:'#e2e7df',size:.024,opacity:.28,transparent:true,depthWrite:false}));this.scene.add(this.dust);
  this.wake=new ManaWake(this.scene);
  const bookReady=loadCover(0).then(async art=>{const b=makeBook(art,0,true);this.books.push(b);this.scene.add(b.root);this.radiance=new Radiance(this.scene,b.finalPages,!this.hideRewardModels);await this.radiance.ready;
  });
  this.ready=Promise.allSettled([bookReady,this.library.ready]).then(async results=>{
   const failure=results.find(r=>r.status==='rejected');if(failure?.status==='rejected')throw failure.reason;
   if(this.disposed)return;
   // Compile the opening; previews also compile their reward silhouettes.
   this.library.set(0);this.rewardKind=this.hideRewardModels?'sleeve':'mixed';this.count=10;
   this.render(19,'SSR',true);
   await this.renderer.compileAsync(this.scene,this.camera);this.rewardKind='sleeve';this.count=1;
  });
 }
 setVariant(v:number){this.variant=v;this.library.set(0)}
 resize(w:number,h:number){this.width=w;this.height=h;this.renderer.setSize(w,h,false);this.composer.setSize(w,h);this.camera.aspect=w/h;this.camera.fov=Math.max(37,2*Math.atan(.32/(w/h))*180/Math.PI);this.camera.updateProjectionMatrix()}
 path(t:number){const p=flightPoint(t,this.variant);return V(p.x,p.y,p.z)}
 render(seconds:number,rarity:Rarity=this.rarity,reduced=false){
  const playback=seconds;seconds=storyTime(seconds);
  if(!this.books.length)return;this.rarity=rarity;const v=this.variant,book=this.books[0];
  const intro=introState(seconds);const t=reduced?.87:Math.min(.87,intro.bookTime),reveal=smooth(.73,.87,t),charge=smooth(.08,.19,t);
  const opening=reduced?1:smooth(7.45,11.4,seconds);
  const wake=reduced?(seconds>.2?1.08:0):smooth(11.7,13.3,seconds)*1.08;
  const color=new T.Color('#63baf0').lerp(new T.Color(themes[0].glow),smooth(.51,.65,t));
  this.books.forEach((b,i)=>b.root.visible=i===0);const p=this.path(t);book.root.position.copy(p);book.root.position.x+=openingCenterOffset(opening);
  const flying=smooth(.24,.65,t);
  const rotation=flightRotation(t,v);book.root.rotation.set(rotation.x,rotation.y,rotation.z);
  book.tick(opening,reduced?0:.03*Math.sin(flying*Math.PI),reduced?0:Math.max(0,seconds-.70),charge*(1-reveal),color,wake);
  book.bands.forEach((b,i)=>{b.visible=false;const release=smooth(.67+i*.009,.75+i*.009,t);b.rotation.y=(i?1:-1)*release*2.6;b.position.z=.14-release*.10});
  const dolly=smooth(.19,.68,t),narrow=1-smooth(.65,1.2,this.width/this.height);
  this.camera.position.set(0,lerp(3.45,3.20,dolly),lerp(11,10.85,dolly)+narrow*.45);
  this.camera.lookAt(V(0,lerp(3.4,3.20,dolly),lerp(-8,3.05,dolly)));this.camera.updateMatrixWorld();
  (this.bokeh.uniforms as Record<string,T.IUniform>).focus.value=this.camera.position.distanceTo(p);(this.bokeh.uniforms as Record<string,T.IUniform>).aperture.value=reduced?0:.00038*intro.blur;this.bokeh.enabled=!reduced&&intro.blur>.001;
  this.introLight.visible=!reduced&&seconds<.58;this.introLight.quaternion.copy(this.camera.quaternion);this.introLight.rotateZ(-.28);this.introLight.position.copy(this.camera.position).add(V(-1.45+intro.light*4.4,.60-intro.light*.30,-2.2).applyQuaternion(this.camera.quaternion));this.introLight.scale.set(3.6,lerp(.65,.11,intro.light),1);this.introLight.material.uniforms.alpha.value=intro.lightAlpha*.52;
  this.mana.position.copy(p).add(V(.65,.70,1.6));this.mana.color.copy(color);this.mana.intensity=charge*(1.35*(1-reveal)+wake*.18);this.halo.position.copy(p).add(V(0,0,-.15));this.halo.scale.setScalar(2+reveal);this.halo.material.color.copy(color);this.halo.material.opacity=reduced?0:charge*.025;
  this.bloom.strength=.19+wake*.31;this.bloom.threshold=1.8;this.renderer.toneMappingExposure=.92-wake*.10;this.dust.visible=!reduced;this.dust.rotation.y=seconds*.008;this.library.tick(seconds,0,reduced);
  this.wake.update(t,seconds,v,reduced,this.camera);
  this.radiance.rewards.featured=this.featuredSleeve;this.radiance.kind=this.rewardKind;this.radiance.count=this.count;this.radiance.rarity=rarity;const burst=this.radiance.render(seconds,v,this.camera,reduced);
  this.bloom.strength+=burst.charge*.30;this.renderer.toneMappingExposure-=burst.charge*.12;
  this.mana.intensity+=burst.charge*1.4;
  this.radiance.rewards.root.visible=!this.hideRewardModels;
  this.lastT=playback/studies[v].duration;this.composer.render();
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;
  // Loading may outlive the dialog. Drain it before releasing instance-owned GPU resources.
  void Promise.allSettled([this.ready,this.library.ready]).then(()=>{
   const geos=new Set<T.BufferGeometry>(),mats=new Set<T.Material>(),textures=new Set<T.Texture>();
   this.scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Points){geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m)}if(o instanceof T.Sprite)mats.add(o.material)});
   for(const m of mats){for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);if(m instanceof T.ShaderMaterial)for(const u of Object.values(m.uniforms))if(u.value instanceof T.Texture)textures.add(u.value);for(const value of Object.values(m.userData))if(value instanceof T.Texture)textures.add(value);}
   this.radiance?.rewards.textures.forEach(t=>textures.add(t));
   geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());this.scene.traverse(o=>{if(o instanceof T.Light&&'shadow' in o)(o as T.DirectionalLight).shadow?.dispose()});this.env.dispose();this.composer.passes.forEach(p=>p.dispose());this.composer.dispose();this.renderer.dispose();this.renderer.forceContextLoss();
  });
 }
}

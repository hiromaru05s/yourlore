import {createWebGLRenderer} from '../webglRenderer';
import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {Chest,materials,box} from './model';
import {Gate} from './gates';
import {ease,clamp,lerp,spawn,landing,cardReveal,duration,fadeStart} from './choreography';
export type P={x:number;y:number};
type State={time:number;variant:number;roll:number;slots:number;light?:boolean;reduced?:boolean;angle?:number;inspect?:boolean;side?:number;screen?:{source:P;targets:P[];width:number;height:number;cardWidth:number}};
export class Stage{
 readonly renderer:T.WebGLRenderer;readonly scene=new T.Scene();readonly camera:T.PerspectiveCamera|T.OrthographicCamera;private palette=materials();private actors:Chest[]=[];private originalMaterials=new Set<T.Material>();private cards:T.Mesh[]=[];private gate:Gate;private ground=new T.Group();private env:T.WebGLRenderTarget;private disposed=false;private ray=new T.Raycaster();private plane=new T.Plane(new T.Vector3(0,1,0),0);private entries=Array.from({length:6},()=>new T.Plane(new T.Vector3(0,0,1),100));private fade=0;private source=new T.Vector3();private lift=0;private blend=new GateBlend();private map:T.Texture;private time=0;
 constructor(readonly canvas:HTMLCanvasElement,readonly overlay=false,readonly gateIndex=0){this.renderer=createWebGLRenderer({canvas,alpha:overlay,antialias:true,preserveDrawingBuffer:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.setClearColor(0x14211e,overlay?0:1);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.localClippingEnabled=true;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.94;this.renderer.outputColorSpace=T.SRGBColorSpace;this.camera=overlay?new T.OrthographicCamera(-10,10,10,-10,.1,100):new T.PerspectiveCamera(37,1,.1,100);this.camera.position.set(0,32,30);this.camera.lookAt(0,0,0);
 const pm=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.env=pm.fromScene(room,.04);this.scene.environment=this.env.texture;this.scene.environmentIntensity=.7;room.dispose();pm.dispose();this.scene.add(new T.HemisphereLight(0xc9e0db,0x3a2817,.8));const sun=new T.DirectionalLight(0xffe1b1,3.2);sun.position.set(-5,12,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.1,far:35});sun.shadow.normalBias=.012;sun.shadow.bias=-.0003;sun.shadow.radius=4;this.scene.add(sun);const rim=new T.DirectionalLight(0x6ccab9,1.5);rim.position.set(4,5,-8);this.scene.add(rim);
 const floorMat=overlay?new T.ShadowMaterial({opacity:.28}):new T.MeshStandardMaterial({color:0x465049,roughness:.88,bumpMap:this.palette.stone.map,bumpScale:.045});const floor=new T.Mesh(new T.PlaneGeometry(overlay?45:16,overlay?45:12),floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=-.06;floor.receiveShadow=true;this.ground.add(floor);this.scene.add(this.ground);if(!overlay){box(this.ground,16,.30,12,this.palette.wood,0,-.24,0,.08);for(const x of [-7.8,7.8])box(this.ground,.055,.025,11.6,this.palette.brass,x,-.03,0);for(const z of [-5.8,5.8])box(this.ground,15.6,.025,.055,this.palette.brass,0,-.03,z);}
 this.gate=new Gate(this.palette,0);this.scene.add(this.gate.root);
 this.map=new T.TextureLoader().load('/art/cards/MIMIC.webp');this.map.colorSpace=T.SRGBColorSpace;this.map.anisotropy=8;
 for(let i=0;i<6;i++){const actor=new Chest(this.palette,2);this.actors.push(actor);this.scene.add(actor.root);const card=new T.Mesh(new T.BoxGeometry(1.7,.033,2.22),[this.palette.brass,this.palette.brass,new T.MeshStandardMaterial({map:this.map,roughness:.65}),this.palette.wood,this.palette.brass,this.palette.brass]);card.receiveShadow=true;this.cards.push(card);this.scene.add(card);}
 const floorClip=new T.Plane(new T.Vector3(0,1,0),.025);
 // Each actor releases its own portal clipping plane once its body clears the threshold.
 this.actors.forEach((actor,i)=>{const copies=new Map<T.Material,T.Material>();actor.root.traverse(o=>{if(o instanceof T.Mesh){const clone=(m:T.Material)=>{this.originalMaterials.add(m);if(!copies.has(m)){const c=m.clone();c.clippingPlanes=[floorClip,this.entries[i]];c.clipShadows=true;copies.set(m,c);}return copies.get(m)!;};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);}});});

 }
 // compileAsync keeps an uncancellable material poll alive after disposal in Three.
 // Compile synchronously after asset readiness so skip/context loss has no orphan poll.
 async ready(){const maps=new Set<T.Texture>([this.map]);this.scene.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])for(const v of Object.values(m))if(v instanceof T.Texture&&!(v instanceof T.CanvasTexture))maps.add(v);});await Promise.all([...maps].map(texture=>new Promise<void>((resolve,reject)=>{const start=performance.now();const check=()=>{const im=texture.image as HTMLImageElement;if(this.disposed)reject(Error('Stage disposed'));else if(im?.complete&&im.naturalWidth>0)resolve();else if(performance.now()-start>30000)reject(Error('Texture unavailable'));else setTimeout(check,20);};check();})));if(!this.disposed)this.renderer.compile(this.scene,this.camera);}
 private projected(p:P,w:number,h:number){this.ray.setFromCamera(new T.Vector2(p.x/w*2-1,1-p.y/h*2),this.camera);const out=new T.Vector3();this.ray.ray.intersectPlane(this.plane,out);return out;}
 draw(s:State){if(this.disposed)return;this.time=s.time;const t=s.time,n=Math.min(s.roll,s.slots),r=this.canvas.getBoundingClientRect(),w=s.screen?.width||r.width,h=s.screen?.height||r.height;if(!w||!h)return;const size=this.renderer.getSize(new T.Vector2());if(size.x!==w||size.y!==h)this.renderer.setSize(w,h,false);if(this.camera instanceof T.PerspectiveCamera){this.camera.aspect=w/h;const a=((s.angle||0)+8)*Math.PI/180;this.camera.position.set(Math.sin(a)*23,15.2,Math.cos(a)*23);this.camera.lookAt(0,.55,.15);}else{this.camera.left=-10*w/h;this.camera.right=10*w/h;}this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();this.scene.background=this.overlay?null:new T.Color(s.light?0xe3dfcf:0x14211e);this.renderer.setClearColor(this.overlay?0x000000:s.light?0xe3dfcf:0x14211e,this.overlay?0:1);if(!this.overlay)((this.ground.children[0] as T.Mesh).material as T.MeshStandardMaterial).color.set(s.light?0xe3dfcf:0x465049);
 const targets=Array.from({length:n},(_,i)=>s.screen?this.projected(s.screen.targets[i],w,h):new T.Vector3((i-(n-1)/2)*2.15,0,2.4));
 let scale=1;if(s.screen&&n){const p=s.screen.targets[0];scale=this.projected({x:p.x+s.screen.cardWidth/2,y:p.y},w,h).distanceTo(this.projected({x:p.x-s.screen.cardWidth/2,y:p.y},w,h))/2.15*.85;}
 const screenRise=s.screen?Math.max(0,s.screen.source.y-Math.min(...s.screen.targets.map(p=>p.y))+55):0;
 const lift=Math.max(3.4*scale,screenRise/(h/20*.684)),src=s.screen?this.projected(s.screen.source,w,h):new T.Vector3(0,0,-3);
 // Source describes the screen-space threshold, rather than the projected floor beneath it.
 src.y=lift;src.z+=lift*15/16;
 this.source.copy(src);this.lift=lift;
 this.gate.root.position.copy(src);this.gate.root.position.y-=.22*scale*(1-ease(0,320,t));
 const forward=s.side===0?-1:1,facing=s.side===0?Math.PI:0;
 this.gate.root.rotation.y=facing;this.gate.root.scale.setScalar(scale);this.gate.pose(t,n);
 this.fade=n&&!s.reduced?ease(0,180,t)*(1-ease(fadeStart(n),fadeStart(n)+240,t)):0;
 this.gate.root.visible=this.fade>0;
 for(let i=0;i<6;i++){
 const actor=this.actors[i],card=this.cards[i];actor.root.visible=false;card.visible=false;if(i>=n)continue;
 const start=spawn(i),end=landing(i),b=targets[i],u=clamp((t-start)/1040),exitProgress=ease(0,.28,u),fall=clamp((u-.28)/.72);
 card.position.copy(b);card.position.y=.014;card.scale.setScalar(scale/.85);card.visible=!this.overlay&&t>=cardReveal(i);if(s.reduced)continue;
 actor.root.visible=t>=start&&t<end+650;
 const exit=src.clone();exit.z+=forward*lerp(-1.25,1.72,exitProgress)*scale;
 const at=exit.clone().lerp(b,fall);at.y=lift*(1-fall*fall)+Math.sin(fall*Math.PI)*.22*scale;
 const impact=Math.sin(ease(end,end+200,t)*Math.PI),sink=ease(end+220,end+650,t);
 at.y-=impact*.035*scale+2.85*sink*scale;
 this.entries[i].normal.set(0,0,forward);this.entries[i].constant=u<.29?-forward*src.z:100;
 actor.root.position.copy(at);actor.root.rotation.set(forward*(-.19*Math.sin(fall*Math.PI)+impact*.06),facing+forward*Math.sin(fall*Math.PI)*Math.max(-.35,Math.min(.35,(b.x-src.x)*.08)),Math.sin(fall*Math.PI)*(i%2?.055:-.055));
 actor.root.scale.set(scale*(1+.025*impact),scale*(1-.06*impact),scale*(1+.025*impact));
 actor.pose((.28+.30*Math.sin(fall*Math.PI)+impact*.16)*(1-ease(end+160,end+380,t)),exitProgress*4+fall*1.5,Math.sin(fall*Math.PI)*.18);
 }
 if(this.overlay&&t>=duration){this.renderer.setRenderTarget(null);this.renderer.clear();return;}
 this.blend.render(this.renderer,this.scene,this.camera,this.gate.root,this.fade);
 }

 get info(){return{calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,gate:{...this.gate.state,opacity:this.fade,yaw:this.gate.root.rotation.y,source:this.source.toArray(),lift:this.lift},model:2,direction:this.gateIndex,sourceArt:false,time:this.time,facing:this.actors.filter(a=>a.root.visible).map(a=>Math.cos(a.root.rotation.y)),positions:this.actors.filter(a=>a.root.visible).map(a=>a.root.position.toArray()),actors:this.actors.filter(a=>a.root.visible).length,minForward:Math.min(1,...this.actors.filter(a=>a.root.visible).map(a=>Math.cos(a.root.rotation.y-this.gate.root.rotation.y)))};}
 dispose(loseContext=true){if(this.disposed)return;this.disposed=true;const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();this.scene.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}if(o instanceof T.Light&&'shadow'in o)(o as T.DirectionalLight).shadow.dispose();});this.originalMaterials.forEach(m=>materials.add(m));Object.values(this.palette).forEach(m=>materials.add(m));materials.forEach(m=>{for(const v of Object.values(m))if(v instanceof T.Texture)textures.add(v);m.dispose();});geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());this.env.dispose();this.blend.dispose();this.renderer.dispose();if(loseContext)this.renderer.forceContextLoss();}
}

// Crossfade two opaque scene renders. Gate leaves, masonry, cavity and cast shadows
// disappear together without exposing the backs of intersecting translucent meshes.
class GateBlend {
 private withGate=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:2});
 private withoutGate=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:2});
 private scene=new T.Scene();private camera=new T.OrthographicCamera(-1,1,1,-1,0,1);
 private material=new T.ShaderMaterial({depthTest:false,depthWrite:false,blending:T.NoBlending,premultipliedAlpha:true,
 uniforms:{a:{value:this.withGate.texture},b:{value:this.withoutGate.texture},amount:{value:1}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
 fragmentShader:`uniform sampler2D a;uniform sampler2D b;uniform float amount;varying vec2 vUv;
 void main(){vec4 c=mix(texture2D(b,vUv),texture2D(a,vUv),amount);gl_FragColor=vec4(c.a>0.00001?c.rgb/c.a:vec3(0.0),c.a);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <premultiplied_alpha_fragment>
 }`});
 private quad=new T.Mesh(new T.PlaneGeometry(2,2),this.material);
 constructor(){this.scene.add(this.quad);}
 render(renderer:T.WebGLRenderer,scene:T.Scene,camera:T.Camera,gate:T.Group,opacity:number){
 if(opacity<=0||opacity>=1){gate.visible=opacity>0;renderer.setRenderTarget(null);renderer.render(scene,camera);return;}
 const size=renderer.getDrawingBufferSize(new T.Vector2());if(this.withGate.width!==size.x||this.withGate.height!==size.y){this.withGate.setSize(size.x,size.y);this.withoutGate.setSize(size.x,size.y);}
 gate.visible=true;renderer.setRenderTarget(this.withGate);renderer.render(scene,camera);
 gate.visible=false;renderer.setRenderTarget(this.withoutGate);renderer.render(scene,camera);gate.visible=true;
 this.material.uniforms.amount.value=opacity;renderer.setRenderTarget(null);renderer.render(this.scene,this.camera);
 }
 dispose(){this.withGate.dispose();this.withoutGate.dispose();this.quad.geometry.dispose();this.material.dispose();}
}

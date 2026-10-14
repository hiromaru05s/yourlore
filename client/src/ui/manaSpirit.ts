import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createSpiritMotion } from './manaSpiritMotion';
import { buildDewFront } from './manaSpiritFront';

export type SpiritPose = ReturnType<ReturnType<typeof createSpiritMotion>['tick']>;
export type SpiritForm = {left:THREE.Group;right:THREE.Group;update?:(pose:SpiritPose,dt:number,time:number)=>void};

/** Original mana spirit: the same teardrop, ink face and folded fins in every screen. */
export function mountManaSpirit(host: HTMLElement, options: {
  home?: boolean;
  /** Comparison-lab injection; normal HOME and tutorial keep the default front. */
  front?: (body: THREE.Group) => void;
  motion?: ReturnType<typeof createSpiritMotion>;
  still?: boolean;
  closeUp?: boolean;
  fps?: number;
  form?: (body:THREE.Group, pearl:THREE.Material, blue:THREE.Material) => SpiritForm;
  silhouette?: boolean;
  viewYaw?: number | (()=>number);
} = {}): { celebrate():void; destroy():void } {
  host.classList.add('mana-spirit'); host.setAttribute('aria-hidden','true');
  const fallback=()=>{host.innerHTML='<svg viewBox="0 0 120 140"><defs><linearGradient id="spiritPearl" x2=".8" y2="1"><stop stop-color="#fffdf0"/><stop offset=".55" stop-color="#e4f0eb"/><stop offset="1" stop-color="#89aec1"/></linearGradient></defs><ellipse cx="60" cy="127" rx="26" ry="5" fill="#315569" opacity=".22"/><path d="M60 8C88 30 97 55 92 84L78 106 60 119 42 106 28 84C23 55 34 30 60 8" fill="url(#spiritPearl)" stroke="#98bdcf" stroke-width="1"/><path d="M33 60Q60 45 87 60L82 79Q60 90 38 79Z" fill="#20374e"/><ellipse cx="48" cy="68" rx="3" ry="6" fill="#9ee6f0"/><ellipse cx="72" cy="68" rx="3" ry="6" fill="#9ee6f0"/><path d="M60 89C57 95 51 101 52 106C53 115 67 115 68 106C69 101 63 95 60 89Z" fill="#9ce8ee" stroke="#c5dedf"/><ellipse cx="60" cy="107" rx="3" ry="4" fill="#ddfff2"/></svg>';};
  const staticSpirit=()=>{fallback();return {celebrate(){},destroy(){host.replaceChildren();}};};
  if(typeof WebGL2RenderingContext==='undefined')return staticSpirit();
  let renderer: THREE.WebGLRenderer;
  try {renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});} catch {return staticSpirit();}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.setClearColor(0,0); renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
  host.append(renderer.domElement);
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(32,1,.1,20);
  camera.position.set(0,.35,5.4); camera.lookAt(0,.05,0);
  if(options.closeUp){camera.position.set(0,-.17,2.35);camera.lookAt(0,-.32,.4);}
  // A real reflection environment gives the crystal distinct windows and dark facets.
  const room=new RoomEnvironment(), pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(room,.025); scene.environment=environment.texture;
  scene.environmentIntensity=.65; room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xe9f6ff,0x324c69,.8));
  const key=new THREE.DirectionalLight(0xffeedb,2.4); key.position.set(-3,5,4); scene.add(key);
  const rim=new THREE.DirectionalLight(0x8bd8f3,1.8); rim.position.set(3,1,-2); scene.add(rim);
  const pearl=new THREE.MeshPhysicalMaterial({color:0xe9f0e9,roughness:.34,metalness:.025,clearcoat:.38,clearcoatRoughness:.25});
  const blue=new THREE.MeshPhysicalMaterial({color:0x437e9d,roughness:.38,metalness:.13,clearcoat:.25});
  const ink=new THREE.MeshPhysicalMaterial({color:0x0b2032,roughness:.62,clearcoat:.08,envMapIntensity:.22});
  const light=new THREE.MeshStandardMaterial({color:0xa9eef2,emissive:0x54b5d1,emissiveIntensity:.35,roughness:.3});
  const spirit=new THREE.Group(); scene.add(spirit);
  const mesh=(g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0,parent:THREE.Object3D=spirit)=>{const n=new THREE.Mesh(g,m);n.position.set(x,y,z);parent.add(n);return n;};
  // Interpolate the original silhouette before revolving it; angular bands are gone.
  if(!options.form){
  const profile=new THREE.SplineCurve([
    new THREE.Vector2(0,-.83),new THREE.Vector2(.30,-.63),new THREE.Vector2(.56,-.28),new THREE.Vector2(.65,.10),
    new THREE.Vector2(.56,.47),new THREE.Vector2(.33,.72),new THREE.Vector2(.12,.92),new THREE.Vector2(.025,1.16),new THREE.Vector2(0,1.19),
  ]).getPoints(96).map(p=>new THREE.Vector2(Math.max(0,p.x),p.y));
  const shell=mesh(new THREE.LatheGeometry(profile,96),pearl); shell.scale.z=.76;
  }
  const face=mesh(new THREE.SphereGeometry(.47,64,40),ink,0,.15,.43); face.scale.set(1,.56,.26);
  const eyes=[mesh(new THREE.SphereGeometry(.048,24,16),light,-.17,.18,.563),mesh(new THREE.SphereGeometry(.048,24,16),light,.17,.18,.563)];
  eyes.forEach(e=>e.scale.set(.75,1.7,.45));
  const arc=(points:THREE.Vector3[], radius:number)=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,radius,8,false);
  const smileMat=light.clone(); smileMat.transparent=true; smileMat.opacity=0; smileMat.depthWrite=false;
  const smiles=[-1,1].map(side=>mesh(arc([new THREE.Vector3(-.047,0,0),new THREE.Vector3(0,.041,.004),new THREE.Vector3(.047,0,0)],.013),smileMat,side*.17,.17,.577));
  const mouth=mesh(arc([new THREE.Vector3(-.047,.01,0),new THREE.Vector3(0,-.018,.004),new THREE.Vector3(.047,.01,0)],.008),smileMat,0,.037,.563);
  const yawnMat=light.clone(); yawnMat.transparent=true; yawnMat.opacity=0; yawnMat.depthWrite=false;
  const yawn=mesh(new THREE.TorusGeometry(.026,.007,10,32),yawnMat,0,.03,.561); yawn.scale.y=1.35;

  (options.front??buildDewFront)(spirit);

  // Preserve broad folded fins, smoothing the edge bevel and the blue underside.
  const fin=(side:number)=>{
    const group=new THREE.Group();group.position.set(side*.47,-.09,0);spirit.add(group);
    const shape=new THREE.Shape();shape.moveTo(0,.16);shape.quadraticCurveTo(side*.42,.12,side*.49,-.47);shape.quadraticCurveTo(side*.11,-.39,0,-.23);shape.closePath();
    mesh(new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelSegments:5,steps:1,bevelSize:.022,bevelThickness:.026,curveSegments:28}),pearl,0,0,0,group);
    const fold=mesh(new THREE.SphereGeometry(1,40,24),blue,side*.235,-.18,-.047,group);fold.scale.set(.083,.24,.054);fold.rotation.z=side*.5;
    return group;
  };
  const form:SpiritForm=options.form?options.form(spirit,pearl,blue):{left:fin(-1),right:fin(1)};
  const {left,right}=form;
  const shadow=mesh(new THREE.CircleGeometry(.53,64),new THREE.MeshBasicMaterial({color:0x284157,transparent:true,opacity:.13,depthWrite:false}),0,-1.07,0,scene);shadow.rotation.x=-Math.PI/2;shadow.scale.y=.65;
  const silhouetteMaterial=options.silhouette?new THREE.MeshBasicMaterial({color:0x122534}):null;
  if(silhouetteMaterial){scene.overrideMaterial=silhouetteMaterial;shadow.visible=false;}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const motion=options.motion??createSpiritMotion(!!options.home);
  const isStill=()=>!!options.still||reduced.matches;
  const rest=createSpiritMotion(false).tick(0);
  let pose={...rest}, dead=false, visible=true, raf=0, last=0, time=0;
  const render=(now:number)=>{
    raf=0;if(dead||!visible||document.hidden)return;
    if(now-last>=1000/(options.fps??60)||isStill()||!last){
      const dt=last?Math.min((now-last)/1000,.1):0;last=now;if(!isStill())time+=dt;
      const target=isStill()?rest:motion.tick(dt);
      // A short blend lets tapping wake a drowsy spirit without snapping its body or eyelids.
      const blend=isStill()?1:1-Math.exp(-dt*18);
      for(const k of ['x','y','yaw','roll','pitch','fin','finPitch','eye','smile','yawn'] as const)pose[k]+=(target[k]-pose[k])*blend;
      host.dataset.spiritMood=target.mood;
      spirit.position.set(pose.x,pose.y,0);spirit.rotation.set(pose.pitch,pose.yaw+(typeof options.viewYaw==='function'?options.viewYaw():options.viewYaw??0),pose.roll);
      left.rotation.set(pose.finPitch,0,-pose.fin);right.rotation.set(-pose.finPitch,0,pose.fin);
      eyes.forEach(e=>{e.scale.y=1.7*Math.max(.045,pose.eye);e.visible=pose.smile<.97;});
      smiles.forEach(e=>e.scale.y=.65+.35*pose.smile);smileMat.opacity=pose.smile;yawnMat.opacity=pose.yawn;
      mouth.scale.x=.8+.2*pose.smile;shadow.scale.x=1-pose.y*.3;
      form.update?.({...pose,mood:target.mood,elapsed:target.elapsed},isStill()?0:dt,time);
      renderer.render(scene,camera);
    }
    if(!isStill())raf=requestAnimationFrame(render);
  };
  const start=()=>{if(!dead&&!raf&&visible&&!document.hidden)raf=requestAnimationFrame(render);};
  const stop=()=>{cancelAnimationFrame(raf);raf=0;last=0;};
  const size=()=>{const b=host.getBoundingClientRect();renderer.setSize(Math.max(1,b.width),Math.max(1,b.height),false);camera.aspect=Math.max(1,b.width)/Math.max(1,b.height);camera.updateProjectionMatrix();start();};
  const resize=new ResizeObserver(size);resize.observe(host);
  const intersection=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;visible?start():stop();});intersection?.observe(host);
  const onVisibility=()=>{document.hidden?stop():start();};
  const onReduced=()=>{stop();start();};
  document.addEventListener('visibilitychange',onVisibility);reduced.addEventListener('change',onReduced);size();
  return {
    celebrate(){if(dead||isStill())return;motion.celebrate();start();},
    destroy(){
      dead=true;stop();resize.disconnect();intersection?.disconnect();document.removeEventListener('visibilitychange',onVisibility);reduced.removeEventListener('change',onReduced);
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>([pearl,blue]);
      scene.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());silhouetteMaterial?.dispose();environment.dispose();renderer.dispose();renderer.forceContextLoss();host.replaceChildren();delete host.dataset.spiritMood;
    },
  };
}

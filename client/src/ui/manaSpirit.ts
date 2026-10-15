import {homeDaylight,onHomeDaylightReady} from './homeDaylight';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createSpiritMotion } from './manaSpiritMotion';
import { buildMoonRabbit } from './zenoRig';
import { bindZenoInteraction, createZenoTurn, ZENO_TURN_LIMIT } from './zenoInteraction';
import { loungeText } from './loungeText';
import { buildDewFront } from './manaSpiritFront';

export type SpiritPose = ReturnType<ReturnType<typeof createSpiritMotion>['tick']>;
export type SpiritForm = {left:THREE.Group;right:THREE.Group;update?:(pose:SpiritPose,dt:number,time:number)=>void};

/** Zeno: the approved moon rabbit, shared by HOME and tutorial. */
export function mountManaSpirit(host: HTMLElement, options: {
  home?: boolean;
  interactive?: HTMLElement | boolean;
  /** Comparison-lab injection; normal HOME and tutorial keep the default front. */
  front?: (body: THREE.Group) => void;
  motion?: ReturnType<typeof createSpiritMotion>;
  still?: boolean;
  closeUp?: boolean;
  fps?: number;
  form?: (body:THREE.Group, pearl:THREE.Material, blue:THREE.Material) => SpiritForm;
  silhouette?: boolean;
  viewYaw?: number | (()=>number);
} = {}): { celebrate():void; greet():void; suspend():void; resume():void; destroy():void } {
  host.classList.add('mana-spirit'); host.setAttribute('aria-hidden','true');
  const fallback=()=>{host.innerHTML='<svg viewBox="0 0 120 140"><defs><linearGradient id="spiritPearl" x2=".8" y2="1"><stop stop-color="#fffdf0"/><stop offset=".55" stop-color="#e4f0eb"/><stop offset="1" stop-color="#89aec1"/></linearGradient></defs><ellipse class="mana-spirit-shadow" cx="60" cy="127" rx="26" ry="5" fill="#315569" opacity=".22"/><ellipse cx="42" cy="29" rx="9" ry="26" fill="url(#spiritPearl)"/><ellipse cx="78" cy="29" rx="9" ry="26" fill="url(#spiritPearl)"/><path d="M60 41C91 41 99 70 91 91C82 123 38 123 29 91C21 70 29 41 60 41" fill="url(#spiritPearl)" stroke="#98bdcf" stroke-width="1"/><path d="M33 60Q60 45 87 60L82 79Q60 90 38 79Z" fill="#20374e"/><ellipse cx="48" cy="68" rx="3" ry="6" fill="#9ee6f0"/><ellipse cx="72" cy="68" rx="3" ry="6" fill="#9ee6f0"/><path d="M60 89C57 95 51 101 52 106C53 115 67 115 68 106C69 101 63 95 60 89Z" fill="#9ce8ee" stroke="#c5dedf"/><ellipse cx="60" cy="107" rx="3" ry="4" fill="#ddfff2"/></svg>';if(options.home)host.querySelector('.mana-spirit-shadow')?.remove();};
  const staticSpirit=()=>{fallback();return {celebrate(){},greet(){},suspend(){},resume(){},destroy(){host.replaceChildren();}};};
  if(typeof WebGL2RenderingContext==='undefined')return staticSpirit();
  let renderer: THREE.WebGLRenderer;
  try {renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});} catch {return staticSpirit();}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.setClearColor(0,0); renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=options.home?1.04:1.15;
  host.append(renderer.domElement);
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(32,1,.1,20);
  camera.position.set(0,.35,5.4); camera.lookAt(0,.05,0);
  if(options.closeUp){camera.position.set(0,-.17,2.35);camera.lookAt(0,-.32,.4);}
  // A real reflection environment gives the crystal distinct windows and dark facets.
  const room=new RoomEnvironment(), pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(room,.025); scene.environment=environment.texture;
  scene.environmentIntensity=options.home ? .28 : .65; room.dispose(); pmrem.dispose();
  const skyFill=new THREE.HemisphereLight(options.home?0xc6def4:0xe9f6ff,options.home?0xa99b79:0x324c69,options.home?1.12:.8);scene.add(skyFill);
  const key=new THREE.DirectionalLight(options.home?0xffe5b7:0xffeedb,options.home?1.8:2.4); key.position.set(options.home?-5:-3,5,options.home?2.5:4); scene.add(key);
  const rim=new THREE.DirectionalLight(options.home?0xa5c5df:0x8bd8f3,options.home ? .32 : 1.8); rim.position.set(3,1,-2); scene.add(rim);
  const pearl=new THREE.MeshPhysicalMaterial({color:options.home?0xf1eee5:0xe9f0e9,roughness:.34,metalness:.025,clearcoat:.38,clearcoatRoughness:.25});
  const blue=new THREE.MeshPhysicalMaterial({color:0x437e9d,roughness:.38,metalness:.13,clearcoat:.25});
  const ink=new THREE.MeshPhysicalMaterial({color:0x0b2032,roughness:.62,clearcoat:.08,envMapIntensity:.22});
  const light=new THREE.MeshStandardMaterial({color:0xa9eef2,emissive:0x54b5d1,emissiveIntensity:.35,roughness:.3});
  const spirit=new THREE.Group(); scene.add(spirit);
  const mesh=(g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0,parent:THREE.Object3D=spirit)=>{const n=new THREE.Mesh(g,m);n.position.set(x,y,z);parent.add(n);return n;};
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

  const form:SpiritForm=options.form?options.form(spirit,pearl,blue):buildMoonRabbit(spirit,pearl);
  const {left,right}=form;
  const shadow=mesh(new THREE.CircleGeometry(.53,64),new THREE.MeshBasicMaterial({color:0x284157,transparent:true,opacity:.13,depthWrite:false}),0,-1.07,0,scene);shadow.rotation.x=-Math.PI/2;shadow.scale.y=.65;shadow.visible=!options.home;
  const silhouetteMaterial=options.silhouette?new THREE.MeshBasicMaterial({color:0x122534}):null;
  if(silhouetteMaterial){scene.overrideMaterial=silhouetteMaterial;shadow.visible=false;}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const motion=options.motion??createSpiritMotion(!!options.home);
  const isStill=()=>!!options.still||reduced.matches;
  const rest=createSpiritMotion(false).tick(0);
  const turn=createZenoTurn();
  const interactive=options.interactive??!options.form;
  const targetElement=interactive instanceof HTMLElement?interactive:host;
  let pose={...rest}, dead=false, suspended=false, visible=true, raf=0, last=0, time=0;
  const render=(now:number)=>{
    raf=0;if(dead||suspended||!visible||document.hidden)return;
    if(now-last>=1000/(options.fps??60)||isStill()||!last){
      const dt=last?Math.min((now-last)/1000,.1):0;last=now;if(!isStill())time+=dt;
      const target=isStill()?rest:motion.tick(dt);
      // A short blend lets tapping wake a drowsy spirit without snapping its body or eyelids.
      const blend=isStill()?1:1-Math.exp(-dt*18);
      for(const k of ['x','y','yaw','roll','pitch','fin','finPitch','eye','smile','yawn'] as const)pose[k]+=(target[k]-pose[k])*blend;
      host.dataset.spiritMood=target.mood;
      const rotation=turn.tick(dt,isStill());
      const yaw=interactive?THREE.MathUtils.clamp(pose.yaw+rotation.yaw,-ZENO_TURN_LIMIT.yaw,ZENO_TURN_LIMIT.yaw):pose.yaw;
      const pitch=interactive?THREE.MathUtils.clamp(pose.pitch+rotation.pitch,-ZENO_TURN_LIMIT.pitch,ZENO_TURN_LIMIT.pitch):pose.pitch;
      host.dataset.zenoYaw=String(yaw*180/Math.PI);host.dataset.zenoPitch=String(pitch*180/Math.PI);
      spirit.position.set(pose.x,pose.y,0);spirit.rotation.set(pitch,yaw+(typeof options.viewYaw==='function'?options.viewYaw():options.viewYaw??0),pose.roll);
      left.rotation.set(pose.finPitch,0,-pose.fin);right.rotation.set(-pose.finPitch,0,pose.fin);
      eyes.forEach(e=>{e.scale.y=1.7*Math.max(.045,pose.eye);e.visible=pose.smile<.97;});
      smiles.forEach(e=>e.scale.y=.65+.35*pose.smile);smileMat.opacity=pose.smile;yawnMat.opacity=pose.yawn;
      mouth.scale.x=.8+.2*pose.smile;shadow.scale.x=1-pose.y*.3;
      form.update?.({...pose,mood:target.mood,elapsed:target.elapsed},isStill()?0:dt,time);
      if(options.home){
        key.intensity=.55+homeDaylight.sun*1.85;
        key.position.set(-5+Math.sin(homeDaylight.time*.07)*.22,5,2.5);
        skyFill.intensity=1.06+(1-homeDaylight.sun)*.16;
        scene.environmentIntensity=.24+homeDaylight.sun*.10;
      }
      renderer.render(scene,camera);
    }
    if(!isStill())raf=requestAnimationFrame(render);
  };
  const start=()=>{if(!dead&&!suspended&&!raf&&visible&&!document.hidden)raf=requestAnimationFrame(render);};
  const stop=()=>{cancelAnimationFrame(raf);raf=0;last=0;};
  const size=()=>{const b=host.getBoundingClientRect();renderer.setSize(Math.max(1,b.width),Math.max(1,b.height),false);camera.aspect=Math.max(1,b.width)/Math.max(1,b.height);camera.updateProjectionMatrix();start();};
  const resize=new ResizeObserver(size);resize.observe(host);
  const intersection=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;visible?start():stop();});intersection?.observe(host);
  const onVisibility=()=>{document.hidden?stop():start();};
  const onReduced=()=>{stop();start();};
  const offDaylight=options.home?onHomeDaylightReady(()=>{last=0;start();}):()=>{};
  document.addEventListener('visibilitychange',onVisibility);reduced.addEventListener('change',onReduced);size();
  if(interactive&&targetElement===host){host.removeAttribute('aria-hidden');host.setAttribute('role','button');host.tabIndex=0;host.setAttribute('aria-label',loungeText('ゼノに挨拶する','Greet Zeno','제노에게 인사하기'));}
  const greet=()=>{if(dead||isStill())return;motion.greet();start();};
  const unbind=interactive?bindZenoInteraction(targetElement,turn,greet,start):()=>{};
  return {
    greet,
    suspend(){suspended=true;stop();},
    resume(){if(dead)return;suspended=false;visible=true;size();},
    celebrate(){if(dead||isStill())return;motion.celebrate();start();},
    destroy(){
      dead=true;offDaylight();unbind();stop();resize.disconnect();intersection?.disconnect();document.removeEventListener('visibilitychange',onVisibility);reduced.removeEventListener('change',onReduced);
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>([pearl,blue]);
      scene.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());silhouetteMaterial?.dispose();environment.dispose();renderer.dispose();renderer.forceContextLoss();host.replaceChildren();delete host.dataset.spiritMood;delete host.dataset.zenoYaw;delete host.dataset.zenoPitch;
      if(interactive&&targetElement===host){host.removeAttribute('role');host.removeAttribute('tabindex');host.removeAttribute('aria-label');}
    },
  };
}

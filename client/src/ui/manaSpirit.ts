import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createSpiritMotion } from './manaSpiritMotion';
import { addCrystalOptics } from './readingCrystalOptics';

/** Original mana spirit: the same teardrop, ink face and folded fins in every screen. */
export function mountManaSpirit(host: HTMLElement, options: {home?: boolean} = {}): { celebrate():void; destroy():void } {
  host.classList.add('mana-spirit'); host.setAttribute('aria-hidden','true');
  const fallback=()=>{host.innerHTML='<svg viewBox="0 0 120 140"><defs><linearGradient id="spiritPearl" x2=".8" y2="1"><stop stop-color="#fffdf0"/><stop offset=".55" stop-color="#e4f0eb"/><stop offset="1" stop-color="#89aec1"/></linearGradient></defs><ellipse cx="60" cy="127" rx="26" ry="5" fill="#315569" opacity=".22"/><path d="M60 8C88 30 97 55 92 84L78 106 60 119 42 106 28 84C23 55 34 30 60 8" fill="url(#spiritPearl)" stroke="#98bdcf" stroke-width="1"/><path d="M33 60Q60 45 87 60L82 79Q60 90 38 79Z" fill="#20374e"/><ellipse cx="48" cy="68" rx="3" ry="6" fill="#9ee6f0"/><ellipse cx="72" cy="68" rx="3" ry="6" fill="#9ee6f0"/><path d="m60 91 9 11-9 11-9-11Z" fill="#247db2" stroke="#b69d6e"/><path d="m60 94 5 8-5 5-5-5Z" fill="#9fe9ef"/><path d="m60 94 5 8-5-2Z" fill="#efffff"/></svg>';};
  const staticSpirit=()=>{fallback();return {celebrate(){},destroy(){host.replaceChildren();}};};
  if(typeof WebGL2RenderingContext==='undefined')return staticSpirit();
  let renderer: THREE.WebGLRenderer;
  try {renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});} catch {return staticSpirit();}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.setClearColor(0,0); renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
  host.append(renderer.domElement);
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(32,1,.1,20);
  camera.position.set(0,.35,5.4); camera.lookAt(0,.05,0);
  // A real reflection environment gives the crystal distinct windows and dark facets.
  const room=new RoomEnvironment(), pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(room,.025); scene.environment=environment.texture;
  scene.environmentIntensity=.65; room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xe9f6ff,0x324c69,.8));
  const key=new THREE.DirectionalLight(0xffeedb,2.4); key.position.set(-3,5,4); scene.add(key);
  const rim=new THREE.DirectionalLight(0x8bd8f3,1.8); rim.position.set(3,1,-2); scene.add(rim);
  const pearl=new THREE.MeshPhysicalMaterial({color:0xe9f0e9,roughness:.34,metalness:.025,clearcoat:.38,clearcoatRoughness:.25});
  const blue=new THREE.MeshPhysicalMaterial({color:0x437e9d,roughness:.38,metalness:.13,clearcoat:.25});
  const gold=new THREE.MeshStandardMaterial({color:0xb59b64,roughness:.27,metalness:.82});
  const ink=new THREE.MeshPhysicalMaterial({color:0x0b2032,roughness:.62,clearcoat:.08,envMapIntensity:.22});
  const light=new THREE.MeshStandardMaterial({color:0xa9eef2,emissive:0x54b5d1,emissiveIntensity:.35,roughness:.3});
  const spirit=new THREE.Group(); scene.add(spirit);
  const mesh=(g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0,parent:THREE.Object3D=spirit)=>{const n=new THREE.Mesh(g,m);n.position.set(x,y,z);parent.add(n);return n;};
  // Interpolate the original silhouette before revolving it; angular bands are gone.
  const profile=new THREE.SplineCurve([
    new THREE.Vector2(0,-.83),new THREE.Vector2(.30,-.63),new THREE.Vector2(.56,-.28),new THREE.Vector2(.65,.10),
    new THREE.Vector2(.56,.47),new THREE.Vector2(.33,.72),new THREE.Vector2(.12,.92),new THREE.Vector2(.025,1.16),new THREE.Vector2(0,1.19),
  ]).getPoints(96).map(p=>new THREE.Vector2(Math.max(0,p.x),p.y));
  const shell=mesh(new THREE.LatheGeometry(profile,96),pearl); shell.scale.z=.76;
  const face=mesh(new THREE.SphereGeometry(.47,64,40),ink,0,.15,.43); face.scale.set(1,.56,.26);
  const eyes=[mesh(new THREE.SphereGeometry(.048,24,16),light,-.17,.18,.563),mesh(new THREE.SphereGeometry(.048,24,16),light,.17,.18,.563)];
  eyes.forEach(e=>e.scale.set(.75,1.7,.45));
  const arc=(points:THREE.Vector3[], radius:number)=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,radius,8,false);
  const smileMat=light.clone(); smileMat.transparent=true; smileMat.opacity=0; smileMat.depthWrite=false;
  const smiles=[-1,1].map(side=>mesh(arc([new THREE.Vector3(-.047,0,0),new THREE.Vector3(0,.041,.004),new THREE.Vector3(.047,0,0)],.013),smileMat,side*.17,.17,.577));
  const mouth=mesh(arc([new THREE.Vector3(-.047,.01,0),new THREE.Vector3(0,-.018,.004),new THREE.Vector3(.047,.01,0)],.008),smileMat,0,.037,.563);
  const yawnMat=light.clone(); yawnMat.transparent=true; yawnMat.opacity=0; yawnMat.depthWrite=false;
  const yawn=mesh(new THREE.TorusGeometry(.026,.007,10,32),yawnMat,0,.03,.561); yawn.scale.y=1.35;

  // Cut gem: table, crown, girdle, and pavilion, with separate planar optical facets.
  const gemGeometry=()=>{
    const vertices:number[]=[];
    const rings=[{r:.52,z:.126},{r:1,z:.055},{r:1,z:.025},{r:.12,z:-.085}];
    const point=(ring:number,i:number)=>{const a=i*Math.PI/4;return new THREE.Vector3(Math.cos(a)*.175*rings[ring].r,Math.sin(a)*.205*rings[ring].r,rings[ring].z);};
    const tri=(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3)=>vertices.push(...a.toArray(),...b.toArray(),...c.toArray());
    for(let i=0;i<8;i++){
      tri(new THREE.Vector3(0,0,rings[0].z),point(0,i),point(0,i+1));
      for(let j=0;j<rings.length-1;j++){tri(point(j,i+1),point(j,i),point(j+1,i));tri(point(j,i+1),point(j+1,i),point(j+1,i+1));}
      tri(new THREE.Vector3(0,0,-.09),point(3,i+1),point(3,i));
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g;
  };
  const socket=mesh(new THREE.SphereGeometry(.215,48,24),gold,0,-.33,.412);socket.scale.set(.95,1.10,.24);
  const backing=mesh(new THREE.SphereGeometry(.176,40,24),new THREE.MeshStandardMaterial({color:0x15395e,metalness:.65,roughness:.19}),0,-.33,.463);backing.scale.set(1,1.13,.23);
  const gemMaterial=new THREE.MeshPhysicalMaterial({
    color:0xbcebf6,metalness:0,roughness:.025,transmission:.95,thickness:.32,ior:1.65,
    attenuationColor:0x207fba,attenuationDistance:1,clearcoat:1,clearcoatRoughness:.07,envMapIntensity:2.2,
  });
  const cut=gemGeometry(), positions=cut.getAttribute('position'), planes:number[][]=[];
  for(let i=0;i<positions.count;i+=3){
    const a=new THREE.Vector3().fromBufferAttribute(positions,i), b=new THREE.Vector3().fromBufferAttribute(positions,i+1), c=new THREE.Vector3().fromBufferAttribute(positions,i+2);
    const normal=b.sub(a).cross(c.sub(a)).normalize(), distance=normal.dot(a);
    if(!planes.some(p=>normal.dot(new THREE.Vector3(p[0],p[1],p[2]))>.99999&&Math.abs(p[3]-distance)<.00001))planes.push([...normal.toArray(),distance]);
  }
  // Reuse LORE's bounded internal-reflection pass with this gem's actual hull planes.
  addCrystalOptics(gemMaterial,{planes,center:[0,0,0],scale:1});
  mesh(cut,gemMaterial,0,-.33,.49);
  // Small inclusions are behind the crown, inside the same solid rather than a glow overlay.
  const inclusion=mesh(new THREE.OctahedronGeometry(.068),new THREE.MeshStandardMaterial({color:0x2b87b8,roughness:.16,metalness:.25,emissive:0x12679c,emissiveIntensity:.12}),0,-.33,.497);
  inclusion.scale.set(.8,1.25,.45); inclusion.rotation.z=.22;
  for(const side of [-1,1])for(const up of [-1,1]){
    const prong=mesh(new THREE.SphereGeometry(.023,16,12),gold,side*.132,-.33+up*.148,.532);prong.scale.set(.8,1.2,.8);
  }
  for(const x of [-1,1]){const seam=mesh(new THREE.CapsuleGeometry(.009,.13,4,12),gold,x*.25,-.32,.409);seam.rotation.z=x*.42;}

  // Preserve broad folded fins, smoothing the edge bevel and the blue underside.
  const fin=(side:number)=>{
    const group=new THREE.Group();group.position.set(side*.47,-.09,0);spirit.add(group);
    const shape=new THREE.Shape();shape.moveTo(0,.16);shape.quadraticCurveTo(side*.42,.12,side*.49,-.47);shape.quadraticCurveTo(side*.11,-.39,0,-.23);shape.closePath();
    mesh(new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelSegments:5,steps:1,bevelSize:.022,bevelThickness:.026,curveSegments:28}),pearl,0,0,0,group);
    const fold=mesh(new THREE.SphereGeometry(1,40,24),blue,side*.235,-.18,-.047,group);fold.scale.set(.083,.24,.054);fold.rotation.z=side*.5;
    return group;
  };
  const left=fin(-1),right=fin(1);
  const shadow=mesh(new THREE.CircleGeometry(.53,64),new THREE.MeshBasicMaterial({color:0x284157,transparent:true,opacity:.13,depthWrite:false}),0,-1.07,0,scene);shadow.rotation.x=-Math.PI/2;shadow.scale.y=.65;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const motion=createSpiritMotion(!!options.home);
  const rest=createSpiritMotion(false).tick(0);
  let pose={...rest}, dead=false, visible=true, raf=0, last=0;
  const render=(now:number)=>{
    raf=0;if(dead||!visible||document.hidden)return;
    if(now-last>=1000/60||reduced.matches||!last){
      const dt=last?Math.min((now-last)/1000,.1):0;last=now;
      const target=reduced.matches?rest:motion.tick(dt);
      // A short blend lets tapping wake a drowsy spirit without snapping its body or eyelids.
      const blend=reduced.matches?1:1-Math.exp(-dt*18);
      for(const k of ['x','y','yaw','roll','pitch','fin','finPitch','eye','smile','yawn'] as const)pose[k]+=(target[k]-pose[k])*blend;
      host.dataset.spiritMood=target.mood;
      spirit.position.set(pose.x,pose.y,0);spirit.rotation.set(pose.pitch,pose.yaw,pose.roll);
      left.rotation.set(pose.finPitch,0,-pose.fin);right.rotation.set(-pose.finPitch,0,pose.fin);
      eyes.forEach(e=>{e.scale.y=1.7*Math.max(.045,pose.eye);e.visible=pose.smile<.97;});
      smiles.forEach(e=>e.scale.y=.65+.35*pose.smile);smileMat.opacity=pose.smile;yawnMat.opacity=pose.yawn;
      mouth.scale.x=.8+.2*pose.smile;shadow.scale.x=1-pose.y*.3;
      renderer.render(scene,camera);
    }
    if(!reduced.matches)raf=requestAnimationFrame(render);
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
    celebrate(){if(dead||reduced.matches)return;motion.celebrate();start();},
    destroy(){
      dead=true;stop();resize.disconnect();intersection?.disconnect();document.removeEventListener('visibilitychange',onVisibility);reduced.removeEventListener('change',onReduced);
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
      scene.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());environment.dispose();renderer.dispose();renderer.forceContextLoss();host.replaceChildren();delete host.dataset.spiritMood;
    },
  };
}

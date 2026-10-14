import * as THREE from 'three';
/** Small original, real 3D mana spirit: porcelain shell, ink face and azure core.
 * Geometry and motion are authored here; no external character assets. */
export function mountManaSpirit(host: HTMLElement, options: {home?: boolean} = {}): { celebrate():void; destroy():void } {
  host.classList.add('mana-spirit'); host.setAttribute('aria-hidden','true');
  const fallback=()=>{host.innerHTML='<svg viewBox="0 0 120 140"><ellipse cx="60" cy="127" rx="26" ry="5" fill="#315569" opacity=".22"/><path d="M60 8C88 30 97 55 92 84L78 106 60 119 42 106 28 84C23 55 34 30 60 8" fill="#e8f4ed" stroke="#98bdcf" stroke-width="2"/><path d="M33 60Q60 45 87 60L82 79Q60 90 38 79Z" fill="#20374e"/><ellipse cx="48" cy="68" rx="3" ry="6" fill="#9ee6f0"/><ellipse cx="72" cy="68" rx="3" ry="6" fill="#9ee6f0"/><path d="m60 94 7 7-7 8-7-8Z" fill="#57b9df" stroke="#caaf78"/></svg>';};
  if(typeof WebGL2RenderingContext==='undefined'){fallback();return {celebrate(){},destroy(){host.replaceChildren();}};}
  let renderer: THREE.WebGLRenderer;
  try {renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});} catch {fallback();return {celebrate(){},destroy(){host.replaceChildren();}};}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5)); renderer.setClearColor(0,0); host.append(renderer.domElement);
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(32,1,.1,20);
  camera.position.set(0,.35,5.4); camera.lookAt(0,.05,0);
  scene.add(new THREE.HemisphereLight(0xe8fbff,0x32466a,2.8));
  const key=new THREE.DirectionalLight(0xffead0,3.3); key.position.set(-3,5,4); scene.add(key);
  const rim=new THREE.DirectionalLight(0x6ad7f7,2); rim.position.set(3,1,-2); scene.add(rim);
  const pearl=new THREE.MeshStandardMaterial({color:0xe7efea,roughness:.48,metalness:.12,flatShading:true});
  const blue=new THREE.MeshStandardMaterial({color:0x438cb7,roughness:.38,metalness:.25,flatShading:true});
  const gold=new THREE.MeshStandardMaterial({color:0xbfa875,roughness:.38,metalness:.6});
  const ink=new THREE.MeshStandardMaterial({color:0x122b42,roughness:.8});
  const light=new THREE.MeshStandardMaterial({color:0x8beaf5,emissive:0x44a9db,emissiveIntensity:.6,roughness:.3});
  const spirit=new THREE.Group(); scene.add(spirit);
  const mesh=(g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0,parent:THREE.Object3D=spirit)=>{const n=new THREE.Mesh(g,m);n.position.set(x,y,z);parent.add(n);return n;};
  const shell=mesh(new THREE.LatheGeometry([new THREE.Vector2(.02,-.81),new THREE.Vector2(.30,-.63),new THREE.Vector2(.56,-.28),new THREE.Vector2(.65,.10),new THREE.Vector2(.56,.47),new THREE.Vector2(.33,.72),new THREE.Vector2(.12,.92),new THREE.Vector2(.025,1.19)],24),pearl);
  shell.scale.z=.76;
  const face=mesh(new THREE.SphereGeometry(.47,24,12),ink,0,.15,.39); face.scale.set(1,.56,.26);
  const eyes=[mesh(new THREE.SphereGeometry(.048,12,8),light,-.17,.18,.522),mesh(new THREE.SphereGeometry(.048,12,8),light,.17,.18,.522)];
  eyes.forEach(e=>e.scale.set(.75,1.7,.45));
  const core=mesh(new THREE.OctahedronGeometry(.17),light,0,-.32,.43); core.rotation.z=Math.PI/4;
  const seal=mesh(new THREE.TorusGeometry(.21,.018,6,32),gold,0,-.32,.425);seal.scale.y=.76;
  for(const x of [-1,1]) {const seam=mesh(new THREE.BoxGeometry(.018,.17,.02),gold,x*.22,-.32,.41);seam.rotation.z=x*.42;}
  // Broad folded fins grow directly from the body, with a blue reverse face.
  const fin=(side:number)=>{const group=new THREE.Group();group.position.set(side*.47,-.09,0);spirit.add(group);
    const shape=new THREE.Shape();shape.moveTo(0,.16);shape.quadraticCurveTo(side*.42,.12,side*.49,-.47);shape.quadraticCurveTo(side*.11,-.39,0,-.23);shape.closePath();
    mesh(new THREE.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.02,curveSegments:8}),pearl,0,0,0,group);
    const fold=mesh(new THREE.ConeGeometry(.11,.48,4),blue,side*.25,-.17,-.045,group);fold.rotation.z=side*.5;return group;};
  const left=fin(-1),right=fin(1);
  const shadow=mesh(new THREE.CircleGeometry(.53,32),new THREE.MeshBasicMaterial({color:0x345466,transparent:true,opacity:.14,depthWrite:false}),0,-1.05,0,scene);shadow.rotation.x=-Math.PI/2;shadow.scale.y=.65;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let dead=false, visible=true, raf=0, last=0, celebration=0;
  const render=(now:number)=>{raf=0;if(dead||!visible||document.hidden)return; if(now-last>32||reduced.matches){last=now;const t=reduced.matches?0:now/1000;
    const cheer=reduced.matches?0:Math.max(0,1-(now-celebration)/1100)*(celebration?1:0);
    spirit.position.x=options.home?Math.sin(t*.55)*.10:0;
    spirit.position.y=Math.sin(t*1.8)*(options.home ? .085 : .055)+cheer*Math.sin(cheer*Math.PI)*.12;
    spirit.rotation.y=Math.sin(t*.8)*(options.home ? .25 : .14);spirit.rotation.z=Math.sin(t*1.2)*.025;
    left.rotation.z=-.04-Math.sin(t*1.8)*.045-cheer*.32;right.rotation.z=.04+Math.sin(t*1.8)*.045+cheer*.32;
    if(options.home){right.rotation.z+=cheer*Math.sin((1-cheer)*Math.PI*6)*.22;core.rotation.y=Math.sin(t*.9)*.12;}
    const blink=!reduced.matches&&t%5.8>5.64?.16:1;eyes.forEach(e=>e.scale.y=1.7*blink);
    shadow.scale.x=1-Math.sin(t*1.8)*.025;renderer.render(scene,camera);
  } if(!reduced.matches)raf=requestAnimationFrame(render);};
  const start=()=>{if(!dead&&!raf&&visible&&!document.hidden)raf=requestAnimationFrame(render);};
  const size=()=>{const b=host.getBoundingClientRect();renderer.setSize(Math.max(1,b.width),Math.max(1,b.height),false);camera.aspect=Math.max(1,b.width)/Math.max(1,b.height);camera.updateProjectionMatrix();start();};
  const resize=new ResizeObserver(size);resize.observe(host);
  const intersection=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;start();});intersection?.observe(host);
  const onVisibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else start();};
  document.addEventListener('visibilitychange',onVisibility);reduced.addEventListener('change',start);size();
  return {celebrate(){celebration=performance.now();start();},destroy(){dead=true;cancelAnimationFrame(raf);resize.disconnect();intersection?.disconnect();document.removeEventListener('visibilitychange',onVisibility);reduced.removeEventListener('change',start);
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();scene.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();host.replaceChildren();}};
}

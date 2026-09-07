/** One WebGL context, five scissored perspective views. DOM owns input and values;
 * real geometry owns the deck, standing-card shelf, glass, sand and landing dust. */
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

type Item = { scene: T.Scene; camera: T.PerspectiveCamera; group: T.Group; key: string; element: HTMLElement; upper?: T.Mesh; lower?: T.Mesh; stream?: T.Points; fraction?: number };
const clamp = (n: number) => Math.min(1, Math.max(0, n));
export function mountDuelScene(root: HTMLElement): () => void {
  let renderer: T.WebGLRenderer;
  try { renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch { return () => {}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0, 0);
  renderer.autoClear = false;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'duel-objects-3d'; canvas.setAttribute('aria-hidden', 'true');
  root.appendChild(canvas);
  const pmrem = new T.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04);
  room.dispose(); pmrem.dispose();
  const textures = new Map<string, T.Texture>();
  const loader = new T.TextureLoader();
  let dead = false, dirty = true, frame = 0, last = 0, width = 0, height = 0;
  const items = new Map<string, Item>();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const texture = (url: string): T.Texture => {
    let result = textures.get(url);
    if (!result) { result = loader.load(url, t => { if (dead) t.dispose(); }); result.colorSpace = T.SRGBColorSpace; result.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); textures.set(url, result); }
    return result;
  };
  const metal = () => new T.MeshStandardMaterial({ color: 0xc5a369, metalness: .82, roughness: .27 });
  const enamel = () => new T.MeshStandardMaterial({ color: 0x122943, metalness: .42, roughness: .3 });
  function mesh(g: T.BufferGeometry, m: T.Material | T.Material[], parent: T.Object3D, x=0,y=0,z=0): T.Mesh {
    const a = new T.Mesh(g,m); a.position.set(x,y,z); a.castShadow=true; a.receiveShadow=true; parent.add(a); return a;
  }
  function box(parent: T.Object3D,w:number,h:number,d:number,m:T.Material,x=0,y=0,z=0):T.Mesh { return mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.18),m,parent,x,y,z); }
  function disposeObject(object: T.Object3D):void {
    const geometries=new Set<T.BufferGeometry>(), materials=new Set<T.Material>();
    object.traverse(o=>{const a=o as T.Mesh; if(a.geometry)geometries.add(a.geometry); if(a.material)(Array.isArray(a.material)?a.material:[a.material]).forEach(m=>materials.add(m));});
    geometries.forEach(g=>g.dispose()); materials.forEach(m=>m.dispose());
  }
  function base(el:HTMLElement, clock:boolean):Item {
    const scene=new T.Scene(); scene.environment=environment.texture;
    const camera=new T.PerspectiveCamera(34,1,.1,50);
    camera.position.set(clock?1.8:2.2,clock?1.2:3.1,clock?6.8:5.2); camera.lookAt(0,clock?0:.35,0); camera.zoom=clock?1.25:1.8; camera.updateProjectionMatrix();
    scene.add(new T.HemisphereLight(0xd4ebff,0x493423,1.3));
    const light=new T.DirectionalLight(0xffe6bc,2.5); light.position.set(-3,7,5);light.castShadow=true;light.shadow.autoUpdate=false;light.shadow.needsUpdate=true;light.shadow.mapSize.set(512,512);light.shadow.camera.left=-3;light.shadow.camera.right=3;light.shadow.camera.top=3;light.shadow.camera.bottom=-3;light.shadow.bias=-.002;scene.add(light);
    const rim=new T.DirectionalLight(0x75bfff,2);rim.position.set(3,2,-2);scene.add(rim);
    const ground=mesh(new T.PlaneGeometry(6,6),new T.ShadowMaterial({opacity:.24}),scene,0,clock?-1.46:-.03,0);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
    const group=new T.Group();scene.add(group);
    return {scene,camera,group,key:'',element:el};
  }
  function deck(item:Item,count:number,url:string):void {
    const gold=metal(), paper=new T.MeshStandardMaterial({color:0xd7c5a1,roughness:.72});
    box(item.group,1.15,.08,1.65,enamel(),0,.01,0);
    for(let i=0;i<Math.min(count,24);i++) {
      const c=box(item.group,1,.018,1.48,i%3===0?gold:paper,Math.sin(i*1.9)*.014,.07+i*.022,Math.cos(i)*.009);
      c.rotation.y=Math.sin(i)*.014;
    }
    if(count) {
      const face=mesh(new T.PlaneGeometry(.99,1.47),new T.MeshStandardMaterial({map:texture(url),roughness:.4,metalness:.12}),item.group,0,.08+Math.min(count,24)*.022,0);
      face.rotation.x=-Math.PI/2;
    }
  }
  function shelf(item:Item,count:number,url:string,frontUrl:string):void {
    const gold=metal(), navy=enamel();
    box(item.group,1.82,.16,1.24,navy,0,.08,0);
    box(item.group,1.85,.055,1.27,gold,0,.02,0);
    for(const x of [-.87,.87]) {box(item.group,.085,.66,1.22,navy,x,.38,0);box(item.group,.10,.045,1.24,gold,x,.72,0);}
    box(item.group,1.76,.30,.08,navy,0,.3,.58);
    box(item.group,1.78,.04,.10,gold,0,.47,.58);
    const n=Math.min(count,9);
    for(let i=0;i<n;i++) {
      const card=new T.Group();card.position.set(0,.67,.38-i*.105);card.rotation.x=-.14;item.group.add(card);
      box(card,1.58,.94,.022,new T.MeshStandardMaterial({color:0xd6c8ac,roughness:.62}));
      // Landscape cards are genuinely standing on their long edge inside the rack.
      const face=mesh(new T.PlaneGeometry(1.54,.91),new T.MeshStandardMaterial({map:texture(i===0?frontUrl:url),roughness:.6,metalness:0}),card,0,0,.014);
      (face.material as T.Material).side=T.DoubleSide;
      if(i===0)mesh(new T.PlaneGeometry(1.56,.93),new T.MeshStandardMaterial({map:texture('/art/biblion/ui/field-frame.png'),transparent:true,roughness:.4,metalness:.2,depthWrite:false}),card,0,0,.018);
    }
  }
  function hourglass(item:Item):void {
    const gold=metal(), navy=enamel();
    for(const y of [-1.33,1.33]) {
      mesh(new T.CylinderGeometry(.71,.71,.12,48),gold,item.group,0,y,0);
      mesh(new T.CylinderGeometry(.64,.68,.08,48),navy,item.group,0,y+(y>0?.09:-.09),0);
      mesh(new T.TorusGeometry(.59,.025,8,48),gold,item.group,0,y+(y>0?.14:-.14),0).rotation.x=Math.PI/2;
    }
    for(let i=0;i<4;i++) {
      const a=Math.PI/4+i*Math.PI/2, x=Math.cos(a)*.59,z=Math.sin(a)*.59;
      mesh(new T.CylinderGeometry(.038,.045,2.53,12),gold,item.group,x,0,z);
      for(const y of [-1.15,1.15])mesh(new T.SphereGeometry(.073,12,8),gold,item.group,x,y,z);
    }
    const profile=[new T.Vector2(.001,-1.21),new T.Vector2(.38,-1.18),new T.Vector2(.47,-.94),new T.Vector2(.40,-.61),new T.Vector2(.16,-.22),new T.Vector2(.065,0),new T.Vector2(.16,.22),new T.Vector2(.40,.61),new T.Vector2(.47,.94),new T.Vector2(.38,1.18),new T.Vector2(.001,1.21)];
    // Transparent glass geometry with physical reflected highlights; the interior sand remains visible.
    mesh(new T.LatheGeometry(profile,48),new T.MeshPhysicalMaterial({color:0xc5e9ff,metalness:0,roughness:.08,transparent:true,opacity:.19,side:T.DoubleSide,depthWrite:false,clearcoat:1,ior:1.46}),item.group);
    const sand=new T.MeshStandardMaterial({color:0xe5bb72,roughness:.92,emissive:0x6d4913,emissiveIntensity:.17});
    // Upper funnel grows from neck; lower mound fills from the bottom.
    item.upper=mesh(new T.ConeGeometry(.39,1.06,32),sand,item.group,0,.56,0);item.upper.rotation.z=Math.PI;
    item.lower=mesh(new T.ConeGeometry(.41,.95,32),sand,item.group,0,-.72,0);
    const positions=new Float32Array(22*3); for(let i=0;i<22;i++){positions[i*3]=Math.sin(i*8)*.018;positions[i*3+1]=-i/22;positions[i*3+2]=Math.cos(i*9)*.018;}
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
    item.stream=new T.Points(geometry,new T.PointsMaterial({color:0xffdb92,size:.023}));item.group.add(item.stream);
  }
  function refresh():void {
    const elements=[...root.querySelectorAll<HTMLElement>('.pile'),...root.querySelectorAll<HTMLElement>('.mp-clock.show')];
    const ids=new Set(elements.map(el=>el.id));
    for(const [id,item] of items)if(!ids.has(id)){disposeObject(item.scene);items.delete(id);}
    for(const el of elements) {
      const clock=el.classList.contains('mp-clock');
      const key=clock?'clock':`${el.dataset.count}:${el.dataset.texture}:${el.dataset.sleeve}`;
      let item=items.get(el.id);
      if(item?.key===key){item.element=el;continue;}
      if(item)disposeObject(item.scene);
      item=base(el,clock);item.key=key;items.set(el.id,item);
      if(clock)hourglass(item);
      else if(el.classList.contains('pile--shelf'))shelf(item,Number(el.dataset.count)||0,el.dataset.sleeve!,el.dataset.texture!);
      else deck(item,Number(el.dataset.count)||0,el.dataset.texture!);
    }
    // A duel can cycle through many cards; retain only textures on current meshes.
    const used=new Set<T.Texture>();
    for(const item of items.values())item.group.traverse(o=>{const m=(o as T.Mesh).material;if(m)(Array.isArray(m)?m:[m]).forEach(v=>{const map=(v as T.MeshStandardMaterial).map;if(map)used.add(map);});});
    for(const [url,map] of textures)if(!used.has(map)){map.dispose();textures.delete(url);}
  }
  const observer=new MutationObserver(()=>{dirty=true;});
  observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-count','data-texture','data-sleeve']});
  const dustScene=new T.Scene(), dustCamera=new T.PerspectiveCamera(45,1,1,4000);
  const dusts:Array<{group:T.Group;start:number;rect:DOMRect}>=[];
  const onDust=(event:Event):void=>{
    if(reduced.matches)return;
    const rect=(event as CustomEvent<DOMRect>).detail;
    const group=new T.Group();dustScene.add(group);
    for(let i=0;i<22;i++)mesh(new T.IcosahedronGeometry(1.5+(i%4),0),new T.MeshBasicMaterial({color:i%3?0xcbbda5:0xf9e6b1,transparent:true,opacity:.28,depthWrite:false}),group);
    dusts.push({group,start:performance.now(),rect});
  };
  window.addEventListener('lore:summon-dust',onDust);
  function render(now:number):void {
    if(dead)return;
    frame=requestAnimationFrame(render);
    if(document.hidden||now-last<33)return;
    const delta=Math.min((now-last)/1000,.1);last=now;
    if(!root.isConnected){dispose();return;}
    if(width!==innerWidth||height!==innerHeight){width=innerWidth;height=innerHeight;renderer.setSize(width,height);dirty=true;}
    if(dirty){refresh();dirty=false;}
    renderer.setScissorTest(false);renderer.clear();renderer.setScissorTest(true);
    for(const item of items.values()) {
      const clock=!!item.upper;
      const el=clock?item.element.querySelector<HTMLElement>('.hourglass-anchor'):item.element;
      if(!el)continue;
      const r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;
      if(clock){
        const target=clamp(Number(item.element.dataset.remaining)/Math.max(1,Number(item.element.dataset.total)));
        item.fraction=item.fraction==null?target:T.MathUtils.damp(item.fraction,target,7,delta);
        const f=item.fraction,upperHeight=Math.cbrt(f),lowerHeight=Math.cbrt(1-f);
        item.upper!.scale.set(upperHeight,upperHeight,upperHeight);item.upper!.position.y=.05+upperHeight*.53;item.upper!.visible=f>.001;
        item.lower!.scale.set(lowerHeight,lowerHeight,lowerHeight);item.lower!.position.y=-1.19+lowerHeight*.475;item.lower!.visible=f<.999;
        item.stream!.visible=f>0&&f<1;
        const pos=item.stream!.geometry.attributes.position;
        if(!reduced.matches)for(let i=0;i<pos.count;i++)pos.setY(i,-((i/pos.count+now*.0006)%1)*1.1);
        pos.needsUpdate=true;
      }
      // Each view has its own perspective camera and real self-occlusion, not CSS transforms.
      item.camera.aspect=r.width/r.height;item.camera.updateProjectionMatrix();
      renderer.setViewport(r.left,height-r.bottom,r.width,r.height);renderer.setScissor(r.left,height-r.bottom,r.width,r.height);
      renderer.render(item.scene,item.camera);
    }
    if(dusts.length){
      renderer.setViewport(0,0,width,height);renderer.setScissor(0,0,width,height);renderer.clearDepth();
      dustCamera.aspect=width/height;dustCamera.position.z=height/(2*Math.tan(Math.PI/8));dustCamera.updateProjectionMatrix();
      for(let j=dusts.length-1;j>=0;j--){const d=dusts[j],age=(now-d.start)/800;
        if(age>=1){dustScene.remove(d.group);disposeObject(d.group);dusts.splice(j,1);continue;}
        d.group.position.set(d.rect.left+d.rect.width/2-width/2,height/2-d.rect.bottom,0);
        d.group.children.forEach((o,i)=>{const m=o as T.Mesh;const angle=i*2.399;m.position.set(Math.cos(angle)*age*70,Math.sin(angle)*age*12+Math.sin(age*Math.PI)*16,Math.sin(angle)*age*38);m.rotation.set(age*i,age*2,0);m.scale.setScalar(1+age*2);(m.material as T.MeshBasicMaterial).opacity=(1-age)*.25;});
      }
      renderer.render(dustScene,dustCamera);
    }
    if(!root.classList.contains('duel-webgl'))root.classList.add('duel-webgl');
  }
  const lost=(e:Event):void=>{e.preventDefault();dispose();};canvas.addEventListener('webglcontextlost',lost);
  function dispose():void {
    if(dead)return;dead=true;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('lore:summon-dust',onDust);canvas.removeEventListener('webglcontextlost',lost);
    items.forEach(item=>disposeObject(item.scene));disposeObject(dustScene);textures.forEach(t=>t.dispose());environment.dispose();renderer.dispose();canvas.remove();root.classList.remove('duel-webgl');
  }
  frame=requestAnimationFrame(render);
  return dispose;
}

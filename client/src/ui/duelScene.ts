/** One WebGL context for library furniture, card stacks and the hourglass.
 * Semantic controls/count labels stay in the DOM, with raster GPU fallback. */
import * as T from 'three';
import { makePile, type PileModel } from './pileModels';
import { captureCardSurface, CARD_PADDING } from './cardSurface';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createDuelTable } from './duelTable';
import { loadLibraryAssets } from './libraryAssets';

type Item = { scene: T.Scene; camera: T.PerspectiveCamera|T.OrthographicCamera; group: T.Group; key: string; element: HTMLElement; market?:boolean; upper?: T.Mesh; lower?: T.Mesh; stream?: T.Points; fraction?: number; pile?:PileModel; count?:number; entered?:number; surface?:T.Texture };
const clamp = (n: number) => Math.min(1, Math.max(0, n));
export function mountDuelScene(root: HTMLElement): () => void {
  let renderer: T.WebGLRenderer;
  try { renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch { return () => {}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0, 0);
  renderer.autoClear = false;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .82;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'duel-objects-3d'; canvas.setAttribute('aria-hidden', 'true');
  root.appendChild(canvas);
  const pmrem = new T.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04);
  room.dispose(); pmrem.dispose();
  const table = createDuelTable(root, environment.texture);
  let dead = false, dirty = true, frame = 0, last = 0, width = 0, height = 0;
  const furniture=loadLibraryAssets(()=>{dirty=true;});
  const items = new Map<string, Item>();
  const textures=new Map<string,T.Texture>();
  const textureLoader=new T.TextureLoader();
  function texture(url:string):T.Texture {
    let map=textures.get(url);
    if(!map){map=textureLoader.load(url);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;textures.set(url,map);}
    return map;
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const metal = () => new T.MeshStandardMaterial({ color: 0xd2c7a6, metalness: .7, roughness: .23 });
  const enamel = () => new T.MeshStandardMaterial({ color: 0x122943, metalness: .42, roughness: .3 });
  function mesh(g: T.BufferGeometry, m: T.Material | T.Material[], parent: T.Object3D, x=0,y=0,z=0): T.Mesh {
    const a = new T.Mesh(g,m); a.position.set(x,y,z); a.castShadow=true; a.receiveShadow=true; parent.add(a); return a;
  }
  function disposeObject(object: T.Object3D):void {
    const geometries=new Set<T.BufferGeometry>(), materials=new Set<T.Material>();
    object.traverse(o=>{if(o instanceof T.DirectionalLight)o.shadow.dispose();const a=o as T.Mesh; if(a.geometry)geometries.add(a.geometry); if(a.material)(Array.isArray(a.material)?a.material:[a.material]).forEach(m=>materials.add(m));});
    geometries.forEach(g=>g.dispose()); materials.forEach(m=>m.dispose());
  }
  function base(el:HTMLElement, clock:boolean):Item {
    const scene=new T.Scene(); scene.environment=environment.texture;
    const camera=new T.PerspectiveCamera(34,1,.1,50);
    camera.position.set(.9,.55,6.8); camera.lookAt(0,clock?0:.35,0); camera.zoom=clock?1.25:1.8; camera.updateProjectionMatrix();
    scene.add(new T.HemisphereLight(0xd4ebff,0x493423,1.3));
    const light=new T.DirectionalLight(0xffe6bc,1.8); light.position.set(-3,7,5);light.castShadow=true;light.shadow.autoUpdate=false;light.shadow.needsUpdate=true;light.shadow.mapSize.set(512,512);light.shadow.camera.left=-3;light.shadow.camera.right=3;light.shadow.camera.top=3;light.shadow.camera.bottom=-3;light.shadow.bias=-.002;scene.add(light);
    const rim=new T.DirectionalLight(0x75bfff,.9);rim.position.set(3,2,-2);scene.add(rim);
    if(!el.classList.contains('market-counter')){
      const ground=mesh(new T.PlaneGeometry(6,6),new T.ShadowMaterial({opacity:.24}),scene,0,clock?-1.46:0,0);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
    }
    const group=new T.Group();scene.add(group);
    return {scene,camera,group,key:'',element:el};
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
      mesh(new T.LatheGeometry([new T.Vector2(.065,-1.26),new T.Vector2(.055,-1.1),new T.Vector2(.032,-.75),new T.Vector2(.028,0),new T.Vector2(.032,.75),new T.Vector2(.055,1.1),new T.Vector2(.065,1.26)],20),navy,item.group,x,0,z);
      for(const y of [-1.15,1.15])mesh(new T.SphereGeometry(.073,12,8),gold,item.group,x,y,z);
    }
    for (const y of [-1.28,1.28]) {
      mesh(new T.TorusGeometry(.67,.018,8,64),gold,item.group,0,y,0).rotation.x=Math.PI/2;
      for(let i=0;i<12;i++){const a=i*Math.PI/6;const inset=mesh(new T.OctahedronGeometry(.04),new T.MeshStandardMaterial({color:0x9bcfe2,metalness:.4,roughness:.2}),item.group,Math.cos(a)*.69,y,Math.sin(a)*.69);inset.scale.y=.6;}
    }
    const profile=[new T.Vector2(.001,-1.21),new T.Vector2(.38,-1.18),new T.Vector2(.47,-.94),new T.Vector2(.40,-.61),new T.Vector2(.16,-.22),new T.Vector2(.065,0),new T.Vector2(.16,.22),new T.Vector2(.40,.61),new T.Vector2(.47,.94),new T.Vector2(.38,1.18),new T.Vector2(.001,1.21)];
    // Transparent glass geometry with physical reflected highlights; the interior sand remains visible.
    mesh(new T.LatheGeometry(profile,48),new T.MeshPhysicalMaterial({color:0xc5e9ff,metalness:0,roughness:.08,transparent:true,opacity:.26,side:T.DoubleSide,depthWrite:false,clearcoat:1,ior:1.46}),item.group);
    const sand=new T.MeshStandardMaterial({color:0xe5bb72,roughness:.92,emissive:0x6d4913,emissiveIntensity:.17});
    // Upper funnel grows from neck; lower mound fills from the bottom.
    item.upper=mesh(new T.ConeGeometry(.39,1.06,32),sand,item.group,0,.56,0);item.upper.rotation.z=Math.PI;
    item.lower=mesh(new T.ConeGeometry(.41,.95,32),sand,item.group,0,-.72,0);
    const positions=new Float32Array(22*3); for(let i=0;i<22;i++){positions[i*3]=Math.sin(i*8)*.018;positions[i*3+1]=-i/22;positions[i*3+2]=Math.cos(i*9)*.018;}
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
    item.stream=new T.Points(geometry,new T.PointsMaterial({color:0xffdb92,size:.023}));item.group.add(item.stream);
  }
  function refresh():void {
    const elements=[...root.querySelectorAll<HTMLElement>('.mp-clock.show, .pile--deck, .pile--shelf, .market-counter')];
    const itemId=(el:HTMLElement)=>el.classList.contains('market-counter')?'market-base':el.id;
    const ids=new Set(elements.map(itemId));
    for(const [id,item] of items)if(!ids.has(id)){disposeObject(item.scene);item.surface?.dispose();items.delete(id);}
    for(const el of elements) {
      const id=itemId(el),market=id==='market-base';
      if(market&&!furniture.has('market'))continue;
      const clock=el.classList.contains('mp-clock');
      const key=clock?'clock':`${el.dataset.count}:${el.dataset.face}:${el.dataset.sleeve}:${furniture.revision}`;
      let item=items.get(id);
      if(item?.key===key){item.element=el;continue;}
      const previousCount=item?.count;
      if(item){disposeObject(item.scene);item.surface?.dispose();}
      item=base(el,clock);item.key=key;items.set(id,item);
      if(market){
        item.market=true;item.group.add(furniture.clone('market')!);
        item.camera=new T.OrthographicCamera(-3.05,3.05,1,-1,.01,50);
        item.camera.position.set(0,Math.cos(32*Math.PI/180)*8,Math.sin(32*Math.PI/180)*8);item.camera.lookAt(0,-.04,0);
      } else if(clock)hourglass(item);
      else {
        const shelf=el.classList.contains('pile--shelf'),count=Number(el.dataset.count)||0;
        item.count=count;
        item.pile=makePile(count,shelf,texture(el.dataset.sleeve!),shelf&&el.dataset.face?texture(el.dataset.face):undefined,furniture.clone(shelf?'shelf':'deck'));
        item.group.add(item.pile.group);
        if(shelf&&previousCount!=null&&count>previousCount&&!reduced.matches)item.entered=performance.now();
        item.camera.position.set(0,shelf?2.8:4.7,shelf?5.8:3.3);
        item.camera.lookAt(0,shelf?.55:.12,0);item.camera.zoom=shelf?1.18:1.7;
        el.dataset.furniture=furniture.has(shelf?'shelf':'deck')?'blender':'fallback';
        const print=el.querySelector<HTMLElement>('.pile-print .card');
        if(shelf&&count&&print){
          const owner=item;
          void captureCardSurface(print,el.dataset.sleeve!,true).then(surface=>{
            if(dead||items.get(el.id)!==owner||!surface.face)return;
            const map=new T.CanvasTexture(surface.face);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
            map.offset.set(CARD_PADDING/(1+2*CARD_PADDING),CARD_PADDING/(1/.64+2*CARD_PADDING));
            map.repeat.set(1/(1+2*CARD_PADDING),(1/.64)/(1/.64+2*CARD_PADDING));
            owner.surface=map;
            const front=owner.pile!.top.getObjectByName('stock-front') as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>;
            if(front){front.material.map=map;front.material.emissiveMap=map;front.material.transparent=true;front.material.alphaTest=.025;front.material.needsUpdate=true;}
          }).catch(()=>{});
        }
      }
    }

    const used=new Set(elements.flatMap(el=>[el.dataset.sleeve,el.dataset.face]).filter(Boolean));
    for(const [url,map] of textures)if(!used.has(url)){map.dispose();textures.delete(url);}
  }
  const observer=new MutationObserver(()=>{dirty=true;});
  observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-count','data-texture','data-sleeve','data-face']});
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
  const flows:Array<{group:T.Group;start:number;from:DOMRect;to:DOMRect}>=[];
  const onFlow=(event:Event):void=>{
    if(reduced.matches)return;
    const {from,to}=(event as CustomEvent<{from:DOMRect;to:DOMRect}>).detail;
    const group=new T.Group();dustScene.add(group);
    for(let i=0;i<64;i++)mesh(new T.OctahedronGeometry(1+(i%4)*.6),new T.MeshBasicMaterial({color:i%3?0xb9eaff:0xfff4d6,transparent:true,blending:T.AdditiveBlending,depthWrite:false}),group);
    flows.push({group,start:performance.now(),from,to});
  };
  window.addEventListener('lore:buff-flow',onFlow);
  function render(now:number):void {
    if(dead)return;
    frame=requestAnimationFrame(render);
    if(document.hidden||now-last<33)return;
    const delta=Math.min((now-last)/1000,.1);last=now;
    if(!root.isConnected){dispose();return;}
    if(width!==innerWidth||height!==innerHeight){width=innerWidth;height=innerHeight;renderer.setSize(width,height);dirty=true;}
    if(dirty){refresh();dirty=false;}
    renderer.setScissorTest(false);renderer.clear();renderer.setScissorTest(true);
    table.render(renderer,width,height);
    // The table and individual props use independent cameras but share one context.
    renderer.clearDepth();
    for(const item of items.values()) {
      const clock=!!item.upper;
      const el=clock?item.element.querySelector<HTMLElement>('.hourglass-anchor'):item.element;
      if(!el)continue;
      let r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;
      if(item.market){
        const model=item.group.children[0];model.scale.z=(1/.064)*(r.height/r.width)*6/Math.cos(32*Math.PI/180)/1.1;
        r=new DOMRect(r.left-12,r.top-6,r.width+24,r.height+26);
      }
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
      if(item.camera instanceof T.PerspectiveCamera)item.camera.aspect=r.width/r.height;
      else {item.camera.top=3.05*r.height/r.width;item.camera.bottom=-item.camera.top;}
      item.camera.updateProjectionMatrix();
      renderer.setViewport(r.left,height-r.bottom,r.width,r.height);renderer.setScissor(r.left,height-r.bottom,r.width,r.height);
      if(item.pile){
        item.pile.cards.visible=!item.element.classList.contains('is-shuffling');
        if(item.entered){
          const t=clamp((now-item.entered)/480);
          item.pile.top.position.y=item.pile.top.userData.restY+.3*Math.pow(1-t,3);
          if(t===1)item.entered=undefined;
        }
      }
      renderer.render(item.scene,item.camera);
      if(item.market&&!root.classList.contains('market-model-ready'))root.classList.add('market-model-ready');
      if(item.pile){
        // Project the actual top-card centre into a DOM anchor for draw/shuffle.
        const centre=item.pile.top.getWorldPosition(new T.Vector3()).project(item.camera);
        let anchor=item.element.querySelector<HTMLElement>('.pile-draw-anchor');
        if(!anchor){anchor=document.createElement('span');anchor.className='pile-draw-anchor';item.element.append(anchor);}
        const cardWidth=r.width*(item.element.classList.contains('pile--shelf')?.69:.7);
        anchor.style.cssText=`left:${(centre.x+1)*r.width/2-cardWidth/2}px;top:${(1-centre.y)*r.height/2-cardWidth/.64/2}px;width:${cardWidth}px;height:${cardWidth/.64}px`;
        if(!item.element.classList.contains('pile--3d-ready'))item.element.classList.add('pile--3d-ready');
      }
    }
    if(dusts.length || flows.length){
      renderer.setViewport(0,0,width,height);renderer.setScissor(0,0,width,height);renderer.clearDepth();
      dustCamera.aspect=width/height;dustCamera.position.z=height/(2*Math.tan(Math.PI/8));dustCamera.updateProjectionMatrix();
      for(let j=dusts.length-1;j>=0;j--){const d=dusts[j],age=(now-d.start)/800;
        if(age>=1){dustScene.remove(d.group);disposeObject(d.group);dusts.splice(j,1);continue;}
        d.group.position.set(d.rect.left+d.rect.width/2-width/2,height/2-d.rect.bottom,0);
        d.group.children.forEach((o,i)=>{const m=o as T.Mesh;const angle=i*2.399;m.position.set(Math.cos(angle)*age*70,Math.sin(angle)*age*12+Math.sin(age*Math.PI)*16,Math.sin(angle)*age*38);m.rotation.set(age*i,age*2,0);m.scale.setScalar(1+age*2);(m.material as T.MeshBasicMaterial).opacity=(1-age)*.25;});
      }
      for(let j=flows.length-1;j>=0;j--){
        const f=flows[j],age=(now-f.start)/700;
        if(age>=1){dustScene.remove(f.group);disposeObject(f.group);flows.splice(j,1);continue;}
        f.group.children.forEach((o,i)=>{const m=o as T.Mesh,p=clamp((age-i*.002)/.87),a=i*2.399;
          const sx=f.from.left+f.from.width*(.5+Math.cos(a)*.35),sy=f.from.top+f.from.height*(.5+Math.sin(a)*.35);
          const tx=f.to.left+f.to.width/2,ty=f.to.top+f.to.height/2;
          m.position.set(sx+(tx-sx)*p-width/2,height/2-(sy+(ty-sy)*p)+Math.sin(p*Math.PI)*55,Math.sin(p*Math.PI)*80);
          m.rotation.set(p*6,a,p*4);m.scale.setScalar((1-p)*1.3+.3);(m.material as T.MeshBasicMaterial).opacity=Math.sin(p*Math.PI)*.9;
        });
      }
      renderer.render(dustScene,dustCamera);
    }
    if(!root.classList.contains('duel-webgl'))root.classList.add('duel-webgl');
  }
  const lost=(e:Event):void=>{e.preventDefault();dispose();};canvas.addEventListener('webglcontextlost',lost);
  function dispose():void {
    if(dead)return;dead=true;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('lore:summon-dust',onDust);window.removeEventListener('lore:buff-flow',onFlow);canvas.removeEventListener('webglcontextlost',lost);
    items.forEach(item=>{disposeObject(item.scene);item.surface?.dispose();});textures.forEach(t=>t.dispose());
    root.querySelectorAll('.pile--3d-ready').forEach(el=>{el.classList.remove('pile--3d-ready');el.querySelector('.pile-draw-anchor')?.remove();});
    table.dispose();furniture.dispose();disposeObject(dustScene);environment.dispose();renderer.dispose();canvas.remove();root.classList.remove('duel-webgl','market-model-ready');
  }
  frame=requestAnimationFrame(render);
  return dispose;
}

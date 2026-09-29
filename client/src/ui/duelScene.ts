import {disposeFormationBloom} from './manaFormation';
import {getManaFormation} from './manaFormationPreview';
import {dustTexture,dustDuration,dustPose,createDust} from './impactDust';
import {bindOpeningScene} from './openingScene';
import {mountReadingWidgets} from './readingBoardWidgets';
import {marketHeight} from './readingBoardLayout';
/** Furniture and front-layer card flights share one camera and physical scale. */
import * as T from 'three';
import {makePile,type PileModel} from './pileModels';
import {installSceneMotion} from './sceneMotion';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {createDuelTable} from './duelTable';
import {loadLibraryAssets} from './libraryAssets';
import {boardLens,cardUnit,layoutRect,projectBoardDOM,clearBoardProjection,screenToBoard} from './boardProjection';
type Item={group:T.Group;key:string;element:HTMLElement;market:boolean;supply:boolean;pile?:PileModel;count?:number;entered?:number;surface?:T.Texture};
const clamp=(n:number)=>Math.min(1,Math.max(0,n));
export function mountDuelScene(root:HTMLElement):()=>void {
  let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{root.dataset.tableState='fallback';root.dataset.widgetsReady='fallback';return ()=>{};}
  let flightRenderer:T.WebGLRenderer;
  try{flightRenderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{renderer.dispose();renderer.forceContextLoss();root.dataset.tableState='fallback';root.dataset.widgetsReady='fallback';return ()=>{};}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5,Math.sqrt(2600000/(innerWidth*innerHeight))));renderer.setClearColor(0,0);renderer.autoClear=false;
  renderer.toneMapping=T.AgXToneMapping;renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const canvas=renderer.domElement;canvas.className='duel-objects-3d';canvas.setAttribute('aria-hidden','true');root.append(canvas);
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();
  const flightScene=new T.Scene();
  flightRenderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5,Math.sqrt(2600000/(innerWidth*innerHeight))));flightRenderer.setClearColor(0,0);flightRenderer.toneMapping=T.NoToneMapping;
  const flightCanvas=flightRenderer.domElement;flightCanvas.className='board-flight-canvas';flightCanvas.setAttribute('aria-hidden','true');document.body.append(flightCanvas);
  flightScene.add(new T.AmbientLight(0xffffff,1.5));
  const scene=new T.Scene();scene.environment=environment.texture;scene.environmentIntensity=.55;
  // Match the approved component preview lighting; avoid washing out sapphire and navy.
  const keyLight=new T.DirectionalLight(0xffeed9,2.3);keyLight.castShadow=true;keyLight.shadow.mapSize.set(2048,2048);keyLight.shadow.bias=-.0002;keyLight.shadow.normalBias=.35;keyLight.shadow.autoUpdate=false;scene.add(keyLight);
  const fill=new T.DirectionalLight(0xc4daff,.7);fill.position.set(800,700,-800);scene.add(fill);
  // Keep color AND depth between portal-only frames: metal rails still occlude
  // the rift, while the costly board/glass/shadow pass runs only when needed.
  const cachedBoard=new T.WebGLRenderTarget(1,1,{depthBuffer:true,samples:2,type:T.HalfFloatType});
  cachedBoard.texture.colorSpace=T.LinearSRGBColorSpace;
  const presentScene=new T.Scene(),presentCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const presentMaterial=new T.MeshBasicMaterial({map:cachedBoard.texture,depthTest:false,depthWrite:false,toneMapped:true,transparent:true,blending:T.NoBlending});
  const presentQuad=new T.Mesh(new T.PlaneGeometry(2,2),presentMaterial);presentScene.add(presentQuad);
  const present=()=>{renderer.setRenderTarget(null);renderer.setViewport(0,0,width,height);renderer.render(presentScene,presentCamera);widgets.renderTurnLights(renderer,camera);};
  const camera=new T.PerspectiveCamera();const table=createDuelTable(root,scene);const widgets=mountReadingWidgets(root,scene);
  let dead=false,dirty=true,flightActive=false,frame=0,last=0,width=0,height=0,lastPaint=0;
  let openingDirty=false;
  const disposeOpening=bindOpeningScene(root,scene,()=>{openingDirty=true;keyLight.shadow.needsUpdate=true;});
  const furniture=loadLibraryAssets(()=>{dirty=true;});
  const items=new Map<string,Item>(),textures=new Map<string,T.Texture>();const loading=new T.LoadingManager();let pendingTextures=0;loading.onStart=()=>{pendingTextures++;};loading.onLoad=()=>{pendingTextures=0;};const loader=new T.TextureLoader(loading);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function texture(url:string){let t=textures.get(url);if(!t){t=loader.load(url,()=>{dirty=true;});t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;textures.set(url,t);}return t;}
  function mesh(g:T.BufferGeometry,m:T.Material|T.Material[],parent:T.Object3D,x=0,y=0,z=0){const a=new T.Mesh(g,m);a.position.set(x,y,z);parent.add(a);return a;}
  function disposeObject(object:T.Object3D){const geos=new Set<T.BufferGeometry>(),mats=new Set<T.Material>();object.traverse(o=>{if(o instanceof T.Mesh){geos.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());}
  function removeItem(item:Item){scene.remove(item.group);disposeObject(item.group);}
  function refresh(){
    const elements=[...root.querySelectorAll<HTMLElement>('.pile--deck,.pile--shelf,.market-counter,.market-sub--supply')];
    const ids=new Set(elements.map(el=>el.classList.contains('market-counter')?'market-base':el.classList.contains('market-sub--supply')?'supply-base':el.id));
    for(const [id,item] of items)if(!ids.has(id)){removeItem(item);items.delete(id);}
    for(const el of elements){
      const supply=el.classList.contains('market-sub--supply'),market=el.classList.contains('market-counter'),id=market?'market-base':supply?'supply-base':el.id,shelf=el.classList.contains('pile--shelf');
      if((market&&!furniture.has('market'))||(supply&&!furniture.has('supply')))continue;
      const key=`${el.dataset.count}:${el.dataset.face}:${el.dataset.sleeve}:${el.dataset.material}:${furniture.revision}`;
      el.dataset.furniture=furniture.has(supply?'supply':market?'market':shelf?'shelf':'deck')?'blender':'fallback';
      let item=items.get(id);if(item?.key===key){item.element=el;if(shelf){const print=el.querySelector<HTMLElement>('.pile-print .card');el.dataset.surfaceReady=String(!!print);el.dataset.surfaceCard=print?.dataset.cardId||'';}continue;}
      if(item)removeItem(item);
      const group=new T.Group();scene.add(group);item={group,key,element:el,market,supply};items.set(id,item);
      if(market||supply)group.add(furniture.clone(supply?'supply':'market')!);
      else{
        const count=Number(el.dataset.count)||0;item.count=count;
        const model=furniture.clone(shelf?'shelf':'deck');
        if(model&&el.dataset.material){const skin=texture(el.dataset.material);skin.flipY=false;model.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof T.MeshStandardMaterial&&m.metalness<.7){m.map=skin;m.color.set(0xffffff);m.needsUpdate=true;}});}
        item.pile=makePile(count,shelf,texture(el.dataset.sleeve!),undefined,model);group.add(item.pile.group);
        const print=el.querySelector<HTMLElement>('.pile-print .card');
        if(shelf){el.dataset.surfaceReady=String(!!print);el.dataset.surfaceCard=print?.dataset.cardId||'';}
      }
    }
    const used=new Set(elements.flatMap(el=>[el.dataset.sleeve,el.dataset.face,el.dataset.material]).filter(Boolean));for(const [url,map] of textures)if(!used.has(url)){map.dispose();textures.delete(url);}
    projectBoardDOM(root);keyLight.shadow.needsUpdate=true;
  }
  const motion=installSceneMotion(root,flightScene,items,texture,refresh,async()=>{
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{await Promise.race([flightRenderer.compileAsync(flightScene,camera),new Promise<void>(resolve=>{timer=setTimeout(resolve,800);})]);}finally{clearTimeout(timer);}
    if(dead)return;
    const warm=new T.WebGLRenderTarget(64,64);flightRenderer.setRenderTarget(warm);
    try{flightRenderer.render(flightScene,camera);}finally{flightRenderer.setRenderTarget(null);warm.dispose();}
  });
  const observer=new MutationObserver(records=>{if(records.some(r=>!(r.target instanceof Element&&r.target.closest('.tc-num,.pt-name,.pt-vitals,.mana-readout'))&&(r.type==='childList'||r.oldValue!==(r.target as Element).getAttribute(r.attributeName!))))dirty=true;});observer.observe(root,{childList:true,subtree:true,attributes:true,attributeOldValue:true,attributeFilter:['class','data-count','data-sleeve','data-face']});
  const onLayout=()=>{dirty=true;};window.addEventListener('lore:layout',onLayout);
  const dustScene=new T.Scene(), dustCamera=new T.PerspectiveCamera(45,1,1,4000);
  const dustMap=dustTexture();
  const dusts:Array<{group:T.Group;start:number;rect:DOMRect;heavy:boolean}>=[];
  const onDust=(event:Event):void=>{
    if(reduced.matches)return;
    const rect=(event as CustomEvent<DOMRect>).detail;
    const heavy=event.type==='lore:summon-impact';
    const group=createDust(dustMap,heavy);dustScene.add(group);
    // Bound concurrent opening impacts without changing gameplay timing.
    if(dusts.length>=16){const old=dusts.shift()!;dustScene.remove(old.group);disposeObject(old.group);}
    dusts.push({group,start:performance.now(),rect,heavy});
  };
  window.addEventListener('lore:summon-dust',onDust);window.addEventListener('lore:summon-impact',onDust);
  const flows:Array<{group:T.Group;start:number;from:DOMRect;to:DOMRect}>=[];
  const onFlow=(event:Event):void=>{
    if(reduced.matches)return;
    const {from,to}=(event as CustomEvent<{from:DOMRect;to:DOMRect}>).detail;
    const group=new T.Group();dustScene.add(group);
    for(let i=0;i<64;i++)mesh(new T.OctahedronGeometry(1+(i%4)*.6),new T.MeshBasicMaterial({color:i%3?0xb9eaff:0xfff4d6,transparent:true,blending:T.AdditiveBlending,depthWrite:false}),group);
    flows.push({group,start:performance.now(),from,to});
  };
  window.addEventListener('lore:buff-flow',onFlow);
  let perfStart=0,perfFrames=0,perfMs=0,fullPasses=0,portalPasses=0,displayPasses=0,flightPasses=0;
  let dustActive=false;
  const diagnostics=new URLSearchParams(location.search).has("polish");
  function render(now:number):void {
    if(dead)return;frame=requestAnimationFrame(render);if(document.hidden||now-last<16)return;last=now;
    if(!root.isConnected){dispose();return;}
    if(width!==innerWidth||height!==innerHeight){width=innerWidth;height=innerHeight;const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt(2600000/(width*height)));renderer.setPixelRatio(ratio);flightRenderer.setPixelRatio(ratio);renderer.setSize(width,height);flightRenderer.setSize(width,height);cachedBoard.setSize(Math.round(width*renderer.getPixelRatio()),Math.round(height*renderer.getPixelRatio()));dirty=true;}
    const paintStart=performance.now();
    const widgetMotion=widgets.tick(now),boardMotion=motion.tick(now),riftMotion=widgets.tickRift(now),displayMotion=widgets.takeDisplayUpdate();
    const full=dirty||openingDirty||widgetMotion||(root.dataset.sceneReady!=='true'&&now-lastPaint>=2000);
    const active=flightScene.children.length>1;
    const overlay=!!(dusts.length||flows.length)||dustActive;
    // Card flights own their renderer. Button emission and rifts own separate
    // layers; none of these require re-rendering static glass and furniture.
    if(full){
      openingDirty=false;lastPaint=now;
      if(dirty){refresh();dirty=false;}
      const {focal,angle,cx,cy}=boardLens(width,height),unit=cardUnit(root);
      // Pixel-space world: keep the near plane close enough to resolve thin card stock.
      camera.fov=T.MathUtils.radToDeg(2*Math.atan(height/(2*focal)));camera.aspect=width/height;camera.near=focal*.25;camera.far=focal*3;
      camera.position.set(0,focal*Math.cos(angle),focal*Math.sin(angle));camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
      keyLight.position.set(-unit/.110*.6,unit/.110,unit/.110*.5);const shadowCamera=keyLight.shadow.camera;shadowCamera.left=-width*.8;shadowCamera.right=width*.8;shadowCamera.top=height;shadowCamera.bottom=-height;shadowCamera.near=1;shadowCamera.far=height*5;shadowCamera.updateProjectionMatrix();
      table.resize(width,height,unit);
      if(widgets.takeShadowUpdate())keyLight.shadow.needsUpdate=true;
      for(const item of items.values()){
        const r=layoutRect(item.element);item.group.position.set(r.left+r.width/2-cx,0,r.top+r.height/2-cy);item.group.scale.setScalar(unit);
        if(item.supply){
          item.group.position.y=unit*(marketHeight(true)-.0008/.110);
        }else if(item.market){
          item.group.position.y=unit*(marketHeight()-.0008/.110);
        }else if(item.pile){
          item.pile.cards.visible=!item.element.classList.contains('is-shuffling');
          if(item.element.classList.contains('pile--shelf')&&item.element.querySelector('.pile-print')){const front=item.pile.top.getObjectByName('stock-front');if(front)front.visible=false;}
          if(item.entered){const t=clamp((now-item.entered)/480);item.pile.top.position.y=item.pile.top.userData.restY+.3*(1-t)**3;keyLight.shadow.needsUpdate=true;if(t===1)item.entered=undefined;}
          item.group.updateMatrixWorld(true);
          const point=item.pile.top.getWorldPosition(new T.Vector3()).project(camera),screen={x:(point.x+1)*width/2,y:(1-point.y)*height/2};
          const anchorPoint=screenToBoard(screen.x,screen.y);
          let anchor=item.element.querySelector<HTMLElement>('.pile-draw-anchor');if(!anchor){anchor=document.createElement('span');anchor.className='pile-draw-anchor';item.element.append(anchor);}
          anchor.style.cssText=`left:${anchorPoint.x-r.left-unit/2}px;top:${anchorPoint.y-r.top-unit/.64/2}px;width:${unit}px;height:${unit/.64}px`;
          if(!item.element.classList.contains('pile--3d-ready'))item.element.classList.add('pile--3d-ready');
        }
        item.group.position.y+=Number(item.group.userData.introHeight)||0;
        item.group.position.z+=Number(item.group.userData.introZ)||0;
        if(root.querySelector('.awaiting-board'))item.group.visible=false;
      }
      const marketItem=items.get('market-base');
      if(marketItem)widgets.setMarketMotion(Number(marketItem.group.userData.introHeight)||0,Number(marketItem.group.userData.introZ)||0,marketItem.group.visible);
      renderer.setRenderTarget(cachedBoard);renderer.setScissorTest(false);renderer.clear();renderer.render(scene,camera);
      if(root.querySelector('.pt-mana[data-gain-start]'))getManaFormation()?.postprocess(renderer,cachedBoard);
      fullPasses++;
    }else if(riftMotion){
      renderer.setRenderTarget(cachedBoard);camera.layers.set(2);renderer.render(scene,camera);camera.layers.set(0);portalPasses++;
    }
    if(full||riftMotion||displayMotion||overlay){present();displayPasses++;}
    if(furniture.has('market')&&!root.classList.contains('market-model-ready'))root.classList.add('market-model-ready');
    if(furniture.has('supply')&&!root.classList.contains('supply-model-ready'))root.classList.add('supply-model-ready');
    if(dusts.length || flows.length){
      renderer.setViewport(0,0,width,height);renderer.setScissor(0,0,width,height);renderer.clearDepth();
      dustCamera.aspect=width/height;dustCamera.position.z=height/(2*Math.tan(Math.PI/8));dustCamera.updateProjectionMatrix();
      for(let j=dusts.length-1;j>=0;j--){const d=dusts[j],age=(now-d.start)/dustDuration(d.heavy);
        if(age>=1){dustScene.remove(d.group);disposeObject(d.group);dusts.splice(j,1);continue;}
        d.group.position.set(d.rect.left+d.rect.width/2-width/2,height/2-d.rect.bottom,0);
        d.group.children.forEach((o,i)=>{const m=o as T.Mesh,p=dustPose(age,i,d.heavy,Math.max(24,d.rect.width));m.position.set(p.x,p.y,p.z);m.rotation.z=p.rotation;m.scale.set(p.size,p.size*(i<32?.72:1),1);(m.material as T.MeshBasicMaterial).opacity=p.opacity;});
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
    canvas.dataset.dustCount=String(dusts.length);
    dustActive=!!(dusts.length||flows.length);
    if(active||flightActive||boardMotion){flightRenderer.render(flightScene,camera);flightPasses++;}
    flightActive=active;
    if(diagnostics){
      if(!perfStart)perfStart=now;perfFrames++;perfMs+=performance.now()-paintStart;
      if(now-perfStart>=5000){root.dataset.scenePerf=JSON.stringify({seconds:+((now-perfStart)/1000).toFixed(1),ticks:perfFrames,fullPasses,portalPasses,displayPasses,flightPasses,cpuMs:+perfMs.toFixed(1),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles});perfStart=now;perfFrames=0;perfMs=0;fullPasses=0;portalPasses=0;displayPasses=0;flightPasses=0;}
    }
    if(!root.classList.contains('duel-webgl'))root.classList.add('duel-webgl');
    if(root.dataset.sceneReady!=='true'&&furniture.settled&&widgets.settled&&pendingTextures===0&&root.dataset.tableState!=='loading'){
      // Compile/upload hidden opening furniture offscreen too, so its first fall
      // cannot cause a shader/texture hitch on the visible canvas.
      const visibility=[...items.values()].map(i=>[i.group,i.group.visible] as const);
      visibility.forEach(([g])=>{g.visible=true;});
      const warm=new T.WebGLRenderTarget(64,64);renderer.setRenderTarget(warm);widgets.warm(()=>renderer.render(scene,camera));renderer.setRenderTarget(null);warm.dispose();
      visibility.forEach(([g,v])=>{g.visible=v;});root.dataset.sceneReady='true';
    }
  }
  const lost=(event:Event)=>{event.preventDefault();dispose();};canvas.addEventListener('webglcontextlost',lost);flightCanvas.addEventListener('webglcontextlost',lost);
  function dispose(){
    if(dead)return;dead=true;disposeOpening();root.dataset.tableState='fallback';motion.dispose();cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('lore:layout',onLayout);window.removeEventListener('lore:summon-dust',onDust);window.removeEventListener('lore:summon-impact',onDust);window.removeEventListener('lore:buff-flow',onFlow);canvas.removeEventListener('webglcontextlost',lost);flightCanvas.removeEventListener('webglcontextlost',lost);
    items.forEach(removeItem);textures.forEach(t=>t.dispose());table.dispose();furniture.dispose();widgets.dispose();disposeFormationBloom();keyLight.shadow.dispose();disposeObject(dustScene);dustMap.dispose();environment.dispose();cachedBoard.dispose();presentQuad.geometry.dispose();presentMaterial.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();flightRenderer.dispose();flightRenderer.forceContextLoss();flightCanvas.remove();
    root.querySelectorAll<HTMLElement>('.pile').forEach(el=>{el.classList.remove('pile--3d-ready');delete el.dataset.furniture;el.querySelector('.pile-draw-anchor')?.remove();});clearBoardProjection(root);root.classList.remove('duel-webgl','market-model-ready','supply-model-ready');
  }
  frame=requestAnimationFrame(render);return dispose;
}

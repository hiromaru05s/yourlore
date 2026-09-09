/** All physical props share the table's camera, lighting, scale and depth buffer. */
import * as T from 'three';
import {makePile,type PileModel} from './pileModels';
import {capturePileSurface} from './cardSurface';
import {installSceneMotion} from './sceneMotion';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {createDuelTable} from './duelTable';
import {loadLibraryAssets} from './libraryAssets';
import {boardLens,cardUnit,layoutRect,projectBoardDOM,clearBoardProjection,screenToBoard} from './boardProjection';
type Item={group:T.Group;key:string;element:HTMLElement;market:boolean;supply:boolean;pile?:PileModel;count?:number;entered?:number;surface?:T.Texture};
const clamp=(n:number)=>Math.min(1,Math.max(0,n));
export function mountDuelScene(root:HTMLElement):()=>void {
  let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return ()=>{};}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.setClearColor(0,0);renderer.autoClear=false;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const canvas=renderer.domElement;canvas.className='duel-objects-3d';canvas.setAttribute('aria-hidden','true');root.append(canvas);
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();
  const scene=new T.Scene();scene.environment=environment.texture;scene.environmentIntensity=.6;
  scene.add(new T.HemisphereLight(0xf7f3eb,0x39465d,1.25));
  const keyLight=new T.DirectionalLight(0xfff2da,2.2);keyLight.castShadow=true;keyLight.shadow.mapSize.set(2048,2048);keyLight.shadow.bias=-.0002;keyLight.shadow.normalBias=.35;keyLight.shadow.autoUpdate=false;scene.add(keyLight);
  const fill=new T.DirectionalLight(0xbbdfff,.65);fill.position.set(700,500,-700);scene.add(fill);
  const camera=new T.PerspectiveCamera();const table=createDuelTable(root,scene);
  let dead=false,dirty=true,frame=0,last=0,width=0,height=0;
  const furniture=loadLibraryAssets(()=>{dirty=true;});
  const surfaces=new Map<string,T.Texture>();
  const surfaceKey=(el:HTMLElement)=>{const card=el.querySelector<HTMLElement>('.pile-print .card');return `${el.dataset.sleeve}:${card?.dataset.cardId}:${card?.textContent}`;};
  const items=new Map<string,Item>(),textures=new Map<string,T.Texture>();const loader=new T.TextureLoader();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function texture(url:string){let t=textures.get(url);if(!t){t=loader.load(url);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;textures.set(url,t);}return t;}
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
      const key=`${el.dataset.count}:${el.dataset.face}:${el.dataset.sleeve}:${furniture.revision}`;
      el.dataset.furniture=furniture.has(supply?'supply':market?'market':shelf?'shelf':'deck')?'blender':'fallback';
      let item=items.get(id);if(item?.key===key){item.element=el;continue;}
      if(item)removeItem(item);
      const group=new T.Group();scene.add(group);item={group,key,element:el,market,supply};items.set(id,item);
      if(market||supply)group.add(furniture.clone(supply?'supply':'market')!);
      else{
        const count=Number(el.dataset.count)||0;item.count=count;
        item.pile=makePile(count,shelf,texture(el.dataset.sleeve!),shelf?surfaces.get(surfaceKey(el)):undefined,furniture.clone(shelf?'shelf':'deck'));group.add(item.pile.group);
        const print=el.querySelector<HTMLElement>('.pile-print .card');
        if(shelf){el.dataset.surfaceReady=String(surfaces.has(surfaceKey(el)));el.dataset.surfaceCard=print?.dataset.cardId||'';}
        if(shelf&&count&&print&&!surfaces.has(surfaceKey(el))){const owner=item;void capturePileSurface(print,el.dataset.sleeve!).then(surface=>{
          if(dead||items.get(el.id)!==owner||!surface.face)return;
          const map=new T.CanvasTexture(surface.face);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
          surfaces.set(surfaceKey(el),map);dirty=true;
          // Rebuild once with the padded full frame, including the protruding seals.
          owner.key='surface-ready';

        }).catch(()=>{});}
      }
    }
    const used=new Set(elements.flatMap(el=>[el.dataset.sleeve,el.dataset.face]).filter(Boolean));for(const [url,map] of textures)if(!used.has(url)){map.dispose();textures.delete(url);}
    const activeSurfaces=new Set(elements.map(surfaceKey));
    for(const [key,map] of surfaces)if(surfaces.size>24&&!activeSurfaces.has(key)){map.dispose();surfaces.delete(key);}
    projectBoardDOM(root);keyLight.shadow.needsUpdate=true;
  }
  const motion=installSceneMotion(root,scene,items,texture,refresh,surfaces,surfaceKey);
  const observer=new MutationObserver(()=>{dirty=true;});observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-count','data-sleeve','data-face']});
  const onLayout=()=>{dirty=true;};window.addEventListener('lore:layout',onLayout);
  const dustScene=new T.Scene(), dustCamera=new T.PerspectiveCamera(45,1,1,4000);
  const dustCanvas=document.createElement('canvas');dustCanvas.width=dustCanvas.height=64;
  const dc=dustCanvas.getContext('2d')!,dg=dc.createRadialGradient(32,32,2,32,32,32);dg.addColorStop(0,'#ffffffaa');dg.addColorStop(.35,'#ffffff65');dg.addColorStop(1,'#ffffff00');dc.fillStyle=dg;dc.fillRect(0,0,64,64);
  const dustMap=new T.CanvasTexture(dustCanvas);
  const dusts:Array<{group:T.Group;start:number;rect:DOMRect}>=[];
  const onDust=(event:Event):void=>{
    if(reduced.matches)return;
    const rect=(event as CustomEvent<DOMRect>).detail;
    const group=new T.Group();dustScene.add(group);
    for(let i=0;i<22;i++)mesh(new T.PlaneGeometry(12+(i%4)*4,12+(i%4)*4),new T.MeshBasicMaterial({map:dustMap,color:0xcbbda5,transparent:true,opacity:.22,depthWrite:false}),group);
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
    if(dead)return;frame=requestAnimationFrame(render);if(document.hidden||now-last<16)return;last=now;
    if(!root.isConnected){dispose();return;}
    if(width!==innerWidth||height!==innerHeight){width=innerWidth;height=innerHeight;renderer.setSize(width,height);dirty=true;}
    if(dirty){refresh();dirty=false;}
    const {focal,angle,cx,cy}=boardLens(width,height),unit=cardUnit(root);
    // Pixel-space world: keep the near plane close enough to resolve thin card stock.
    camera.fov=T.MathUtils.radToDeg(2*Math.atan(height/(2*focal)));camera.aspect=width/height;camera.near=focal*.25;camera.far=focal*3;
    camera.position.set(0,focal*Math.cos(angle),focal*Math.sin(angle));camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    keyLight.position.set(-width*.35,height*1.4,height*.55);const shadowCamera=keyLight.shadow.camera;shadowCamera.left=-width*.8;shadowCamera.right=width*.8;shadowCamera.top=height;shadowCamera.bottom=-height;shadowCamera.near=1;shadowCamera.far=height*5;shadowCamera.updateProjectionMatrix();
    table.resize(width,height,unit);
    if(motion.tick(now))keyLight.shadow.needsUpdate=true;
    for(const item of items.values()){
      const r=layoutRect(item.element);item.group.position.set(r.left+r.width/2-cx,0,r.top+r.height/2-cy);item.group.scale.setScalar(unit);
      if(item.supply){
        item.group.position.y=unit*.30;
        item.group.scale.set(r.width/4.5,unit,r.height/1.94);
      }else if(item.market){
        item.group.position.y=unit*.22;
        // Resize the pedestal around the market cards, never fit cards to furniture.
        item.group.scale.set((r.width+12)/6,unit,(r.height+8)/1.1);
      }else if(item.pile){
        item.pile.cards.visible=!item.element.classList.contains('is-shuffling');
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
    renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);renderer.clear();renderer.render(scene,camera);
    if(furniture.has('market')&&!root.classList.contains('market-model-ready'))root.classList.add('market-model-ready');
    if(furniture.has('supply')&&!root.classList.contains('supply-model-ready'))root.classList.add('supply-model-ready');
    if(dusts.length || flows.length){
      renderer.setViewport(0,0,width,height);renderer.setScissor(0,0,width,height);renderer.clearDepth();
      dustCamera.aspect=width/height;dustCamera.position.z=height/(2*Math.tan(Math.PI/8));dustCamera.updateProjectionMatrix();
      for(let j=dusts.length-1;j>=0;j--){const d=dusts[j],age=(now-d.start)/800;
        if(age>=1){dustScene.remove(d.group);disposeObject(d.group);dusts.splice(j,1);continue;}
        d.group.position.set(d.rect.left+d.rect.width/2-width/2,height/2-d.rect.bottom,0);
        d.group.children.forEach((o,i)=>{const m=o as T.Mesh;const angle=i*2.399;m.position.set(Math.cos(angle)*age*70,Math.sin(angle)*age*12+Math.sin(age*Math.PI)*16,Math.sin(angle)*age*38);m.rotation.z=age*i;m.scale.setScalar(.5+age*2);(m.material as T.MeshBasicMaterial).opacity=(1-age)*.25;});
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
  const lost=(event:Event)=>{event.preventDefault();dispose();};canvas.addEventListener('webglcontextlost',lost);
  function dispose(){
    if(dead)return;dead=true;motion.dispose();cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('lore:layout',onLayout);window.removeEventListener('lore:summon-dust',onDust);window.removeEventListener('lore:buff-flow',onFlow);canvas.removeEventListener('webglcontextlost',lost);
    items.forEach(removeItem);surfaces.forEach(t=>t.dispose());textures.forEach(t=>t.dispose());table.dispose();furniture.dispose();keyLight.shadow.dispose();disposeObject(dustScene);dustMap.dispose();environment.dispose();renderer.dispose();canvas.remove();
    root.querySelectorAll<HTMLElement>('.pile').forEach(el=>{el.classList.remove('pile--3d-ready');delete el.dataset.furniture;el.querySelector('.pile-draw-anchor')?.remove();});clearBoardProjection(root);root.classList.remove('duel-webgl','market-model-ready','supply-model-ready');
  }
  frame=requestAnimationFrame(render);return dispose;
}

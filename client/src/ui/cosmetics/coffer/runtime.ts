import {boardPixelRatio} from '../../renderDensity';
import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {isCofferFurniture,isCofferSleeve} from '../../../shared/mimicCofferCosmetics';
import type {CosmeticPreviewAdapter} from '../../cosmeticPreviewBridge';
import {cofferFurniture} from './furniture';
import {cofferSleeve,retainCofferArt} from './sleeve';
import {mountDomSleeves} from './domSleeve';
type Entry={element?:HTMLElement;source:T.Object3D;proxy:T.Group;object?:ReturnType<typeof cofferFurniture>;material?:T.Material;shadow?:T.Group;shadowMaterial?:T.Material};
/** Approved surfaces retain their geometry and lighting. Only the animated
 * surfaces repaint; a fixed invisible caster preserves board contact shadows. */
export function createCofferCosmetics(root:HTMLElement):CosmeticPreviewAdapter {
 const scene=new T.Scene(),entries=new Set<Entry>(),clock={value:0};
 const keyLight=new T.DirectionalLight('#ffeed9',2.3);keyLight.position.set(-.6,1,.5);scene.add(keyLight);
 const fill=new T.DirectionalLight('#c4daff',.7);fill.position.set(800,700,-800);scene.add(fill);
 const depth={value:null as T.Texture|null},size={value:new T.Vector2()},use={value:0};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let environment:T.WebGLRenderTarget|undefined,lease:ReturnType<typeof retainCofferArt>|undefined,backs:ReturnType<typeof mountDomSleeves>|undefined;
 let dead=false,revision=0,key='',lastTime=-1;
 const releases=new Map<string,number>();
 const onDraw=(event:Event)=>{const id=(event as CustomEvent<{pile:string}>).detail?.pile;if(id&&root.querySelector('#'+id)?.hasAttribute('data-coffer-furniture'))releases.set(id,performance.now());};
 window.addEventListener('lore:draw-start',onDraw);
 const refresh=()=>{revision++;lastTime=-1;window.dispatchEvent(new Event('lore:layout'));window.dispatchEvent(new Event('lore:render-density'));};
 const onMotion=()=>refresh();reduced.addEventListener('change',onMotion);
 function protectDepth(m:T.Material){
  const original=m.onBeforeCompile.bind(m),prior=m.customProgramCacheKey();
  m.onBeforeCompile=(s,r)=>{original(s,r);Object.assign(s.uniforms,{cofferDepth:depth,cofferViewport:size,cofferUseDepth:use});
   s.fragmentShader='uniform sampler2D cofferDepth;uniform vec2 cofferViewport;uniform float cofferUseDepth;\n'+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('void main() {','void main() { if(cofferUseDepth>.5 && gl_FragCoord.z>texture2D(cofferDepth,gl_FragCoord.xy/cofferViewport).r+.000008)discard;');
  };m.customProgramCacheKey=()=>prior+'-coffer-depth';
 }
 function remove(e:Entry){entries.delete(e);e.proxy.removeFromParent();e.shadow?.removeFromParent();e.shadowMaterial?.dispose();e.object?.dispose();if(e.material){e.material.dispose();e.proxy.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});}}
 return {
  get revision(){return revision;},
  get pixelRatio(){return root.querySelector('[data-coffer-furniture]')?boardPixelRatio(innerWidth,innerHeight,Math.max(2,devicePixelRatio||1)):undefined;},
  applyFurniture(model,el){if(isCofferFurniture(el.dataset.material))model.visible=false;},
  decoratePile(pile,el){
   const added:Entry[]=[],shelf=el.classList.contains('pile--shelf');
   delete el.dataset.cofferFurniture;delete el.dataset.cofferSleeve;
   if(isCofferFurniture(el.dataset.material)){
    const object=cofferFurniture(shelf),proxy=new T.Group();proxy.matrixAutoUpdate=false;proxy.add(object.group);scene.add(proxy);object.tick(clock.value);
    for(const child of pile.group.children)if(child!==pile.cards&&child!==pile.top)child.visible=false;
    const shadowMaterial=new T.MeshBasicMaterial({colorWrite:false,depthWrite:false}),shadow=object.group.clone(true);
    shadow.traverse(o=>{if(o instanceof T.Mesh)o.material=shadowMaterial;});pile.group.add(shadow);
    const seen=new Set<T.Material>();object.group.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(!seen.has(m)){seen.add(m);protectDepth(m);}});
    const e={element:el,source:pile.group,proxy,object,shadow,shadowMaterial};entries.add(e);added.push(e);el.dataset.cofferFurniture='true';
   }
   if(isCofferSleeve(el.dataset.sleeve)&&!shelf){const front=pile.top.getObjectByName('stock-front');if(front instanceof T.Mesh){
    const material=cofferSleeve(clock),proxy=new T.Group();proxy.matrixAutoUpdate=false;
    const mesh=new T.Mesh(front.geometry.clone(),material);mesh.position.z=.0008;proxy.add(mesh);scene.add(proxy);protectDepth(material);
    const e={source:front,proxy,material};entries.add(e);added.push(e);el.dataset.cofferSleeve='true';
   }}
   lastTime=-1;return()=>{added.forEach(remove);delete el.dataset.cofferFurniture;delete el.dataset.cofferSleeve;};
  },
  tick(now){
   if(dead||document.hidden)return false;
   const equipped=[...root.querySelectorAll<HTMLElement>('#pile-myDeck,#pile-oppDeck')].flatMap(el=>[isCofferFurniture(el.dataset.material),isCofferSleeve(el.dataset.sleeve)]);
   const next=equipped.join('|');if(next!==key){key=next;if(equipped[1]||equipped[3]){if(!lease){lease=retainCofferArt();backs=mountDomSleeves(lease.art,root);}}else{backs?.dispose();backs=undefined;lease?.release();lease=undefined;}refresh();}
   clock.value=reduced.matches?0:Math.floor(now/33.333)/30;backs?.tick(clock.value);
   if(!entries.size||lastTime===clock.value)return false;lastTime=clock.value;
   for(const e of entries){const activity=reduced.matches?0:Math.max(0,1-(now-(releases.get(e.element?.id??'')??-Infinity))/800);e.object?.tick(clock.value,activity);}return true;
  },
  render(renderer,camera,texture){
   if(!entries.size)return;
   if(!environment){const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.55;room.dispose();pmrem.dispose();}
   depth.value=texture??null;use.value=texture?1:0;renderer.getDrawingBufferSize(size.value);
   for(const e of entries){e.source.updateWorldMatrix(true,false);e.proxy.matrix.copy(e.source.matrixWorld);e.proxy.visible=true;for(let p:T.Object3D|null=e.source;p;p=p.parent)if(!p.visible)e.proxy.visible=false;}
   renderer.clearDepth();renderer.render(scene,camera);
  },
  dispose(){if(dead)return;dead=true;window.removeEventListener('lore:draw-start',onDraw);releases.clear();reduced.removeEventListener('change',onMotion);for(const e of [...entries])remove(e);backs?.dispose();lease?.release();environment?.dispose();scene.clear();}
 };
}

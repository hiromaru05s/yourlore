import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import type {CosmeticPreviewAdapter} from '../../cosmeticPreviewBridge';
import {livingFromUrl} from '../../../shared/livingCosmetics';
import {makeObject,type LivingObject} from './objects';
import {animatedMaterial,retainArt} from './materials';

type Entry={source:T.Object3D;proxy:T.Group;object?:LivingObject;material?:T.ShaderMaterial};
/** Approved material motion shares the board camera and its occlusion texture.
 * Sleeves and furniture resolve independently for both players. */
export function createLivingCosmetics(root:HTMLElement):CosmeticPreviewAdapter{
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xdbeeff,0x3e3029,2));
 const light=new T.DirectionalLight(0xffecd2,3);light.position.set(-3,6,4);scene.add(light);
 const entries=new Set<Entry>(),depth={value:null as T.Texture|null},size={value:new T.Vector2()},use={value:0};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let environment:T.WebGLRenderTarget|undefined,lease:ReturnType<typeof retainArt>|undefined;
 let ready=false,dead=false,revision=0,key='',time=0,lastTime=-1;
 const refresh=()=>{revision++;lastTime=-1;window.dispatchEvent(new Event('lore:layout'));};
 const onMotion=()=>refresh();reduced.addEventListener('change',onMotion);
 function load(){
  if(lease)return;lease=retainArt();
  void lease.ready.then(()=>{if(!dead){ready=true;refresh();}}).catch(()=>{if(!dead)console.warn('Living cosmetic artwork unavailable; keeping static equipment.');});
 }
 function depthMaterial(m:T.Material){
  const prefix='uniform sampler2D livingDepth;uniform vec2 livingViewport;uniform float livingUseDepth;\n';
  const guard='if(livingUseDepth>.5 && gl_FragCoord.z>texture2D(livingDepth,gl_FragCoord.xy/livingViewport).r+.000008)discard;';
  if(m instanceof T.ShaderMaterial){Object.assign(m.uniforms,{livingDepth:depth,livingViewport:size,livingUseDepth:use});m.fragmentShader=prefix+m.fragmentShader.replace('void main(){','void main(){'+guard);}
  else{const original=m.onBeforeCompile.bind(m),prior=m.customProgramCacheKey();m.onBeforeCompile=(s,r)=>{original(s,r);Object.assign(s.uniforms,{livingDepth:depth,livingViewport:size,livingUseDepth:use});s.fragmentShader=prefix+s.fragmentShader.replace('void main() {','void main() {'+guard);};m.customProgramCacheKey=()=>prior+'-living-depth';}
 }
 function remove(e:Entry){entries.delete(e);e.proxy.removeFromParent();e.object?.dispose();if(e.material){e.material.dispose();e.proxy.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});}}
 return{
  get revision(){return revision;},
  applyFurniture(model,el){if(ready&&livingFromUrl(el.dataset.material))model.visible=false;},
  decoratePile(pile,el){
   delete el.dataset.livingFurniture;delete el.dataset.livingSleeve;
   if(!ready)return()=>{};
   const furniture=livingFromUrl(el.dataset.material),sleeve=livingFromUrl(el.dataset.sleeve),shelf=el.classList.contains('pile--shelf'),added:Entry[]=[];
   if(furniture){
    const object=makeObject(furniture.variant,shelf?'shelf':'deck'),proxy=new T.Group();proxy.matrixAutoUpdate=false;
    object.root.scale.set(1,.70,1);proxy.add(object.root);scene.add(proxy);object.tick(time);
    for(const child of pile.group.children)if(child!==pile.cards&&child!==pile.top)child.visible=false;
    const seen=new Set<T.Material>();object.root.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(!seen.has(m)){seen.add(m);depthMaterial(m);}});
    const e={source:pile.group,proxy,object};entries.add(e);added.push(e);el.dataset.livingFurniture=furniture.id;
   }
   if(sleeve&&!shelf){const front=pile.top.getObjectByName('stock-front');if(front instanceof T.Mesh){
    const material=animatedMaterial(sleeve.variant),proxy=new T.Group();proxy.matrixAutoUpdate=false;
    const mesh=new T.Mesh(front.geometry.clone(),material);mesh.position.z=.0008;proxy.add(mesh);scene.add(proxy);depthMaterial(material);material.uniforms.time.value=time;
    const e={source:front,proxy,material};entries.add(e);added.push(e);el.dataset.livingSleeve=sleeve.id;
   }}
   lastTime=-1;return()=>added.forEach(remove);
  },
  tick(now){
   if(dead)return false;
   const equipped=[...root.querySelectorAll<HTMLElement>('#pile-myDeck,#pile-oppDeck')].flatMap(el=>[livingFromUrl(el.dataset.material)?.id??'',livingFromUrl(el.dataset.sleeve)?.id??'']);
   const next=equipped.join('|');if(next!==key){key=next;if(equipped.some(Boolean))load();refresh();}
   time=reduced.matches?0:now/1000;
   if(!entries.size||lastTime===time)return false;lastTime=time;
   for(const e of entries){e.object?.tick(time);if(e.material)e.material.uniforms.time.value=time;}return true;
  },
  render(renderer,camera,texture){
   if(!entries.size)return;
   if(!environment){const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();}
   depth.value=texture??null;use.value=texture?1:0;renderer.getDrawingBufferSize(size.value);
   for(const e of entries){e.source.updateWorldMatrix(true,false);e.proxy.matrix.copy(e.source.matrixWorld);e.proxy.visible=true;for(let p:T.Object3D|null=e.source;p;p=p.parent)if(!p.visible)e.proxy.visible=false;}
   renderer.clearDepth();renderer.render(scene,camera);
  },
  dispose(){if(dead)return;dead=true;reduced.removeEventListener('change',onMotion);for(const e of [...entries])remove(e);environment?.dispose();lease?.release();scene.clear();}
 };
}

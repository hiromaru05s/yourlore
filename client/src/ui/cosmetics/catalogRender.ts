import {gachaFromUrl} from '../../shared/gachaCosmetics';
import {makeFurniture as makeGachaFurniture} from './gachaTrio/furniture';
import {createWebGLRenderer} from '../webglRenderer';
import {livingFromUrl} from '../../shared/livingCosmetics';
import {retainArt} from './living/materials';
import {makeObject,type LivingObject} from './living/objects';
import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {loadLibraryAssets} from '../libraryAssets';
import {createAtelierMaterials} from './materials';
import {applyFurnitureSkin} from './baseFurniture';
import {FURNITURE_LIST} from '../../shared/cosmetics';
import {themeFromUrl} from '../../shared/atelierThemes';

declare const __LORE_FURNITURE_REVISION__:string;
const PREVIEWS='lore-furniture-previews-v1';
const previewKey=(id:string)=>new URL(`/__lore_furniture__/${__LORE_FURNITURE_REVISION__}/${matchMedia('(max-width:700px)').matches?'low':'full'}/${id}.webp`,location.origin).href;
async function restoreCatalog():Promise<Map<string,string>|undefined>{
 if(typeof __LORE_FURNITURE_REVISION__==='undefined'||!('caches' in window))return;
 try{
  const cache=await caches.open(PREVIEWS),responses=await Promise.all(FURNITURE_LIST.map(item=>cache.match(previewKey(item.id))));
  if(responses.some(r=>!r))return;
  const blobs=await Promise.all(responses.map(r=>r!.blob()));
  if(blobs.some(b=>!b.size))return;
  return new Map(FURNITURE_LIST.map((item,i)=>[item.id,URL.createObjectURL(blobs[i])]));
 }catch{return;}
}
async function persistCatalog(images:Map<string,string>):Promise<void>{
 if(typeof __LORE_FURNITURE_REVISION__==='undefined'||!('caches' in window))return;
 try{const cache=await caches.open(PREVIEWS);for(const [id,url] of images)await cache.put(previewKey(id),await fetch(url));
  // Finished previews from older builds are replaceable derived data.
  const current=new Set(FURNITURE_LIST.map(i=>previewKey(i.id)));for(const key of await cache.keys())if(!current.has(key.url))await cache.delete(key);
 }catch{/* Restricted/quota storage keeps the already rendered in-memory previews. */}
}
let pending:Promise<Map<string,string>>|undefined;
let prepared:Map<string,string>|undefined;
export const preparedFurnitureCatalog=()=>prepared;
/** One short-lived renderer for the whole catalog, never a WebGL context per tile.
 * These are views of the equipped GLBs, not pictures of their texture maps. */
export function furnitureCatalog():Promise<Map<string,string>> {
  return pending??=(async()=>{const cached=await restoreCatalog();if(cached)return cached;const images=await renderCatalog();await persistCatalog(images);return images;})().then(images=>{prepared=images;return images;}).catch(error=>{pending=undefined;throw error;});
}
const snapshot=(canvas:HTMLCanvasElement)=>new Promise<string>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(URL.createObjectURL(blob)):reject(Error('Furniture snapshot failed')),'image/webp',.92));
async function renderCatalog():Promise<Map<string,string>> {
  const renderer=createWebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setSize(640,400);renderer.setPixelRatio(1);renderer.toneMapping=T.AgXToneMapping;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1.6,.01,100);
  camera.position.set(0,4.5,4.9);camera.lookAt(0,0,0);
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);
  room.dispose();pmrem.dispose();scene.environment=environment.texture;scene.environmentIntensity=.55;
  const key=new T.DirectionalLight(0xffeed9,2.3);key.position.set(-3,6,4);scene.add(key);
  const fill=new T.DirectionalLight(0xc4daff,.7);fill.position.set(4,3,-3);scene.add(fill);
  let lease:ReturnType<typeof retainArt>|undefined;const livingObjects:LivingObject[]=[];
  const materials=createAtelierMaterials('furniture'),textures:T.Texture[]=[],objects:T.Group[]=[];
  let ready!:()=>void;const settled=new Promise<void>(r=>ready=r);
  const assets=loadLibraryAssets(()=>{if(assets.settled)ready();},['deck','shelf']);
  const clear=()=>{livingObjects.splice(0).forEach(o=>o.dispose());for(const model of objects){scene.remove(model);model.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}objects.length=0;};
  try {
    await settled;
    if(!assets.has('deck')||!assets.has('shelf'))throw new Error('Furniture models unavailable');
    const images=new Map<string,string>();
    for(const item of FURNITURE_LIST){
      const gacha=gachaFromUrl(item.url);
      if(gacha){
        for(const [i,grave]of([false,true]as const).entries()){
          const object=makeGachaFurniture(gacha.variant,grave);livingObjects.push(object);object.tick(1.5);object.root.position.x=i?1.03:-1.03;scene.add(object.root);
        }
        renderer.render(scene,camera);images.set(item.id,await snapshot(renderer.domElement));clear();continue;
      }
      const living=livingFromUrl(item.url);
      if(living){
        lease??=retainArt();await lease.ready;
        for(const [i,kind]of(['deck','shelf']as const).entries()){
          const object=makeObject(living.variant,kind);livingObjects.push(object);object.tick(1.5);object.root.position.x=i?1.03:-1.03;scene.add(object.root);
        }
        renderer.render(scene,camera);images.set(item.id,await snapshot(renderer.domElement));clear();continue;
      }
      await materials.select(themeFromUrl(item.url)??null,'self');
      const skin=await new T.TextureLoader().loadAsync(item.url);skin.colorSpace=T.SRGBColorSpace;skin.anisotropy=8;textures.push(skin);
      for(const [i,kind]of(['deck','shelf']as const).entries()){
        const model=assets.clone(kind)!;objects.push(model);applyFurnitureSkin(model,skin);
        const el=document.createElement('div');el.id=kind==='deck'?'pile-myDeck':'pile-myDisc';el.className='pile--'+kind;
        materials.applyFurniture(model,el);model.position.x=i?1.03:-1.03;scene.add(model);
      }
      renderer.render(scene,camera);images.set(item.id,await snapshot(renderer.domElement));
      clear();await new Promise<void>(r=>requestAnimationFrame(()=>r()));
    }
    return images;
  } finally {
    clear();lease?.release();materials.dispose();assets.dispose();textures.forEach(t=>t.dispose());environment.dispose();renderer.dispose();renderer.forceContextLoss();
  }
}

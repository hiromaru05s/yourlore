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

let pending:Promise<Map<string,string>>|undefined;
/** One short-lived renderer for the whole catalog, never a WebGL context per tile.
 * These are views of the equipped GLBs, not pictures of their texture maps. */
export function furnitureCatalog():Promise<Map<string,string>> {
  return pending??=renderCatalog().catch(error=>{pending=undefined;throw error;});
}
async function renderCatalog():Promise<Map<string,string>> {
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
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
      const living=livingFromUrl(item.url);
      if(living){
        lease??=retainArt();await lease.ready;
        for(const [i,kind]of(['deck','shelf']as const).entries()){
          const object=makeObject(living.variant,kind);livingObjects.push(object);object.tick(1.5);object.root.position.x=i?1.03:-1.03;scene.add(object.root);
        }
        renderer.render(scene,camera);images.set(item.id,renderer.domElement.toDataURL('image/webp',.92));clear();continue;
      }
      await materials.select(themeFromUrl(item.url)??null,'self');
      const skin=await new T.TextureLoader().loadAsync(item.url);skin.colorSpace=T.SRGBColorSpace;skin.anisotropy=8;textures.push(skin);
      for(const [i,kind]of(['deck','shelf']as const).entries()){
        const model=assets.clone(kind)!;objects.push(model);applyFurnitureSkin(model,skin);
        const el=document.createElement('div');el.id=kind==='deck'?'pile-myDeck':'pile-myDisc';el.className='pile--'+kind;
        materials.applyFurniture(model,el);model.position.x=i?1.03:-1.03;scene.add(model);
      }
      renderer.render(scene,camera);images.set(item.id,renderer.domElement.toDataURL('image/webp',.92));
      clear();await new Promise<void>(r=>requestAnimationFrame(()=>r()));
    }
    return images;
  } finally {
    clear();lease?.release();materials.dispose();assets.dispose();textures.forEach(t=>t.dispose());environment.dispose();renderer.dispose();renderer.forceContextLoss();
  }
}

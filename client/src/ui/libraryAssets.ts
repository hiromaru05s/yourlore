import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
export type FurnitureKind='deck'|'shelf'|'market';
/** Cached GLBs own textures; scene instances own their cloned meshes/materials. */
export function loadLibraryAssets(onReady:()=>void) {
  const cache=new Map<FurnitureKind,T.Group>();let dead=false,revision=0;
  const low=matchMedia('(max-width:700px)').matches;
  const paths:Record<FurnitureKind,string>={deck:`/models/cosmetics/deck_holder_biblion_ivory/v1/model${low?'-low':''}.glb`,shelf:`/models/library-furniture/shelf${low?'-low':''}.glb`,market:`/models/library-furniture/market${low?'-low':''}.glb`};
  function release(root:T.Object3D){
    const geos=new Set<T.BufferGeometry>(),mats=new Set<T.Material>(),maps=new Set<T.Texture>();
    root.traverse(o=>{if(o instanceof T.Mesh){geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){mats.add(m);for(const v of Object.values(m))if(v instanceof T.Texture)maps.add(v);}}});
    geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());const bitmaps=new Set<ImageBitmap>();
    maps.forEach(m=>{if(typeof ImageBitmap!=='undefined'&&m.image instanceof ImageBitmap)bitmaps.add(m.image);m.dispose();});bitmaps.forEach(b=>b.close());
  }
  for(const kind of Object.keys(paths) as FurnitureKind[])void new GLTFLoader().loadAsync(paths[kind]).then(g=>{
    if(dead){release(g.scene);return;}cache.set(kind,g.scene);revision++;onReady();
  }).catch(()=>{/* Keep the existing usable furniture fallback. */});
  return {
    get revision(){return revision;},
    has(kind:FurnitureKind){return cache.has(kind);},
    clone(kind:FurnitureKind):T.Group|undefined{
      const source=cache.get(kind);if(!source)return;
      const instance=source.clone(true);instance.scale.setScalar(1/.064);
      instance.traverse(o=>{if(o instanceof T.Mesh){o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.castShadow=true;o.receiveShadow=true;}});
      return instance;
    },
    dispose(){dead=true;cache.forEach(release);cache.clear();},
  };
}

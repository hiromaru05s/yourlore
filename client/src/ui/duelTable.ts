/** The real Blender table, drawn behind the DOM with the existing duel renderer. */
import * as T from 'three';
import { BOARD_TILT } from './boardProjection';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function createDuelTable(root: HTMLElement, scene: T.Scene) {
  let model: T.Group | undefined;
  let dead = false;
  const low = matchMedia('(max-width: 700px)').matches;
  // Versioned URLs prevent a cached model from silently disagreeing with its renderer.
  const url = `/models/lore-table/${low ? 'table-low' : 'table'}.glb?v=20260909`;
  root.dataset.tableState = 'loading';

  function release(object: T.Object3D): void {
    const geometries = new Set<T.BufferGeometry>();
    const materials = new Set<T.Material>();
    const maps = new Set<T.Texture>();
    object.traverse(node => {
      if (!(node instanceof T.Mesh)) return;
      geometries.add(node.geometry);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof T.Texture) maps.add(value);
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    const bitmaps = new Set<ImageBitmap>();
    maps.forEach(map => {
      if (typeof ImageBitmap !== 'undefined' && map.image instanceof ImageBitmap) bitmaps.add(map.image);
      map.dispose();
    });
    bitmaps.forEach(bitmap => bitmap.close());
  }

  void new GLTFLoader().loadAsync(url).then(gltf => {
    if (dead) { release(gltf.scene); return; }
    model = gltf.scene;
    model.traverse(node => {
      if (!(node instanceof T.Mesh)) return;
      node.receiveShadow=true;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) if (material instanceof T.MeshStandardMaterial) {
        for (const map of [material.map, material.metalnessMap, material.roughnessMap]) if (map) map.anisotropy = 4;
      }
    });
    scene.add(model);
  }).catch(() => {
    if (!dead) root.dataset.tableState = 'fallback';
    // Existing raster fallback and all game controls remain usable on load failure.
  });

  return {
    resize(width:number,height:number,unit:number):void {
      if(dead||!model)return;
      model.scale.set(width*.92/1.6,unit*.42/.075,height*.90/Math.cos(BOARD_TILT*Math.PI/180)/1.02);
      if(!root.classList.contains('duel-table-ready')){root.classList.add('duel-table-ready');root.dataset.tableState=low?'ready-low':'ready';}
    },
    dispose(): void {
      dead = true;
      if (model) { scene.remove(model); release(model); model = undefined; }
      root.classList.remove('duel-table-ready');
      delete root.dataset.tableState;

    },
  };
}

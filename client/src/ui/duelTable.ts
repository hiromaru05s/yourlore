/** The real Blender table, drawn behind the DOM with the existing duel renderer. */
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function createDuelTable(root: HTMLElement, environment: T.Texture) {
  const scene = new T.Scene();
  scene.environment = environment;
  scene.environmentIntensity = .65;
  // Match the field cards' CSS tilt. A long lens adds gentle convergence without
  // shrinking the opponent's cards enough to hurt readability.
  const tilt = 32;
  const radians = T.MathUtils.degToRad(tilt);
  const camera = new T.PerspectiveCamera(20, 1, .01, 50);
  root.style.setProperty('--duel-table-tilt', `${tilt}deg`);
  root.style.setProperty('--duel-card-stretch', String(1 / Math.cos(radians)));
  scene.add(new T.HemisphereLight(0xfffcf3, 0x667184, 1.3));
  const key = new T.DirectionalLight(0xfff5e5, 2.1);
  key.position.set(-1.4, 2.8, 1.6); scene.add(key);
  const fill = new T.DirectionalLight(0xf1f5ff, .8);
  fill.position.set(2, 1, -2); scene.add(fill);
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
    render(renderer: T.WebGLRenderer, width: number, height: number): void {
      if (dead || !model || width <= 0 || height <= 0) return;
      const aspect = width / height;
      const spanX = aspect < 1 ? 1.45 : 1.62;
      // Preserve card sizes and the physical edge thickness. Only the empty field's
      // depth follows the responsive play area; cosmetics retain their own geometry.
      model.scale.z = (16 / 9) / aspect * Math.SQRT1_2 / Math.cos(radians) * 1.1 * spanX / 1.62;
      const focalPixels = height * 3;
      const distance = focalPixels * spanX / width;
      camera.fov = T.MathUtils.radToDeg(2 * Math.atan(height / (2 * focalPixels)));
      camera.aspect = aspect;
      camera.position.set(0, distance * Math.cos(radians) - .022, distance * Math.sin(radians) + .02);
      camera.lookAt(0, -.022, .02);
      camera.updateProjectionMatrix();
      renderer.setViewport(0, 0, width, height);
      renderer.setScissor(0, 0, width, height);
      renderer.render(scene, camera);
      if (!root.classList.contains('duel-table-ready')) {
        root.classList.add('duel-table-ready');
        root.dataset.tableState = low ? 'ready-low' : 'ready';
      }
    },
    dispose(): void {
      dead = true;
      if (model) { scene.remove(model); release(model); model = undefined; }
      root.classList.remove('duel-table-ready');
      delete root.dataset.tableState;
      root.style.removeProperty('--duel-table-tilt');
      root.style.removeProperty('--duel-card-stretch');
    },
  };
}

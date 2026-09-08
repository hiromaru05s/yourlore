import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import './tablePreview.css';

const stage = document.querySelector<HTMLElement>('#table-stage')!;
const status = document.querySelector<HTMLElement>('#status')!;
const lowDetail = document.querySelector<HTMLInputElement>('#low-detail')!;
const download = document.querySelector<HTMLAnchorElement>('#download')!;
const viewButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-view]')];
const base = `${import.meta.env.BASE_URL}models/lore-table/`;

function showFallback(message: string): void {
  const image = document.createElement('img');
  image.src = `${base}preview.webp`;
  image.alt = 'Blenderで制作した白い平面天板、金の二重線、紺の側面を持つ対戦台';
  image.className = 'fallback';
  stage.replaceChildren(image);
  status.textContent = message;
  lowDetail.disabled = true;
  viewButtons.forEach(button => { button.disabled = true; });
}

function start(): void {
  let renderer: T.WebGLRenderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: false }); }
  catch { showFallback('3Dを開始できないため静止画を表示しています。GLBは保存できます。'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.domElement.setAttribute('aria-label', 'ドラッグで回転できる対戦台');
  stage.appendChild(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color('#d5d6d8');
  const camera = new T.PerspectiveCamera(30, 1, .01, 40);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.minDistance = 1;
  controls.maxDistance = 5;
  controls.maxPolarAngle = Math.PI * .485;
  controls.target.set(0, -.025, 0);
  const pmrem = new T.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .65;
  room.dispose(); pmrem.dispose();
  const ambient = new T.HemisphereLight(0xffffff, 0x777b89, 1.3);
  scene.add(ambient);
  const key = new T.DirectionalLight(0xfff7e7, 2.4);
  key.position.set(-1.4, 2.8, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -1.3; key.shadow.camera.right = 1.3;
  key.shadow.camera.top = 1.3; key.shadow.camera.bottom = -1.3;
  key.shadow.camera.near = .1; key.shadow.camera.far = 7;
  key.shadow.bias = -.00015; key.shadow.normalBias = .001;
  key.shadow.autoUpdate = false;
  scene.add(key);
  const fill = new T.DirectionalLight(0xf1f5ff, .9);
  fill.position.set(2, 1, -2); scene.add(fill);
  const floor = new T.Mesh(new T.PlaneGeometry(200, 200), new T.ShadowMaterial({ color: 0x1b2231, opacity: .25 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.0756;
  floor.receiveShadow = true; scene.add(floor);
  let model: T.Group | undefined;
  let frame = 0, disposed = false, loadId = 0, loadedLow = false;
  let selectedView = 'reference';
  const loader = new GLTFLoader();
  const geometries = new Set<T.BufferGeometry>();
  const materials = new Set<T.Material>();
  const textures = new Set<T.Texture>();

  function release(object: T.Object3D): void {
    geometries.clear(); materials.clear(); textures.clear();
    object.traverse(node => {
      if (!(node instanceof T.Mesh)) return;
      geometries.add(node.geometry);
      (Array.isArray(node.material) ? node.material : [node.material]).forEach((mat: T.Material) => {
        materials.add(mat);
        for (const value of Object.values(mat)) if (value instanceof T.Texture) textures.add(value);
      });
    });
    geometries.forEach(value => value.dispose());
    materials.forEach(value => value.dispose());
    const bitmaps = new Set<ImageBitmap>();
    textures.forEach(value => {
      if (typeof ImageBitmap !== 'undefined' && value.image instanceof ImageBitmap) bitmaps.add(value.image);
      value.dispose();
    });
    bitmaps.forEach(value => value.close());
  }

  function requestRender(): void {
    if (disposed || frame || document.hidden) return;
    frame = requestAnimationFrame(() => { frame = 0; renderer.render(scene, camera); });
  }
  controls.addEventListener('change', requestRender);
  controls.addEventListener('start', () => viewButtons.forEach(button => button.setAttribute('aria-pressed', 'false')));

  function setView(name: string): void {
    selectedView = name;
    // Fit both wide desktop and narrow phones without cutting off the object.
    let distance = Math.max(2.15, 1.94 / (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
    const direction = name === 'top' ? new T.Vector3(0, 1, .0001)
      : name === 'quarter' ? new T.Vector3(.95, 1.25, 1.45) : new T.Vector3(0, 1.60, 2.12);
    direction.normalize();
    for (let attempt = 0; attempt < 24; attempt++) {
      camera.position.copy(direction).multiplyScalar(distance).add(controls.target);
      camera.lookAt(controls.target); camera.updateMatrixWorld();
      let fits = true;
      for (const x of [-.8, .8]) for (const y of [-.075, 0]) for (const z of [-.51, .51]) {
        const projected = new T.Vector3(x, y, z).project(camera);
        if (Math.abs(projected.x) > .90 || Math.abs(projected.y) > .76) fits = false;
      }
      if (fits) break;
      distance *= 1.06;
    }
    controls.maxDistance = Math.max(5, distance * 1.8);
    controls.update();
    viewButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === name)));
    requestRender();
  }
  viewButtons.forEach(button => button.addEventListener('click', () => setView(button.dataset.view!)));
  const resize = new ResizeObserver(() => {
    const width = stage.clientWidth, height = stage.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    setView(selectedView);
  });
  resize.observe(stage);

  async function load(): Promise<void> {
    const id = ++loadId;
    lowDetail.disabled = true;
    const url = base + (lowDetail.checked ? 'table-low.glb' : 'table.glb');
    status.textContent = 'モデルを読み込み中…';
    try {
      const result = await loader.loadAsync(url);
      if (disposed || id !== loadId) { release(result.scene); return; }
      if (model) { scene.remove(model); release(model); }
      model = result.scene;
      let triangles = 0, primitives = 0;
      model.traverse(node => {
        if (!(node instanceof T.Mesh)) return;
        node.castShadow = true; node.receiveShadow = true;
        triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
        primitives += Math.max(1, node.geometry.groups.length);
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        for (const mat of mats) {
          if (mat instanceof T.MeshStandardMaterial) {
            for (const map of [mat.map, mat.roughnessMap, mat.metalnessMap]) if (map) map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
          }
        }
      });
      scene.add(model);
      key.shadow.needsUpdate = true;
      let sizeLabel = '';
      try {
        const response = await fetch(`${base}manifest.json`);
        if (response.ok) {
          const manifest = await response.json();
          const variant = manifest.variants[lowDetail.checked ? 'low' : 'standard'];
          sizeLabel = `${(variant.bytes / 1024).toFixed(0)} KB · `;
        }
      } catch { /* The model remains usable without optional file-size metadata. */ }
      if (disposed || id !== loadId) return;
      status.textContent = `${sizeLabel}${triangles.toLocaleString()} triangles · ${primitives} materials`;
      loadedLow = lowDetail.checked;
      download.href = url;
      document.documentElement.dataset.modelReady = lowDetail.checked ? 'low' : 'standard';
      requestRender();
    } catch (error) {
      if (disposed || id !== loadId) return;
      console.error(error);
      if (!model) { dispose(); showFallback('モデルを読み込めませんでした。再読み込みしてください。'); }
      else {
        lowDetail.checked = loadedLow;
        status.textContent = 'モデル切り替えに失敗しました。もう一度お試しください。';
      }
    } finally { if (!disposed && id === loadId) lowDetail.disabled = false; }
  }
  lowDetail.addEventListener('change', () => { void load(); });
  const onVisible = (): void => { if (!document.hidden) requestRender(); };
  document.addEventListener('visibilitychange', onVisible);
  function dispose(): void {
    if (disposed) return;
    disposed = true; ++loadId; cancelAnimationFrame(frame);
    resize.disconnect(); controls.dispose();
    document.removeEventListener('visibilitychange', onVisible);
    if (model) release(model);
    floor.geometry.dispose(); floor.material.dispose(); key.shadow.dispose();
    environment.dispose(); renderer.dispose();
  }
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); dispose(); showFallback('3D表示が中断されたため静止画を表示しています。再読み込みで復帰します。');
  });
  window.addEventListener('pagehide', dispose, { once: true });
  void load();
}
start();

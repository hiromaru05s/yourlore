import {createWebGLRenderer} from '../webglRenderer';
/** Selected R3 direction 03: card-surface torsion, simultaneous rupture, then grave traces. */
import * as T from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { COST, IMPACT, END, phase, ease } from "./timing";
const DURATION = END,
  impacts = [IMPACT, IMPACT, IMPACT];
import { CARD_PADDING } from "../cardSurface";
import { boardLens, screenToBoard } from "../boardProjection";
export type Point = { x: number; y: number };
export type Pose = Point & {
  w: number;
  h: number;
  id: string;
  destination?: Point;
  matrix?: number[];
};
export type Scene = {
  source: Pose;
  targets: Pose[];
  mana: Point;
  grave: Point;
  ownGrave: Point;
  width: number;
  height: number;
};
export type Config = {
  variant: number;
  ms: number;
  count: number;
  side: number;
  dark: boolean;
  reduced: boolean;
  angle?: number;
};
type Vec = T.Vector3;
type Piece = {
  mesh: T.Mesh;
  home: Vec;
  index: number;
  card: number;
  angle: number;
};
type Card = {
  group: T.Group;
  shell: T.Group;
  batch: T.Mesh;
  mapping: Array<[number, number]>;
  parts: Piece[];
  mat: T.MeshStandardMaterial;
  death: { value: number };
  veins: T.Group;
  pulse: T.MeshStandardMaterial;
  cut: T.MeshStandardMaterial;
  home: Vec;
  w: number;
  h: number;
};
const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z),
  rng = (n: number) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
const palettes = [0xb17b69, 0x7e81b0, 0xaa746a, 0x8f70d7, 0x934353];

function prism(points: T.Vector2[], height: number) {
  const pts: number[] = [],
    uv: number[] = [],
    groups: Array<[number, number, number]> = [];
  const add = (
    a: Vec,
    b: Vec,
    c: Vec,
    ta: T.Vector2,
    tb: T.Vector2,
    tc: T.Vector2,
  ) => {
    for (const p of [a, b, c]) pts.push(p.x, p.y, p.z);
    for (const p of [ta, tb, tc]) uv.push(p.x, p.y);
  };
  const start = () => pts.length / 3;
  const triangles = T.ShapeUtils.triangulateShape(points, []);
  let st = start();
  for (const tr of triangles) {
    const p = tr.map((i) => points[i]);
    add(
      V(p[0].x, height / 2, p[0].y),
      V(p[2].x, height / 2, p[2].y),
      V(p[1].x, height / 2, p[1].y),
      p[0],
      p[2],
      p[1],
    );
  }
  groups.push([st, start() - st, 0]);
  st = start();
  for (const tr of triangles) {
    const p = tr.map((i) => points[i]);
    add(
      V(p[0].x, -height / 2, p[0].y),
      V(p[1].x, -height / 2, p[1].y),
      V(p[2].x, -height / 2, p[2].y),
      p[0],
      p[1],
      p[2],
    );
  }
  groups.push([st, start() - st, 1]);
  st = start();
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    add(
      V(a.x, height / 2, a.y),
      V(b.x, height / 2, b.y),
      V(b.x, -height / 2, b.y),
      a,
      b,
      b,
    );
    add(
      V(a.x, height / 2, a.y),
      V(b.x, -height / 2, b.y),
      V(a.x, -height / 2, a.y),
      a,
      b,
      a,
    );
  }
  groups.push([st, start() - st, 2]);
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pts, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  for (const [a, b, m] of groups) g.addGroup(a, b, m);
  g.computeVertexNormals();
  return g;
}
function roundedBox(w: number, h: number, d: number, bevel = 0.035) {
  const s = new T.Shape(),
    x = -w / 2,
    y = -d / 2;
  s.moveTo(x + bevel, y);
  s.lineTo(x + w - bevel, y);
  s.quadraticCurveTo(x + w, y, x + w, y + bevel);
  s.lineTo(x + w, y + d - bevel);
  s.quadraticCurveTo(x + w, y + d, x + w - bevel, y + d);
  s.lineTo(x + bevel, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - bevel);
  s.lineTo(x, y + bevel);
  s.quadraticCurveTo(x, y, x + bevel, y);
  const g = new T.ExtrudeGeometry(s, {
    depth: h,
    bevelEnabled: true,
    bevelSize: bevel * 0.35,
    bevelThickness: bevel * 0.35,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 4,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -h / 2, 0);
  return g;
}
function wearTexture() {
  const n = 128,
    data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4,
        value =
          158 +
          rng(x + y * n) * 14 +
          Math.sin(y * 1.8) * 6 +
          (rng(y + 51) > 0.94 ? -14 : 0);
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
  const t = new T.DataTexture(data, n, n, T.RGBAFormat);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(5, 5);
  t.needsUpdate = true;
  return t;
}

export class TorsionRenderer {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  world = new T.Group();
  floor = new T.Group();
  fx = new T.Group();
  cards: Card[] = [];
  source!: Card;
  allies: Card[] = [];
  mana: T.Mesh[] = [];
  costParts: T.Mesh[] = [];
  shards: T.Mesh[] = [];
  slabs: T.Mesh[] = [];
  crystals: T.Mesh[] = [];
  tubes: T.Mesh[] = [];
  blade = new T.Group();
  scissors: T.Group[] = [];
  petals: T.Mesh[] = [];
  cores: T.Mesh[] = [];
  bloodTubes: T.Mesh[] = [];
  blood: T.MeshPhysicalMaterial;
  handPos = V();
  castPos = V();
  focusPos = V();
  sourceReveal = 0;
  sourcePitch = 0;
  bladeLinks: T.Mesh[] = [];
  bed!: T.Mesh;
  shadow!: T.Mesh;
  camera = new T.PerspectiveCamera();
  light: T.PointLight;
  key: T.DirectionalLight;
  env: T.WebGLRenderTarget;
  noise: T.Texture;
  geometries = new Set<T.BufferGeometry>();
  materials = new Set<T.Material>();
  textures = new Map<string, T.Texture>();
  signature = "";
  localMaterials: T.Material[] = [];
  dead = false;
  unit = 1;
  origins: Vec[] = [];
  destinations: Vec[] = [];
  sourcePos = V();
  manaPos = V();
  grave = V();
  ownGrave = V();
  row = V();
  span = 6;
  scale = 1;
  overlay = false;
  graveStacks: T.Group[] = [];
  manaTray!: T.Mesh;
  renderSize = [0, 0];
  steel: T.MeshPhysicalMaterial;
  darkSteel: T.MeshPhysicalMaterial;
  stone: T.MeshStandardMaterial;
  vein: T.MeshStandardMaterial;
  crystal: T.MeshPhysicalMaterial;
  edge: T.MeshStandardMaterial;
  back: T.MeshStandardMaterial;
  dust: T.MeshStandardMaterial;
  costMat: T.MeshPhysicalMaterial;
  constructor() {
    this.renderer = createWebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0, 0);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    const pm = new T.PMREMGenerator(this.renderer),
      room = new RoomEnvironment();
    this.env = pm.fromScene(room, 0.035);
    room.dispose();
    pm.dispose();
    this.scene.environment = this.env.texture;
    this.scene.environmentIntensity = 0.65;
    this.noise = wearTexture();
    const material = <M extends T.Material>(m: M) => {
      this.materials.add(m);
      return m;
    };
    this.steel = material(
      new T.MeshPhysicalMaterial({
        color: 0x68636e,
        metalness: 0.92,
        roughness: 0.27,
        clearcoat: 0.35,
        bumpMap: this.noise,
        bumpScale: 0.015,
      }),
    );
    this.darkSteel = material(
      new T.MeshPhysicalMaterial({
        color: 0xb8b1b7,
        metalness: 0.9,
        roughness: 0.48,
        map: this.noise,
        roughnessMap: this.noise,
        bumpMap: this.noise,
        bumpScale: 0.04,
      }),
    );
    this.stone = material(
      new T.MeshStandardMaterial({
        color: 0x34313c,
        metalness: 0.16,
        roughness: 0.84,
        bumpMap: this.noise,
        bumpScale: 0.055,
      }),
    );
    this.vein = material(
      new T.MeshStandardMaterial({
        color: 0x291019,
        emissive: 0xc54d36,
        emissiveIntensity: 1,
        metalness: 0.65,
        roughness: 0.3,
      }),
    );
    this.crystal = material(
      new T.MeshPhysicalMaterial({
        color: 0x46394f,
        metalness: 0.3,
        roughness: 0.14,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        ior: 1.9,
        transmission: 0.12,
        thickness: 0.4,
        attenuationColor: new T.Color(0x583b75),
        attenuationDistance: 0.5,
        bumpMap: this.noise,
        bumpScale: 0.005,
      }),
    );
    this.blood = material(
      new T.MeshPhysicalMaterial({
        color: 0x5f1025,
        roughness: 0.24,
        metalness: 0.2,
        clearcoat: 1,
        emissive: 0x4e0614,
        emissiveIntensity: 0.3,
      }),
    );
    this.edge = material(
      new T.MeshStandardMaterial({
        color: 0xb6a18a,
        roughness: 0.7,
        metalness: 0.25,
      }),
    );
    this.back = material(
      new T.MeshStandardMaterial({
        color: 0x1e1625,
        roughness: 0.4,
        metalness: 0.45,
        bumpMap: this.noise,
        bumpScale: 0.012,
      }),
    );
    this.dust = material(
      new T.MeshStandardMaterial({ color: 0x474049, roughness: 0.98 }),
    );
    this.costMat = material(
      new T.MeshPhysicalMaterial({
        color: 0x7888aa,
        metalness: 0.55,
        roughness: 0.15,
        clearcoat: 1,
        emissive: 0x202745,
        emissiveIntensity: 0.4,
      }),
    );
    this.key = new T.DirectionalLight(0xffdfb6, 2.7);
    this.key.position.set(-5, 11, 5);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.camera.left = -10;
    this.key.shadow.camera.right = 10;
    this.key.shadow.camera.top = 10;
    this.key.shadow.camera.bottom = -10;
    this.key.shadow.camera.near = 0.1;
    this.key.shadow.camera.far = 40;
    this.key.shadow.bias = -0.0005;
    this.key.shadow.normalBias = 0.025;
    this.key.shadow.radius = 3;
    this.scene.add(this.key, this.key.target);
    RectAreaLightUniformsLib.init();
    const panel = new T.RectAreaLight(0xffdfc4, 5, 8, 2);
    panel.position.set(0, 4.5, 6);
    panel.lookAt(0, 1, 0);
    this.scene.add(panel);
    const rim = new T.DirectionalLight(0xa2bfff, 1.1);
    rim.position.set(4, 5, -7);
    this.scene.add(rim, new T.HemisphereLight(0xe2d6e5, 0x29252b, 0.8));
    this.light = new T.PointLight(0xeac2a6, 0, 9, 1.5);
    this.scene.add(this.light);
    this.scene.add(this.world);
    this.world.add(this.floor, this.fx);
  }
  geo<G extends T.BufferGeometry>(g: G) {
    this.geometries.add(g);
    return g;
  }
  mesh(
    g: T.BufferGeometry,
    m: T.Material | T.Material[],
    parent: T.Object3D = this.fx,
  ) {
    const n = new T.Mesh(this.geo(g), m);
    n.castShadow = true;
    n.receiveShadow = true;
    parent.add(n);
    return n;
  }
  texture(id: string, faces: Map<string, HTMLCanvasElement>) {
    if (!this.textures.has(id)) {
      const tex = new T.CanvasTexture(faces.get(id)!);
      tex.colorSpace = T.SRGBColorSpace;
      tex.anisotropy = Math.min(
        8,
        this.renderer.capabilities.getMaxAnisotropy(),
      );
      this.textures.set(id, tex);
    }
    return this.textures.get(id)!;
  }
  card(id: string, index: number, faces: Map<string, HTMLCanvasElement>): Card {
    const group = new T.Group();
    this.world.add(group);
    const mat = new T.MeshStandardMaterial({
      map: this.texture(id, faces),
      roughness: 0.38,
      metalness: 0.12,
      emissive: 0x63494a,
      emissiveMap: this.texture(id, faces),
      emissiveIntensity: 0,
      alphaTest: 0.06,
      side: T.DoubleSide,
    });
    this.materials.add(mat);
    const parts: Piece[] = [];
    const death = { value: 0 };
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uMortality = death;
      shader.fragmentShader =
        "uniform float uMortality;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nfloat ashLuma=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(ashLuma*0.48),uMortality);",
      );
    };
    mat.customProgramCacheKey = () => "massacre-mortality-r3";
    const pulse = new T.MeshStandardMaterial({
        color: 0x4c0718,
        emissive: 0xa71c32,
        emissiveIntensity: 0.7,
        roughness: 0.32,
        metalness: 0.16,
      }),
      cut = this.edge.clone();
    for (const m of [pulse, cut]) {
      this.materials.add(m);
      this.localMaterials.push(m);
    }
    const veins = new T.Group();
    group.add(veins);
    for (let branch = 0; branch < 3; branch++) {
      const points =
        branch === 0
          ? [
              V(-0.08, 0.042, -0.4),
              V(0.06, 0.043, -0.19),
              V(-0.03, 0.044, 0.01),
              V(0.11, 0.042, 0.22),
              V(0.04, 0.041, 0.39),
            ]
          : [
              V(0.0, 0.043, branch === 1 ? -0.03 : 0.18),
              V(branch === 1 ? -0.18 : 0.22, 0.043, branch === 1 ? 0.05 : 0.1),
              V(branch === 1 ? -0.32 : 0.36, 0.042, branch === 1 ? 0.16 : 0.24),
            ];
      const vessel = this.mesh(
        new T.TubeGeometry(new T.CatmullRomCurve3(points), 12, 0.008, 5, false),
        pulse,
        veins,
      );
      vessel.userData.surfaceBase = Float32Array.from(
        vessel.geometry.getAttribute("position").array,
      );
    }
    // Irregular triangular prisms preserve the original card UVs on every broken face.
    const nx = 3,
      nz = 4,
      vertices: T.Vector2[][] = [];
    for (let z = 0; z <= nz; z++) {
      const row: T.Vector2[] = [];
      for (let x = 0; x <= nx; x++)
        row.push(
          new T.Vector2(
            x / nx -
              0.5 +
              (x > 0 && x < nx ? (rng(x + z * 9) - 0.5) * 0.12 : 0),
            z / nz -
              0.5 +
              (z > 0 && z < nz ? (rng(x + z * 7 + 40) - 0.5) * 0.08 : 0),
          ),
        );
      vertices.push(row);
    }
    const shell = new T.Group();
    group.add(shell);
    const sourceFace = id === "MASSACRE";
    this.mesh(
      roundedBox(
        sourceFace ? 0.96 : 1,
        0.027,
        sourceFace ? 0.96 : 1,
        sourceFace ? 0.055 : 0.02,
      ),
      this.edge,
      shell,
    );
    const face = this.mesh(
      new T.PlaneGeometry(
        sourceFace ? 1 + CARD_PADDING * 2 : 1,
        sourceFace ? 1 + (CARD_PADDING * 2 * 180) / 280 : 1,
      ),
      mat,
      shell,
    );
    face.rotation.x = -Math.PI / 2;
    face.position.y = sourceFace ? 0.052 : 0.028;
    for (let z = 0; z < nz; z++)
      for (let x = 0; x < nx; x++)
        for (let tri = 0; tri < 2; tri++) {
          const pp = tri
              ? [vertices[z][x], vertices[z + 1][x + 1], vertices[z + 1][x]]
              : [vertices[z][x], vertices[z][x + 1], vertices[z + 1][x + 1]],
            center = pp
              .reduce((v, p) => v.add(p), new T.Vector2())
              .multiplyScalar(1 / 3);
          const g = prism(pp, 0.027);
          const uv = g.getAttribute("uv") as T.BufferAttribute;
          for (let i = 0; i < uv.count; i++)
            uv.setXY(i, uv.getX(i) + 0.5, 0.5 - uv.getY(i));
          g.translate(-center.x, 0, -center.y);
          const mesh = this.mesh(g, [mat, this.back, cut], group);
          const home = V(center.x, 0, center.y);
          mesh.position.copy(home);
          parts.push({
            mesh,
            home,
            index: parts.length,
            card: index,
            angle: rng(parts.length * 4 + index) * Math.PI * 2,
          });
        }
    const bp: number[] = [],
      bn: number[] = [],
      bu: number[] = [],
      mapping: Array<[number, number]> = [],
      bg = new T.BufferGeometry();
    for (let material = 0; material < 3; material++) {
      const start = bp.length / 3;
      for (let pi = 0; pi < parts.length; pi++) {
        const g = parts[pi].mesh.geometry,
          positions = g.getAttribute("position"),
          normals = g.getAttribute("normal"),
          uvs = g.getAttribute("uv");
        for (const group of g.groups.filter(
          (g) => g.materialIndex === material,
        )) {
          for (let j = group.start; j < group.start + group.count; j++) {
            bp.push(positions.getX(j), positions.getY(j), positions.getZ(j));
            bn.push(normals.getX(j), normals.getY(j), normals.getZ(j));
            bu.push(uvs.getX(j), uvs.getY(j));
            mapping.push([pi, j]);
          }
        }
      }
      bg.addGroup(start, bp.length / 3 - start, material);
    }
    bg.setAttribute(
      "position",
      new T.Float32BufferAttribute(bp, 3).setUsage(T.DynamicDrawUsage),
    );
    bg.setAttribute(
      "normal",
      new T.Float32BufferAttribute(bn, 3).setUsage(T.DynamicDrawUsage),
    );
    bg.setAttribute("uv", new T.Float32BufferAttribute(bu, 2));
    const batch = this.mesh(bg, [mat, this.back, cut], group);
    batch.frustumCulled = false;
    batch.visible = false;
    parts.forEach((p) => group.remove(p.mesh));
    return {
      group,
      shell,
      parts,
      batch,
      mapping,
      mat,
      death,
      veins,
      pulse,
      cut,
      home: V(),
      w: 1,
      h: 1.48,
    };
  }
  clearGeometry() {
    this.localMaterials.forEach((m) => {
      m.dispose();
      this.materials.delete(m);
    });
    this.localMaterials = [];
    this.cards.forEach((c) => {
      this.world.remove(c.group);
      c.mat.dispose();
      this.materials.delete(c.mat);
    });
    this.allies.forEach((c) => {
      this.world.remove(c.group);
      c.mat.dispose();
      this.materials.delete(c.mat);
    });
    if (this.source) {
      this.world.remove(this.source.group);
      this.source.mat.dispose();
      this.materials.delete(this.source.mat);
    }
    this.cards = [];
    this.allies = [];
    this.floor.clear();
    this.fx.clear();
    this.blade = new T.Group();
    this.fx.add(this.blade);
    this.geometries.forEach((g) => g.dispose());
    this.geometries.clear();
    this.mana = [];
    this.graveStacks = [];
    this.costParts = [];
    this.shards = [];
    this.slabs = [];
    this.crystals = [];
    this.tubes = [];
    this.bladeLinks = [];
    this.scissors = [];
    this.petals = [];
    this.cores = [];
    this.bloodTubes = [];
  }
  build(
    faces: Map<string, HTMLCanvasElement>,
    ids: string[],
    overlay: boolean,
  ) {
    this.clearGeometry();
    const count = ids.length;
    for (let i = 0; i < count; i++)
      this.cards.push(this.card(ids[i], i, faces));
    this.source = this.card("MASSACRE", 7, faces);
    void overlay;
    this.shadow = this.mesh(
      new T.PlaneGeometry(30, 30),
      new T.ShadowMaterial({ opacity: 0.32 }),
      this.floor,
    );
    this.materials.add(this.shadow.material as T.Material);
    this.localMaterials.push(this.shadow.material as T.Material);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = -0.02;
    this.shadow.castShadow = false;

    for (let i = 0; i < 4; i++)
      this.costParts.push(
        this.mesh(new T.TetrahedronGeometry(0.075, 0), this.costMat),
      );
    for (let i = 0; i < 48; i++) {
      const m = this.mesh(
        new T.IcosahedronGeometry(0.07 + rng(i + 5) * 0.085, 0),
        i % 4 === 0 ? this.steel : this.dust,
      );
      this.shards.push(m);
    }
    for (let i = 0; i < count + 2; i++) {
      const g = new T.BufferGeometry();
      const n = 64,
        r = 7;
      g.setAttribute(
        "position",
        new T.BufferAttribute(new Float32Array((n + 1) * r * 3), 3),
      );
      g.setAttribute(
        "normal",
        new T.BufferAttribute(new Float32Array((n + 1) * r * 3), 3),
      );
      const ids: number[] = [];
      for (let j = 0; j < n; j++)
        for (let a = 0; a < r; a++) {
          const x = j * r + a,
            y = j * r + ((a + 1) % r);
          ids.push(x, y, x + r, y, y + r, x + r);
        }
      g.setIndex(ids);
      g.setDrawRange(0, ids.length);
      this.tubes.push(this.mesh(g, i === count ? this.darkSteel : this.steel));
    }
  }
  tube(mesh: T.Mesh, points: Vec[], radius: number, progress: number) {
    mesh.visible = progress > 0 && radius > 0.001;
    if (!mesh.visible) return;
    const curve = new T.CatmullRomCurve3(points),
      attr = mesh.geometry.getAttribute("position") as T.BufferAttribute;
    for (let j = 0; j <= 64; j++) {
      const t = (j / 64) * Math.max(0.001, progress),
        p = curve.getPoint(t),
        tan = curve.getTangent(t),
        n = V(0, 1, 0).cross(tan).normalize();
      if (n.lengthSq() < 0.01) n.set(1, 0, 0);
      const b = tan.clone().cross(n).normalize();
      const rr =
        radius *
        (0.45 + 0.55 * Math.sin((Math.PI * j) / 64)) *
        (1 - phase(j / 64, 0.94, 1) * 0.94);
      for (let a = 0; a < 7; a++) {
        const v = p
          .clone()
          .addScaledVector(n, Math.cos((a / 7) * Math.PI * 2) * rr)
          .addScaledVector(b, Math.sin((a / 7) * Math.PI * 2) * rr);
        attr.setXYZ(j * 7 + a, v.x, v.y, v.z);
      }
    }
    attr.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeBoundingSphere();
  }
  position(cfg: Config, s?: Scene) {
    this.overlay = !!s;
    this.unit = s ? Math.max(15, s.targets[0]?.w || 60) : 1;
    const convert = (p: Point, y = 0) => {
      if (!s) return V(p.x, y, p.y);
      const a = screenToBoard(p.x, p.y);
      return V(
        (a.x - s.width / 2) / this.unit,
        y,
        (a.y - s.height / 2) / this.unit,
      );
    };
    const flip = cfg.side ? -1 : 1;
    this.destinations = s
      ? s.targets.map((p) => convert(p.destination ?? s.grave, 0.1))
      : [];
    this.origins = this.cards.map((_, i) =>
      s
        ? convert(s.targets[i], 0.055)
        : V((i - (cfg.count - 1) / 2) * 1.35, 0.055, -1.02 * flip),
    );
    this.handPos.copy(
      s ? convert(s.source, 0.09) : V(-0.55, 0.075, 3.05 * flip),
    );
    this.castPos.copy(
      s
        ? convert(
            { x: s.width * 0.36, y: s.height * (cfg.side ? 0.34 : 0.66) },
            0.13,
          )
        : V(-1.35, 0.13, 1.35 * flip),
    );
    this.focusPos.copy(
      s
        ? convert({ x: s.width * 0.5, y: s.height * 0.53 }, 0)
        : V(0, 1.35, 0.65),
    );
    if (s) {
      const lens = boardLens(s.width, s.height),
        f = lens.focal / this.unit,
        camera = V(0, f * Math.cos(lens.angle), f * Math.sin(lens.angle));
      this.focusPos.lerp(camera, 1.25 / camera.y);
    }
    this.castPos.copy(this.focusPos).add(V(-3.8, 0, 0));
    if (s) {
      const lens = boardLens(s.width, s.height),
        f = lens.focal / this.unit,
        camera = V(0, f * Math.cos(lens.angle), f * Math.sin(lens.angle));
      this.castPos
        .copy(convert({ x: s.width * 0.2, y: s.height * 0.53 }, 0))
        .lerp(camera, 1.25 / camera.y);
    }
    const rise = ease(phase(cfg.ms, 0, 390)),
      park = ease(phase(cfg.ms, 550, 900));
    this.sourceReveal = cfg.reduced ? 0 : rise * (1 - park);
    this.sourcePitch =
      (s
        ? boardLens(s.width, s.height).angle
        : Math.atan((cfg.angle ? 13 : 10.3) / (cfg.angle ? 6.5 : 9))) *
      (cfg.reduced ? 0 : rise);
    this.sourcePos
      .copy(this.handPos)
      .lerp(this.focusPos, rise)
      .lerp(this.castPos, park);
    if (cfg.reduced) this.sourcePos.copy(this.castPos);
    this.manaPos = s ? convert(s.mana, 0.12) : V(-4, 0.14, 2.6 * flip);
    this.grave = s ? convert(s.grave, 0.1) : V(4.8, 0.1, -1.4 * flip);
    this.ownGrave = s ? convert(s.ownGrave, 0.1) : V(4.8, 0.1, 2.4 * flip);
    this.row = this.origins
      .reduce((p, v) => p.add(v), V())
      .multiplyScalar(1 / this.origins.length);
    this.span =
      this.origins.length > 1
        ? this.origins.at(-1)!.x - this.origins[0].x + 1.4
        : 1.5;
    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      card.home.copy(this.origins[i]);
      card.w = s ? s.targets[i].w / this.unit : 1.05;
      card.h = s
        ? s.targets[i].h /
          this.unit /
          Math.cos(boardLens(s.width, s.height).angle)
        : 1.55;
      card.group.position.copy(card.home);
      card.group.rotation.set(0, 0, 0);
      card.group.scale.set(card.w, 1, card.h);
    }
    this.source.home.copy(this.sourcePos);
    this.source.group.position.copy(this.sourcePos);
    const revealScale = 1 + this.sourceReveal * 1.45;
    this.source.group.scale.set(
      (s ? s.source.w / this.unit : 1.05) * revealScale,
      1,
      (s ? s.source.h / this.unit : 1.63) * revealScale,
    );
    this.allies.forEach((c, i) => {
      c.batch.visible = false;
      c.shell.visible = true;
      c.veins.visible = false;
      c.parts.forEach((p) => (p.mesh.visible = false));
      c.group.position.set(2.5 + i * 1.25, 0.055, 2.1 * flip);
      c.group.scale.set(1, 1, 1.55);
    });
    this.floor.visible = !s;
    this.shadow.visible = !!s;
    if (s) {
      this.floor.visible = true;
      this.floor.children.forEach((n) => (n.visible = n === this.shadow));
    } else this.floor.children.forEach((n) => (n.visible = true));
    this.graveStacks.forEach((g, i) =>
      g.position.copy(i ? this.ownGrave : this.grave),
    );
    this.mana.forEach((m, i) => {
      m.visible = !s;
      m.position.copy(this.manaPos).add(V((i - 9) * 0.24, 0, 0));
      m.rotation.set(0.15, i * 0.4, 0.1);
    });
    if (s) {
      const { focal, angle } = boardLens(s.width, s.height),
        f = focal / this.unit;
      this.camera.fov = T.MathUtils.radToDeg(
        2 * Math.atan(s.height / (2 * focal)),
      );
      this.camera.aspect = s.width / s.height;
      this.camera.near = 0.05;
      this.camera.far = f * 4;
      this.camera.position.set(0, f * Math.cos(angle), f * Math.sin(angle));
      this.camera.lookAt(0, 0, 0);
    } else {
      this.camera.fov = 36;
      this.camera.aspect = 960 / 560;
      this.camera.near = 0.1;
      this.camera.far = 70;
      this.camera.position.set(
        cfg.angle ? 5 : 2.2,
        cfg.angle ? 6.5 : 9,
        cfg.angle ? 13 : 10.3,
      );
      this.camera.lookAt(0, 0, 0.05);
    }
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.key.position.copy(this.row).add(V(-4, 10, 5));
    this.key.target.position.copy(this.row);
    this.key.target.updateMatrixWorld();
  }
  animate(cfg: Config) {
    const t = Math.min(cfg.ms, DURATION),
      v = cfg.variant,
      hit = cfg.reduced ? 850 : impacts[v],
      end = cfg.reduced ? 1150 : 3100;
    const activation = ease(phase(t, 650, 1120)),
      settle = ease(phase(t, hit + 730, end));
    this.fx.visible = t > 0 && t < end;
    this.scene.background = this.overlay
      ? null
      : new T.Color(cfg.dark ? 0x15151b : 0xc7c0b7);
    this.key.intensity = cfg.dark ? 2.1 : 2.7;
    this.scene.environmentIntensity = cfg.dark ? 0.4 : 0.5;
    this.shadow.visible = this.overlay;
    this.light.color.setHex(palettes[v]);
    this.light.position.copy(this.row).add(V(0, 0.8, 0));
    this.light.intensity = cfg.reduced
      ? 0
      : (2 * activation + 12 * Math.exp(-Math.pow((t - hit) / 65, 2))) *
        (1 - settle);
    this.vein.emissive.setHex(palettes[v]);
    this.source.mat.emissive.setHex(palettes[v]);
    this.source.mat.emissiveIntensity =
      Math.sin(Math.PI * phase(t, 300, 1300)) * 0.65;
    for (const m of [
      ...this.slabs,
      ...this.crystals,
      ...this.tubes,
      ...this.shards,
      ...this.bladeLinks,
      ...this.scissors,
      ...this.petals,
      ...this.cores,
      ...this.bloodTubes,
    ])
      m.visible = false;
    this.blade.visible = false;
    this.mana.forEach((m, i) => {
      m.visible = !this.overlay && (i < 9 || t < 200);
    });
    for (let j = 0; j < 4; j++) {
      const m = this.costParts[j],
        u = ease(phase(t, COST, 880)),
        split = ease(phase(t, 200, COST));
      m.visible = !cfg.reduced && t > 200 && t < 900;
      m.position.copy(this.manaPos).lerp(this.sourcePos, u);
      m.position.y += Math.sin(Math.PI * u) * 0.5 + 0.05;
      m.position.x += Math.cos(j * 1.57) * 0.06 * split * (1 - u);
      m.position.z += Math.sin(j * 1.57) * 0.08 * split * (1 - u);
      m.rotation.set(t * 0.002 + j, j * 0.9 + t * 0.003, t * 0.001);
      m.scale.setScalar((1 - u * 0.8) * 1.1);
    }
    this.source.batch.visible = false;
    this.source.shell.visible = true;
    this.source.group.visible = t < end;
    this.source.veins.visible = false;
    this.source.group.rotation.set(this.sourcePitch, 0, 0);
    const exit = ease(phase(t, hit + 610, end));
    this.source.group.position.copy(this.sourcePos);
    this.source.group.position.y += 0.06 * Math.sin(exit * Math.PI);
    this.source.group.scale.x *= 1 - exit;
    this.source.group.scale.z *= 1 - exit * 0.45;
    this.source.group.rotation.z = exit * 0.12;
    for (const p of this.source.parts) {
      p.mesh.position.copy(p.home);
      p.mesh.rotation.set(0, 0, 0);
      p.mesh.scale.setScalar(1);
      p.mesh.visible = false;
    }
    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      card.group.visible = t < end;
      card.mat.emissive.setHex(palettes[v]);
      card.mat.emissiveIntensity = cfg.reduced
        ? 0
        : Math.max(0, Math.sin(phase(t, 950, hit + 180) * Math.PI)) * 0.22;
      const extinguish = ease(phase(t, hit, hit + 85));
      card.death.value = extinguish;
      card.cut.color
        .copy(this.edge.color)
        .lerp(
          new T.Color(0x71142a),
          (1 - ease(phase(t, hit + 110, hit + 380))) *
            phase(t, hit - 40, hit + 25),
        );
      card.veins.visible = !cfg.reduced && t > hit - 380 && t < hit;
      const pulse =
        phase(t, hit - 380, hit - 230) * (1 - phase(t, hit + 15, hit + 80));
      card.veins.scale.set(pulse, 1, pulse);
      card.pulse.emissiveIntensity = 0.55 + Math.sin(t * 0.019) * 0.25;
      if (card.veins.visible) {
        for (const child of card.veins.children) {
          const vessel = child as T.Mesh,
            attr = vessel.geometry.getAttribute(
              "position",
            ) as T.BufferAttribute,
            base = vessel.userData.surfaceBase as Float32Array;
          for (let k = 0; k < attr.count; k++) {
            const x = base[k * 3],
              y = base[k * 3 + 1],
              z = base[k * 3 + 2];
            if (v === 2) {
              const bend = ease(phase(t, 900, hit)),
                angle = z * 2 * bend * 2.35;
              attr.setXYZ(
                k,
                x * Math.cos(angle) - y * Math.sin(angle),
                x * Math.sin(angle) + y * Math.cos(angle) + bend * 0.37,
                z,
              );
            } else if (v === 3) {
              const pressure = ease(phase(t, 1060, hit));
              attr.setXYZ(
                k,
                x,
                y + pressure * 0.19 * Math.max(0, 1 - (x * x + z * z) * 3),
                z,
              );
            } else attr.setXYZ(k, x, y, z);
          }
          attr.needsUpdate = true;
          vessel.geometry.computeVertexNormals();
        }
      }
      const fractured =
        !cfg.reduced &&
        (t >= hit || (v === 2 && t > 900) || (v === 3 && t > 1060));
      card.shell.visible = !fractured && t < hit;
      for (const p of card.parts) {
        const n = p.index,
          m = p.mesh,
          h = p.home;
        m.visible = fractured;
        m.scale.setScalar(1);
        m.position.copy(h);
        m.rotation.set(0, 0, 0);
        if (cfg.reduced) {
          if (t >= 850) m.visible = false;
          continue;
        }
        if (t < hit) {
          const a = ease(phase(t, 900, hit)),
            twist = h.z * 2 * a * 2.35;
          m.position.set(
            h.x * Math.cos(twist),
            h.x * Math.sin(twist) + a * 0.37,
            h.z,
          );
          m.rotation.z = twist;
          card.group.rotation.y = a * (i % 2 ? 0.22 : -0.22);
        } else {
          const d = phase(t, hit, hit + 820),
            flight = d * 0.82,
            decay = 1 - ease(phase(t, hit + 500, hit + 850));
          if (v === 2) {
            const a = 2.35 + flight * 6;
            const r = h.x * (1 - d * 0.5);
            m.position.set(
              r * Math.cos(a * h.z * 2) + Math.sin(n * 3) * d * 0.22,
              r * Math.sin(a * h.z * 2) + 0.38 + d * 0.6,
              h.z + d * (h.z > 0 ? 1 : -1) * 0.6,
            );
            m.rotation.set(d * 0.7, d * 1.2, a * h.z * 2);
          }
          m.scale.setScalar(decay);
          if (t > hit + 790) m.visible = false;
        }
      }
      card.batch.visible = fractured;
      if (fractured) {
        const pp = card.batch.geometry.getAttribute(
            "position",
          ) as T.BufferAttribute,
          nn = card.batch.geometry.getAttribute("normal") as T.BufferAttribute;
        card.parts.forEach((p) => p.mesh.updateMatrix());
        const pos = V(),
          normal = V();
        for (let j = 0; j < card.mapping.length; j++) {
          const [pi, idx] = card.mapping[j],
            p = card.parts[pi],
            src = p.mesh.geometry.getAttribute("position"),
            nor = p.mesh.geometry.getAttribute("normal");
          if (!p.mesh.visible) {
            pp.setXYZ(j, 0, 0, 0);
            continue;
          }
          pos.fromBufferAttribute(src, idx).applyMatrix4(p.mesh.matrix);
          normal
            .fromBufferAttribute(nor, idx)
            .transformDirection(p.mesh.matrix);
          pp.setXYZ(j, pos.x, pos.y, pos.z);
          nn.setXYZ(j, normal.x, normal.y, normal.z);
        }
        pp.needsUpdate = true;
        nn.needsUpdate = true;
      }
      if (settle > 0) {
        card.group.visible = false;
      }
    }
    if (!cfg.reduced && t > 650 && t < end) {
      if (v === 2) {
        const grow = ease(phase(t, 700, 1400)),
          twist = ease(phase(t, 1050, hit)),
          snap = phase(t, hit, hit + 650),
          release = 1 - ease(phase(t, hit + 250, hit + 820));
        for (let i = 0; i < this.cards.length; i++) {
          const o = this.origins[i],
            points = [
              this.sourcePos.clone().add(V(0, 0.07, 0)),
              this.sourcePos
                .clone()
                .lerp(o, 0.35)
                .add(V((i - (this.cards.length - 1) / 2) * 0.12, 0.22, 0.3)),
              o.clone().add(V(-0.66, 0.28, 0.65)),
            ];
          for (let j = 0; j <= 20; j++) {
            const a = (j / 20) * Math.PI * 3.1 + twist * 0.8;
            points.push(
              o
                .clone()
                .add(
                  V(
                    Math.cos(a) * (0.59 + snap * 0.12),
                    0.4 + Math.sin(a) * 0.48,
                    0.65 - (j / 20) * 1.25,
                  ),
                ),
            );
          }
          this.tube(this.tubes[i], points, 0.1 * release, grow);
        }
      }
      // A small amount of solid debris uses ballistic height, tumbling and a ground bounce.
      if (t >= hit && t < hit + 780 && v !== 1 && v !== 4) {
        for (let j = 0; j < this.shards.length; j++) {
          const m = this.shards[j],
            o = this.origins[j % this.cards.length],
            a = j * 2.399,
            d = phase(t, hit, hit + 780),
            f = d * 0.78,
            vel = 0.6 + rng(j + 2) * 2.3;
          m.visible = true;
          m.position
            .copy(o)
            .add(
              V(
                Math.cos(a) * f * (0.8 + rng(j)),
                Math.max(0.015, vel * f - 3.3 * f * f),
                Math.sin(a) * f,
              ),
            );
          m.rotation.set(j + f * 4, f * 5, j + f * 3);
          m.scale.setScalar(
            (1 - ease(phase(d, 0.55, 1))) * (v === 3 ? 0.65 : 0.45),
          );
        }
      }
    }
    // A surviving trace from each target settles into its owner's graveyard.
    if (t > hit + 650 && t < end && !cfg.reduced) {
      const u = ease(phase(t, hit + 650, end));
      for (let i = 0; i < this.cards.length; i++) {
        const m = this.shards[i],
          o = this.origins[i];
        m.visible = true;
        m.position.copy(o).lerp(this.destinations[i] ?? this.grave, u);
        m.position.y = 0.08 + Math.sin(u * Math.PI) * 0.7;
        m.scale.setScalar(0.55 * (1 - u * 0.65));
        m.rotation.set(u * 8, i, u * 5);
      }
    }
    if (t >= end) {
      this.cards.forEach((c) => (c.group.visible = false));
      this.source.group.visible = false;
    }
  }
  render(
    faces: Map<string, HTMLCanvasElement>,
    cfg: Config,
    w: number,
    h: number,
    s?: Scene,
  ) {
    if (this.dead) return;
    const ids = s?.targets.map((p) => p.id) ?? [];
    const sig = ids.join("|");
    if (this.signature !== sig) {
      this.build(faces, ids, !!s);
      this.signature = sig;
    }
    this.position(cfg, s);
    this.animate(cfg);
    if (this.renderSize[0] !== w || this.renderSize[1] !== h) {
      this.renderer.setSize(w, h, false);
      this.renderSize = [w, h];
    }
    this.renderer.render(this.scene, this.camera);
  }
  project(p: Vec, w: number, h: number) {
    const q = p.clone().project(this.camera);
    return { x: ((q.x + 1) * w) / 2, y: ((1 - q.y) * h) / 2 };
  }
  dispose() {
    if (this.dead) return;
    this.dead = true;
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.noise.dispose();
    this.env.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

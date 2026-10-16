import * as T from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
const theme = {body:"#66432e",metal:"#b88c4e",period:7};
export interface Sculpture {
    group: T.Group;
    tick: (t: number, activity?: number) => void;
    dispose: () => void;
}
export function disposeObject(group: T.Object3D) { const gs = new Set<T.BufferGeometry>(), ms = new Set<T.Material>(); group.traverse(o => { if (o instanceof T.Mesh) {
    gs.add(o.geometry);
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => ms.add(m));
} }); gs.forEach(g => g.dispose()); ms.forEach(m => m.dispose()); group.removeFromParent(); }
// Weld rigid decoration per material without merging independently moving parts.
function batchRigid(parent: T.Group) {
    const buckets = new Map<T.Material, T.Mesh[]>();
    for (const o of parent.children)
        if (o instanceof T.Mesh && !Array.isArray(o.material)) {
            const list = buckets.get(o.material) ?? [];
            list.push(o);
            buckets.set(o.material, list);
        }
    for (const [mat, list] of buckets) {
        if (list.length < 2)
            continue;
        const parts = list.map(o => { o.updateMatrix(); const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrix); return g; });
        const merged = mergeGeometries(parts);
        parts.forEach(g => g.dispose());
        if (!merged)
            continue;
        for (const o of list) {
            o.geometry.dispose();
            o.removeFromParent();
        }
        const o = new T.Mesh(merged, mat);
        o.castShadow = true;
        o.receiveShadow = true;
        parent.add(o);
    }
}
export function cofferFurniture(grave = false): Sculpture {
    const group = new T.Group(), updates: ((t: number, a: number) => void)[] = [];
    const mat = (color: string, metalness = 0, roughness = .4) => new T.MeshStandardMaterial({ color, metalness, roughness });
    const body = mat(theme.body, .15, .34), metal = mat(theme.metal, .78, .26), shadow = mat('#15131b', .1, .7), bone = mat('#eee0b4', .05, .3), mouth = mat('#3c1420', 0, .44), tongueMat = mat('#b44847', .03, .32);
    const iris = new T.MeshPhysicalMaterial({ color: '#e8b359', emissive: '#8a3b0d', emissiveIntensity: .18, roughness: .2, clearcoat: 1 });
    const w = grave ? 1.42 : 1.28, h = grave ? 1.99 : 1.9;
    function mesh(geo: T.BufferGeometry, m: T.Material, parent: T.Object3D = group) { const o = new T.Mesh(geo, m); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; }
    function box(x: number, y: number, z: number, m: T.Material, px = 0, py = 0, pz = 0, parent: T.Object3D = group) { const o = mesh(new T.BoxGeometry(x, y, z), m, parent); o.position.set(px, py, pz); return o; }
    function plate(x: number, z: number, d: number, m: T.Material, y: number, parent: T.Object3D = group) { const s = new T.Shape(), a = x / 2, b = z / 2, c = .09; s.moveTo(-a + c, -b); s.lineTo(a - c, -b); s.lineTo(a, -b + c); s.lineTo(a, b - c); s.lineTo(a - c, b); s.lineTo(-a + c, b); s.lineTo(-a, b - c); s.lineTo(-a, -b + c); s.closePath(); const geo = new T.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelSize: .012, bevelThickness: .007, bevelSegments: 2 }); geo.rotateX(-Math.PI / 2); const o = mesh(geo, m, parent); o.position.y = y; return o; }
    function rail(points: number[][], r: number, m: T.Material, parent: T.Object3D = group) { return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(p[0], p[1], p[2]))), 24, r, 6, false), m, parent); }
    function orb(x: number, y: number, z: number, sx: number, sy: number, sz: number, m: T.Material, parent: T.Object3D = group) { const o = mesh(new T.SphereGeometry(1, 20, 12), m, parent); o.position.set(x, y, z); o.scale.set(sx, sy, sz); return o; }
    function tooth(x: number, y: number, z: number, len: number, rx: number, rz: number, parent: T.Object3D = group) { const o = mesh(new T.ConeGeometry(.037, len, 5), bone, parent); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); return o; }
    function eye(x: number, z: number, size: number, parent: T.Object3D = group) { const e = new T.Group(); e.position.set(x, .14, z); parent.add(e); orb(0, 0, 0, size * 1.26, .048, size * .70, metal, e); const eyeball = orb(0, .035, 0, size, .058, size * .52, iris, e); const pupil = orb(0, .087, 0, size * .16, .016, size * .40, shadow, e); orb(-size * .25, .10, -size * .14, .017, .006, .015, bone, e); updates.push(t => { const blink = 1 - .91 * Math.pow(Math.max(0, Math.cos(t * .91 + 1.3)), 28); eyeball.scale.z = size * .52 * blink; pupil.scale.z = size * .4 * blink; pupil.position.x = Math.sin(t * .41) * size * .28; }); return e; }
    // Low physical tray keeps the real card stack at its native contact height.
    plate(w, h, .032, shadow, .014);
    plate(w - .025, h - .025, .024, metal, .045);
    plate(w - .09, h - .09, .008, body, .07);
    for (const x of [-1, 1])
        for (const z of [-1, 1])
            box(.13, .035, .17, metal, x * (w / 2 - .12), .015, z * (h / 2 - .15));
    {
        plate(w - .23, h - .23, .003, mouth, .083);
        // Carved plank seams and brass ribs belong to the same hinged jaws.
        for (const side of [-1, 1]) {
            const jaw = new T.Group();
            jaw.position.set(side * (w / 2 - .045), .10, 0);
            group.add(jaw);
            box(.15, .17, h - .11, body, 0, .035, 0, jaw);
            box(.025, .055, h - .12, metal, -side * .084, .10, 0, jaw);
            for (let j = 0; j < 7; j++) {
                const z = -h * .4 + j * h * .8 / 6;
                box(.163, .018, .016, shadow, 0, .08, z, jaw);
                tooth(-side * .085, .09, z, .13, 0, side * .85, jaw);
                orb(side * .083, .06, z, .025, .025, .025, metal, jaw);
            }
            for (const z of [-h * .32, h * .32]) {
                box(.17, .024, .09, metal, 0, .135, z, jaw);
                box(.026, .17, .09, metal, side * .082, .04, z, jaw);
            }
            batchRigid(jaw);
            updates.push((t, a) => jaw.rotation.z = side * (.045 + .07 * (.5 + .5 * Math.sin(t * Math.PI * 2 / 7)) + .23 * a));
        }
        for (const end of [-1, 1]) {
            box(w - .14, .12, .13, body, 0, .125, end * (h / 2 - .03));
            box(w - .09, .024, .15, metal, 0, .195, end * (h / 2 - .03));
            for (let j = 0; j < 7; j++)
                tooth(-.42 + j * .14, .13, end * (h / 2 - .14), .12, end * .8, 0);
        }
        eye(-.24, -h / 2 + .03, .14);
        eye(.24, -h / 2 + .03, .14);
        const lock = plate(.17, .24, .022, metal, .19);
        lock.position.z = h / 2 - .02;
        orb(0, .22, h / 2 - .05, .03, .008, .03, shadow);
        box(.027, .008, .058, shadow, 0, .22, h / 2 + .0);
        const tongue = orb(0, .089, .36, .16, .008, .40, tongueMat);
        rail([[0, .1, .09], [0, .104, .34], [.02, .104, .65]], .006, mouth);
        updates.push(t => { tongue.scale.z = .39 + .035 * Math.sin(t * .9); tongue.position.z = .36 + .028 * Math.sin(t * .9); });
    }
    let dead = false;
    return { group, tick(t, a = 0) { if (!dead)
            updates.forEach(f => f(t, a)); }, dispose() { if (dead)
            return; dead = true; disposeObject(group); [body, metal, shadow, bone, mouth, tongueMat, iris].forEach(m => m.dispose()); } };
}

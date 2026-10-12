import { Euler, Quaternion, Vector3 } from 'three';
import { ease, hash, hit } from './catalog';
import type { Pose } from './catalog';

const DT = 1 / 300;
const UP = new Vector3(0, 0, 1);
export type CoinContact = { ms: number; i: number; speed: number; x: number };
type Body = {
    p: Vector3; v: Vector3; q: Quaternion; w: Vector3;
    radius: number; half: number; start: number; life: number; fade: number;
    restitution: number; friction: number; lastContact: number; floorY: number;
};
type Frame = { p: Vector3; q: Quaternion };
type Take = { bodies: Body[]; frames: Frame[][]; contacts: CoinContact[] };
const cache = new Map<string, Take>();

function makeBody(variant: number, i: number, n: number, black: boolean): Body {
    const random = (k: number) => hash(i * 47.71 + variant * 113.37 + n * 3.9 + k * 19.13 + (black ? 719 : 0));
    const angle = n === 2 ? (i === 0 ? 2.1 + random(1) * 1.1 : -.65 + random(1) * 1.5) : random(1) * Math.PI * 2;
    const radius = black ? .067 + random(2) * .013 : .097 + random(2) * .009;
    let x = Math.cos(angle) * (.43 + random(3) * .07), y = Math.sin(angle) * (.59 + random(4) * .12);
    const direction = angle + (random(5) - .5) * .9;
    let vx = Math.cos(direction) * (.26 + random(5) * .42), vy = Math.sin(direction) * (.24 + random(6) * .48);
    let vz = 1.35 + random(7) * 1.40;
    let start = hit / 1000 + random(8) * .075;
    if (variant === 1) { x = (random(3) - .5) * .57; y = -.61 - random(4) * .08; vx = (random(5) - .5) * 1.05; vy = -.28 - random(6) * .53; start += random(9) * .11; }
    if (variant === 2) { vz = .70 + random(7) * .85; vx *= 1.20; vy *= 1.15; }
    if (variant === 3) { x = .36 + random(3) * .12; y = -.51 - random(4) * .14; vz = .82 + random(7) * .95; vx = .06 + random(5) * .48; vy = -.12 - random(6) * .52; start += random(9) * .14; }
    const q = new Quaternion().setFromEuler(new Euler(
        (variant === 3 ? 1.10 : -.8) + random(10) * (variant === 3 ? .5 : 2.0),
        (random(11) - .5) * 1.9, random(12) * Math.PI * 2,
    ));
    let z = .13 + random(13) * .04;
    let floorY = 0;
    if (black) {
        start = .86 + i * (variant === 2 ? .17 : .082) + (random(8) - .5) * .12;
        x = (random(3) - .5) * 2.5;
        y = (random(4) - .5) * .5;
        vx = (random(5) - .5) * .46; vy = (random(6) - .5) * .32;
        z = 2.25 + random(13) * .65; vz = -.15 - random(7) * .7;
        floorY = variant === 2 ? .34 : 1.00;
        if (variant === 0) x = (random(3) < .46 ? -1 : 1) * (.72 + random(14) * .44);
        if (variant === 1) { x *= .30; z = .15 + random(13) * .12; vx *= 2.2; vz = 1.6 + random(7) * 1.2; floorY = .78; }
        if (variant === 2) { x = (random(3) < .52 ? -1 : 1) * (.88 + random(14) * .10); vx *= .22; vy *= .2; }
    }
    const b: Body = {
        p: new Vector3(x, y, z), v: new Vector3(vx, vy, vz), q,
        w: new Vector3((random(15) - .5) * 24, (random(16) - .5) * 25, (random(17) - .5) * 18),
        radius, half: radius * .07, start,
        life: black ? 2.05 + random(18) * .36 : 1.72 + random(18) * .30,
        fade: .33 + random(19) * .18, restitution: .34 + random(20) * .18,
        friction: .19 + random(21) * .18, lastContact: -10, floorY,
    };
    b.p.z = Math.max(b.p.z, -tablePoint(b).z + .006);
    return b;
}

// Lowest point of a finite cylinder. A coin resting on its rim needs a different
// centre height and torque arm from a coin lying on its face.
function tablePoint(b: Body): Vector3 {
    const axis = UP.clone().applyQuaternion(b.q);
    const radial = UP.clone().addScaledVector(axis, -axis.z);
    if (radial.lengthSq() > 1e-12) radial.normalize().multiplyScalar(-b.radius);
    return radial.addScaledVector(axis, -b.half * (axis.z < 0 ? -1 : 1));
}
function invInertia(b: Body, v: Vector3): Vector3 {
    const out = v.clone().applyQuaternion(b.q.clone().invert());
    const flat = 12 / (3 * b.radius * b.radius + 4 * b.half * b.half);
    out.set(out.x * flat, out.y * flat, out.z * 2 / (b.radius * b.radius));
    return out.applyQuaternion(b.q);
}
function denominator(b: Body, r: Vector3, axis: Vector3): number {
    return 1 + invInertia(b, r.clone().cross(axis)).cross(r).dot(axis);
}
function impulse(b: Body, r: Vector3, force: Vector3) {
    b.v.add(force);
    b.w.add(invInertia(b, r.clone().cross(force)));
}
function tableContact(b: Body, time: number, i: number, contacts: CoinContact[]) {
    const r = tablePoint(b);
    if (b.p.z + r.z > .00015) return;
    b.p.z = -r.z;
    const contactVelocity = b.v.clone().add(b.w.clone().cross(r));
    const speed = -contactVelocity.z;
    if (speed > 0) {
        const face = Math.abs(UP.clone().applyQuaternion(b.q).z);
        const restitution = speed < .32 ? 0 : b.restitution * (face > .9 ? .42 : 1);
        const j = (1 + restitution) * speed / denominator(b, r, UP);
        impulse(b, r, UP.clone().multiplyScalar(j));
        const tangent = b.v.clone().add(b.w.clone().cross(r)); tangent.z = 0;
        const slip = tangent.length();
        if (slip > 1e-6) {
            tangent.multiplyScalar(1 / slip);
            const friction = Math.min(slip / denominator(b, r, tangent), b.friction * j);
            impulse(b, r, tangent.multiplyScalar(-friction));
        }
        if (speed > .30 && time - b.lastContact > .065) {
            contacts.push({ ms: time * 1000, i, speed, x: b.p.x }); b.lastContact = time;
        }
    }
    // Rolling resistance acts only during contact, never as an airborne snap to flat.
    b.w.multiplyScalar(Math.exp(-DT * 2.4));
    if (b.v.lengthSq() < .0016 && b.w.lengthSq() < .08) { b.v.set(0, 0, 0); b.w.set(0, 0, 0); }
}
function coinContact(a: Body, b: Body) {
    const delta = b.p.clone().sub(a.p), distance = delta.length();
    if (distance < 1e-5 || distance > a.radius + b.radius) return;
    const axis = delta.multiplyScalar(1 / distance);
    const support = (body: Body) => {
        const dot = Math.abs(UP.clone().applyQuaternion(body.q).dot(axis));
        return body.radius * Math.sqrt(Math.max(0, 1 - dot * dot)) + body.half * dot;
    };
    const ar = support(a), br = support(b), overlap = ar + br - distance;
    if (overlap <= 0) return;
    const correction = Math.min(overlap * .3, .003);
    a.p.addScaledVector(axis, -correction); b.p.addScaledVector(axis, correction);
    const speed = b.v.clone().sub(a.v).dot(axis);
    if (speed < 0) {
        const j = -speed * .61;
        impulse(a, axis.clone().multiplyScalar(ar), axis.clone().multiplyScalar(-j));
        impulse(b, axis.clone().multiplyScalar(-br), axis.clone().multiplyScalar(j));
    }
}
function take(variant: number, n: number, black: boolean): Take {
    const key = `${black}/${variant}/${n}`, previous = cache.get(key);
    if (previous) return previous;
    const bodies = Array.from({ length: n }, (_, i) => makeBody(variant, i, n, black));
    const frames: Frame[][] = [], contacts: CoinContact[] = [];
    const end = black ? 6.6 : 3.1;
    for (let step = 0; step <= Math.ceil(end / DT); step++) {
        const t = step * DT;
        for (let i = 0; i < n; i++) {
            const b = bodies[i]; if (t < b.start || t > b.start + b.life) continue;
            b.v.z -= 7.8 * DT; b.p.addScaledVector(b.v, DT);
            const angularSpeed = b.w.length();
            if (angularSpeed > 1e-7) b.q.premultiply(new Quaternion().setFromAxisAngle(b.w.clone().multiplyScalar(1 / angularSpeed), angularSpeed * DT)).normalize();
            b.w.multiplyScalar(Math.exp(-.09 * DT));
            tableContact(b, t, i, contacts);
        }
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            const a = bodies[i], b = bodies[j];
            if (t > a.start && t > b.start && t < a.start + a.life && t < b.start + b.life) coinContact(a, b);
        }
        for (const b of bodies) b.p.z = Math.max(b.p.z, -tablePoint(b).z);
        frames.push(bodies.map(b => ({ p: b.p.clone(), q: b.q.clone() })));
    }
    const result = { bodies, frames, contacts }; cache.set(key, result); return result;
}
export function coinContacts(variant: number, n: number, black = false): readonly CoinContact[] {
    return take(variant, n, black).contacts;
}
export function coinPose(variant: number, i: number, n: number, ms: number, black = false): Pose {
    const sim = take(variant, n, black), body = sim.bodies[i];
    const frame = Math.max(0, Math.min(sim.frames.length - 1, ms / 1000 / DT));
    const a = sim.frames[Math.floor(frame)][i], b = sim.frames[Math.min(sim.frames.length - 1, Math.floor(frame) + 1)][i];
    const p = a.p.clone().lerp(b.p, frame % 1), q = a.q.clone().slerp(b.q, frame % 1);
    const age = ms / 1000 - body.start;
    if (black) q.premultiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 1.03));
    return {
        x: p.x, y: black ? body.floorY - p.z * .92 + p.y * .18 : -p.y,
        z: black ? .3 + p.y * .12 : p.z, rx: 0, ry: 0, rz: 0,
        quaternion: [q.x, q.y, q.z, q.w], r: body.radius,
        visible: age >= 0 && age < body.life && (!black || ms < 5950),
        dissolve: Math.max(ease(body.life - body.fade, body.life, age), black ? ease(5.15, 5.95, ms / 1000) : 0),
        impact: sim.contacts.find(e => e.i === i)?.ms ?? Infinity,
    };
}
export function coinPoses(variant: number, n: number, ms: number, black = false): Pose[] {
    return Array.from({ length: n }, (_, i) => coinPose(variant, i, n, ms, black));
}

import {createWebGLRenderer} from '../webglRenderer';
import * as T from 'three';
import { hash } from './catalog';
import { coinPoses } from './physics';
import type { Pose } from './catalog';
/** Real bevel, reeded edge, embossed faces and deterministic ballistic flight. */
export class Coins {
    readonly canvas = document.createElement('canvas');
    private gl = createWebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    private scene = new T.Scene();
    private root = new T.Group();
    private camera = new T.OrthographicCamera(-2, 2, 2, -2, .01, 40);
    private coins: T.Group[] = [];
    private materials: T.MeshStandardMaterial[][] = [];
    private dissolve: {
        value: number;
    }[] = [];
    private geometries: T.BufferGeometry[] = [];
    private textures: T.Texture[] = [];
    private env: T.WebGLRenderTarget;
    private dead = false;
    constructor() {
        this.gl.setSize(768, 768, false);
        this.gl.outputColorSpace = T.SRGBColorSpace;
        this.gl.setClearColor(0, 0);
        this.scene.add(this.root);
        const env = document.createElement('canvas');
        env.width = 1024;
        env.height = 512;
        const e = env.getContext('2d')!;
        e.fillStyle = '#4b4540';
        e.fillRect(0, 0, 1024, 512);
        const g = e.createLinearGradient(0, 0, 0, 512);
        g.addColorStop(0, '#eeeeea');
        g.addColorStop(.45, '#6d665c');
        g.addColorStop(.52, '#171717');
        g.addColorStop(1, '#817768');
        e.fillStyle = g;
        e.fillRect(0, 0, 1024, 512);
        e.fillStyle = '#ffffff';
        e.fillRect(90, 30, 75, 180);
        e.fillRect(620, 80, 30, 230);
        e.fillStyle = '#b2c3d6';
        e.fillRect(870, 95, 65, 110);
        const et = new T.CanvasTexture(env);
        et.mapping = T.EquirectangularReflectionMapping;
        const pm = new T.PMREMGenerator(this.gl);
        this.env = pm.fromEquirectangular(et);
        this.scene.environment = this.env.texture;
        pm.dispose();
        et.dispose();
        this.scene.add(new T.HemisphereLight('#fff6d9', '#242432', 1));
        const l = new T.DirectionalLight('#fff3cf', 2);
        l.position.set(-3, 2, 7);
        this.scene.add(l);
        const relief = this.relief();
        const body = new T.CylinderGeometry(1, 1, .14, 80, 1, false);
        body.rotateX(Math.PI / 2);
        const rim = new T.TorusGeometry(.92, .04, 8, 80);
        const plate = new T.CircleGeometry(.87, 80);
        this.geometries.push(body, rim, plate);
        const tooth = new T.BoxGeometry(.028, .075, .135);
        this.geometries.push(tooth);
        for (let i = 0; i < 30; i++) {
            const amount = { value: 0 };
            this.dissolve.push(amount);
            const metal = new T.MeshStandardMaterial({ color: '#d8ac48', metalness: 1, roughness: .27 });
            const face = new T.MeshStandardMaterial({ color: '#e3b957', map: relief.map, bumpMap: relief.bump, bumpScale: .055, metalness: .9, roughness: .32 });
            for (const m of [metal, face]) {
                m.onBeforeCompile = shader => { shader.uniforms.vanish = amount; shader.fragmentShader = 'uniform float vanish;\n' + shader.fragmentShader; shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', `#include <alphatest_fragment>\nfloat grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);if(grain<vanish)discard;`); };
            }
            this.materials.push([metal, face]);
            const coin = new T.Group();
            coin.add(new T.Mesh(body, metal));
            for (const side of [-1, 1]) {
                const ring = new T.Mesh(rim, metal);
                ring.position.z = side * .078;
                coin.add(ring);
                const cap = new T.Mesh(plate, face);
                cap.position.z = side * .078;
                if (side < 0)
                    cap.rotation.y = Math.PI;
                coin.add(cap);
            }
            const reeds = new T.InstancedMesh(tooth, metal, 72);
            const obj = new T.Object3D();
            for (let j = 0; j < 72; j++) {
                const a = j * Math.PI * 2 / 72;
                obj.position.set(Math.cos(a) * .997, Math.sin(a) * .997, 0);
                obj.rotation.z = a;
                obj.updateMatrix();
                reeds.setMatrixAt(j, obj.matrix);
            }
            coin.add(reeds);
            coin.visible = false;
            this.root.add(coin);
            this.coins.push(coin);
        }
    }
    private relief() {
        const c = document.createElement('canvas');
        c.width = c.height = 512;
        const x = c.getContext('2d')!;
        x.fillStyle = '#9c8b67';
        x.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 2500; i++) {
            x.fillStyle = i % 2 ? '#a89672' : '#95835f';
            x.fillRect(hash(i) * 512, hash(i + 55) * 512, .5 + hash(i + 4) * 2, .6);
        }
        x.strokeStyle = '#d2c097';
        x.lineWidth = 5;
        for (const r of [235, 220, 191]) {
            x.beginPath();
            x.arc(256, 256, r, 0, Math.PI * 2);
            x.stroke();
        }
        for (let i = 0; i < 48; i++) {
            const a = i * Math.PI / 24;
            x.save();
            x.translate(256, 256);
            x.rotate(a);
            x.fillStyle = '#dbc99f';
            x.fillRect(199, -2, i % 4 === 0 ? 13 : 6, 4);
            x.restore();
        }
        // A sculpted eye/diamond merchant seal; no card illustration or currency text.
        x.save();
        x.translate(256, 256);
        x.strokeStyle = '#625031';
        x.lineWidth = 14;
        x.beginPath();
        x.moveTo(-132, 0);
        x.quadraticCurveTo(0, -130, 132, 0);
        x.quadraticCurveTo(0, 130, -132, 0);
        x.stroke();
        x.translate(-3, -4);
        x.strokeStyle = '#e9d8ae';
        x.lineWidth = 7;
        x.stroke();
        x.beginPath();
        x.moveTo(0, -67);
        x.lineTo(46, 0);
        x.lineTo(0, 67);
        x.lineTo(-46, 0);
        x.closePath();
        x.fillStyle = '#cfba88';
        x.fill();
        x.stroke();
        x.restore();
        const map = new T.CanvasTexture(c), bump = new T.CanvasTexture(c);
        map.colorSpace = T.SRGBColorSpace;
        this.textures.push(map, bump);
        return { map, bump };
    }
    render(poses: Pose[], black: boolean, studio: boolean, size = 768) {
        if (this.dead)
            return this.canvas;
        const s = Math.min(900, Math.max(300, Math.round(size / 32) * 32));
        if (this.canvas.width !== s)
            this.gl.setSize(s, s, false);
        for (let i = 0; i < this.coins.length; i++) {
            const coin = this.coins[i], p = poses[i];
            coin.visible = !!p?.visible;
            if (!p)
                continue;
            coin.position.set(p.x, -p.y, p.z);
            if (p.quaternion) coin.quaternion.fromArray(p.quaternion);
            else coin.rotation.set(p.rx, p.ry, p.rz);
            coin.scale.setScalar(p.r);
            this.dissolve[i].value = p.dissolve;
            this.materials[i][0].color.set(black ? '#292737' : '#d8ac48');
            this.materials[i][1].color.set(black ? '#4d485b' : '#e4bc5e');
            this.materials[i][0].roughness = black ? .29 : .23;
        }
        this.camera.position.set(0, studio ? -5.7 : 0, studio ? 4.1 : 8);
        this.camera.lookAt(0, 0, 0);
        this.root.rotation.z = studio ? 14 * Math.PI / 180 : 0;
        this.gl.render(this.scene, this.camera);
        return this.canvas;
    }
    draw(c: CanvasRenderingContext2D, v: number, n: number, ms: number, x: number, y: number, w: number, studio = true) { const poses = coinPoses(v, n, ms); c.save(); c.translate(x, y); c.scale(w, w); if (studio)
        c.transform(.970, -.14, .242, .563, 0, 0); for (const p of poses) {
        if (!p.visible)
            continue;
        c.globalAlpha = (1 - p.dissolve) * .24 / (1 + p.z * 4);
        c.fillStyle = '#392b1c';
        c.beginPath();
        c.ellipse(p.x, p.y, p.r * (1.1 + p.z * .3), p.r * (1.1 + p.z * .3), 0, 0, Math.PI * 2);
        c.fill();
    } c.restore(); c.drawImage(this.render(studio ? poses : poses.map(p => ({ ...p, y: p.y - p.z * Math.tan(Math.PI / 10) })), false, studio, Math.min(768, w * 4)), x - w * 2, y - w * 2, w * 4, w * 4); }
    dark(c: CanvasRenderingContext2D, v: number, ms: number, x: number, y: number, w: number) {
        const poses = coinPoses(v, [18, 24, 12, 26][v], ms, true);
        c.drawImage(this.render(poses, true, false, Math.min(900, w * 4)), x - w * 2, y - w * 2, w * 4, w * 4);
    }
    get resources() { return { contexts: 1, geometry: this.gl.info.memory.geometries, textures: this.gl.info.memory.textures, coins: this.coins.length }; }
    dispose() { if (this.dead)
        return; this.dead = true; this.geometries.forEach(g => g.dispose()); this.materials.flat().forEach(m => m.dispose()); this.textures.forEach(t => t.dispose()); this.env.dispose(); this.gl.dispose(); this.gl.forceContextLoss(); }
}

import {DarkRenderer} from '../../ui/merchant/darkRenderer';
import { Renderer as Slate } from '../../ui/summon/renderer';
import { Coins } from './coins';
import { Material } from './material';
import { count } from './catalog';
import type { Merchant } from './catalog';
import gate from './assets/gate.png';
import coffer from './assets/coffer.png';
import balance from './assets/balance.png';
import bazaar from './assets/bazaar.png';
export async function loadAssets() { return Promise.all([gate, coffer, balance, bazaar].map(src => new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; }))); }
export class Renderer {
    private slate = new Slate();
    readonly coins = new Coins();
    private material: Material;
    constructor(images: HTMLImageElement[]) { this.material = new Material(images); }
    normal(c: CanvasRenderingContext2D, face: HTMLCanvasElement, v: number, ms: number, x: number, y: number, w: number, id: Merchant, reduced = false, pass: 'all' | 'ground' | 'card' = 'all', studio = true) { this.slate.draw(c, face, 2, Math.min(2500, ms), x, y, w, reduced, pass, studio); if (!reduced && pass !== 'card')
        this.coins.draw(c, v, count(id), ms, x, y, w, studio); }
    dark = DarkRenderer.prototype.dark;
    dispose() { this.slate.dispose(); this.coins.dispose(); this.material.dispose(); }
}

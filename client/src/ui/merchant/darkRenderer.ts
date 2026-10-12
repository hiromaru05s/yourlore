import {Coins} from './coins';
import {Material} from './material';
import {ease} from './catalog';
export class DarkRenderer {
 readonly coins = new Coins();
 private material: Material;
 constructor(images:HTMLImageElement[]){this.material=new Material(images);}
    dark(c: CanvasRenderingContext2D, face: HTMLCanvasElement, v: number, ms: number, w: number, h: number, reduced = false, board = false, source?: {
        x: number;
        y: number;
        w: number;
    }, keepCard = false) {
        const t = reduced ? 3.3 : ms / 1000, scale = Math.min(w / 960, h / 650), cx = w / 2, cy = h * .49, live = ease(.2, .7, t) * (1 - ease(5.9, 6.6, t));
        if (ms >= 6600 && !reduced)
            return;
        if (board) {
            c.fillStyle = `rgba(7,6,12,${live * .83})`;
            c.fillRect(0, 0, w, h);
        }
        c.save();
        c.translate(cx, cy);
        c.scale(scale, scale);
        const g = c.createRadialGradient(0, 80, 10, 0, 80, 330);
        g.addColorStop(0, `rgba(85,61,102,${.17 * live})`);
        g.addColorStop(.65, `rgba(57,36,63,${.1 * live})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.fillRect(-420, -300, 840, 660);
        // The market's light touches its threshold, with a quiet reflection below the source card.
        c.save();
        c.translate(0, 215);
        c.scale(1, .12);
        const light = c.createRadialGradient(0, 0, 0, 0, 0, 300);
        light.addColorStop(0, `rgba(187,139,70,${.26 * live})`);
        light.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = light;
        c.fillRect(-310, -310, 620, 620);
        c.restore();
        c.restore();
        const mat = this.material.draw(Math.min(1200, w), Math.min(1200, w) * h / w, v, t);
        c.drawImage(mat, 0, cy - h / 2, w, h);
        if (!reduced)
            this.coins.dark(c, v, ms, cx, cy, scale * 230);
        // The card itself stays intact and readable throughout its enlarged spell reveal.
        const focus = ease(0, .55, t), cardW = Math.max(scale * [151, 160, 138, 155][v], Math.min(w * .29, 110)), targetY = cy + scale * [10, -72, -12, -10][v];
        const sx = source?.x ?? cx, sy = source?.y ?? (cy + scale * 160), sw = source?.w ?? cardW * .45;
        const ww = sw + (cardW - sw) * focus, xx = sx + (cx - sx) * focus, yy = sy + (targetY - sy) * focus, hold = keepCard ? 1 : 1 - ease(5.8, 6.6, t);
        c.save();
        c.globalAlpha = hold;
        c.shadowColor = '#000';
        c.shadowBlur = scale * 18;
        c.shadowOffsetY = scale * 6;
        c.drawImage(face, xx - ww * .62, yy - ww * .87, ww * 1.24, ww * 1.74);
        c.restore();
        if (t > 2.1 && t < 3.1) {
            const shine = Math.sin(ease(2.1, 3.1, t) * Math.PI) * .34;
            c.save();
            c.translate(xx, yy);
            c.globalAlpha = shine;
            c.strokeStyle = '#d6c098';
            c.lineWidth = scale * .8;
            c.strokeRect(-cardW * .49, -cardW * .745, cardW * .98, cardW * 1.49);
            c.restore();
        }
    }
 dispose(){this.coins.dispose();this.material.dispose();}
}

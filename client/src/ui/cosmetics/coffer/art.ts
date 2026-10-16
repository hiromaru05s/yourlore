import * as T from 'three';
const theme = {body:"#66432e",metal:"#b88c4e",period:7};
/** The same animated bitmap is sampled by pile stock, the hand and draw clones.
 * Only the inset creature moves; the physical two-tone cut edge stays fixed. */
export function sleeveArt() {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 1200;
    const base = canvas.cloneNode() as HTMLCanvasElement, ctx = base.getContext('2d')!;
    ctx.scale(2, 2);
    
    function rect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string, width = 1) { c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill(); if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = width;
        c.stroke();
    } }
    function line(c: CanvasRenderingContext2D, points: number[][], color: string, width = 1) { c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = color; c.lineWidth = width; c.stroke(); }
    function ellipse(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = color; c.fill(); }
    function poly(c: CanvasRenderingContext2D, pts: number[][], color: string, stroke?: string) { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = color; c.fill(); if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = 1;
        c.stroke();
    } }
    const metal = ctx.createLinearGradient(0, 0, 384, 600);
    metal.addColorStop(0, '#edcc8c');
    metal.addColorStop(.35, theme.metal);
    metal.addColorStop(.52, '#e3bb77');
    metal.addColorStop(1, '#735035');
    ctx.fillStyle = '#0d1118';
    ctx.fillRect(0, 0, 384, 600);
    rect(ctx, 17, 23, 350, 554, 40, '#0c0e17');
    ctx.fillStyle = metal;
    ctx.beginPath();
    ctx.roundRect(23, 29, 338, 542, 35);
    ctx.fill();
    rect(ctx, 31, 37, 322, 526, 28, '#11121c');
    rect(ctx, 38, 44, 308, 512, 22, theme.body);
    const pat = ctx.createLinearGradient(38, 0, 346, 0);
    pat.addColorStop(0, '#0005');
    pat.addColorStop(.4, '#ffffff10');
    pat.addColorStop(1, '#0008');
    ctx.fillStyle = pat;
    ctx.fillRect(42, 60, 300, 480);
    {
        for (let j = 0; j < 7; j++) {
            const x = 48 + j * 42;
            line(ctx, [[x, 59], [x + 2, 539]], '#211a16', 3);
            for (let k = 0; k < 6; k++) {
                const pts = Array.from({ length: 18 }, (_, i) => [x + 7 + k * 4 + Math.sin(i * .75 + j + k) * 2, 66 + i * 27]);
                line(ctx, pts, k % 2 ? '#b5834a50' : '#201b1580', .8);
            }
        }
        for (const y of [102, 488]) {
            rect(ctx, 41, y, 302, 35, 3, '#33281f', theme.metal, 2);
            for (let x = 53; x < 340; x += 24) {
                ellipse(ctx, x, y + 17, 3.8, 3.8, '#d4b57a');
                ellipse(ctx, x - 1, y + 16, 1, 1, '#fff0bf');
            }
        }
        for (const x of [75, 285]) {
            rect(ctx, x, 68, 24, 466, 3, '#a47b43', '#e6c68c', 1);
            line(ctx, [[x + 6, 73], [x + 6, 529]], '#604528', 2);
        }
    }
    // Corner armour is fully inside the real rounded card crop.
    for (const x of [48, 336])
        for (const y of [61, 539]) {
            const sx = x < 192 ? 1 : -1, sy = y < 300 ? 1 : -1;
            poly(ctx, [[x, y], [x + sx * 53, y], [x + sx * 13, y + sy * 36], [x, y + sy * 55]], theme.metal, '#ead6ac');
            ellipse(ctx, x + sx * 13, y + sy * 13, 4, 4, '#20202a');
            ellipse(ctx, x + sx * 12, y + sy * 12, 1.4, 1.4, '#eddfbc');
        }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#edd5a3';
    ctx.font = '13px Georgia';
    ctx.fillText('L O R E', 192, 551);
    const out = canvas.getContext('2d')!;
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 8;
    const finishCanvas = base.cloneNode() as HTMLCanvasElement;
    const f = finishCanvas.getContext('2d')!;
    f.fillStyle = '#888';
    f.fillRect(0, 0, 768, 1200);
    const finish = new T.CanvasTexture(finishCanvas);
    function eye(c: CanvasRenderingContext2D, x: number, y: number, w: number, time: number) {
        const blink = 1 - .94 * Math.pow(Math.max(0, Math.cos(time * .91 + 1.3)), 28), h = w * .45 * blink;
        ellipse(c, x, y, w + 5, h + 5, '#0c1018');
        ellipse(c, x, y, w, h, '#957344');
        const iris = c.createRadialGradient(x - w * .12, y - h * .22, 1, x, y, w);
        iris.addColorStop(0, '#fff2b7');
        iris.addColorStop(.36, '#eab756');
        iris.addColorStop(1, '#98501e');
        c.save();
        c.beginPath();
        c.ellipse(x, y, w - 4, Math.max(1, h - 3), 0, 0, Math.PI * 2);
        c.clip();
        c.fillStyle = iris;
        c.fillRect(x - w, y - h, w * 2, h * 2);
        for (let j = 0; j < 32; j++) {
            const a = j * Math.PI / 16;
            line(c, [[x + Math.cos(a) * w * .43, y + Math.sin(a) * w * .43], [x + Math.cos(a) * w * .85, y + Math.sin(a) * w * .85]], '#6c3f304d', 1.3);
        }
        ellipse(c, x + Math.sin(time * .41) * w * .24, y, w * .14, w * .58, '#11121b');
        ellipse(c, x - w * .27, y - h * .25, w * .12, w * .055, '#fff8de');
        c.restore();
    }
    function teeth(c: CanvasRenderingContext2D, y: number, up: boolean, width = 218) { for (let j = 0; j < 9; j++) {
        const x = 192 - width / 2 + j * width / 8, len = j === 0 || j === 8 ? 27 : j % 2 ? 21 : 33;
        poly(c, [[x - 8, y], [x + 8, y], [x + 2, y + (up ? -len : len)]], '#eee0b6', '#aa936f');
        line(c, [[x - 5, y + (up ? -2 : 2)], [x + 1, y + (up ? -len * .65 : len * .65)]], '#fff3d6', 1.5);
    } }
    let last = -1;
    function paint(t: number) {
        if (Math.abs(t - last) < 1 / 30 && last >= 0)
            return;
        last = t;
        out.setTransform(1, 0, 0, 1, 0, 0);
        out.drawImage(base, 0, 0);
        out.setTransform(2, 0, 0, 2, 0, 0);
        const breath = .5 + .5 * Math.sin(t * Math.PI * 2 / theme.period);
        {
            const gap = 42 + breath * 14;
            rect(out, 60, 218, 264, 177, 18, '#1a1015', '#34201d', 5);
            // Two rigid wooden halves pivot visually around the mouth seam.
            rect(out, 62, 199, 260, 99 - gap * .36, 15, '#5f3b27', '#d1a666', 3);
            rect(out, 62, 313 + gap * .36, 260, 100 - gap * .36, 14, '#523323', '#b78d53', 3);
            for (const x of [83, 277]) {
                rect(out, x, 204, 23, 74 - gap * .36, 3, '#ac8248', '#e6c185');
                rect(out, x, 324 + gap * .36, 23, 76 - gap * .36, 3, '#977040', '#d3b477');
            }
            ellipse(out, 192, 329 + breath * 5, 34, 40, '#9e4248');
            line(out, [[192, 304], [193, 355 + breath * 5]], '#542331', 2);
            teeth(out, 287 - gap * .36, false);
            teeth(out, 325 + gap * .36, true);
            eye(out, 132, 240 - gap * .12, 25, t);
            eye(out, 252, 240 - gap * .12, 25, t);
            rect(out, 173, 370, 38, 48, 6, '#bc9457', '#efcf91', 2);
            ellipse(out, 192, 385, 7, 7, '#2c2020');
            poly(out, [[188, 386], [196, 386], [199, 404], [185, 404]], '#2c2020');
        }
        map.needsUpdate = true;
    }
    paint(0);
    return { map, finish, canvas, paint, dispose() { map.dispose(); finish.dispose(); } };
}
export function animatedSleeve(art: ReturnType<typeof sleeveArt>) {
    return new T.MeshPhysicalMaterial({ map: art.map, metalness: .20, roughness: .43, clearcoat: .38, clearcoatRoughness: .25 });
}

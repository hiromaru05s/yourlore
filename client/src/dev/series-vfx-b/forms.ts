/** Deterministic, card-local material forms. All coordinates use a 100 × 140 card. */
export const familyStyles: Record<string, { name1: string; name2: string; ink: string; mid: string; light: string }> = {
  elf: { name1: '翠刻の葉脈', name2: '風葉の織冠', ink: '#123f35', mid: '#4faa76', light: '#e2f5b6' },
  tree: { name1: '根脈の樹心', name2: '琥珀葉の樹膜', ink: '#3a3522', mid: '#ac8650', light: '#e7e5a5' },
  dragon: { name1: '竜鱗の翼圧', name2: '影翼の降臨', ink: '#172b47', mid: '#52849a', light: '#d0eeef' },
  divine: { name1: '白殻の神紋', name2: '角光の羽衣', ink: '#454052', mid: '#b9a9cd', light: '#fff7da' },
  origin: { name1: '古層の刻印', name2: '始原の織核', ink: '#223b48', mid: '#669994', light: '#d5f0d1' },
  predator: { name1: '牙環の咬合', name2: '影獣の吸収', ink: '#372536', mid: '#ad5c69', light: '#fce1bd' },
  noble: { name1: '紋章の金象嵌', name2: '封蝋の絹襞', ink: '#493248', mid: '#b48f55', light: '#f9e4aa' },
  market: { name1: '帳簿の転写', name2: '交易箔の架橋', ink: '#343b49', mid: '#b69c65', light: '#f6e7b4' },
  wine: { name1: '紫晶の熟成', name2: '蔓織りの醸造', ink: '#41263c', mid: '#a35370', light: '#f4cfb8' },
};
type C = CanvasRenderingContext2D;
type Palette = typeof familyStyles[string];
type Point = readonly [number, number];
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => { const q = clamp(v); return q * q * (3 - 2 * q); };
const grow = (p: number, delay = 0) => ease((p - delay) / .25);
const retract = (p: number, delay = 0) => 1 - ease((p - .68 - delay) / (.32 - delay));

function stroke(c: C, points: readonly Point[], color: string, width: number, close = false) {
  if (!points.length) return;
  c.beginPath(); c.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) c.lineTo(points[i][0], points[i][1]);
  if (close) c.closePath();
  c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function polygon(c: C, points: readonly Point[], fill: string, edge?: string, width = .55) {
  c.beginPath(); c.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) c.lineTo(points[i][0], points[i][1]);
  c.closePath(); c.fillStyle = fill; c.fill();
  if (edge) { c.strokeStyle = edge; c.lineWidth = width; c.stroke(); }
}
/** A continuous tapered material strip; the narrow lit seam describes its curvature. */
function ribbon(c: C, a: Point, b: Point, d: Point, thickness: number, s: Palette, reverse = false) {
  c.beginPath(); c.moveTo(a[0], a[1]);
  c.quadraticCurveTo(b[0], b[1], d[0], d[1]);
  c.quadraticCurveTo(b[0] + thickness, b[1] + thickness * .45, a[0] + thickness * .2, a[1] + thickness);
  c.closePath(); c.fillStyle = s.ink; c.fill();
  c.beginPath(); c.moveTo(a[0] + thickness * .16, a[1] + thickness * .4);
  c.quadraticCurveTo(b[0] + thickness * .3, b[1] + thickness * .25, d[0], d[1]);
  c.strokeStyle = reverse ? s.light : s.mid; c.lineWidth = Math.max(.45, thickness * .32); c.stroke();
  c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(b[0], b[1], d[0], d[1]);
  c.strokeStyle = s.light; c.lineWidth = .65; c.stroke();
}
function leaf(c: C, x: number, y: number, size: number, angle: number, s: Palette, crystal = false) {
  c.save(); c.translate(x, y); c.rotate(angle); c.scale(size, size);
  if (crystal) {
    polygon(c, [[0, 0], [-5, -12], [0, -29], [7, -11]], s.ink, s.mid);
    polygon(c, [[0, 0], [0, -29], [7, -11]], s.mid);
    stroke(c, [[0, 0], [0, -29], [7, -11]], s.light, .7);
    stroke(c, [[-5, -12], [0, -17], [7, -11]], s.light, .4);
  } else {
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-12, -7, -10, -20, 0, -29);
    c.bezierCurveTo(8, -19, 12, -9, 0, 0); c.fillStyle = s.ink; c.fill();
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-2, -18, 0, -29);
    c.quadraticCurveTo(10, -15, 0, 0); c.fillStyle = s.mid; c.fill();
    stroke(c, [[0, 0], [-.6, -14], [0, -29]], s.light, .65);
    for (let j = 0; j < 3; j++) {
      const yy = -7 - j * 5;
      stroke(c, [[-5 + j, yy - 5], [0, yy], [5 - j, yy - 4]], s.light, .35);
    }
  }
  c.restore();
}
function gem(c: C, x: number, y: number, r: number, s: Palette, sides = 6) {
  const pts: Point[] = Array.from({ length: sides }, (_, i) => {
    const a = i / sides * Math.PI * 2 - Math.PI / 2;
    return [x + Math.cos(a) * r, y + Math.sin(a) * r];
  });
  polygon(c, pts, s.ink, s.mid, .6);
  for (let i = 0; i < sides; i++) polygon(c, [[x, y], pts[i], pts[(i + 1) % sides]], i % 3 === 0 ? s.light : i % 3 === 1 ? s.mid : s.ink);
  stroke(c, pts, s.light, .4, true);
}
function elf(c: C, v: number, p: number, s: Palette) {
  const q = grow(p) * retract(p);
  if (v === 1) {
    for (const side of [-1, 1]) {
      c.save(); c.scale(side, 1);
      ribbon(c, [5, 55], [45 * q, 5], [22 * q, 55 - 110 * q], 4 * q, s);
      for (let i = 0; i < 5; i++) {
        const z = grow(p, i * .035) * retract(p, i * .012);
        leaf(c, 13 + 16 * Math.sin(i * .65), 39 - i * 20, .7 * z, -.8 + i * .18, s);
        if (i < 4) leaf(c, 14 + 14 * Math.sin(i * .65), 28 - i * 20, .4 * z, 1.1, s);
      }
      c.restore();
    }
  } else {
    for (let i = 0; i < 8; i++) {
      const z = grow(p, i * .025) * retract(p, i * .015);
      const a = i / 8 * Math.PI * 2 + (1 - grow(p)) * .8;
      const x = Math.sin(a) * (33 + 23 * Math.sin(p * Math.PI)) * z;
      const y = Math.cos(a) * 49 * z;
      ribbon(c, [0, 39], [x * .5 - 12, y + 18], [x, y], 2.5 * z, s);
      leaf(c, x, y, z * .75, -a + p * .7, s);
    }
  }
}
function tree(c: C, v: number, p: number, s: Palette) {
  const q = grow(p) * retract(p);
  if (v === 1) {
    for (let i = -2; i <= 2; i++) {
      const x = i * 5;
      ribbon(c, [i * 17 * q, 65], [x, 20], [i * 16 * q, 55 - 113 * q], (7 - Math.abs(i)) * q, s);
      for (const side of [-1, 1]) ribbon(c, [x, 5 + i * 4], [side * 37 * q, -10], [side * (44 + i) * q, -30 - i * 9], 2.4 * q, s);
    }
    for (let i = 0; i < 7; i++) leaf(c, (i - 3) * 13 * q, -30 - (3 - Math.abs(i - 3)) * 7 * q, .46 * q, (i - 3) * .3, s);
  } else {
    for (let i = 0; i < 7; i++) {
      const z = grow(p, i * .03) * retract(p, i * .015);
      const a = (i - 3) * .44;
      const x = Math.sin(a) * 47 * z;
      const y = 21 - Math.cos(a) * 55 * z;
      ribbon(c, [0, 55], [x * 1.3, 9], [x, y - 13 * z], 6 * z, s, i % 2 === 0);
      leaf(c, x, y, 1.1 * z, a, s, true);
    }
    for (let j = 0; j < 4; j++) ribbon(c, [-22 * q, 48 - j * 13], [26 * q, 39 - j * 13], [9 * q, 23 - j * 13], 2 * q, s);
  }
}
function dragon(c: C, v: number, p: number, s: Palette) {
  const q = grow(p) * retract(p);
  if (v === 1) {
    for (let row = 0; row < 5; row++) for (let col = -1; col <= 1; col++) {
      const z = grow(p, row * .034 + Math.abs(col) * .02) * retract(p);
      const x = col * 24 + (row % 2 ? 6 : 0), y = 38 - row * 20;
      c.save(); c.translate(x, y); c.scale(z, z);
      polygon(c, [[-11, -9], [0, -16], [11, -9], [7, 2], [0, 10], [-7, 2]], s.ink, s.mid);
      polygon(c, [[0, -15], [10, -9], [0, 8]], s.mid);
      stroke(c, [[-9, -8], [0, -14], [9, -8]], s.light, 1);
      stroke(c, [[0, -9], [0, 4]], s.light, .35); c.restore();
    }
  } else {
    for (const side of [-1, 1]) {
      c.save(); c.scale(side, 1);
      const flex = Math.sin(clamp((p - .12) / .67) * Math.PI) * 13;
      const tip: Point = [79 * q, -51 * q + flex];
      polygon(c, [[9, 28], [20 * q, -37 * q], tip, [60 * q, -9 * q], [61 * q, 19 * q], [42 * q, 8 * q], [31 * q, 37 * q]], s.ink, s.mid);
      polygon(c, [[20 * q, -37 * q], tip, [42 * q, 8 * q]], s.mid);
      for (const end of [tip, [61 * q, 19 * q], [31 * q, 37 * q]] as Point[]) ribbon(c, [9, 28], [17 * q, -19 * q], end, 3 * q, s);
      stroke(c, [[9, 28], [20 * q, -37 * q], tip], s.light, .9);
      for (let i = 0; i < 4; i++) stroke(c, [[20 * q, (-25 + i * 9) * q], [(40 + i * 3) * q, (-26 + i * 10) * q]], s.ink, .6);
      c.restore();
    }
  }
}
function divine(c: C, v: number, p: number, s: Palette) {
  const q = grow(p) * retract(p);
  if (v === 1) {
    const split = ease((p - .24) / .31) * retract(p) * 21;
    for (const side of [-1, 1]) {
      c.save(); c.translate(side * split, 0); c.scale(side * q, q);
      c.beginPath(); c.moveTo(0, -54); c.bezierCurveTo(47, -44, 49, 31, 0, 49);
      c.lineTo(8, 26); c.lineTo(-3, 12); c.lineTo(9, -7); c.lineTo(-2, -26); c.closePath(); c.fillStyle = s.mid; c.fill();
      c.strokeStyle = s.ink; c.lineWidth = 1.3; c.stroke();
      ribbon(c, [5, 43], [49, 4], [1, -52], 4, s, true);
      stroke(c, [[12, 28], [24, 13], [16, -2], [27, -17], [11, -34]], s.light, 1.3);
      for (let i = 0; i < 4; i++) stroke(c, [[19, 20 - i * 14], [28, 23 - i * 14], [32, 16 - i * 14]], s.ink, .65);
      c.restore();
    }
    gem(c, 0, 0, 9 * q, s, 4);
  } else {
    for (const side of [-1, 1]) {
      c.save(); c.scale(side, 1);
      ribbon(c, [9 * q, 5], [57 * q, -41], [28 * q, -76 * q], 8 * q, s, true);
      for (let i = 0; i < 5; i++) {
        const z = grow(p, .03 * i) * retract(p, .018 * i);
        leaf(c, (17 + i * 7) * z, (35 - i * 7) * z, (.72 + i * .05) * z, .65 + i * .23, s);
      }
      stroke(c, [[12 * q, -1], [25 * q, -25], [27 * q, -58]], s.light, .7);
      c.restore();
    }
  }
}
function origin(c: C, v: number, p: number, s: Palette) {
  const q = grow(p) * retract(p);
  if (v === 1) {
    for (let i = 0; i < 5; i++) {
      const z = grow(p, i * .035) * retract(p, i * .016);
      const y = 42 - i * 21;
      for (const side of [-1, 1]) {
        c.save(); c.scale(side, 1);
        polygon(c, [[3, y], [35 * z, y - 8], [41 * z, y - 2], [31 * z, y + 5], [3, y + 4]], s.ink, s.mid);
        stroke(c, [[8, y], [17 * z, y - 3], [21 * z, y], [31 * z, y - 4]], s.light, .7);
        c.restore();
      }
    }
    gem(c, 0, 0, 12 * q, s, 4);
  } else {
    for (let i = 0; i < 6; i++) {
      const z = grow(p, i * .028) * retract(p, i * .016);
      const a = i / 6 * Math.PI * 2 + p * .7;
      c.save(); c.rotate(a);
      ribbon(c, [0, 0], [-30 * z, -8], [0, -63 * z], 8 * z, s);
      leaf(c, 0, -27 * z, .75 * z, .35, s, true);
      c.restore();
    }
    gem(c, 0, 0, 15 * q, s, 6);
  }
}
function predator(c: C, v: number, p: number, s: Palette) {
  const q = grow(p) * retract(p);
  if (v === 1) {
    const bite = 1 - ease((p - .37) / .16);
    for (const side of [-1, 1]) {
      c.save(); c.scale(1, side); c.translate(0, -bite * 23 * q);
      ribbon(c, [-43 * q, -20], [0, -54 * q], [43 * q, -20], 9 * q, s);
      for (let i = -2; i <= 2; i++) {
        const x = i * 16 * q, y = (-33 + Math.abs(i) * 4) * q;
        polygon(c, [[x - 6 * q, y], [x + 6 * q, y - 2], [x + (i > 0 ? -4 : 4) * q, y + (22 - Math.abs(i) * 4) * q]], s.light, s.ink, .7);
        stroke(c, [[x + 3 * q, y], [x + 1 * q, y + 13 * q]], s.mid, 1.3);
      }
      c.restore();
    }
  } else {
    const squeeze = 1 - ease((p - .5) / .35) * .72;
    for (const side of [-1, 1]) {
      c.save(); c.scale(side * q * squeeze, q);
      polygon(c, [[0, 36], [35, 12], [47, -21], [31, -12], [24, -51], [5, -28], [0, -35]], s.ink, s.mid);
      polygon(c, [[0, 36], [35, 12], [14, 4]], s.mid);
      stroke(c, [[4, -22], [15, -31], [24, -48], [28, -13]], s.light, 1);
      polygon(c, [[9, -5], [28, -13], [18, -3]], s.light);
      for (let i = 0; i < 3; i++) ribbon(c, [4, 28], [32 + i * 5, 30 - i * 6], [51 + i * 7, -7 + i * 5], 2, s);
      c.restore();
    }
  }
}
function noble(c: C, v: number, p: number, s: Palette) {
  const q = grow(p) * retract(p);
  if (v === 1) {
    for (const side of [-1, 1]) {
      c.save(); c.scale(side * q, q);
      ribbon(c, [0, 43], [40, 17], [33, -26], 5, s, true);
      stroke(c, [[0, 35], [24, 13], [26, -20], [6, -26]], s.light, .8);
      for (let i = 0; i < 4; i++) leaf(c, 30 - i * 4, 18 - i * 13, .37, .8, s);
      c.restore();
    }
    polygon(c, [[-22 * q, -34 * q], [-25 * q, -54 * q], [-9 * q, -43 * q], [0, -61 * q], [9 * q, -43 * q], [25 * q, -54 * q], [22 * q, -34 * q]], s.ink, s.light);
    gem(c, 0, -5, 12 * q, s, 4);
  } else {
    for (const side of [-1, 1]) {
      c.save(); c.scale(side, 1);
      const z = grow(p, .07) * retract(p);
      ribbon(c, [0, -17], [62 * z, -36], [51 * z, 25 * z], 14 * z, s);
      ribbon(c, [8 * z, -7], [17 * z, 42 * z], [46 * z, 55 * z], 10 * z, s, true);
      polygon(c, [[32 * z, 32 * z], [46 * z, 55 * z], [38 * z, 48 * z], [28 * z, 54 * z]], s.mid, s.ink);
      c.restore();
    }
    c.save(); c.scale(q, q); c.rotate(-.15 + p * .2);
    const pts: Point[] = Array.from({ length: 20 }, (_, i) => { const a = i * Math.PI / 10; const r = i % 2 ? 17 : 19; return [Math.cos(a) * r, Math.sin(a) * r - 12]; });
    polygon(c, pts, s.ink, s.mid, 2);
    stroke(c, [[-9, -20], [-9, -5], [0, 1], [9, -5], [9, -20], [0, -16], [-9, -20]], s.light, 1.2);
    stroke(c, [[0, -14], [0, -4], [-4, -8], [4, -8]], s.mid, 1); c.restore();
  }
}
function market(c: C, v: number, p: number, s: Palette) {
  const q = grow(p) * retract(p);
  if (v === 1) {
    for (const side of [-1, 1]) {
      c.save(); c.scale(side, 1);
      ribbon(c, [3, 51], [51 * q, 29], [38 * q, -51], 5 * q, s);
      for (let row = 0; row < 7; row++) {
        const z = grow(p, row * .027) * retract(p, row * .012);
        const y = 37 - row * 12;
        for (let col = 0; col < 3; col++) {
          const x = 7 + col * 9;
          stroke(c, [[x, y], [x + 4 * z, y], [x + 4 * z, y - 4 * z], [x + 6 * z, y - 4 * z]], row % 3 ? s.mid : s.light, .9 * z);
        }
      }
      c.restore();
    }
    stroke(c, [[0, -48 * q], [0, 49 * q]], s.ink, 1);
  } else {
    for (let i = 0; i < 5; i++) {
      const z = grow(p, i * .035) * retract(p, i * .015);
      const t = i / 4, x = (t - .5) * 118 * z;
      const y = -20 + Math.sin(t * Math.PI) * 44;
      ribbon(c, [-42 * q, -20], [0, 59 * q], [x, y], 5 * z, s);
      c.save(); c.translate(x, y); c.rotate((t - .5) * .8 + (1 - grow(p)) * .8); c.scale(z, z);
      polygon(c, [[-12, -19], [12, -19], [12, 17], [-12, 17]], s.ink, s.light, .75);
      polygon(c, [[-12, -19], [12, -19], [6, -13], [-8, -13]], s.mid);
      stroke(c, [[-7, -9], [7, -9], [7, 10], [-7, 10], [-7, -9]], s.mid, .7);
      gem(c, 0, 0, 5, s, 4); c.restore();
    }
  }
}
function wine(c: C, v: number, p: number, s: Palette) {
  const q = grow(p) * retract(p);
  if (v === 1) {
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4 - row; col++) {
      const z = grow(p, row * .045 + col * .018) * retract(p, row * .02);
      const x = (col - (3 - row) / 2) * 15, y = -27 + row * 17;
      gem(c, x * q, y * q, 9 * z, s, 7);
    }
    for (const side of [-1, 1]) {
      c.save(); c.scale(side, 1);
      ribbon(c, [0, 56], [54 * q, 28], [30 * q, -33 * q], 6 * q, s);
      for (let i = 0; i < 3; i++) stroke(c, [[20 * q, 35 - i * 10], [31 * q, 29 - i * 10], [33 * q, 21 - i * 10]], s.light, .6);
      c.restore();
    }
    leaf(c, 0, -34 * q, .6 * q, -.7, s);
  } else {
    for (const side of [-1, 1]) {
      c.save(); c.scale(side, 1);
      for (let i = 0; i < 3; i++) {
        const z = grow(p, i * .045) * retract(p, i * .028);
        ribbon(c, [0, 56], [(56 - i * 8) * z, 20 - i * 13], [(30 - i * 7) * z, -56 * z], (9 - i * 2) * z, s, i === 1);
        leaf(c, (36 - i * 6) * z, (15 - i * 21) * z, .58 * z, side * .25 + i * .7, s);
      }
      c.restore();
    }
    const level = (1 - ease((p - .4) / .45)) * 28;
    ribbon(c, [-23 * q, 29], [0, level], [23 * q, 29], 7 * q, s, true);
    ribbon(c, [-17 * q, 43], [0, level + 17], [17 * q, 43], 5 * q, s);
  }
}
const forms: Record<string, (c: C, v: number, p: number, s: Palette) => void> = { elf, tree, dragon, divine, origin, predator, noble, market, wine };

/** Caller owns the card surface and transform. No DOM, allocation of resources, or random clock. */
export function drawForm(ctx: CanvasRenderingContext2D, family: string, variant: number, p: number, w: number, h: number): void {
  if (!Number.isFinite(p) || p <= 0 || p >= 1 || !Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
  const form = forms[family];
  if (!form) return;
  ctx.save();
  try {
    const settle = 1 - ease((p - .86) / .14);
    ctx.scale(w / 100 * settle, h / 140 * settle);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Opacity only handles the subpixel ends; disappearance is driven by shape retraction.
    ctx.globalAlpha *= Math.min(1, p * 22, (1 - p) * 22);
    form(ctx, variant === 2 ? 2 : 1, p, familyStyles[family]);
  } finally { ctx.restore(); }
}

// All distances are CSS pixels, measured from the native pointer's hotspot.
export const clickLifetime = 470;
export const clickSurface = 128;
type Brush = CanvasRenderingContext2D;
const tau = Math.PI * 2;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const out = (n: number) => 1 - (1 - clamp(n)) ** 3;
const phase = (t: number, start: number, end: number) => clamp((t - start) / (end - start));

function glint(ctx: Brush, length: number, width: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -length);
  ctx.quadraticCurveTo(width, -width, length * .8, 0);
  ctx.quadraticCurveTo(width, width, 0, length);
  ctx.quadraticCurveTo(-width, width, -length * .8, 0);
  ctx.quadraticCurveTo(-width, -width, 0, -length);
  ctx.fill();
}

function light(ctx: Brush, radius: number, core: string, middle: string) {
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, core);
  glow.addColorStop(.35, middle);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
}

function arc(ctx: Brush, r: number, from: number, to: number, width: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(0, 0, r, from, to);
  ctx.stroke();
}

// A hot point punches through a thin lens. The transmitted wave overtakes
// the short rays, leaving only a few gold diffraction glints at its edge.
function flare(ctx: Brush, t: number) {
  const hit = 1 - phase(t, .05, .49);
  const travel = out(phase(t, 0, .92));
  const r = 3 + 34 * travel;
  ctx.globalAlpha = hit;
  light(ctx, 20 + 13 * travel, '#fff9df', '#f8bd6da8');
  ctx.save();
  ctx.rotate(-.32);
  glint(ctx, 4 + 18 * Math.sin(Math.PI * phase(t, 0, .49)), 2.5 * hit, '#ffffee');
  ctx.restore();

  const fade = 1 - phase(t, .37, 1);
  ctx.globalAlpha = fade * (1 - phase(t, .31, .73));
  const halo = ctx.createRadialGradient(0, 0, r * .65, 0, 0, r + 2);
  halo.addColorStop(0, 'transparent');
  halo.addColorStop(.72, '#f2b96118');
  halo.addColorStop(.91, '#ffe0a2a8');
  halo.addColorStop(1, 'transparent');
  ctx.fillStyle = halo;
  ctx.fillRect(-r-2, -r-2, 2*r+4, 2*r+4);
  // Reflections run across the front of the wave then shear off at two poles.
  ctx.globalAlpha = fade;
  for (let i = 0; i < 2; i++) {
    const sweep = out(phase(t, .07, .68));
    const a = -.64 + i * Math.PI + sweep * .65;
    const span = 1.25 * Math.sin(Math.PI * phase(t, .015, .72));
    if (span > .01) {
      arc(ctx, r * .86, a-span, a, 1.2, '#f9efd6');
      arc(ctx, r + 1.4, a-.6*span, a, 1.6, '#fff9dd');
    }
  }
  for (let i = 0; i < 4; i++) {
    const a = i * tau / 4 - .41 + .16 * travel;
    const length = 1.55 * (1 - phase(t, .27 + (i % 2) * .05, .94));
    arc(ctx, r, a, a + length, 2.1 * fade + .35, '#ae854f');
    arc(ctx, r + .55, a, a + length, .85, '#fffad4');
  }
  for (let i = 0; i < 12; i++) {
    const v = phase(t, .025 * (i % 3), .76 + (i % 4) * .07);
    if (v === 0 || v === 1) continue;
    ctx.save();
    ctx.rotate(i * tau / 12 + .13 * Math.sin(i * 4));
    const end = 3 + (i % 3 === 0 ? 49 : 34 + i % 5) * out(v);
    const tail = Math.max(2, end - (i % 3 === 0 ? 19 : 9) * Math.sin(Math.PI * v));
    ctx.globalAlpha = 1 - v * .8;
    const streak = ctx.createLinearGradient(0, -tail, 0, -end);
    streak.addColorStop(0, '#ae803000'); streak.addColorStop(.7, '#ffdc96'); streak.addColorStop(1, '#ffffeb');
    ctx.fillStyle = streak;
    ctx.beginPath();ctx.moveTo(0,-tail);ctx.lineTo(1.05,-end+2);ctx.lineTo(0,-end);ctx.lineTo(-.6,-end+1);ctx.fill();
    if (i % 3 === 0) {
      ctx.translate(0,-end);
      glint(ctx, 3.4 * Math.sin(v * Math.PI), .65, '#fffbe2');
    }
    ctx.restore();
  }
}

export function paintClick(ctx: Brush, t: number, reduced: boolean) {
  ctx.save();
  const scale=ctx.canvas.width/clickSurface;
  ctx.setTransform(scale,0,0,scale,0,0);
  ctx.clearRect(0,0,clickSurface,clickSurface);
  ctx.translate(clickSurface/2,clickSurface/2);
  if (reduced) {
    ctx.globalAlpha=1-t;
    arc(ctx,7,0,tau,1.2,'#aadce9');glint(ctx,4,1,'#fff6d6');
  } else {
    flare(ctx, t);
  }
  ctx.restore();
}

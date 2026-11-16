// All distances are CSS pixels, measured from the native pointer's hotspot.
export type ClickStyle = 'flare' | 'ink' | 'glass';
export const clickLifetime = {flare: 470, ink: 540, glass: 500} as const;
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

// Each nib draws a broad belly and a hairline edge in one continuous curve.
// Advancing the tail along the same path lifts the ink off the surface.
function ink(ctx: Brush, t: number) {
  const bloom = 1 - phase(t, .04, .4);
  ctx.globalAlpha = bloom;
  light(ctx, 18, '#e9ffff', '#49badb9c');
  glint(ctx, 7 * bloom, 1.1, '#e8ffff');
  const lengths = [3.72, 2.92, 2.36];
  for (let i = 0; i < lengths.length; i++) {
    const p = phase(t, i * .045, 1 - i * .02);
    if (p === 0 || p === 1) continue;
    const head = out(phase(p, 0, .75));
    const tail = phase(p, .24, 1) ** 1.35;
    const phaseAngle = [-2.34, .48, 2.58][i];
    const outer: number[][] = [], inner: number[][] = [];
    for (let j = 0; j <= 34; j++) {
      const f = j / 34, u = tail + (head - tail) * f;
      const a = phaseAngle + u * lengths[i] + .22 * p;
      const r = 3 + (i === 2 ? 25 : 35 + i * 3) * (1 - (1 - u) ** 2) + 4 * p;
      const w = .15 + [7, 5.6, 3.3][i] * Math.sin(Math.PI * f) ** .8 * (1 - tail);
      outer.push([Math.cos(a) * r, Math.sin(a) * r]);
      inner.push([Math.cos(a) * (r-w), Math.sin(a) * (r-w)]);
    }
    ctx.globalAlpha = 1 - phase(p, .76, 1);
    const wash = ctx.createLinearGradient(-26, 19, 22, -24);
    wash.addColorStop(0,'#193c69'); wash.addColorStop(.34,'#367ea3'); wash.addColorStop(.65,'#9feaf1'); wash.addColorStop(1,'#286b93');
    ctx.fillStyle = wash;
    ctx.beginPath();ctx.moveTo(outer[0][0],outer[0][1]);
    for (const [x,y] of outer) ctx.lineTo(x,y);
    for (let j=inner.length-1;j>=0;j--) ctx.lineTo(inner[j][0],inner[j][1]);
    ctx.closePath();ctx.fill();
    ctx.strokeStyle = '#c8ffff';ctx.lineWidth = .95 * (1 - tail) + .2;
    ctx.beginPath();outer.forEach(([x,y],j)=>j ? ctx.lineTo(x,y) : ctx.moveTo(x,y));ctx.stroke();
    // A silver vein follows the sweep and runs out before its nib.
    ctx.strokeStyle='#e7dcac';ctx.lineWidth=.65;
    ctx.beginPath();
    for (let j=8;j<28;j++) {
      const x=outer[j][0]*.32+inner[j][0]*.68, y=outer[j][1]*.32+inner[j][1]*.68;
      if (j===8) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    const tip=outer[outer.length-1];
    ctx.save();ctx.translate(tip[0],tip[1]);ctx.rotate(phaseAngle+head*lengths[i]);glint(ctx,2.6*(1-tail),.65,'#f4ffff');ctx.restore();
  }
}

function triangle(ctx: Brush, ax:number, ay:number, bx:number, by:number, cx:number, cy:number, color:string | CanvasGradient) {
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.lineTo(cx,cy);ctx.closePath();ctx.fill();
}

// Six joined facets open under pressure. Each plate rolls edge-on before
// it disappears, revealing a bright bevel and a differently lit reverse.
function glass(ctx: Brush, t: number) {
  const contact = 1 - phase(t,.04,.46);
  ctx.globalAlpha = contact;
  light(ctx, 24, '#fff7ff', '#bb93f886');
  for (let i=0;i<6;i++) {
    const p=phase(t, .014*(i%3), .88+.05*(i%3));
    if(p===1) continue;
    const crack=out(phase(p,.14,1)), open=out(phase(p,0,.3));
    ctx.save();
    ctx.rotate(i*tau/6-.34);
    ctx.translate(0,-2-(24+i%3*2)*crack);
    ctx.rotate(crack*(i%2 ? .42 : -.32));
    const tilt=Math.cos(phase(p,.18,.94)*(1.94+i%3*.1));
    ctx.scale((.35+.65*open)*Math.max(.05,Math.abs(tilt)),(.42+.58*open)*(1-.56*crack));
    ctx.globalAlpha=1-phase(p,.65,1);
    const h=18+i%3*2,w=8.2;
    const refract=ctx.createLinearGradient(-w,-h, w, 2);
    refract.addColorStop(0,'#fbf6ff');refract.addColorStop(.32,'#a1d8f2');
    refract.addColorStop(.57,'#ac95d3');refract.addColorStop(.82,'#d6b8e8');refract.addColorStop(1,'#685281');
    triangle(ctx,0,2,-w,-h*.56,0,-h,tilt<0?'#bbcde9':'#9684b8');
    triangle(ctx,0,2,0,-h,w,-h*.55, refract);
    triangle(ctx,0,-h*.36,-w,-h*.56,0,-h,'#f5d7f6');
    triangle(ctx,0,-h*.36,0,-h,w,-h*.55,'#edf9ff');
    ctx.lineWidth=1;ctx.strokeStyle='#624c778c';ctx.beginPath();ctx.moveTo(-w,-h*.56);ctx.lineTo(0,2);ctx.lineTo(w,-h*.55);ctx.stroke();
    ctx.strokeStyle='#fff7fa';ctx.beginPath();ctx.moveTo(-w,-h*.56);ctx.lineTo(0,-h);ctx.lineTo(w,-h*.55);ctx.stroke();
    const sheen = Math.sin(Math.PI * phase(p,.17+i%3*.035,.59+i%3*.035));
    ctx.globalAlpha *= sheen;
    ctx.strokeStyle='#fffdeb';ctx.lineWidth=.9;
    ctx.beginPath();ctx.moveTo(0,1);ctx.lineTo(0,-h);ctx.stroke();
    ctx.translate(0,-h);glint(ctx, 3.2*sheen,.65,'#fff8fa');
    ctx.restore();
    const chip=phase(p,.16,1);
    if(chip>0) {
      ctx.save();ctx.rotate(i*tau/6+.04);ctx.translate(0,-9-(31+i%2*5)*out(chip));
      ctx.rotate(.54+chip*(i%2?1:-1));ctx.scale(1-chip*.8,1-chip*.65);
      ctx.globalAlpha=1-chip;
      triangle(ctx,-1.7,1,0,-3,2.3,2,'#fce8ec');triangle(ctx,-1.7,1,2.3,2,.4,3,'#9480aa');ctx.restore();
    }
  }
  ctx.globalAlpha=contact;
  glint(ctx, 12*contact, 1.8*contact, '#fffaf7');
}

export function paintClick(ctx: Brush, style: ClickStyle, t: number, reduced: boolean) {
  ctx.save();
  const scale=ctx.canvas.width/clickSurface;
  ctx.setTransform(scale,0,0,scale,0,0);
  ctx.clearRect(0,0,clickSurface,clickSurface);
  ctx.translate(clickSurface/2,clickSurface/2);
  if (reduced) {
    ctx.globalAlpha=1-t;
    arc(ctx,7,0,tau,1.2,'#aadce9');glint(ctx,4,1,'#fff6d6');
  } else if (style==='ink') ink(ctx,t);
  else if (style==='glass') glass(ctx,t);
  else flare(ctx,t);
  ctx.restore();
}

/** Shape-first play VFX. Direction/reference: docs/vfx-art-direction.md.
 * Filled silhouettes carry the motion; bloom and loose sparks are secondary.
 * Geometry is authored here, not extracted from the reference recording. */
export type ToonPlayKind = 'spell' | 'enchant-place' | 'quick' | 'quest' | 'summon-charge' | 'summon-impact';
export const TOON_PLAY_DURATION: Record<ToonPlayKind, number> = {
  spell: 1.05, 'enchant-place': 1.45, quick: .88, quest: 1.5,
  'summon-charge': .96, 'summon-impact': 1.15,
};
type C = CanvasRenderingContext2D;
type Rect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
const TAU = Math.PI * 2;
const sat = (n: number) => Math.min(1, Math.max(0, n));
const ease = (n: number) => 1 - (1 - sat(n)) ** 3;
const smooth = (n: number) => { n = sat(n); return n * n * (3 - 2 * n); };
const noise = (n: number) => { const v = Math.sin(n * 127.1 + 34.7) * 43758.5453; return v - Math.floor(v); };
const ivory = '#fff4d8';

function polygon(c: C, points: number[][], color: string, stroke?: string) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.closePath(); c.fillStyle = color; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = .8; c.stroke(); }
}
function sparkle(c: C, x: number, y: number, s: number, turn: number, color: string) {
  c.save(); c.translate(x, y); c.rotate(turn);
  polygon(c, [[0,-s],[s*.19,-s*.2],[s*.58,0],[s*.16,s*.18],[0,s],[-s*.16,s*.18],[-s*.58,0],[-s*.19,-s*.2]], color);
  c.restore();
}
/** A tapered, filled brushstroke around an ellipse, not a uniform stroked ring. */
function crescent(c: C, x: number, y: number, rx: number, ry: number, angle: number, arc: number, width: number, color: string) {
  if (width <= .05 || arc <= .01) return;
  const outer: number[][] = [], inner: number[][] = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30, a = angle + t * arc;
    const w = width * Math.sin(Math.PI * t) ** .7 * (.5 + .5 * t);
    outer.push([x + Math.cos(a) * (rx + w), y + Math.sin(a) * (ry + w * .7)]);
    inner.unshift([x + Math.cos(a) * (rx - w * .16), y + Math.sin(a) * (ry - w * .12)]);
  }
  polygon(c, [...outer, ...inner], color);
}
/** Break a broad stroke into separated, shrinking arcs as it ages. */
function brokenArc(c: C, x: number, y: number, rx: number, ry: number, angle: number, width: number, p: number, color: string, span = Math.PI * .82) {
  const cut = smooth((p - .42) / .48), parts = p < .42 ? 1 : 3;
  for (let i = 0; i < parts; i++) {
    const sector = span / parts;
    crescent(c, x, y, rx, ry, angle + sector * i + cut * .14, sector * (1 - cut * .82), width * (1 - cut * .85), color);
  }
}
function scatter(c: C, x: number, y: number, u: number, p: number, colors: string[], count = 12, flat = .55) {
  for (let i = 0; i < count; i++) {
    const q = sat((p - noise(i) * .12) / .78), a = i * 2.399;
    const d = u * (.38 + ease(q) * (.5 + noise(i + 4) * .25));
    const size = u * (.024 + noise(i + 7) * .035) * Math.sin(q * Math.PI);
    sparkle(c, x + Math.cos(a) * d, y + Math.sin(a) * d * flat - u * q * .16, size, a + q, colors[i % colors.length]);
  }
}
function eye(c: C, x: number, y: number, w: number, open: number) {
  const h = w * .40 * open;
  c.save(); c.translate(x, y);
  c.beginPath(); c.moveTo(-w, 0); c.bezierCurveTo(-w*.35,-h*1.55,w*.28,-h*1.55,w,0);
  c.bezierCurveTo(w*.25,h*1.35,-w*.35,h*1.35,-w,0);
  c.moveTo(-w*.73, 0); c.quadraticCurveTo(0,-h*1.02,w*.73,0); c.quadraticCurveTo(0,h*.88,-w*.73,0);
  c.fillStyle = '#277e8c'; c.fill('evenodd'); c.strokeStyle = '#9deee0'; c.lineWidth = 1; c.stroke();
  polygon(c, [[0,-h*.82],[h*.43,0],[0,h*.82],[-h*.43,0]], '#244764');
  polygon(c, [[0,-h*.62],[h*.20,0],[0,h*.44],[-h*.20,0]], ivory);
  c.restore();
}
function page(c: C, x: number, y: number, w: number, h: number, turn: number, color: string) {
  c.save(); c.translate(x,y); c.rotate(turn);
  c.beginPath(); c.moveTo(-w*.5,-h*.5); c.quadraticCurveTo(0,-h*.67,w*.5,-h*.35);
  c.lineTo(w*.43,h*.5); c.quadraticCurveTo(0,h*.25,-w*.56,h*.4); c.closePath();
  c.fillStyle = color; c.fill(); c.strokeStyle = '#aa793e'; c.lineWidth = .8; c.stroke();
  polygon(c, [[w*.15,-h*.45],[w*.5,-h*.35],[w*.47,-h*.10]], '#d7aa64');
  c.strokeStyle = '#b7894b'; c.lineWidth = .7;
  for (let j=0;j<3;j++) { c.beginPath(); c.moveTo(-w*.29,-h*.20+j*h*.15); c.lineTo(w*(j===2?.10:.29),-h*.16+j*h*.15); c.stroke(); }
  c.restore();
}
function burst(c: C, x: number, y: number, r: number, flat: number, p: number, color: string) {
  c.save(); c.translate(x,y); c.scale(1,flat);
  const points: number[][]=[];
  for(let i=0;i<40;i++) { const a=i/40*TAU; const radius=r*(i%4===0?1+noise(i)*.24:i%2===0?.65:.45); points.push([Math.cos(a)*radius,Math.sin(a)*radius]); }
  c.beginPath(); points.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py)); c.closePath(); c.clip();
  c.moveTo(r*.92*smooth(p),0); c.arc(0,0,r*.92*smooth(p),0,TAU);
  c.fillStyle=color;c.fill('evenodd');c.restore();
}
/** A lobed cel cloud. The interior is eaten away before the final fragments shrink. */
function smoke(c: C, x: number, y: number, s: number, turn: number) {
  c.save(); c.translate(x,y); c.rotate(turn); c.scale(1,.7);
  c.beginPath();
  for(let i=0;i<=64;i++) { const a=i/64*TAU; const r=s*(.84+.12*Math.sin(a*5+.8)+.06*Math.cos(a*3)); i?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r); }
  c.closePath(); c.clip();
  c.fillStyle='#b39e86';c.fill();
  // Small cel highlight, kept inside the same silhouette.
  c.beginPath();c.ellipse(-s*.13,-s*.22,s*.88,s*.71,0,0,TAU);c.fillStyle='#eee0c4';c.fill();
  c.restore();
}
/** Isolated offscreen cloud prevents a dissolve from erasing another simultaneous effect. */
let cloudCanvas: HTMLCanvasElement | undefined;
function dissolvingCloud(c: C,x:number,y:number,s:number,p:number,turn:number) {
  if(!cloudCanvas){cloudCanvas=document.createElement('canvas');cloudCanvas.width=cloudCanvas.height=128;}
  const d=cloudCanvas.getContext('2d');if(!d)return;
  d.clearRect(0,0,128,128);d.globalCompositeOperation='source-over';
  smoke(d,64,64,48,0);
  d.globalCompositeOperation='destination-out';
  d.beginPath();d.arc(64+21*p,64+19*p,64*smooth((p-.13)/.83),0,TAU);d.fill();
  d.globalCompositeOperation='source-over';
  c.save();c.translate(x,y);c.rotate(turn);c.drawImage(cloudCanvas,-s,-s,s*2,s*2);c.restore();
}
export function disposeToonPlayVisual(){cloudCanvas=undefined;}

export function drawToonPlay(c: C, kind: ToonPlayKind, r: Rect, age: number) {
  const duration=TOON_PLAY_DURATION[kind]; if(age<0||age>=duration)return;
  const p=age/duration, u=Math.max(26,Math.min(r.width,180));
  const x=r.left+r.width/2, centerY=r.top+r.height/2;
  const alpha=smooth(p/.045)*(1-smooth((p-.84)/.16));
  c.save();c.globalAlpha=alpha;c.lineJoin='round';c.lineCap='round';
  if(kind==='spell') {
    // Two asymmetric strokes roll over one another, then break open into the shelf.
    const turn=-1.4+ease(p)*3.3, rx=u*(.46+ease(p)*.12),ry=u*.48;
    brokenArc(c,x,centerY,rx,ry,turn,u*.20,p,'#277abb');
    brokenArc(c,x,centerY,rx+u*.025,ry+u*.01,turn+.11,u*.10,p,'#91e5f0');
    brokenArc(c,x,centerY,rx+u*.05,ry+u*.02,turn+.21,u*.038,p,ivory);
    brokenArc(c,x,centerY,rx*.88,ry*.94,turn+Math.PI,u*.12,p,'#489ccf');
    brokenArc(c,x,centerY,rx*.89,ry*.95,turn+Math.PI+.10,u*.033,p,'#d0f8f4');
    scatter(c,x,centerY,u,p,['#3a90cc','#b7eff3',ivory],10);
  } else if(kind==='enchant-place') {
    const y=r.top-u*.38, open=smooth(p/.22), settle=smooth((p-.50)/.28),radius=u*(.55+.15*open-.14*settle);
    // Petals travel inward: establishing a persistent seal, rather than an explosion.
    for(let i=0;i<4;i++){
      const a=i*TAU/4+.35+ease(p)*.9;
      brokenArc(c,x,y,radius,radius*.67,a,u*.19*(1-settle*.6),p,'#26858b',1.02);
      brokenArc(c,x,y,radius+u*.015,radius*.67,a+.07,u*.065,p,'#b6f5d7',.93);
    }
    c.save();c.globalAlpha=alpha*(1-smooth((p-.64)/.3));
    eye(c,x,y,u*.36*open,open);
    for(let i=0;i<4;i++){const a=i*TAU/4;const d=u*(.78-.20*ease(p));sparkle(c,x+Math.cos(a)*d,y+Math.sin(a)*d*.68,u*.085*Math.sin(p*Math.PI),a,'#d4b16c');}
    c.restore();
    if(p>.65)for(let i=0;i<5;i++){const q=sat((p-.65)/.35),a=i*2.399; sparkle(c,x+Math.cos(a)*u*.25*(1-q),y+q*u*.38,u*.035*(1-q),a,'#73bcb0');}
  } else if(kind==='quick') {
    const pop=ease(p/.24),spread=ease((p-.10)/.7),radius=u*(.25+spread*.66);
    if(p<.42){burst(c,x,centerY,u*(.3+pop*.5),.74,sat(p/.42),'#8262bf');burst(c,x,centerY,u*(.22+pop*.42),.74,sat(p/.38),'#e1cbff');}
    // Three branching, filled strokes; fast attack and broken, vanishing tips.
    for(let i=0;i<3;i++){
      const a=i*TAU/3-.65;c.save();c.translate(x,centerY);c.rotate(a);
      const k=(1-smooth((p-.32)/.62))*u*.10;
      polygon(c,[[u*.28,0],[radius*.64,-k],[radius*.53,-k*.15],[radius,-k*.8],[radius*.72,k*.8],[radius*.75,0],[u*.28,k*.34]],'#7955b6');
      polygon(c,[[u*.31,0],[radius*.65,-k*.55],[radius*.61,0],[radius,-k*.64],[radius*.68,k*.38]],'#f2ddff');c.restore();
    }
    scatter(c,x,centerY,u,p,['#8057ba','#c1a3ec',ivory],13,.74);
  } else if(kind==='quest') {
    const y=r.top-u*.40,unfold=ease(p/.30),lift=Math.sin(p*Math.PI)*u*.12,fade=1-smooth((p-.62)/.32);
    // Solid, turning pages separate quest placement from circular magic seals.
    c.save();c.globalAlpha=alpha*fade;
    for(let i=0;i<5;i++){
      const a=(i-2)*.34*unfold;
      const px=x+Math.sin(a)*u*.43,py=y-lift+Math.abs(i-2)*u*.018;
      page(c,px,py,u*(.22+.03*(i===2?1:0))*unfold,u*.45,a,i%2?'#ead098':ivory);
    }
    polygon(c,[[x-u*.36*unfold,y+u*.21],[x,y+u*.28],[x+u*.36*unfold,y+u*.21],[x,y+u*.37]],'#b78942');
    c.restore();
    for(let i=0;i<2;i++)brokenArc(c,x,y+u*.15,u*(.48+.20*ease(p)),u*.22,i*Math.PI-.9+p*.6,u*.075,p,i?'#e6c47c':'#a87a39');
    scatter(c,x,y,u,p,['#bf9655','#efd498',ivory],10,.45);
    // The last page fragments curl down into the card instead of lingering above it.
    if(p>.52)for(let i=0;i<5;i++){const q=sat((p-.52-i*.035)/.40);const size=u*.10*Math.sin(q*Math.PI);page(c,x+(i-2)*u*.18*(1-q),y+q*u*.5,size,size*1.5,(i-2)*.4+q,ivory);}
  } else if(kind==='summon-charge') {
    const y=r.top+r.height*.70,contract=ease(p),radius=u*(.84-.4*contract);
    for(let i=0;i<3;i++){
      crescent(c,x,y,radius,radius*.32,i*TAU/3+p*.65,1.32,u*.045*(1-p*.6),'#b39358');
      crescent(c,x,y,radius+u*.015,radius*.32,i*TAU/3+p*.65+.07,1.06,u*.017,ivory);
    }
    for(let i=0;i<6;i++){const a=i*TAU/6;const s=u*.10*Math.sin(p*Math.PI);sparkle(c,x+Math.cos(a)*radius,y+Math.sin(a)*radius*.32,s,a, i%2?'#c6ac7c':'#f0ddb4');}
  } else {
    const y=r.top+r.height*.80,spread=ease(p/.72);
    // One sharp contact shape, followed by heavier, low clouds on the plane.
    if(p<.32){burst(c,x,y,u*(.4+ease(p/.20)*.76),.25,sat(p/.32),'#b49359');burst(c,x,y,u*(.34+ease(p/.20)*.66),.23,sat(p/.30),ivory);}
    for(let i=0;i<10;i++){
      const a=i*2.399,q=sat((p-noise(i)*.06)/.94),d=u*(.37+spread*(.40+noise(i+4)*.30));
      const sx=x+Math.cos(a)*d,sy=y+Math.sin(a)*d*.23-u*Math.sin(q*Math.PI)*.14;
      const size=u*(.16+noise(i+7)*.09)*(.62+ease(q)*.63);
      dissolvingCloud(c,sx,sy,size,q,Math.sin(a)*.32);
    }
    for(let i=0;i<14;i++){
      const a=i*2.399,d=u*(.3+noise(i)*.7)*spread,q=sat(p/.85);
      const px=x+Math.cos(a)*d,py=y+Math.sin(a)*d*.23-u*Math.sin(q*Math.PI)*(.12+noise(i+2)*.18);
      sparkle(c,px,py,u*.028*(1-q),a+p*3,i%3?'#a0845d':'#e7c77e');
    }
  }
  c.restore();
}

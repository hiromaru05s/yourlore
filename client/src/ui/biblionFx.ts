import {MANA_GAIN_MS} from './manaGainTiming';
import {drawManaGain} from './manaGain';
import {drawAttackVisual,ATTACK_DURATION_MS} from './attackVisual';
import {projectedPlacement} from './boardProjection';
import {drawManaPurchase,MANA_PURCHASE_DURATION,disposeManaPurchase} from './manaPurchase';
import {drawToonPlay,TOON_PLAY_DURATION,disposeToonPlayVisual} from './toonPlayVisual';
/** Target-local Biblion VFX. All geometry is procedural; no labels or stat changes. */
export type BiblionEffect = 'mana' | 'attack' | 'purchase' | 'heal' | 'spell' | 'summon-charge' | 'summon-impact' | 'quest' | 'quick' | 'enchant' | 'enchant-place';
export type FxRect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
export const EFFECT_DURATION: Record<BiblionEffect, number> = {attack:ATTACK_DURATION_MS/1000,purchase:MANA_PURCHASE_DURATION,mana:MANA_GAIN_MS/1000,heal:1.65,enchant:1.4,...TOON_PLAY_DURATION};
const TAU=Math.PI*2;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{x=clamp(x);return x*x*(3-2*x);};
const random=(i:number)=>{const x=Math.sin(i*127.1+74.7)*43758.5453;return x-Math.floor(x);};
const palettes={blue:['#397ee5','#a9e4ff','#fff4d6'],red:['#d35464','#ffd4cd','#fff2dd'],gold:['#ae8140','#edd59a','#fff8dc'],violet:['#8169c5','#d7beff','#fff1d5']};
function ellipse(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string,alpha:number,width=1,start=0,end=TAU){c.globalAlpha=clamp(alpha);c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,start,end);c.strokeStyle='#42536b';c.globalAlpha=clamp(alpha)*.26;c.lineWidth=width+1.8;c.stroke();c.strokeStyle=color;c.globalAlpha=clamp(alpha);c.lineWidth=width;c.stroke();}
function glow(c:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,alpha:number){if(r<=0||alpha<=0)return;c.globalAlpha=clamp(alpha);const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(.28,color+'99');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
function shard(c:CanvasRenderingContext2D,x:number,y:number,s:number,a:number,color:string,alpha:number){c.save();c.translate(x,y);c.rotate(a);c.globalAlpha=clamp(alpha);c.fillStyle=color;c.beginPath();c.moveTo(0,-s);c.lineTo(s*.4,0);c.lineTo(0,s);c.lineTo(-s*.4,0);c.closePath();c.fill();c.restore();}

function compass(c:CanvasRenderingContext2D,x:number,y:number,r:number,p:number,color:string,alpha:number){ellipse(c,x,y,r,r*.55,color,alpha,1,-Math.PI*.5,-Math.PI*.5+TAU*smooth(p*3));for(let i=0;i<8;i++){const a=i*TAU/8;shard(c,x+Math.cos(a)*r,y+Math.sin(a)*r*.55,i%2?r*.035:r*.07,a+Math.PI/2,color,alpha*.85);}}

/** Normalized card/UI geometry keeps effects bounded at phone and desktop sizes. */
export function drawBiblionEffect(c:CanvasRenderingContext2D,kind:BiblionEffect,r:FxRect,age:number,destination?:FxRect){
 if(kind==='mana'){drawManaGain(c,r,age);return;}
 if(kind==='attack'){drawAttackVisual(c,r,destination??r,age);return;}
 if(kind==='purchase'){drawManaPurchase(c,r,destination??r,age);return;}
 if(kind==='spell'||kind==='quest'||kind==='quick'||kind==='enchant-place'||kind==='summon-charge'||kind==='summon-impact'){drawToonPlay(c,kind,r,age);return;}
 const p=clamp(age/EFFECT_DURATION[kind]);if(age<0||p>=1)return;
 const x=r.left+r.width/2,y=kind==='enchant'?r.top-r.width*.24:r.top+r.height/2,u=Math.max(24,Math.min(r.width,180));
 const envelope=smooth(p*10)*(1-smooth((p-.6)/.4));
 c.save();c.lineCap='round';
 if(kind==='heal'){
   const h=Math.min(135,Math.max(r.height,55));
   for(let j=0;j<3;j++){const q=clamp((p-j*.08)/.74),fade=Math.sin(q*Math.PI);c.globalAlpha=fade*.7;c.strokeStyle=j===1?palettes.red[2]:palettes.red[1];c.lineWidth=j===1?1.8:1;c.beginPath();for(let k=0;k<=40;k++){const t=k/40,a=t*Math.PI*1.4+q*1.7+j*1.4,px=x+Math.cos(a)*u*(.28+.07*t),py=y+h*.3-q*h*.55+Math.sin(a)*h*.12;k?c.lineTo(px,py):c.moveTo(px,py);}c.stroke();}
   for(let i=0;i<22;i++){const q=clamp((p-random(i)*.24)/.76);shard(c,x+(random(i+3)-.5)*u*.95,y+h*.4-q*h*.9,u*.024*(.6+random(i+1)),q*.4,palettes.red[i%3],Math.sin(q*Math.PI)*.68);}
   glow(c,x,y+h*.22,u*.46,'#ed9b9d',envelope*.12);
 } else {
   // The library eye opens on the source card; orbiting pages release the pulse.
   compass(c,x,y,u*(.58+.06*Math.sin(p*Math.PI)),p,palettes.blue[1],envelope*.7);
   c.globalAlpha=envelope;c.strokeStyle='#977542';c.lineWidth=1.8;c.shadowColor='#f5daa0';c.shadowBlur=5;const rx=u*.34,ry=u*.15*smooth(p*5);c.beginPath();c.moveTo(x-rx,y);c.quadraticCurveTo(x,y-ry*2,x+rx,y);c.quadraticCurveTo(x,y+ry*2,x-rx,y);c.stroke();shard(c,x,y,u*.075,0,palettes.blue[1],envelope);
   for(let i=0;i<12;i++){const a=i*TAU/12+p*.8;shard(c,x+Math.cos(a)*u*.55,y+Math.sin(a)*u*.3,u*.024,a,palettes.gold[i%3],envelope*.7);}
 }
 c.restore();
}

type Anchor=Element|FxRect|(()=>FxRect|null);
type Entry={kind:BiblionEffect;anchor:()=>FxRect|null;destination?:()=>FxRect|null;start:number;last:FxRect|null};
type Layer={canvas:HTMLCanvasElement;context:CanvasRenderingContext2D};
const layers:Partial<Record<'rear'|'front',Layer>>={};
let frame=0;
const entries:Entry[]=[];
export const biblionLayer=(kind:BiblionEffect)=>kind==='attack'||kind==='summon-charge'||kind==='summon-impact'?'rear':'front';
function reduced(){return typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;}
/** Real board cards still occlude rear FX after their temporary flying face is removed. */
function maskBoardCards(c:CanvasRenderingContext2D){
 c.save();c.globalCompositeOperation='destination-out';c.globalAlpha=1;c.fillStyle='#000';
 for(const card of document.querySelectorAll<HTMLElement>('.zone-mon .card,#fixedMarket .card,.portrait .avatar,.pt-vitals,.pt-mana')){
  if(!card.offsetWidth||getComputedStyle(card).visibility==='hidden')continue;
  const w=card.offsetWidth,h=card.offsetHeight,m=projectedPlacement(card,w,h);
  c.beginPath();[[0,0],[w,0],[w,h],[0,h]].forEach(([x,y],i)=>{const p=m.transformPoint(new DOMPoint(x,y));i?c.lineTo(p.x/p.w,p.y/p.w):c.moveTo(p.x/p.w,p.y/p.w);});c.closePath();c.fill();
 }
 c.restore();
}
function render(now:number){
 frame=0;if(document.hidden||reduced()){clearBiblionFx();return;}
 const dpr=Math.min(devicePixelRatio,2),w=innerWidth,h=innerHeight;
 for(const layer of Object.values(layers)){
  const {canvas,context}=layer;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';}
  context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,w,h);
 }
 for(let i=entries.length-1;i>=0;i--){
  const e=entries[i],age=(now-e.start)/1000;e.last=e.anchor()||e.last;
  if(age>=EFFECT_DURATION[e.kind]||!e.last){entries.splice(i,1);continue;}
  const layer=layers[biblionLayer(e.kind)];if(layer)drawBiblionEffect(layer.context,e.kind,e.last,age,e.destination?.()??undefined);
 }
 for(const [name,layer] of Object.entries(layers)){
  const active=entries.filter(e=>biblionLayer(e.kind)===name);
  if(name==='rear'&&active.length)maskBoardCards(layer.context);
  layer.canvas.dataset.effects=active.map(e=>e.kind).join(' ');layer.canvas.hidden=!active.length;
 }
 if(entries.length)frame=requestAnimationFrame(render);
}
const resolveAnchor=(anchor:Anchor)=>typeof anchor==='function'?anchor:anchor instanceof Element?()=>anchor.isConnected?anchor.getBoundingClientRect():null:()=>anchor;
export function playBiblionFx(kind:BiblionEffect,anchor:Anchor,destination?:Anchor,startAt=performance.now()):()=>void{
 if(document.hidden||reduced())return ()=>{};
 const name=biblionLayer(kind);
 if(!layers[name]){
  const canvas=document.createElement('canvas');canvas.className=`biblion-fx biblion-fx--${name}`;canvas.dataset.layer=name;canvas.setAttribute('aria-hidden','true');
  canvas.style.cssText=`position:fixed;inset:0;pointer-events:none;z-index:${name==='rear'?124:1700}`;
  const context=canvas.getContext('2d');if(!context)return ()=>{};
  layers[name]={canvas,context};document.body.append(canvas);document.addEventListener('visibilitychange',onVisibility);
 }
 const resolve=resolveAnchor(anchor),entry:Entry={kind,anchor:resolve,destination:destination?resolveAnchor(destination):undefined,start:startAt,last:resolve()};entries.push(entry);
 // Two bounded shared layers: ground FX beneath flying cards, UI magic above the board.
 if(entries.length>24)entries.shift();layers[name]!.canvas.hidden=false;if(!frame)frame=requestAnimationFrame(render);
 return ()=>{const i=entries.indexOf(entry);if(i>=0)entries.splice(i,1);};
}
function onVisibility(){if(document.hidden)clearBiblionFx();}
export function clearBiblionFx(dispose=false){
 cancelAnimationFrame(frame);frame=0;entries.length=0;
 for(const name of ['rear','front'] as const){const layer=layers[name];if(!layer)continue;layer.context.clearRect(0,0,layer.canvas.width,layer.canvas.height);layer.canvas.hidden=true;layer.canvas.dataset.effects='';if(dispose){layer.canvas.remove();delete layers[name];}}
 if(dispose){disposeManaPurchase();disposeToonPlayVisual();document.removeEventListener('visibilitychange',onVisibility);}
}

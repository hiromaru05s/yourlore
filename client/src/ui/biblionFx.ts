/** Target-local Biblion VFX. All geometry is procedural; no labels or stat changes. */
export type BiblionEffect = 'mana' | 'heal' | 'spell' | 'summon-charge' | 'summon-impact' | 'quest' | 'quick' | 'enchant';
export type FxRect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
export const EFFECT_DURATION: Record<BiblionEffect, number> = {mana:1.85,heal:1.65,spell:1.1,'summon-charge':1.1,'summon-impact':1.3,quest:1.5,quick:1.1,enchant:1.4};
const TAU=Math.PI*2;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{x=clamp(x);return x*x*(3-2*x);};
const random=(i:number)=>{const x=Math.sin(i*127.1+74.7)*43758.5453;return x-Math.floor(x);};
const palettes={blue:['#397ee5','#a9e4ff','#fff4d6'],red:['#d35464','#ffd4cd','#fff2dd'],gold:['#ae8140','#edd59a','#fff8dc'],violet:['#8169c5','#d7beff','#fff1d5']};
function ellipse(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string,alpha:number,width=1,start=0,end=TAU){c.globalAlpha=clamp(alpha);c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,start,end);c.strokeStyle='#42536b';c.globalAlpha=clamp(alpha)*.26;c.lineWidth=width+1.8;c.stroke();c.strokeStyle=color;c.globalAlpha=clamp(alpha);c.lineWidth=width;c.stroke();}
function glow(c:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,alpha:number){if(r<=0||alpha<=0)return;c.globalAlpha=clamp(alpha);const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(.28,color+'99');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
function shard(c:CanvasRenderingContext2D,x:number,y:number,s:number,a:number,color:string,alpha:number){c.save();c.translate(x,y);c.rotate(a);c.globalAlpha=clamp(alpha);c.fillStyle=color;c.beginPath();c.moveTo(0,-s);c.lineTo(s*.4,0);c.lineTo(0,s);c.lineTo(-s*.4,0);c.closePath();c.fill();c.restore();}
function gem(c:CanvasRenderingContext2D,x:number,y:number,s:number,alpha:number){c.save();c.globalAlpha=clamp(alpha);c.translate(x,y);const faces=[['#d4f2ff',0,-1,-.53,0,0,.22],['#73b4f5',0,-1,.53,0,0,.22],['#3366b6',-.53,0,0,1,0,.22],['#9bd5ff',.53,0,0,1,0,.22]] as const;for(const [color,x1,y1,x2,y2,x3,y3] of faces){c.fillStyle=color;c.beginPath();c.moveTo(x1*s,y1*s);c.lineTo(x2*s,y2*s);c.lineTo(x3*s,y3*s);c.closePath();c.fill();}c.strokeStyle='#fff1cb';c.lineWidth=.7;c.beginPath();c.moveTo(0,-s);c.lineTo(s*.53,0);c.lineTo(0,s);c.lineTo(-s*.53,0);c.closePath();c.stroke();c.restore();}
function compass(c:CanvasRenderingContext2D,x:number,y:number,r:number,p:number,color:string,alpha:number){ellipse(c,x,y,r,r*.55,color,alpha,1,-Math.PI*.5,-Math.PI*.5+TAU*smooth(p*3));for(let i=0;i<8;i++){const a=i*TAU/8;shard(c,x+Math.cos(a)*r,y+Math.sin(a)*r*.55,i%2?r*.035:r*.07,a+Math.PI/2,color,alpha*.85);}}

let dustTexture:HTMLCanvasElement|undefined;
function dustPuff(c:CanvasRenderingContext2D,x:number,y:number,size:number,angle:number,alpha:number){
 if(!dustTexture){
  dustTexture=document.createElement('canvas');dustTexture.width=dustTexture.height=96;const d=dustTexture.getContext('2d')!;
  for(let i=0;i<22;i++){const a=i*2.399,rad=11+random(i)*19,px=48+Math.cos(a)*rad,py=48+Math.sin(a)*rad,sz=12+random(i+8)*16;const g=d.createRadialGradient(px,py,0,px,py,sz);g.addColorStop(0,i%3?'#cbb89d44':'#f5e7cc55');g.addColorStop(.45,'#b49b7930');g.addColorStop(1,'#a28a6900');d.fillStyle=g;d.fillRect(px-sz,py-sz,sz*2,sz*2);}
 }
 c.save();c.globalAlpha=clamp(alpha);c.translate(x,y);c.rotate(angle);c.scale(1,.64);c.drawImage(dustTexture,-size,-size,size*2,size*2);c.restore();
}

/** Normalized card/UI geometry keeps effects bounded at phone and desktop sizes. */
export function drawBiblionEffect(c:CanvasRenderingContext2D,kind:BiblionEffect,r:FxRect,age:number){
 const p=clamp(age/EFFECT_DURATION[kind]);if(age<0||p>=1)return;
 const x=r.left+r.width/2,y=(kind==='quest'||kind==='enchant')?r.top-r.width*.24:r.top+r.height/2,u=Math.max(24,Math.min(r.width,180));
 const envelope=smooth(p*10)*(1-smooth((p-.6)/.4));
 c.save();c.lineCap='round';
 if(kind==='summon-impact'){
   // Low, warm dust lobes separate into fine grains; the card face stays clear.
   const spread=1-(1-p)**3,cy=r.top+r.height*.82;
   ellipse(c,x,cy,u*(.28+spread*.83),u*(.06+spread*.14),'#c8ae82',(1-p)**3*.5,1.5);
   for(let i=0;i<30;i++){const a=i*2.399,side=Math.cos(a),q=clamp((p-random(i)*.075)/.925),travel=1-(1-q)**3;
     const px=x+side*u*(.35+travel*(.40+random(i+2)*.38)),py=cy+Math.sin(a)*u*.16*travel-u*Math.sin(q*Math.PI)*(.08+random(i+3)*.12);
     const size=u*(.06+random(i+5)*.09)*(.4+q*1.1);
     dustPuff(c,px,py,size*1.8,a+q*.6,smooth(q*18)*(1-q)**1.7*.75);
   }
   for(let i=0;i<24;i++){const a=i*2.399,d=u*(.3+random(i)*.65)*spread;shard(c,x+Math.cos(a)*d,cy+Math.sin(a)*d*.26-u*Math.sin(p*Math.PI)*random(i+2)*.25,u*(.009+random(i+4)*.018)*(1-p),a+p*3,i%4?'#a59072':'#eedab3',(1-p)**2*.7);}
 } else if(kind==='mana'){
   const cy=y-Math.min(35,u*.28),gather=smooth(p/.48),lift=Math.sin(p*Math.PI);
   compass(c,x,cy,u*(.38+.05*lift),p,palettes.blue[1],envelope*.58);
   ellipse(c,x,cy,u*.32,u*.15,'#d8bd80',envelope*.65,.9,p*TAU,p*TAU+Math.PI*1.4);
   for(let i=0;i<20;i++){const a=i*2.399,delay=random(i)*.13,q=clamp((p-delay)/.56),d=u*(.45+random(i+5)*.35)*(1-smooth(q));const px=x+Math.cos(a)*d,py=cy+Math.sin(a)*d*.58;shard(c,px,py,u*(.018+random(i+1)*.023),a+q*2,i%4?palettes.blue[1]:palettes.blue[2],Math.sin(q*Math.PI)*.8);}
   glow(c,x,cy,u*.35,'#69baff',Math.exp(-(((p-.5)/.1)**2))*.36);
   gem(c,x,cy+(y-cy)*smooth((p-.55)/.3),u*(.08+.10*gather)*(1-.5*smooth((p-.6)/.3)),envelope);
   // Thin acknowledgement along the pips, then a clean disappearance.
   ellipse(c,x,y,u*(.14+.42*smooth((p-.5)/.4)),Math.max(6,r.height*.38),'#a3d8ff',Math.sin(clamp((p-.48)/.52)*Math.PI)*.45,1.5);
 } else if(kind==='heal'){
   const h=Math.min(135,Math.max(r.height,55));
   for(let j=0;j<3;j++){const q=clamp((p-j*.08)/.74),fade=Math.sin(q*Math.PI);c.globalAlpha=fade*.7;c.strokeStyle=j===1?palettes.red[2]:palettes.red[1];c.lineWidth=j===1?1.8:1;c.beginPath();for(let k=0;k<=40;k++){const t=k/40,a=t*Math.PI*1.4+q*1.7+j*1.4,px=x+Math.cos(a)*u*(.28+.07*t),py=y+h*.3-q*h*.55+Math.sin(a)*h*.12;k?c.lineTo(px,py):c.moveTo(px,py);}c.stroke();}
   for(let i=0;i<22;i++){const q=clamp((p-random(i)*.24)/.76);shard(c,x+(random(i+3)-.5)*u*.95,y+h*.4-q*h*.9,u*.024*(.6+random(i+1)),q*.4,palettes.red[i%3],Math.sin(q*Math.PI)*.68);}
   glow(c,x,y+h*.22,u*.46,'#ed9b9d',envelope*.12);
 } else if(kind==='spell'){
   for(let j=0;j<2;j++){const a=p*TAU*.65+j*Math.PI;ellipse(c,x,y,u*(.56+j*.08),Math.min(r.height*.44,u*.62),j?palettes.gold[1]:palettes.blue[1],envelope*.8,1.1,a,a+Math.PI*1.25);}
   for(let i=0;i<20;i++){const a=i*2.399,q=clamp((p-random(i)*.15)/.85),d=u*(.5+q*.4);shard(c,x+Math.cos(a)*d,y+Math.sin(a)*d*.65-q*u*.13,u*.025,a+q,palettes.blue[i%3],Math.sin(q*Math.PI)*.75);}
 } else if(kind==='summon-charge'){
   const cy=r.top+r.height*.7;compass(c,x,cy,u*(.65-.18*smooth(p)),p,palettes.gold[1],envelope*.7);
   for(let i=0;i<20;i++){const a=i*2.399,d=u*(.65-.27*p);shard(c,x+Math.cos(a)*d,cy+Math.sin(a)*d*.32-u*p*.58,u*.021,a,palettes.gold[i%3],envelope*.7);}
   ellipse(c,x,cy,u*.54,u*.18,'#e7d2a2',envelope*.5,1.5);
 } else if(kind==='quest'){
   // Unfolded folio and compass seal: a record placed into the public quest slot.
   compass(c,x,y,u*(.46+.18*smooth(p)),p,palettes.gold[1],envelope*.85);
   const open=smooth(p*4),s=u*.39;c.globalAlpha=envelope;c.strokeStyle='#b4843e';c.lineWidth=2;c.shadowColor='#fff3cf';c.shadowBlur=5;
   c.beginPath();c.moveTo(x,y+s*.5);c.lineTo(x-s*open,y+s*.3);c.lineTo(x-s*open,y-s*.6);c.quadraticCurveTo(x-s*.4,y-s*.72,x,y-s*.35);c.quadraticCurveTo(x+s*.4,y-s*.72,x+s*open,y-s*.6);c.lineTo(x+s*open,y+s*.3);c.closePath();c.moveTo(x,y-s*.35);c.lineTo(x,y+s*.5);c.stroke();
   for(let i=0;i<14;i++){const a=i*2.399;shard(c,x+Math.cos(a)*u*(.43+p*.28),y+Math.sin(a)*u*(.25+p*.17)-p*u*.15,u*.025,a,palettes.gold[i%3],envelope*.65);}
 } else if(kind==='quick'){
   // One decisive seal break, with violet shards pulling toward the rift.
   const q=1-(1-p)**3;ellipse(c,x,y,u*(.36+q*.46),u*(.15+q*.2),'#dcc1ff',(1-p)**2,1.6);
   c.globalAlpha=envelope;c.strokeStyle='#fff1c8';c.lineWidth=2;c.beginPath();c.moveTo(x+u*.08,y-u*.3);c.lineTo(x-u*.1,y);c.lineTo(x+u*.06,y);c.lineTo(x-u*.08,y+u*.3);c.stroke();
   for(let i=0;i<20;i++){const a=i*2.399,d=u*(.3+random(i)*.4)*q;shard(c,x+Math.cos(a)*d,y+Math.sin(a)*d*.65,u*.033*(1-p),a+p*2,palettes.violet[i%3],(1-p)**1.5);}
 } else {
   // The library eye opens on the source card; orbiting pages release the pulse.
   compass(c,x,y,u*(.58+.06*Math.sin(p*Math.PI)),p,palettes.blue[1],envelope*.7);
   c.globalAlpha=envelope;c.strokeStyle='#977542';c.lineWidth=1.8;c.shadowColor='#f5daa0';c.shadowBlur=5;const rx=u*.34,ry=u*.15*smooth(p*5);c.beginPath();c.moveTo(x-rx,y);c.quadraticCurveTo(x,y-ry*2,x+rx,y);c.quadraticCurveTo(x,y+ry*2,x-rx,y);c.stroke();gem(c,x,y,u*.075,envelope);
   for(let i=0;i<12;i++){const a=i*TAU/12+p*.8;shard(c,x+Math.cos(a)*u*.55,y+Math.sin(a)*u*.3,u*.024,a,palettes.gold[i%3],envelope*.7);}
 }
 c.restore();
}

type Entry={kind:BiblionEffect;anchor:()=>FxRect|null;start:number;last:FxRect|null};
let canvas:HTMLCanvasElement|undefined,context:CanvasRenderingContext2D|null=null,frame=0;
const entries:Entry[]=[];
function reduced(){return typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;}
function render(now:number){
 frame=0;if(document.hidden||reduced()){clearBiblionFx();return;}
 if(!canvas||!context)return;
 const dpr=Math.min(devicePixelRatio,2),w=innerWidth,h=innerHeight;
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';}
 context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,w,h);
 for(let i=entries.length-1;i>=0;i--){const e=entries[i],age=(now-e.start)/1000;e.last=e.anchor()||e.last;if(age>=EFFECT_DURATION[e.kind]||!e.last){entries.splice(i,1);continue;}drawBiblionEffect(context,e.kind,e.last,age);}
 canvas.dataset.effects=entries.map(e=>e.kind).join(' ');
 if(entries.length)frame=requestAnimationFrame(render);else canvas.hidden=true;
}
export function playBiblionFx(kind:BiblionEffect,anchor:Element|FxRect|(()=>FxRect|null)):()=>void{
 if(document.hidden||reduced())return ()=>{};
 if(!canvas){canvas=document.createElement('canvas');canvas.className='biblion-fx';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:1700';context=canvas.getContext('2d');document.body.append(canvas);document.addEventListener('visibilitychange',onVisibility);}
 if(!context)return ()=>{};
 const resolve=typeof anchor==='function'?anchor:anchor instanceof Element?()=>anchor.isConnected?anchor.getBoundingClientRect():null:()=>anchor;
 const entry:Entry={kind,anchor:resolve,start:performance.now(),last:resolve()};entries.push(entry);
 // Bound repeated activations and keep one canvas. Last events take precedence.
 if(entries.length>24)entries.shift();canvas.hidden=false;if(!frame)frame=requestAnimationFrame(render);
 return ()=>{const i=entries.indexOf(entry);if(i>=0)entries.splice(i,1);};
}
function onVisibility(){if(document.hidden)clearBiblionFx();}
export function clearBiblionFx(dispose=false){cancelAnimationFrame(frame);frame=0;entries.length=0;if(canvas){context?.clearRect(0,0,canvas.width,canvas.height);canvas.hidden=true;}if(dispose){canvas?.remove();canvas=undefined;context=null;dustTexture=undefined;document.removeEventListener('visibilitychange',onVisibility);}}

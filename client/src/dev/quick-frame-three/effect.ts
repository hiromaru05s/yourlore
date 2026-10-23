export type Variant = 0 | 1 | 2;
export const variants = [
  {name:'閃走のフレーム',en:'ARC RUNNER',desc:'細い雷光が枠を駆け、角の彫金へ伝わる。',detail:'速い立ち上がりと、短い残光。瞬発力を最も強く。',color:'#8ce9ff'},
  {name:'速記の刻印',en:'LIVING INSCRIPTION',desc:'金属枠に刻まれた紋が、連鎖して点灯する。',detail:'枠の内側に光を蓄え、刻印へ順に受け渡す。',color:'#f5d595'},
  {name:'瞬風のヴェール',en:'EDGE VEIL',desc:'枠から薄い魔力がほどけ、縁へ巻き戻る。',detail:'面のある帯が呼吸し、二重の縁をつくる。',color:'#c4b1ff'},
] as const;
const W=360,H=562,PAD=42;
const outline = new Path2D('M 180 24 L 193 33 Q 277 26 329 39 Q 341 42 341 64 L 341 518 Q 343 540 326 541 Q 254 554 180 540 Q 106 554 34 541 Q 19 540 19 518 L 19 64 Q 19 42 31 39 Q 101 26 167 33 Z');
// Clockwise, on the frame's own engraved rails. Normal points outward.
function edge(q:number):[number,number,number,number]{
 const d=((q%1)+1)%1*1604;
 if(d<320)return[20+d,35-7*Math.sin(d/320*Math.PI),0,-1];
 if(d<822)return[340,35+d-320,1,0];
 if(d<1142)return[340-(d-822),537+7*Math.sin((d-822)/320*Math.PI),0,1];
 return[20,537-(d-1142),-1,0];
}
export class FrameEffect {
 readonly canvas=document.createElement('canvas');
 readonly badge=document.createElement('div');
 readonly sheen:HTMLElement;
 private ctx:CanvasRenderingContext2D;
 private typeChip:HTMLElement|null;
 private observer:ResizeObserver;
 constructor(readonly node:HTMLElement,readonly variant:Variant){
  node.classList.add('quick-frame-preview');node.dataset.quickVariant=String(variant);node.style.setProperty('--quick-ink',variants[variant].color);
  this.canvas.className='quick-frame-canvas';this.canvas.setAttribute('aria-hidden','true');
  this.canvas.style.cssText=`position:absolute;left:${-PAD/W*100}%;top:${-PAD/H*100}%;width:${(W+PAD*2)/W*100}%;height:${(H+PAD*2)/H*100}%;pointer-events:none;z-index:2`;
  this.ctx=this.canvas.getContext('2d')!;
  this.typeChip=node.querySelector('.card-status .kw');
  this.sheen=node.querySelector<HTMLElement>('.card-frame')!.cloneNode(true) as HTMLElement;
  this.sheen.classList.add('quick-frame-sheen');this.sheen.setAttribute('aria-hidden','true');
  this.badge.className='quick-frame-badge';this.badge.innerHTML='<span aria-hidden="true">ϟ</span> クイック魔法';
  node.append(this.sheen,this.canvas,this.badge);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(node);this.resize();
 }
 private resize(){const ratio=Math.min(devicePixelRatio||1,2)*this.node.getBoundingClientRect().width/W;this.canvas.width=Math.ceil((W+PAD*2)*ratio);this.canvas.height=Math.ceil((H+PAD*2)*ratio);}
 draw(t:number,enabled=true,reduced=false){
  this.canvas.hidden=this.badge.hidden=this.sheen.hidden=!enabled;
  if(this.typeChip)this.typeChip.hidden=enabled;
  if(!enabled)return;
  if(reduced)t=1.4;
  const c=this.ctx;c.setTransform(this.canvas.width/(W+PAD*2),0,0,this.canvas.height/(H+PAD*2),0,0);c.clearRect(0,0,W+PAD*2,H+PAD*2);c.translate(PAD,PAD);
  const color=variants[this.variant].color;
  const pulse=.5+.5*Math.sin(t*2.4);
  this.sheen.style.opacity=String(.22+.12*pulse);
  this.sheen.style.maskImage=`linear-gradient(${this.variant===2?15:125}deg, transparent ${((t*.19)%1)*150-45}%, #000 ${((t*.19)%1)*150-20}%, transparent ${((t*.19)%1)*150+10}%)`;
  c.strokeStyle=color;c.lineWidth=1.4;c.globalAlpha=.45;c.stroke(outline);c.globalAlpha=1;
  if(this.variant===0)this.arc(t,color,reduced);
  else if(this.variant===1)this.inscription(t,color);
  else this.veil(t,color);
  // Four corners remain attached to the existing metalwork, with a dark core and a fine lit edge.
  for(const [x,y,sx,sy] of [[22,44,1,1],[338,44,-1,1],[22,530,1,-1],[338,530,-1,-1]]){
   c.save();c.translate(x,y);c.scale(sx,sy);c.beginPath();c.moveTo(0,25);c.lineTo(0,3);c.quadraticCurveTo(0,0,4,0);c.lineTo(25,0);c.strokeStyle='#152338';c.lineWidth=6;c.stroke();c.strokeStyle=color;c.lineWidth=1.5;c.stroke();c.restore();
  }
 }
 private stroke(p:Path2D,color:string,width:number,alpha=1){const c=this.ctx;c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke(p);c.globalAlpha=1;}
 private arc(t:number,color:string,reduced:boolean){
  const c=this.ctx;
  for(let n=0;n<2;n++){
   const head=t*.28+n*.5;
   for(let band=0;band<3;band++){
    const p=new Path2D();
    for(let i=0;i<=72;i++){
     const u=i/72,[x,y,nx,ny]=edge(head-u*.25);
     const jitter=Math.sin(i*2.1+Math.floor(t*15)*1.9+n)*Math.sin(u*Math.PI)*(band===0?4:2);
     if(i===0)p.moveTo(x,y);else p.lineTo(x+nx*jitter,y+ny*jitter);
    }
    this.stroke(p,color,band===0?12:band===1?4:1.25,band===0?.1:band===1?.45:.95);
   }
   // A tapering white-hot runner on the leading portion of the frame.
   for(let i=0;i<22;i++){
    const [x,y]=edge(head-i*.003),[xx,yy]=edge(head-(i+1)*.003);
    c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle=i<5?'#efffff':color;c.lineWidth=4*(1-i/22)+.3;c.globalAlpha=1-i/26;c.stroke();
   }
   c.globalAlpha=1;
   const [x,y,nx,ny]=edge(head);const p=new Path2D();p.moveTo(x,y);p.lineTo(x+nx*11+ny*7,y+ny*11-nx*7);p.lineTo(x+nx*5+ny*15,y+ny*5-nx*15);p.lineTo(x+nx*16+ny*22,y+ny*16-nx*22);
   if(!reduced)this.stroke(p,color,1.6,.65);
  }
 }
 private inscription(t:number,color:string){
  const c=this.ctx;
  for(let i=0;i<44;i++){
   const q=i/44,[x,y,nx,ny]=edge(q);const phase=((q-t*.12)%1+1)%1;
   const lit=.22+.78*Math.exp(-phase*8);
   c.save();c.translate(x,y);c.rotate(Math.atan2(ny,nx));
   c.beginPath();c.moveTo(-2,-5);c.lineTo(3,0);c.lineTo(-2,5);c.moveTo(0,-7);c.lineTo(0,7);if(i%3===0){c.moveTo(-4,-2);c.lineTo(-4,3);c.lineTo(4,3);}
   c.strokeStyle='#40301d88';c.lineWidth=3;c.stroke();c.strokeStyle=color;c.lineWidth=1.25;c.globalAlpha=lit;c.stroke();
   if(lit>.7){c.shadowColor=color;c.shadowBlur=9;c.stroke();}c.restore();
  }
  // Two engraved inner lines conduct the illumination, without covering the illustration.
  for(const side of [0,1]){
   const x=side?332:28;const y=110+((t*.23)%1)*390;
   const g=c.createLinearGradient(x,y-80,x,y+40);g.addColorStop(0,'#f5d59500');g.addColorStop(.7,color);g.addColorStop(1,'#fff5dd00');
   c.strokeStyle=g;c.lineWidth=2;c.beginPath();c.moveTo(x,108);c.lineTo(x,523);c.stroke();
  }
 }
 private veil(t:number,color:string){
  const c=this.ctx;
  for(const side of [-1,1]){
   const root=side<0?19:341;
   for(let band=0;band<3;band++){
    const p=new Path2D();
    const positions:[number,number,number][]=[];
    for(let i=0;i<=70;i++){
     const u=i/70,y=83+u*445;
     const env=Math.pow(Math.sin(u*Math.PI),.65);
     const wave=.5+.5*Math.sin(u*12-t*2.7+band*.85);
     const width=(4+wave*14+band*3)*env;
     const x=root+side*(2+width);positions.push([x,y,width]);
     if(i===0)p.moveTo(root,y);else p.lineTo(x,y);
    }
    for(let i=positions.length-1;i>=0;i--){const [,y,w]=positions[i];p.lineTo(root+side*(2+w*.12),y);}p.closePath();
    const g=c.createLinearGradient(root,0,root+side*34,0);g.addColorStop(0,'#8b73c600');g.addColorStop(.35,'#8166d346');g.addColorStop(.85,'#c4b1ff69');g.addColorStop(1,'#e8ddff17');c.fillStyle=g;c.fill(p);
    const line=new Path2D();positions.forEach(([x,y],i)=>i===0?line.moveTo(x,y):line.lineTo(x,y));this.stroke(line,color,band===0?1.8:.7,band===0?.85:.4);
   }
  }
  for(let n=0;n<2;n++){
   const q=t*.13+n*.5;const p=new Path2D();for(let i=0;i<40;i++){const [x,y,nx,ny]=edge(q-i*.003);const lift=5*Math.sin(i/40*Math.PI);if(i===0)p.moveTo(x,y);else p.lineTo(x+nx*lift,y+ny*lift);}this.stroke(p,'#e9dfff',2,.85);
  }
 }
 dispose(){if(this.typeChip)this.typeChip.hidden=false;this.observer.disconnect();this.canvas.remove();this.badge.remove();this.sheen.remove();this.node.classList.remove('quick-frame-preview');delete this.node.dataset.quickVariant;this.node.style.removeProperty('--quick-ink');}
}
export class EffectClock {
 effects:FrameEffect[]=[];time=0;playing=true;speed=1;enabled=true;reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 private raf=0;private last=0;private disposed=false;
 constructor(){document.addEventListener('visibilitychange',this.visibility);this.resume();}
 private visibility=()=>{cancelAnimationFrame(this.raf);this.last=0;if(!document.hidden)this.resume();};
 private resume=()=>{if(this.disposed)return;this.raf=requestAnimationFrame(this.tick);};
 private tick=(now:number)=>{if(this.last&&this.playing&&!this.reduced)this.time+=Math.min((now-this.last)/1000,.05)*this.speed;this.last=now;this.draw();this.resume();};
 attach(node:HTMLElement,v:Variant){const fx=new FrameEffect(node,v);this.effects.push(fx);this.draw();return fx;}
 clear(){this.effects.forEach(f=>f.dispose());this.effects=[];}
 draw(){this.effects.filter(f=>f.node.isConnected).forEach(f=>f.draw(this.time,this.enabled,this.reduced));}
 dispose(){this.disposed=true;cancelAnimationFrame(this.raf);document.removeEventListener('visibilitychange',this.visibility);this.clear();}
}

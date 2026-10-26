import '../styles/quickSpellFrame.css';

/** Selected preview 03: a thin three-layer veil rooted in the card's metal frame. */
const W=360,H=562,PAD=42,COLOR='#c4b1ff';
function edge(q:number):[number,number,number,number]{
 const d=((q%1)+1)%1*1604;
 if(d<320)return[20+d,35-7*Math.sin(d/320*Math.PI),0,-1];
 if(d<822)return[340,35+d-320,1,0];
 if(d<1142)return[340-(d-822),537+7*Math.sin((d-822)/320*Math.PI),0,1];
 return[20,537-(d-1142),-1,0];
}

class VeilFrame {
 readonly canvas=document.createElement('canvas');
 readonly badge=document.createElement('div');
 private sheen:HTMLElement;
 private ctx:CanvasRenderingContext2D|null;
 private outline:Path2D|null=null;
 private observer:ResizeObserver|undefined;
 private typeChip:HTMLElement|null;
 private chipWasHidden=false;
 private time=0;
 private reduced=false;
 constructor(readonly node:HTMLElement,label:string){
  node.classList.add('quick-spell-frame');
  this.canvas.className='quick-spell-frame-canvas';this.canvas.setAttribute('aria-hidden','true');
  this.canvas.style.cssText=`position:absolute;left:${-PAD/W*100}%;top:${-PAD/H*100}%;width:${(W+PAD*2)/W*100}%;height:${(H+PAD*2)/H*100}%;pointer-events:none;z-index:2`;
  this.ctx=typeof Path2D==='function'?this.canvas.getContext('2d'):null;
  if(this.ctx){this.outline = new Path2D('M 180 24 L 193 33 Q 277 26 329 39 Q 341 42 341 64 L 341 518 Q 343 540 326 541 Q 254 554 180 540 Q 106 554 34 541 Q 19 540 19 518 L 19 64 Q 19 42 31 39 Q 101 26 167 33 Z');}
  this.typeChip=node.querySelector('.card-status .kw');
  if(this.typeChip){this.chipWasHidden=this.typeChip.hidden;this.typeChip.hidden=true;}
  this.sheen=node.querySelector<HTMLElement>('.card-frame')!.cloneNode(true) as HTMLElement;
  this.sheen.classList.add('quick-spell-frame-sheen');this.sheen.setAttribute('aria-hidden','true');
  this.badge.className='card-type-badge quick-spell-frame-badge';
  const mark=document.createElement('span');mark.setAttribute('aria-hidden','true');mark.textContent='ϟ';
  this.badge.append(mark,document.createTextNode(label));
  node.append(this.sheen,this.canvas,this.badge);
  if(typeof ResizeObserver==='function'){this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(node);}
  else window.addEventListener('resize',this.onResize);
  this.resize();
 }
 readonly canAnimate=()=>!!this.ctx;
 private onResize=()=>this.resize();
 private resize(){
  const width=this.node.getBoundingClientRect().width;if(!width)return;
  const ratio=Math.min(window.devicePixelRatio||1,2)*width/W;
  this.canvas.width=Math.ceil((W+PAD*2)*ratio);this.canvas.height=Math.ceil((H+PAD*2)*ratio);
  this.draw(this.time,this.reduced);
 }
 draw(t:number,reduced=false){
  this.time=t;this.reduced=reduced;if(reduced)t=1.4;
  const pulse=.5+.5*Math.sin(t*2.4);
  this.sheen.style.opacity=String(.22+.12*pulse);
  this.sheen.style.maskImage=`linear-gradient(15deg, transparent ${((t*.19)%1)*150-45}%, #000 ${((t*.19)%1)*150-20}%, transparent ${((t*.19)%1)*150+10}%)`;
  const c=this.ctx;if(!c||!this.outline)return;
  c.setTransform(this.canvas.width/(W+PAD*2),0,0,this.canvas.height/(H+PAD*2),0,0);c.clearRect(0,0,W+PAD*2,H+PAD*2);c.translate(PAD,PAD);
  c.strokeStyle=COLOR;c.lineWidth=1.4;c.globalAlpha=.45;c.stroke(this.outline);c.globalAlpha=1;
  this.veil(t,COLOR);
  for(const [x,y,sx,sy] of [[22,44,1,1],[338,44,-1,1],[22,530,1,-1],[338,530,-1,-1]]){
   c.save();c.translate(x,y);c.scale(sx,sy);c.beginPath();c.moveTo(0,25);c.lineTo(0,3);c.quadraticCurveTo(0,0,4,0);c.lineTo(25,0);c.strokeStyle='#152338';c.lineWidth=6;c.stroke();c.strokeStyle=COLOR;c.lineWidth=1.5;c.stroke();c.restore();
  }
 }
 private stroke(p:Path2D,color:string,width:number,alpha=1){const c=this.ctx!;c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke(p);c.globalAlpha=1;}

 private veil(t:number,color:string){
  const c=this.ctx!;
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

 dispose(){
  this.observer?.disconnect();window.removeEventListener('resize',this.onResize);this.canvas.remove();this.badge.remove();this.sheen.remove();
  if(this.typeChip)this.typeChip.hidden=this.chipWasHidden;
  this.node.classList.remove('quick-spell-frame');
 }
}

export interface QuickSpellFrame { pause():void; resume():void; dispose():void }
const attached=new WeakMap<HTMLElement,QuickSpellFrame>();
export function disposeQuickSpellFrame(node:HTMLElement):void { attached.get(node)?.dispose(); }

/** The inspector owns this handle: pause while in its history, resume on back, dispose on close. */
export function mountQuickSpellFrame(node:HTMLElement,label:string):QuickSpellFrame {
 disposeQuickSpellFrame(node);
 const surface=new VeilFrame(node,label),media=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0,last=0,time=0,active=true,disposed=false;
 const stop=()=>{cancelAnimationFrame(frame);frame=0;last=0;};
 const tick=(now:number)=>{
  frame=0;
  if(disposed||!active||document.hidden||!node.isConnected){last=0;return;}
  if(last)time+=Math.min((now-last)/1000,.05);last=now;
  surface.draw(time,media.matches);
  if(!media.matches&&surface.canAnimate())frame=requestAnimationFrame(tick);
 };
 const sync=()=>{
  stop();if(disposed||!active||document.hidden||!node.isConnected)return;
  surface.draw(time,media.matches);
  if(!media.matches&&surface.canAnimate())frame=requestAnimationFrame(tick);
 };
 const handle:QuickSpellFrame={
  pause(){active=false;stop();},
  resume(){if(disposed)return;active=true;sync();},
  dispose(){
   if(disposed)return;disposed=true;stop();surface.dispose();attached.delete(node);
   document.removeEventListener('visibilitychange',sync);media.removeEventListener('change',sync);window.removeEventListener('pagehide',handle.dispose);
  },
 };
 document.addEventListener('visibilitychange',sync);media.addEventListener('change',sync);window.addEventListener('pagehide',handle.dispose);
 attached.set(node,handle);sync();return handle;
}

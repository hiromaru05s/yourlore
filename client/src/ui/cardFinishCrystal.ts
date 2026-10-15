/** Selected crystal facets material, including the approved 2x clock. */
export type Finish = 0 | 1 | 2;
const W=256,H=384,TAU=Math.PI*2;
const canvas=()=>Object.assign(document.createElement('canvas'),{width:W,height:H});
const hash=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const textures:HTMLCanvasElement[]=[];
const frameMasks=new Map<string,Promise<HTMLCanvasElement>>();
function frameMask(url:string){
 let pending=frameMasks.get(url);if(pending)return pending;
 pending=(async()=>{const img=new Image();img.src=url;await img.decode();const out=canvas(),c=out.getContext('2d')!;c.drawImage(img,0,0,W,H);const p=c.getImageData(0,0,W,H);for(let i=0;i<p.data.length;i+=4){const light=(p.data[i]+p.data[i+1]+p.data[i+2])/765;p.data[i+3]*=Math.min(1,Math.max(0,light*30-.65))*(.2+light*.8);}c.putImageData(p,0,0);return out;})();frameMasks.set(url,pending);return pending;
}
function star(c:CanvasRenderingContext2D,x:number,y:number,r:number,a:number,color:string){
 if(a<.01)return;c.save();c.translate(x,y);c.fillStyle=color;c.globalAlpha=a;c.beginPath();c.moveTo(0,-r);c.quadraticCurveTo(r*.14,-r*.14,r,0);c.quadraticCurveTo(r*.14,r*.14,0,r);c.quadraticCurveTo(-r*.14,r*.14,-r,0);c.quadraticCurveTo(-r*.14,-r*.14,0,-r);c.fill();c.restore();
}
/** Three distinct surface geometries share a clock; glints never leave the card. */
function texture(v:Finish,t:number){
 const out=textures[v]??(textures[v]=canvas()),c=out.getContext('2d')!;c.clearRect(0,0,W,H);
 {
  // Cut crystal foil: fixed tessellated planes catch light independently.
  // 03 revision: twice the playback speed and glint repetition frequency.
  const crystalTime=t*2;
  const cell=24,points:Array<Array<[number,number]>>=[];
  for(let y=0;y<18;y++){points[y]=[];for(let x=0;x<13;x++)points[y][x]=[x*cell-20+(hash(x+y*23)-.5)*17,y*cell-16+(hash(x+y*17+40)-.5)*17];}
  for(let y=0;y<17;y++)for(let x=0;x<12;x++)for(let half=0;half<2;half++){
   const p=half?[points[y][x],points[y+1][x+1],points[y+1][x]]:[points[y][x],points[y][x+1],points[y+1][x+1]];
   const seed=x+y*12+half*207,phase=crystalTime*.72+hash(seed+71)*TAU+(x+y)*.18,a=Math.pow(Math.max(0,Math.sin(phase)),13);
   c.beginPath();p.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.closePath();c.fillStyle=`rgba(${half?'203,226,251':'250,221,178'},${.012+a*.18})`;c.fill();
   if(a>.3){c.strokeStyle=`rgba(255,240,215,${a*.24})`;c.lineWidth=.45;c.stroke();}
   if(hash(seed+73)>.86)star(c,p[0][0],p[0][1],1.7+hash(seed)*2.8,Math.pow(a,2)*.95,'#fff2d8');
  }
 }
 return out;
}
interface Entry {node:HTMLElement;art:HTMLCanvasElement;rim:HTMLCanvasElement;mask?:HTMLCanvasElement;detail?:HTMLCanvasElement;variant:Finish;visible:boolean;disposed:boolean;}
export class CrystalRenderer {
 private entries=new Map<HTMLElement,Entry>();private observer:IntersectionObserver;private disposed=false;
 constructor(){this.observer=new IntersectionObserver(es=>{for(const e of es){const item=this.entries.get(e.target as HTMLElement);if(item)item.visible=e.isIntersecting;}},{rootMargin:'50px'});}
 attach(node:HTMLElement,variant:Finish){
  const existing=this.entries.get(node);if(existing){existing.variant=variant;return;}
  const artHost=node.querySelector<HTMLElement>('.card-art');if(!artHost)return;
  const art=canvas(),rim=canvas();for(const c of [art,rim]){c.className='card-effect-surface';c.setAttribute('aria-hidden','true');c.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:screen';}
  art.style.zIndex='2';rim.style.zIndex='0';artHost.append(art);node.append(rim);
  const entry:Entry={node,art,rim,variant,visible:true,disposed:false};this.entries.set(node,entry);this.observer.observe(node);
  const frame=node.querySelector<HTMLElement>('.card-frame'),url=frame?.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
  if(url)void frameMask(url).then(mask=>{if(!entry.disposed)entry.mask=mask;}).catch(()=>{});
  const img=node.querySelector<HTMLImageElement>('.card-art img');
  if(img)void img.decode().then(()=>{
   if(entry.disposed)return;const mask=canvas(),c=mask.getContext('2d')!;const compact=node.classList.contains('card--field');
   const x=W*.075,y=H*(compact?.045:.18),w=W*.85,h=H*(compact?.91:.77),scale=Math.max(w/img.naturalWidth,h/img.naturalHeight),sw=w/scale,sh=h/scale;
   c.drawImage(img,(img.naturalWidth-sw)*.5,(img.naturalHeight-sh)*.22,sw,sh,x,y,w,h);
   const p=c.getImageData(0,0,W,H);for(let i=0;i<p.data.length;i+=4){const lum=(p.data[i]*.2126+p.data[i+1]*.7152+p.data[i+2]*.0722)/255;const next=(p.data[Math.min(p.data.length-4,i+4)]+p.data[Math.min(p.data.length-3,i+5)]+p.data[Math.min(p.data.length-2,i+6)])/765;const relief=Math.min(1,Math.abs(lum-next)*5);p.data[i+3]=Math.round(255*(.38+lum*.35+relief*.27));}c.putImageData(p,0,0);entry.detail=mask;
  }).catch(()=>{});
 }
 detach(node:HTMLElement){const e=this.entries.get(node);if(!e)return;e.disposed=true;e.art.remove();e.rim.remove();this.observer.unobserve(node);this.entries.delete(node);}
 draw(t:number,enabled=true){if(this.disposed)return;texture(2,t);for(const e of this.entries.values()){
  if(!e.visible)continue;for(const c of [e.art,e.rim]){c.style.visibility=enabled?'visible':'hidden';}if(!enabled)continue;
  const c=e.art.getContext('2d')!;c.clearRect(0,0,W,H);c.globalCompositeOperation='source-over';c.drawImage(textures[e.variant],0,0);if(e.detail){c.globalCompositeOperation='destination-in';c.drawImage(e.detail,0,0);c.globalCompositeOperation='source-over';}
  const r=e.rim.getContext('2d')!;r.clearRect(0,0,W,H);if(e.mask){r.globalCompositeOperation='source-over';r.globalAlpha=.65;r.drawImage(textures[e.variant],0,0);r.globalAlpha=1;r.globalCompositeOperation='destination-in';r.drawImage(e.mask,0,0);r.globalCompositeOperation='source-over';}
 }}
 get count(){return this.entries.size;}
 dispose(){this.disposed=true;for(const n of [...this.entries.keys()])this.detach(n);this.observer.disconnect();}
}

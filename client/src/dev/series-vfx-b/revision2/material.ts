export type Variant=1|2;
export type Point={x:number;y:number};
// Local contact times only. Shared destroyAnim owns its unchanged 320 + 340 ms.
export const lengths={1:620,2:900} as const;
export const keys={1:[300,505,620],2:[250,610,900]} as const;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const load=(url:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Cannot load '+url));i.src=url;});
// Registration is to the current 832 x 760 ELF, never a replacement weapon.
export const registration={grip:[.651,.615],upperTip:[.778,.144],lowerTip:[.536,.697],canopy:[.81,.235]} as const;
const bowSamples=[[.144,.778],[.215,.739],[.30,.767],[.39,.752],[.48,.718],[.56,.679],[.615,.651],[.655,.609],[.697,.536]];
function bowX(y:number){for(let i=1;i<bowSamples.length;i++){const a=bowSamples[i-1],b=bowSamples[i];if(y<=b[0])return a[1]+(b[1]-a[1])*clamp((y-a[0])/(b[0]-a[0]));}return .536;}
function bowPoses(img:HTMLImageElement){
 const base=document.createElement('canvas');base.width=img.naturalWidth;base.height=img.naturalHeight;const c=base.getContext('2d')!;c.drawImage(img,0,0);
 const src=c.getImageData(0,0,base.width,base.height),{width:w,height:h}=base,poses=[base];
 // Inverse displacement only in a narrow limb corridor. Hand, face, arm, frame,
 // original string and arrow remain the native art. No duplicated bow beneath it.
 for(let pose=1;pose<=6;pose++){
  const out=document.createElement('canvas');out.width=w;out.height=h;const d=new ImageData(new Uint8ClampedArray(src.data),w,h);
  for(let y=Math.ceil(h*.144);y<h*.698;y++){
   const v=y/h,cx=bowX(v),upper=v<.615,limb=upper?Math.sin(Math.PI*(v-.144)/(.615-.144)):Math.sin(Math.PI*(v-.615)/(.698-.615));
   for(let x=Math.floor((cx-.066)*w);x<(cx+.066)*w;x++){
    const u=x/w,fall=1-smooth(.022,.066,Math.abs(u-cx)),grip=1-smooth(0,.045,Math.hypot(u-.651,v-.615));
    const displacement=-(upper?.027:.013)*limb*fall*(1-grip)*pose/6*w;
    const sx=Math.max(0,Math.min(w-2,x-displacement)),lo=Math.floor(sx),f=sx-lo,k=(y*w+x)*4,a=(y*w+lo)*4;
    for(let ch=0;ch<4;ch++)d.data[k+ch]=src.data[a+ch]*(1-f)+src.data[a+4+ch]*f;
   }
  }
  out.getContext('2d')!.putImageData(d,0,0);poses.push(out);
 }
 return poses;
}
export const materials=load('/art/cards/ELF.webp').then(bowPoses);
export type Assets=Awaited<typeof materials>;
export type Surface={node:HTMLElement;image:HTMLImageElement;canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;w:number;h:number;natW:number;natH:number};
export function attachSurface(card:HTMLElement):Surface{
 const node=card.querySelector<HTMLElement>('.card-art')!,image=node.querySelector<HTMLImageElement>('img')!,w=node.clientWidth,h=node.clientHeight,canvas=document.createElement('canvas');
 canvas.width=Math.ceil(w*3);canvas.height=Math.ceil(h*3);canvas.className='elf-r2-surface';canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';
 node.append(canvas);return {node,image,canvas,ctx:canvas.getContext('2d')!,w,h,natW:image.naturalWidth,natH:image.naturalHeight};
}
function aperture(s:Surface){return {x:s.image.offsetLeft,y:s.image.offsetTop,w:s.image.clientWidth,h:s.image.clientHeight};}
function original(s:Surface){const a=aperture(s),z=Math.max(a.w/s.natW,a.h/s.natH);return {w:s.natW*z,h:s.natH*z,x:a.x+(a.w-s.natW*z)*.5,y:a.y+(a.h-s.natH*z)*.22};}
export function artPoint(s:Surface,u:number,v:number):Point{const q=original(s),r=s.node.getBoundingClientRect();return {x:r.left+(q.x+q.w*u)/s.w*r.width,y:r.top+(q.y+q.h*v)/s.h*r.height};}
function clear(s:Surface){s.ctx.setTransform(3,0,0,3,0,0);s.ctx.clearRect(0,0,s.w,s.h);}
function clipArt(s:Surface){const a=aperture(s);s.ctx.beginPath();s.ctx.rect(a.x,a.y,a.w,a.h);s.ctx.clip();}
function sourceBow(s:Surface,assets:Assets,ms:number,reduced:boolean){
 const tension=smooth(0,300,ms)*(1-smooth(365,475,ms));if(tension<=0)return;
 const c=s.ctx,q=original(s);c.save();clipArt(s);
 const p=(reduced?0:tension)*6,lo=Math.floor(p),hi=Math.min(6,lo+1);c.drawImage(assets[lo],q.x,q.y,q.w,q.h);
 if(hi!==lo){c.globalAlpha=p-lo;c.drawImage(assets[hi],q.x,q.y,q.w,q.h);c.globalAlpha=1;}
 // A short specular seated on the existing lower upper-limb carving, with the
 // exact same displacement as the native pixels; no new bow/string drawing.
 c.translate(q.x,q.y);c.scale(q.w,q.h);c.beginPath();
 for(let v=.44;v<=.566;v+=.007){const x=bowX(v)-.027*Math.sin(Math.PI*(v-.144)/(.615-.144))*tension;v===.44?c.moveTo(x,v):c.lineTo(x,v);}
 c.globalAlpha=tension*.7;c.strokeStyle='#eddda8';c.lineWidth=.0035;c.stroke();c.restore();
}
// Branched silhouette with deep open notches. Both halves share the same
// negative spaces at origin, in flight and at arrival; the opening is unpainted.
const shadowLeft=new Path2D('M -.055 -.56 C -.19 -.61 -.33 -.55 -.39 -.43 C -.28 -.46 -.21 -.42 -.17 -.32 L -.32 -.37 C -.43 -.25 -.34 -.13 -.21 -.105 L -.15 -.15 L -.13 -.035 C -.24 -.01 -.30 -.075 -.34 -.055 C -.43 .075 -.34 .23 -.205 .23 L -.145 .135 L -.115 .32 C -.215 .285 -.30 .34 -.285 .435 C -.25 .535 -.155 .56 -.085 .585 C -.025 .415 -.05 .265 -.057 .13 L -.04 -.01 L -.085 -.195 C -.025 -.36 -.10 -.44 -.055 -.56 Z M -.19 -.285 Q -.29 -.29 -.31 -.23 Q -.245 -.23 -.19 -.19 Z M -.13 .40 Q -.20 .37 -.225 .42 L -.13 .47 Z');
const shadowRight=new Path2D('M .075 -.49 C .225 -.51 .35 -.405 .375 -.28 C .27 -.32 .225 -.27 .19 -.18 L .32 -.21 C .40 -.07 .33 .065 .19 .10 L .14 .045 L .105 .21 C .22 .145 .315 .22 .29 .36 C .23 .465 .125 .505 .055 .55 C .005 .40 .03 .29 .05 .15 L .025 -.03 C .095 -.195 .09 -.29 .075 -.49 Z M .16 -.36 Q .26 -.39 .28 -.31 L .18 -.28 Z M .16 .255 L .225 .27 Q .21 .345 .135 .35 Z');
function canopy(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,angle:number,closure:number,alpha:number){
 c.save();c.translate(x,y);c.rotate(angle);c.scale(w,h);c.globalAlpha=alpha*.64;
 const gap=.12*(1-closure);
 // Neutral multiplicative illumination: original RGB detail is scaled, never
 // replaced by an opaque green fill. White/transparent gaps leave native art.
 // No central gold ribbon. The narrowing opening is the unpainted original.
 const penumbra=c.createLinearGradient(-.42,-.2,.37,.24);
 penumbra.addColorStop(0,'#c0c1b9');penumbra.addColorStop(.34,'#737a70');penumbra.addColorStop(.58,'#899083');penumbra.addColorStop(1,'#d1d2ca');
 c.fillStyle=penumbra;c.save();c.translate(-gap,0);c.fill(shadowLeft,'evenodd');c.restore();
 c.save();c.translate(gap,0);c.fill(shadowRight,'evenodd');c.restore();c.restore();
}
function sourceCanopy(s:Surface,ms:number){
 const a=smooth(0,230,ms)*(1-smooth(400,535,ms));if(a<=0)return;
 const c=s.ctx,q=original(s);c.save();clipArt(s);
 // The original sunlit foliage behind the bow is the source, not the elf's face.
 canopy(c,q.x+q.w*.81,q.y+q.h*.235,q.w*.31,q.h*.35,-.18,0,a*.9);c.restore();
}
function targetCut(s:Surface,ms:number,v:Variant,angle:number){
 const c=s.ctx,a=aperture(s),w=a.w,h=a.h;c.save();clipArt(s);
 if(v===1){
  if(ms<lengths[1]){c.restore();return;}
  c.translate(a.x+w*.5,a.y+h*.47);c.rotate(angle);
  c.beginPath();c.moveTo(-h*.49,-w*.026);c.bezierCurveTo(-h*.20,-w*.17,h*.23,-w*.125,h*.51,0);c.bezierCurveTo(h*.19,w*.052,-h*.23,w*.082,-h*.49,-w*.026);c.fillStyle='rgba(22,34,25,.96)';c.fill();
  c.beginPath();c.moveTo(-h*.46,-w*.026);c.bezierCurveTo(-h*.16,-w*.124,h*.22,-w*.076,h*.47,0);c.lineWidth=Math.max(.65,w*.032);c.strokeStyle='#edd49a';c.stroke();
 }else{
  const enter=smooth(690,735,ms);if(enter>0)canopy(c,a.x+w*.5,a.y+h*.47,w*.90,h*.91,-.18,smooth(740,900,ms),enter);
 }
 c.restore();
}
function slashShape(c:CanvasRenderingContext2D,len:number,width:number){
 // One closed silhouette: thick leading plane and two tapering tails, no beam.
 c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-len*.10,-width*.54,-len*.43,-width*.68,-len, -width*.04);
 c.quadraticCurveTo(-len*.56,-width*.07,-len*.34,width*.015);c.lineTo(-len*.89,width*.25);
 c.quadraticCurveTo(-len*.39,width*.40,-len*.15,width*.20);c.quadraticCurveTo(-len*.035,width*.10,0,0);c.closePath();
 const color=c.createLinearGradient(0,-width*.5,0,width*.4);color.addColorStop(0,'#ecd497');color.addColorStop(.20,'#bba46b');color.addColorStop(.45,'#716a3c');color.addColorStop(1,'#263e30');c.fillStyle=color;c.fill();
 c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-len*.10,-width*.54,-len*.43,-width*.68,-len,-width*.04);c.strokeStyle='#f8e7b4';c.lineWidth=Math.max(.65,width*.052);c.stroke();
 c.beginPath();c.moveTo(-len*.13,-width*.17);c.quadraticCurveTo(-len*.35,-width*.07,-len*.75,-width*.025);c.strokeStyle='rgba(43,55,30,.9)';c.lineWidth=Math.max(.6,width*.062);c.stroke();
}
function slash(c:CanvasRenderingContext2D,a:Point,b:Point,w:number,ms:number){
 if(ms<320||ms>=620)return;
 const p=clamp((ms-365)/255),travel=p*p*(1.65-.65*p),dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy),compression=smooth(320,365,ms);
 const contact=smooth(.83,1,p);
 const len=w*(.20*compression+1.32*Math.sin(p*Math.PI*.65))*(1-contact*.55),thick=w*(.10*compression+.40*Math.sin(Math.PI*p)+contact*.20);
 c.save();c.translate(a.x+dx*travel,a.y+dy*travel);c.rotate(Math.atan2(dy,dx));
 slashShape(c,Math.min(len,Math.max(w*.2,dist*travel+w*.15)),thick);c.restore();
}
function travellingCanopy(c:CanvasRenderingContext2D,a:Point,b:Point,w:number,h:number,ms:number){
 if(ms<400||ms>=735)return;
 const p=smooth(400,735,ms),dx=b.x-a.x,dy=b.y-a.y;
 canopy(c,a.x+dx*p,a.y+dy*p,w*(.58+p*.32),h*(.55+p*.36),-.18,0,smooth(400,465,ms)*(1-smooth(690,735,ms)));
}
const textMasks=new WeakMap<HTMLCanvasElement,Path2D>();
function protectCardInformation(c:CanvasRenderingContext2D,key:HTMLCanvasElement){
 let mask=textMasks.get(key);
 if(!mask){
  mask=new Path2D();mask.rect(0,0,innerWidth,innerHeight);
  // Only actual text runs, never card/plate/frame rectangles. Cache for this
  // attached surface; reset/seek/resize create a fresh surface and mask.
  const seen=new Set<string>();
  for(const label of document.querySelectorAll<HTMLElement>('.card .card-name,.card .seal-value,.card .badge')){
   const walker=document.createTreeWalker(label,NodeFilter.SHOW_TEXT);
   while(walker.nextNode()){
    const text=walker.currentNode;if(!text.textContent?.trim())continue;
    const range=document.createRange();range.selectNodeContents(text);
    for(const r of range.getClientRects()){
     if(r.width<=0||r.height<=0)continue;const id=[r.x,r.y,r.width,r.height].map(n=>n.toFixed(1)).join(',');if(seen.has(id))continue;seen.add(id);
     mask.rect(r.x-.5,r.y-.5,r.width+1,r.height+1);
    }
   }
  }
  textMasks.set(key,mask);
 }
 c.clip(mask,'evenodd');
}
export function drawFrame(c:CanvasRenderingContext2D,source:Surface,target:Surface,assets:Assets,v:Variant,ms:number,reduced=false){
 // Multiply is a DOM blend against the actual illustration/board beneath the
 // transparent canvas. A keeps its unchanged normal slash compositing.
 const blend=v===2?'multiply':'normal';
 for(const layer of [source.canvas,target.canvas,c.canvas])if(layer.style.mixBlendMode!==blend)layer.style.mixBlendMode=blend;
 clear(source);clear(target);const dpr=Math.min(devicePixelRatio||1,2);c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,innerWidth,innerHeight);
 if(ms<=0)return;
 if(v===1)sourceBow(source,assets,ms,reduced);else sourceCanopy(source,ms);
 const a=v===1?artPoint(source,...registration.grip):artPoint(source,...registration.canopy),b=artPoint(target,.5,.47),r=source.node.getBoundingClientRect();
 if(!reduced){c.save();protectCardInformation(c,source.canvas);if(v===1)slash(c,a,b,r.width,ms);else travellingCanopy(c,a,b,r.width,r.height,ms);c.restore();}
 // Contact material stays in the actual target node throughout shared mdie.
 targetCut(target,ms,v,Math.atan2(b.y-a.y,b.x-a.x));
}

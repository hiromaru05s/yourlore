import {pose,baselinePose,vi,clamp,ease,mix,isBuff,isDebuff,isStat,statKind,type Kind,type Variant,type Rect} from './catalog';
import {chevron,ongoingFilter} from './renderer';
export type Point=[number,number];
export function placement(r:Rect,x=r.x,y=r.y,angle=0,scale=1,z=0,rock=0){
 const base=r.matrix??new DOMMatrix().translate(r.x-r.w/2,r.y-r.h/2);
 return new DOMMatrix().translateSelf(x,y).rotateSelf(0,0,angle).scaleSelf(scale).translateSelf(-r.x,-r.y).multiplySelf(base).translateSelf(r.w/2,r.h/2,z).rotateAxisAngleSelf(1,0,0,rock).translateSelf(-r.w/2,-r.h/2);
}
export function corners(m:DOMMatrix,w:number,h:number,poly:Point[]=[[0,0],[1,0],[1,1],[0,1]]):Point[]{return poly.map(([a,b])=>{const p=m.transformPoint(new DOMPoint(a*w,b*h));return[p.x/p.w,p.y/p.w];});}
export class Actor{
 private surfaceDirty=false;
 private readonly frame:HTMLElement|null;
 private readonly art:HTMLElement|null;
 private readonly badges:Map<string,{badge:HTMLElement;value:HTMLElement}>;
 private readonly styled=new WeakMap<HTMLElement,string>();
 readonly el:HTMLElement;readonly surface:HTMLCanvasElement;readonly pieces:HTMLElement[]=[];readonly polygons:Point[][]=[];stats?:Partial<Record<'atk'|'def',{from:number;to:number}>>;masks:Point[][]=[];matrix=new DOMMatrix();
 constructor(source:HTMLElement,readonly root:HTMLElement){
  this.el=source.cloneNode(true) as HTMLElement;this.el.removeAttribute('id');this.el.removeAttribute('data-uid');this.el.classList.remove('can-attack','ready','exhausted','summon-in','is-attacker','is-exhausted','is-targetable','monster-blocked');this.el.classList.add('duet-card');root.append(this.el);
  this.frame=this.el.querySelector('.card-frame');this.art=this.el.querySelector('.card-art');this.badges=new Map();
  for(const key of ['atk','def']){const badge=this.el.querySelector<HTMLElement>('.ad-'+key),value=badge?.querySelector<HTMLElement>('.seal-value');if(badge&&value)this.badges.set(key,{badge,value});}
  this.surface=document.createElement('canvas');this.surface.width=this.surface.height=1;this.surface.className='stat-surface';this.surface.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:4;pointer-events:none';this.el.append(this.surface);
  const xs=[0,.47,1],ys=[0,.21,.53,.77,1];
  for(let y=0;y<4;y++)for(let x=0;x<2;x++)for(let tri=0;tri<2;tri++){
   const p0:Point=[xs[x]+(x===1?(y%2?.07:-.025):0),ys[y]],p1:Point=[xs[x+1]+(x===0?(y%2?.07:-.025):0),ys[y]],p2:Point=[xs[x+1]+(x===0?((y+1)%2?.07:-.025):0),ys[y+1]],p3:Point=[xs[x]+(x===1?((y+1)%2?.07:-.025):0),ys[y+1]];this.polygons.push(tri?[p0,p2,p3]:[p0,p1,p2]);
  }
  for(const img of this.el.querySelectorAll('img')){const done=()=>{img.classList.add('art-loaded');img.parentElement?.classList.add('art-done');};if(img.complete&&img.naturalWidth)done();else img.addEventListener('load',done,{once:true});}this.hide();
 }
 style(n:HTMLElement,r:Rect,x:number,y:number,angle:number,scale:number,z=0,rock=0){
  const m=placement(r,x,y,angle,scale,z,rock),size=`${r.w}/${r.h}`;
  if(this.styled.get(n)!==size){this.styled.set(n,size);n.style.cssText=`position:absolute!important;left:0!important;top:0!important;width:${r.w}px!important;height:${r.h}px!important;--cw:${r.w}px;--ch:${r.h}px;--field-card-size:${r.w}px;margin:0!important;transform:${m.toString()}!important;transform-origin:0 0!important;transition:none!important;animation:none!important;pointer-events:none!important;z-index:2;filter:none!important;box-shadow:none!important;`;}else{n.style.setProperty('transform',m.toString(),'important');n.style.setProperty('filter','none','important');}return m;
 }
 paint(k:Kind,v:Variant,t:number,r:Rect,target:Rect,reduced:boolean,active=true,side=1,destination?:Rect){
  this.masks=[];this.pieces.forEach(n=>n.style.display='none');const p=pose(k,v,t,r,target,reduced,active,side);
  this.matrix=this.style(this.el,r,p.x,p.y,p.angle,p.scale,p.z,p.rock);this.el.style.display='block';
  this.el.style.setProperty('filter',`grayscale(${1-p.saturation}) brightness(${p.brightness})${p.edge&&!isDebuff(k)?` drop-shadow(0 0 ${r.w*.019*p.edge}px ${k==='aura'?'#6afbe0':isBuff(k)?'#67cfff':'#fff0bc'})`:''}`,'important');
  if(k==='aura'&&active)this.el.style.setProperty('filter',ongoingFilter(v,t,reduced),'important');
  if(k==='ready'){const b=reduced?.5:.5-.5*Math.cos(t*4*Math.PI);this.el.style.setProperty('filter',`drop-shadow(0 2px 4px #0009) drop-shadow(0 0 ${4+5*b}px rgba(255,122,77,${.4+.6*b}))`,'important');}
  const frame=this.frame,art=this.art;
  if(frame){frame.style.filter=k==='trigger'?`url(#celestial-matte) brightness(${1+p.edge*.45})`:isBuff(k)?`url(#celestial-matte) brightness(${1+p.edge*.12}) drop-shadow(0 0 2px #56c8ff)`:'';frame.style.transform=isBuff(k)?`scale(${1+p.edge*.025})`:'';}
  if(art)art.style.filter=k==='trigger'?`brightness(${1-p.edge*.12}) contrast(${1+p.edge*.12})`:'';
  for(const key of ['atk','def']){const parts=this.badges.get(key);if(!parts)continue;const {badge,value:val}=parts;const sk=statKind(k),change=this.stats?.[key as 'atk'|'def'],selected=isStat(k)&&(sk==='both'||sk==='atk'&&key==='atk'||sk==='hp'&&key==='def');if(change)val.textContent=String(t>=.46||reduced?change.to:change.from);badge.style.filter=selected?`brightness(${1+p.edge*.45})`:'';badge.style.transform=selected?`scale(${1+p.edge*.10})`:'';}
  this.drawSurface(k,v,t,r,reduced,active);
  if(k==='destroy'){
   if(!destination)throw Error('Destruction requires a visible destination');
   if(reduced||t>=1){this.el.style.display='none';if(v==='A'){this.matrix=this.style(this.el,destination,destination.x,destination.y,0,1);this.el.style.display='block';this.masks=[corners(this.matrix,destination.w,destination.h)];}return;}
   if(t>.03){this.el.style.display='none';this.shatter(v,t,r,destination);return;}
  }
  this.masks=[corners(this.matrix,r.w,r.h)];
 }
 drawSurface(k:Kind,v:Variant,t:number,r:Rect,reduced:boolean,_active:boolean){
  const drawing=isStat(k)&&!reduced&&t>.18&&t<.86;
  if(!drawing&&!this.surfaceDirty)return;
  this.surfaceDirty=drawing;
  const dpr=Math.min(devicePixelRatio,2);const w=Math.round(r.w*dpr),h=Math.round(r.h*dpr);if(this.surface.width!==w||this.surface.height!==h){this.surface.width=w;this.surface.height=h;}const c=this.surface.getContext('2d')!;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,r.w,r.h);
  if(k==='aura')return; // The state lives only on the card silhouette; no added surface icon.
  if(!isStat(k)||reduced||t<=.18||t>=.86)return;
  c.save();c.beginPath();c.rect(r.w*.13,r.h*.25,r.w*.74,r.h*.49);c.clip();
  const sk=statKind(k),down=isDebuff(k),n=vi(v)+1,colors=sk==='both'?[false,true]:[sk==='hp'];
  for(const red of colors)for(let i=0;i<n;i++){const q=(t-.21-i*.085)/(.48-i*.03),x=r.w*(sk==='both'?(red?.68:.32):.5),y=r.h*(down?.30+.38*ease(0,1,q):.71-.38*ease(0,1,q));chevron(c,x,y,r.w*(sk==='both'?.28:.40),q,red,down?Math.PI:0);}
  c.restore();
 }
 shatter(v:Variant,t:number,r:Rect,dest:Rect){
  if(!this.pieces.length)for(let i=0;i<this.polygons.length;i++){const n=this.el.cloneNode(true) as HTMLElement;n.querySelector('.stat-surface')?.remove();for(const child of n.querySelectorAll<HTMLElement>('.card-art,.card-frame,.ad-atk,.ad-def')){child.style.filter='';child.style.transform='';}const coat=document.createElement('div');coat.className='inkcoat';coat.style.cssText='position:absolute;inset:0;background:#79509d;mix-blend-mode:color;z-index:20;opacity:0';n.append(coat);n.classList.add('duet-fragment');this.root.append(n);this.pieces.push(n);}
  for(let i=0;i<16;i++){
   const n=this.pieces[i],delay=(i%5)*.012,split=clamp((t-.03-delay)/.22),flight=ease(.20+i*.003,.91,t),sgn=Math.floor(i/2)%2?1:-1;
   // Same approved A fracture velocities; transport catches each piece before it disappears.
   const spread=sgn*r.w*.26*(.55+i%4*.22)*ease(0,.8,split),fall=r.h*split*split*.19,curve=Math.sin(flight*Math.PI)*r.w*(.20+(i%3)*.07);
   const x=mix(r.x+spread,dest.x,flight),y=mix(r.y+fall,dest.y,flight)-curve;
   const scale=mix(1,dest.w/r.w,flight)*(v==='B'?1-ease(.76,.99,t):1),angle=sgn*split*25*(.55+i%5*.19)*(1-flight);
   let m=this.style(n,r,x,y,angle,scale);if(v==='A'&&flight>.7){const destM=placement(dest).scale(dest.w/r.w,dest.h/r.h),blend=ease(.7,1,flight),a=m.toFloat64Array(),b=destM.toFloat64Array();m=new DOMMatrix(Array.from(a,(value,j)=>mix(value,b[j],blend)));n.style.setProperty('transform',m.toString(),'important');}n.style.display=scale<.001?'none':'block';n.style.clipPath=`polygon(${this.polygons[i].map(([a,b])=>`${a*100}% ${b*100}%`).join(',')})`;
   (n.querySelector('.inkcoat') as HTMLElement).style.opacity=String(v==='B'?ease(.25,.62,t):0);
   if(v==='B')n.style.setProperty('filter',`brightness(${1-ease(.35,.79,t)*.55})`,'important');
   this.masks.push(corners(m,r.w,r.h,this.polygons[i]));
  }
 }
 baseline(k:'summon'|'attack',ms:number,r:Rect,target:Rect){this.hide();const p=baselinePose(k,ms,r,target);this.matrix=this.style(this.el,r,p.x,p.y,p.angle,p.scale);this.el.style.display='block';this.masks=[corners(this.matrix,r.w,r.h)];}
 hide(){if(this.el.style.display!=='none')this.el.style.display='none';this.pieces.forEach(n=>{if(n.style.display!=='none')n.style.display='none';});this.masks=[];}
 dispose(){this.el.remove();this.pieces.forEach(n=>n.remove());}
}

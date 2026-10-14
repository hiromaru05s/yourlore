import {boardPoint} from '../boardProjection';
import {readingScale} from '../readingBoardLayout';
type Control={time:number;level:number;reduced:boolean};
const TAU=Math.PI*2;
const fract=(n:number)=>n-Math.floor(n);
const rand=(n:number)=>fract(Math.sin(n*127.1+74.7)*43758.5453123);
export async function frameMasks(){const masks:HTMLCanvasElement[]=[];for(const name of ['attack','health']){const img=new Image();img.src=`/art/biblion/modular/${name}-ui.webp`;await img.decode();const c=document.createElement('canvas');c.width=c.height=192;const x=c.getContext('2d')!;x.drawImage(img,0,0,192,192);const p=x.getImageData(0,0,192,192);for(let i=0;i<p.data.length;i+=4){const r=p.data[i]/255,g=p.data[i+1]/255,b=p.data[i+2]/255,lum=.2126*r+.7152*g+.0722*b;const a=Math.max(0,Math.min(1,(lum-.20)*5))*Math.max(0,Math.min(1,(Math.min(r,g)-.14)*7));p.data[i]=p.data[i+1]=p.data[i+2]=255;p.data[i+3]*=a;}x.putImageData(p,0,0);masks.push(c);}return masks;}
export class PersistentLight {
 readonly canvas=document.createElement('canvas');private ctx:CanvasRenderingContext2D;private icons:HTMLCanvasElement[]=[];private surfaces:HTMLCanvasElement[]=[];private paint=document.createElement('canvas');private lastSize='';private live=false;private disposed=false;
 constructor(readonly root:HTMLElement,readonly masks:HTMLCanvasElement[]){this.canvas.dataset.trickSurface='true';this.canvas.setAttribute('aria-hidden','true');this.canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:170;pointer-events:none';document.body.append(this.canvas);this.ctx=this.canvas.getContext('2d')!;this.paint.width=this.paint.height=192;for(let i=0;i<2;i++){const s=document.createElement('canvas');s.width=s.height=240;this.surfaces.push(s);} }
 bind(cards:HTMLElement[]){
  const targets=new Set(cards.flatMap(card=>[...card.querySelectorAll<HTMLElement>('.ad-atk,.ad-def')]));
  this.icons=this.icons.filter(c=>{if(c.parentElement&&targets.has(c.parentElement))return true;c.parentElement?.classList.remove('trick-illuminated');c.remove();return false;});
  for(const el of targets){if(this.icons.some(c=>c.parentElement===el))continue;
   // Actors clone the DOM but canvas pixels are not cloned. Adopt and paint their canvas too.
   let c=el.querySelector<HTMLCanvasElement>('[data-trick-rim]');
   if(!c){c=document.createElement('canvas');c.width=c.height=240;c.dataset.trickRim=el.classList.contains('ad-atk')?'0':'1';c.style.cssText='position:absolute;width:125%;height:125%;left:-12.5%;top:-12.5%;z-index:1;pointer-events:none';el.append(c);}
   if(!el.classList.contains('trick-illuminated'))el.classList.add('trick-illuminated');this.icons.push(c);
  }
 }
 private clearIcons(){for(const c of this.icons){c.parentElement?.classList.remove('trick-illuminated');c.remove();}this.icons=[];}
 draw(o:Control){if(this.disposed)return;const w=innerWidth,h=innerHeight,d=Math.min(devicePixelRatio,1.5);if(this.lastSize!==`${w}:${h}:${d}`){this.lastSize=`${w}:${h}:${d}`;this.canvas.width=Math.round(w*d);this.canvas.height=Math.round(h*d);}const c=this.ctx;c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);this.live=o.level>0;if(!this.live){this.icons.forEach(i=>i.getContext('2d')!.clearRect(0,0,240,240));return;}
 const t=o.reduced?1:o.time/1000,level=o.level,s=readingScale(),cx=w/2,cy=h/2;
 const point=(x:number,y:number)=>boardPoint(cx+x*s,cy+y*s,.005*s);
 // Project a rounded tabletop boundary through the same lens as the actual board.
 const outline=new Path2D();for(let k=0;k<4;k++){const ax=k===0||k===3?-.702:.702,ay=k<2?-.327:.327;for(let j=0;j<=10;j++){const a=([Math.PI,Math.PI*1.5,0,Math.PI*.5][k])+j/10*Math.PI/2;const p=point(ax+Math.cos(a)*.05,ay+Math.sin(a)*.05);if(k===0&&j===0)outline.moveTo(p.x,p.y);else outline.lineTo(p.x,p.y);}}outline.closePath();c.save();c.clip(outline);
 // White stone needs a coloured edge around a bright core; white-on-white pinpoints disappear.
 const px=Math.max(.52,s/850);
 const glint=(x:number,y:number,r:number,a:number,rotation=0,rose=false)=>{
  const p=point(x,y),colour=rose?'172,91,177':'75,125,209';
  c.save();c.translate(p.x,p.y);c.rotate(rotation);c.scale(1,.84);
  const halo=c.createRadialGradient(0,0,r*.25,0,0,r*2.6);
  halo.addColorStop(0,`rgba(${colour},${a*.34})`);halo.addColorStop(.4,`rgba(${colour},${a*.17})`);halo.addColorStop(1,`rgba(${colour},0)`);
  c.fillStyle=halo;c.fillRect(-r*2.6,-r*2.6,r*5.2,r*5.2);
  c.beginPath();c.moveTo(0,-r);c.quadraticCurveTo(r*.17,-r*.17,r*.78,0);c.quadraticCurveTo(r*.17,r*.17,0,r);c.quadraticCurveTo(-r*.17,r*.17,-r*.78,0);c.quadraticCurveTo(-r*.17,-r*.17,0,-r);
  c.fillStyle=`rgba(239,246,255,${a*.94})`;c.fill();c.strokeStyle=`rgba(${colour},${a*.58})`;c.lineWidth=Math.max(.55,px*.8);c.stroke();
  c.fillStyle=`rgba(255,255,255,${a})`;c.beginPath();c.ellipse(0,0,Math.max(.5,r*.17),Math.max(.6,r*.2),0,0,TAU);c.fill();c.restore();
 };
  // A moving field of silver flecks with short, tapered reflections attached to the bright flecks.
  for(let i=0;i<110;i++){
   const x=-.78+fract(rand(i)+t*.012)*1.56,y=-.39+fract(rand(i+280)+t*.006)*.78;
   const pulse=Math.pow(.5+.5*Math.sin(t*(.95+rand(i+610)*.5)+rand(i+41)*TAU),3);
   const radius=px*(2.2+rand(i+33)*4.5)*(.68+pulse*.45),alpha=level*(.16+.79*pulse);
   if(pulse>.12){const head=point(x,y),tail=point(x-.016-pulse*.012,y-.006-pulse*.005);const g=c.createLinearGradient(tail.x,tail.y,head.x,head.y);g.addColorStop(0,'rgba(113,149,223,0)');g.addColorStop(.7,`rgba(118,151,225,${level*pulse*.25})`);g.addColorStop(1,`rgba(244,247,255,${level*pulse*.64})`);c.strokeStyle=g;c.lineWidth=Math.max(.7,px*1.7);c.beginPath();c.moveTo(tail.x,tail.y);c.lineTo(head.x,head.y);c.stroke();}
   glint(x,y,radius,alpha,.22,i%5===0);
  }
 c.restore();
 // Light belongs to the exposed board material: erase it over cards, fixtures and UI.
 c.save();c.globalCompositeOperation='destination-out';c.fillStyle='#000';for(const el of this.root.querySelectorAll<HTMLElement>('.card,.pt-ring,.pt-vitals,.pt-mana,.pile,.rift-button,.mid-aside,.market-counter')){const r=el.getBoundingClientRect();if(r.width>0&&r.height>0)c.fillRect(r.x-1,r.y-1,r.width+2,r.height+2);}c.restore();
 for(let kind=0;kind<2;kind++){const p=this.paint.getContext('2d')!;p.clearRect(0,0,192,192);const angle=t*.25+(kind?Math.PI:0),gradient=p.createConicGradient(angle,96,96);const stops=['#55b7ff','#8891f4','#f56988','#cd91df','#55b7ff'];stops.forEach((col,i)=>gradient.addColorStop(i/4,col));p.fillStyle=gradient;p.fillRect(0,0,192,192);p.globalCompositeOperation='destination-in';p.drawImage(this.masks[kind],0,0);p.globalCompositeOperation='source-over';const out=this.surfaces[kind].getContext('2d')!;out.clearRect(0,0,240,240);const breath=.83;out.globalAlpha=level*breath;out.filter='blur(7px)';out.drawImage(this.paint,24,24);out.filter='blur(2px)';out.globalAlpha=level*.65;out.drawImage(this.paint,24,24);out.filter='none';out.globalAlpha=level*.76;out.drawImage(this.paint,24,24);out.globalAlpha=1;}
 for(const icon of this.icons){const x=icon.getContext('2d')!;x.clearRect(0,0,240,240);x.drawImage(this.surfaces[Number(icon.dataset.trickRim)],0,0);}
 }
 clear(){this.live=false;this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);for(const c of this.icons)c.getContext('2d')!.clearRect(0,0,240,240);}
 get state(){return {live:this.live,icons:this.icons.length,disposed:this.disposed};}
 dispose(){if(this.disposed)return;this.disposed=true;this.clear();this.clearIcons();this.canvas.remove();}
}

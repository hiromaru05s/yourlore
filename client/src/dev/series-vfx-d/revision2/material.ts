import fungusUrl from './assets/fungal-invasion-r2.png';
import rustUrl from './assets/rust-scar-r2.png';
export const SIZE=512;
export const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
const make=()=>Object.assign(document.createElement('canvas'),{width:SIZE,height:SIZE});
const images=[new Image(),new Image()];images[0].src=fungusUrl;images[1].src=rustUrl;
export const ready=Promise.all(images.map(i=>i.decode()));
const base=make(),layer=make(),mask=make(),bed=make();
const thresholds=new Float32Array(SIZE*SIZE);
// Fixed spatial growth field: broad advancing lobes, never animated noise.
for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
 const nx=x/SIZE,ny=y/SIZE;
 const n=Math.sin(nx*17+ny*9)*.042+Math.sin(nx*39-ny*21)*.017+Math.sin(nx*87+ny*65)*.006;
 thresholds[y*SIZE+x]=Math.max(0,Math.min(1,(nx*.53+(1-ny)*.66-.10+n)));
}
function maskAt(progress:number){const c=mask.getContext('2d')!,d=c.createImageData(SIZE,SIZE);for(let i=0;i<thresholds.length;i++){const a=smooth(thresholds[i]-.055,thresholds[i]+.035,progress);d.data[i*4]=255;d.data[i*4+1]=255;d.data[i*4+2]=255;d.data[i*4+3]=a*255;}c.putImageData(d,0,0);return mask;}
export function paint(canvas:HTMLCanvasElement,variant:number,ms:number){
 const c=canvas.getContext('2d')!;c.clearRect(0,0,SIZE,SIZE);
 const first=variant===1?.31:.43,second=variant===1?.65:.67;
 const p=ms<2100?first*smooth(850,1530,ms):ms<4100?first+(second-first)*smooth(2450,3300,ms):second+(.9-second)*smooth(4150,4540,ms);
 // Leave attached corrosion visible until the native card destruction hides its node.
 const breaking=smooth(4680,5180,ms);if(p<=0)return;
 const b=base.getContext('2d')!;b.clearRect(0,0,SIZE,SIZE);b.drawImage(images[variant-1],0,0,SIZE,SIZE);b.globalCompositeOperation='destination-in';b.drawImage(maskAt(p),0,0);b.globalCompositeOperation='source-over';
 const bc=bed.getContext('2d')!;bc.clearRect(0,0,SIZE,SIZE);bc.drawImage(images[variant-1],0,0,SIZE,SIZE);bc.globalCompositeOperation='destination-in';bc.drawImage(maskAt(Math.min(1,p+.055)),0,0);bc.globalCompositeOperation='source-in';bc.fillStyle='#201b14';bc.fillRect(0,0,SIZE,SIZE);bc.globalCompositeOperation='source-over';
 c.save();
 // Full card area is never replaced: this material occupies an offset art-window patch.
 if(variant===1){
  const breathe=smooth(4150,4520,ms)*(1-smooth(4720,5050,ms));
  c.translate(22,143);c.scale(.66,.62);c.save();c.globalAlpha=.52;c.drawImage(bed,-3,3);c.restore();
  c.save();c.shadowColor='#171c16';c.shadowBlur=5;c.shadowOffsetY=5;c.drawImage(base,0,0);c.restore();
  // Pull attached growth toward the rooted lower-left only once destruction is confirmed.
  if(breaking>0){c.clearRect(-30,-30,580,600);c.save();c.globalAlpha=.52;c.drawImage(bed,-3,3);c.restore();c.translate(22*breaking,57*breaking);c.transform(1-breaking*.1,0,-breaking*.18,1-breaking*.32,0,0);}
  c.drawImage(base,0,0);
  if(breathe>0){const l=layer.getContext('2d')!;l.clearRect(0,0,SIZE,SIZE);l.drawImage(base,0,0);l.globalCompositeOperation='source-atop';l.fillStyle=`rgba(118,219,199,${breathe*.13})`;l.fillRect(0,0,SIZE,SIZE);l.globalCompositeOperation='source-over';c.drawImage(layer,0,0);}
 }else{
  c.translate(0,140);c.scale(.70,.65);c.save();c.globalAlpha=.62;c.drawImage(bed,-3,4);c.restore();c.save();c.shadowColor='#211409';c.shadowBlur=7;c.shadowOffsetY=3;c.drawImage(base,0,0);c.restore();
  // Three authored lamellar regions follow the generated rind's actual broad folds.
  const shapes=[['M 265 0 L 512 0 L 512 210 C 365 180 325 178 265 270 Z',345,167],['M 143 243 C 197 170 320 151 360 190 L 260 352 L 115 357 Z',185,310],['M 0 331 C 76 285 133 268 181 312 L 229 405 L 138 512 L 0 512 Z',68,439]] as const;
  for(let i=0;i<shapes.length;i++){const [path,px,py]=shapes[i],lift=smooth(4320+i*100,4970+i*70,ms);if(!lift)continue;c.save();c.clip(new Path2D(path));c.globalAlpha=lift*.8;c.drawImage(bed,0,0);c.restore();c.save();c.translate(px+lift*(i===1?-21:16),py-lift*(12+i*5)+breaking*32);c.rotate(lift*(i===1?-.20:.15));c.scale(1,1-lift*.22);c.translate(-px,-py);c.shadowColor='#100f0bdd';c.shadowBlur=10*lift;c.shadowOffsetY=9*lift;c.clip(new Path2D(path));c.drawImage(base,0,0);c.restore();}
 }
 c.restore();
}

import {clamp,hash} from './catalog';
/** Artwork-derived edge light stays in the card's own transformed plane. */
export class CardMaterial {
 readonly canvas=document.createElement('canvas');private mask=document.createElement('canvas');private c:CanvasRenderingContext2D;
 constructor(readonly el:HTMLElement){const art=el.querySelector<HTMLElement>('.card-art')??el;this.canvas.className='element-surface';this.canvas.width=256;this.canvas.height=300;this.mask.width=256;this.mask.height=300;art.append(this.canvas);this.c=this.canvas.getContext('2d')!;
  const img=art.querySelector<HTMLImageElement>('img');if(img?.complete&&img.naturalWidth){const mc=this.mask.getContext('2d')!;const scale=Math.max(256/img.naturalWidth,300/img.naturalHeight);mc.drawImage(img,(256-img.naturalWidth*scale)/2,(300-img.naturalHeight*scale)*.22,img.naturalWidth*scale,img.naturalHeight*scale);const data=mc.getImageData(0,0,256,300),out=mc.createImageData(256,300);for(let y=1;y<299;y++)for(let x=1;x<255;x++){const i=(y*256+x)*4,l=(k:number)=>(data.data[k]*.3+data.data[k+1]*.59+data.data[k+2]*.11);const edge=Math.abs(l(i-4)-l(i+4))+Math.abs(l(i-1024)-l(i+1024));out.data[i]=255;out.data[i+1]=205;out.data[i+2]=140;out.data[i+3]=Math.min(220,edge*2.8)}mc.putImageData(out,0,0)}
 }
 paint(t:number,heat:number,kind:string,damage=0){const c=this.c;c.clearRect(0,0,256,300);heat=clamp(heat);if(heat<=0&&damage<=0)return;c.save();
  if(heat>0){c.globalAlpha=heat*.8;c.drawImage(this.mask,0,0);c.globalCompositeOperation='source-in';const g=c.createLinearGradient(0,300,256,0);const cool=kind==='lightning',red=kind==='berserk';g.addColorStop(0,cool?'#4e47bd':red?'#69152e':'#a52d10');g.addColorStop(.48,cool?'#8f9bff':red?'#ee637d':'#ff8c22');g.addColorStop(.65,'#fff3d7');g.addColorStop(1,cool?'#8090ff':'#e05017');c.fillStyle=g;c.fillRect(0,0,256,300);c.globalCompositeOperation='source-over';
   const scan=(t*.14)%440-70;c.globalAlpha=heat*.21;const band=c.createLinearGradient(0,scan-40,0,scan+40);band.addColorStop(0,'#ffab5200');band.addColorStop(.5,cool?'#b0b8ff':'#ffd68c');band.addColorStop(1,'#ffab5200');c.fillStyle=band;c.fillRect(0,0,256,300);
   c.globalAlpha=heat*.5;c.strokeStyle=cool?'#d0d8ff':red?'#fa919d':'#ffc489';c.lineWidth=.7;for(let j=0;j<9;j++){const x=30+hash(j+60)*196,y=40+hash(j+8)*220;c.beginPath();c.moveTo(x,y+22);c.lineTo(x+7*Math.sin(j+t*.002),y);c.lineTo(x+13,y-8);c.stroke()}
  }
  if(damage>0){c.globalAlpha=damage*.5;c.globalCompositeOperation='multiply';const g=c.createRadialGradient(128,140,4,128,140,135);g.addColorStop(0,'#39211c');g.addColorStop(.4,'#785347');g.addColorStop(1,'#ffffff');c.fillStyle=g;c.fillRect(0,0,256,300)}c.restore();
 }
 dispose(){this.canvas.remove()}
}

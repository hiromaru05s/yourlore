import {captureCardSurface,captureCardBack,CARD_PADDING} from '../cardSurface';
import {FRAME_BACK} from '../../shared/cards';
function url(node:Element){return /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(node).backgroundImage)?.[1];}
async function load(src:string){const img=new Image();img.src=src;await img.decode();return img;}
/** Capture only the published face. A set trap keeps the native generic seal or sleeve; its identity is never read. */
export async function originSurface(node:HTMLElement,kind:'monster'|'trap'|'enchant'):Promise<HTMLCanvasElement>{
 const r=node.getBoundingClientRect();
 if(node.classList.contains('card')){
  const sleeve=url(node.querySelector('.card-back')??node)||FRAME_BACK;
  const result=kind==='trap'?await captureCardBack(sleeve,r.height/r.width):await captureCardSurface(node,FRAME_BACK,true,false);
  const face=kind==='trap'?result.back:result.face;if(!face)throw Error('Origin rite surface unavailable');
  const pad=face.width*CARD_PADDING/(1+2*CARD_PADDING),out=document.createElement('canvas');out.width=512;out.height=Math.round(512*r.height/r.width);
  out.getContext('2d')!.drawImage(face,pad,pad,face.width-2*pad,face.height-2*pad,0,0,out.width,out.height);return out;
 }
 // Enchantments are the native small public tile, not a replacement full-sized card.
 const out=document.createElement('canvas');out.width=512;out.height=Math.round(512*r.height/r.width);const c=out.getContext('2d')!;
 const frame=node.querySelector('.buff-frame'),art=node.querySelector('.buff-art');if(!frame||!art)throw Error('Missing origin target tile');
 const fr=url(frame),ar=url(art);if(!fr||!ar)throw Error('Missing origin target art');
 const [f,a]=await Promise.all([load(fr),load(ar)]);
 c.drawImage(f,0,0,out.width,out.height);
 const pixels=c.getImageData(0,0,out.width,out.height);for(let i=0;i<pixels.data.length;i+=4)pixels.data[i+3]*=Math.max(0,Math.min(1,(pixels.data[i]+pixels.data[i+1]+pixels.data[i+2])/255*10-.65));c.putImageData(pixels,0,0);
 c.save();const shape=document.querySelector(kind==='trap'?'#celestial-field-trap path':'#celestial-field-spell path')?.getAttribute('d');if(shape){c.scale(out.width,out.height);c.clip(new Path2D(shape));c.scale(1/out.width,1/out.height);}else{c.beginPath();c.roundRect(4,4,out.width-8,out.height-8,30);c.clip();}
 const fit=Math.max(out.width/a.width,out.height/a.height),sw=out.width/fit,sh=out.height/fit;c.drawImage(a,(a.width-sw)/2,(a.height-sh)/2,sw,sh,0,0,out.width,out.height);c.restore();
 for(const item of node.querySelectorAll<HTMLElement>('.buff-cost,.buff-turns')){const q=item.getBoundingClientRect(),style=getComputedStyle(item.querySelector('span')??item);c.fillStyle='#171f2e';c.beginPath();c.ellipse((q.x-r.x+q.width/2)*512/r.width,(q.y-r.y+q.height/2)*512/r.width,q.width*256/r.width,q.height*256/r.width,0,0,Math.PI*2);c.fill();c.font=`${style.fontWeight} ${parseFloat(style.fontSize)*512/r.width}px ${style.fontFamily}`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=style.color;c.fillText(item.textContent??'',(q.x-r.x+q.width/2)*512/r.width,(q.y-r.y+q.height/2)*512/r.width);}
 for(const img of node.querySelectorAll<HTMLImageElement>('img.buff-infinity')){await img.decode();const q=img.getBoundingClientRect();c.drawImage(img,(q.x-r.x)*512/r.width,(q.y-r.y)*512/r.width,q.width*512/r.width,q.height*512/r.width);}
 return out;
}

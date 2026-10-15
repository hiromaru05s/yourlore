import {rasterFrameMask} from './raster';
import {frameMaskOffThread} from './rasterClient';
import {CanvasTexture,LinearFilter,Texture} from 'three';

// Keep a small CPU-only cache; each scene owns and disposes its GPU texture.
// Exact stencil geometry is part of the key so transformed/resized cards cannot
// reuse a mask with a different cost seal. Idle pages retain no mask surfaces.
const surfaces=new Map<string,HTMLCanvasElement>();
let idle:ReturnType<typeof setTimeout>|undefined;
const textureFor=(canvas:HTMLCanvasElement)=>{const texture=new CanvasTexture(canvas);texture.minFilter=LinearFilter;texture.magFilter=LinearFilter;texture.generateMipmaps=false;return texture;};

/** The mask is registered to the actual raster frame, not a rounded rectangle. */
export async function makeFrameMask(card:HTMLElement):Promise<Texture>{
 const url=/url\(["']?(.*?)["']?\)/.exec(getComputedStyle(card.querySelector('.card-frame')!).backgroundImage)?.[1];
 if(!url)throw Error('Frame image missing');
 const artPath=document.querySelector('#celestial-base-spell path')?.getAttribute('d');
 const box=card.getBoundingClientRect();
 const seals=Array.from(card.querySelectorAll('.card-cost'),el=>{const b=el.getBoundingClientRect();return [(b.x-box.x)/box.width,(b.y-box.y)/box.height,b.width/box.width,b.height/box.height];});
 const key=JSON.stringify([url,artPath,seals]);
 clearTimeout(idle);idle=setTimeout(()=>surfaces.clear(),30000);
 const cached=surfaces.get(key);
 if(cached){surfaces.delete(key);surfaces.set(key,cached);return textureFor(cached);}
 const img=new Image();img.src=url;
 let timeout:ReturnType<typeof setTimeout>|undefined;
 try{await Promise.race([img.decode(),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(Error('Frame decode timeout')),2000);})]);}finally{clearTimeout(timeout);}
 let c:HTMLCanvasElement;
 try{
  const bitmap=await frameMaskOffThread(img,artPath,seals);
  c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;
  try{c.getContext('2d')!.drawImage(bitmap,0,0);}finally{bitmap.close();}
 }catch{c=rasterFrameMask(img,artPath,seals,()=>document.createElement('canvas'));}
 if(surfaces.size>=4)surfaces.delete(surfaces.keys().next().value!);
 surfaces.set(key,c);
 return textureFor(c);
}

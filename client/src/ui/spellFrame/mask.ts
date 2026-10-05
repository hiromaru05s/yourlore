import {CanvasTexture,LinearFilter,Texture} from 'three';

/** The mask is registered to the actual raster frame, not a rounded rectangle. */
export async function makeFrameMask(card:HTMLElement):Promise<Texture>{
 const url=/url\(["']?(.*?)["']?\)/.exec(getComputedStyle(card.querySelector('.card-frame')!).backgroundImage)?.[1];
 if(!url)throw Error('Frame image missing');
 const img=new Image();img.src=url;
 let timeout:ReturnType<typeof setTimeout>|undefined;
 try{await Promise.race([img.decode(),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(Error('Frame decode timeout')),2000);})]);}finally{clearTimeout(timeout);}
 const w=768,h=1200,c=document.createElement('canvas');c.width=w;c.height=h;
 const ctx=c.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(img,0,0,w,h);
 const pixels=ctx.getImageData(0,0,w,h),d=pixels.data,mask=new Float32Array(w*h);
 for(let p=0;p<mask.length;p++){
  const i=p*4,r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255;
  // Gold/silver frame, excluding the blue plaque, black exterior and art window.
  const value=Math.max(0,Math.min(1,(Math.min(r,g)-.25)/.40));
  const warm=Math.max(0,Math.min(1,(r-b+.06)*8));
  mask[p]=value*warm*d[i+3]/255;
 }
 // Preserve the exact illustration silhouette and cost seal above the frame.
 const stencil=document.createElement('canvas');stencil.width=w;stencil.height=h;
 const s=stencil.getContext('2d')!;s.fillStyle='white';
 const artPath=document.querySelector('#celestial-base-spell path')?.getAttribute('d');
 if(artPath){s.save();s.scale(w,h);s.fill(new Path2D(artPath));s.restore();}
 const box=card.getBoundingClientRect();
 for(const el of card.querySelectorAll('.card-cost')){
  const b=el.getBoundingClientRect();s.fillRect((b.x-box.x)/box.width*w,(b.y-box.y)/box.height*h,b.width/box.width*w,b.height/box.height*h);
 }
 const cut=s.getImageData(0,0,w,h).data;
 const mono=ctx.createImageData(w,h);
 for(let p=0;p<mask.length;p++){
  mask[p]*=1-cut[p*4+3]/255;
  mono.data[p*4]=mono.data[p*4+1]=mono.data[p*4+2]=Math.round(mask[p]*255);mono.data[p*4+3]=255;
 }
 ctx.putImageData(mono,0,0);
 const halo=document.createElement('canvas');halo.width=w;halo.height=h;const hc=halo.getContext('2d')!;hc.filter='blur(14px)';hc.drawImage(c,0,0);const hd=hc.getImageData(0,0,w,h).data;
 const packed=ctx.createImageData(w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const p=y*w+x,i=p*4;
  const local=(mask[y*w+Math.max(0,x-2)]+mask[y*w+Math.min(w-1,x+2)]+mask[Math.max(0,y-2)*w+x]+mask[Math.min(h-1,y+2)*w+x])*.25;
  const ridge=Math.max(0,mask[p]-local)*5;
  const lum=d[i]/255;
  const left=d[(y*w+Math.max(0,x-2))*4]/255,right=d[(y*w+Math.min(w-1,x+2))*4]/255;
  const top=d[(Math.max(0,y-2)*w+x)*4]/255,bottom=d[(Math.min(h-1,y+2)*w+x)*4]/255;
  const engraving=Math.max(0,lum-(left+right+top+bottom)*.25)*8*mask[p];
  // R: material; G: narrow bevel/ridge; B: low energy spill, all at the same UV.
  packed.data[i]=Math.round(mask[p]*255);
  packed.data[i+1]=Math.round(Math.min(1,ridge+engraving+Math.pow(lum,16)*mask[p]*.12)*255);
  packed.data[i+2]=hd[i];packed.data[i+3]=255;
 }
 ctx.putImageData(packed,0,0);
 const texture=new CanvasTexture(c);texture.minFilter=LinearFilter;texture.magFilter=LinearFilter;texture.generateMipmaps=false;
 return texture;
}

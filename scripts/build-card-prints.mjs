/** Bake the existing celestial alpha transfer once at source resolution. Runtime
 * Alpha is stored losslessly; high-quality WebP color bounds network cost.
 * SVG filters otherwise rasterize these intricate frames at tiny layout sizes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const dir='client/public/art/biblion/modular';
const names=['base-mon','base-spell','base-trap','base-quest','field-mon','field-spell','field-trap','field-quest','attack','health','cost','plaque','infinity','shield','dew'];
for(const name of names){
 const {data,info}=await sharp(path.join(dir,name+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<data.length;i+=4)data[i+3]=Math.round(data[i+3]*Math.min(1,Math.max(0,(data[i]+data[i+1]+data[i+2])/255*10-.65)));
 await sharp(data,{raw:info}).resize({width:name.startsWith('base-')?1024:name.startsWith('field-')?768:name==='plaque'?768:name==='infinity'?512:384,withoutEnlargement:true}).webp({quality:94,alphaQuality:100,smartSubsample:true,effort:6}).toFile(path.join(dir,name+'-print.webp'));
 console.log(name,info.width,info.height,(await fs.stat(path.join(dir,name+'-print.webp'))).size);
}

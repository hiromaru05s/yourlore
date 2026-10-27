// Derive display assets from the adopted deck masters. Originals stay intact.
// Run with SHARP_MODULE pointing to an installed sharp package, or npm i -D sharp.
import fs from 'node:fs/promises';
import path from 'node:path';
const {default:sharp}=await import(process.env.SHARP_MODULE||'sharp');
const root='client/public/art',report={cards:[],mattes:[]};
await fs.mkdir(root+'/deck-display-v1',{recursive:true});await fs.mkdir(root+'/deck-mattes-v1',{recursive:true});
for(const name of (await fs.readdir(root+'/deck-masters-v1')).filter(n=>n.endsWith('.webp')).sort()){
 const source=root+'/deck-masters-v1/'+name,target=root+'/deck-display-v1/'+name;
 await sharp(source).resize({width:512,withoutEnlargement:true}).webp({lossless:true,effort:6}).toFile(target);
 report.cards.push({name,sourceBytes:(await fs.stat(source)).size,displayBytes:(await fs.stat(target)).size,width:512});
}
for(const file of ['base-mon-print.webp','base-spell-print.webp','base-trap-print.webp','base-quest-print.webp','cost.png','attack.png','health.png']){
 const source=root+'/biblion/modular/'+file,target=root+'/deck-mattes-v1/'+file.replace(/\.png$/,'.webp');
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 // Match Uint8ClampedArray rounding used by the former browser pixel loop.
 const pixels=new Uint8ClampedArray(data.buffer,data.byteOffset,data.byteLength);
 for(let i=0;i<pixels.length;i+=4)pixels[i+3]*=Math.max(0,Math.min(1,(pixels[i]+pixels[i+1]+pixels[i+2])/255*10-.65));
 await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).resize({width:512,withoutEnlargement:true}).webp({lossless:true,effort:6}).toFile(target);
 report.mattes.push({file,sourceBytes:(await fs.stat(source)).size,displayBytes:(await fs.stat(target)).size,width:info.width,height:info.height});
}
const out='docs/performance/2026-10-27-startup';await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/deck-assets.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({cardSourceBytes:report.cards.reduce((n,c)=>n+c.sourceBytes,0),cardDisplayBytes:report.cards.reduce((n,c)=>n+c.displayBytes,0),matteSourceBytes:report.mattes.reduce((n,c)=>n+c.sourceBytes,0),matteDisplayBytes:report.mattes.reduce((n,c)=>n+c.displayBytes,0)}));

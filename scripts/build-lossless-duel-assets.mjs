/** Same resolution and visible RGBA as the PNG masters; no quality dial. */
import fs from 'node:fs/promises';
import sharp from 'sharp';
const paths=[...['mon','spell','quest','trap'].map(t=>`/art/biblion/modular/base-${t}.png`),...['blue','red'].map(t=>`/art/biblion/seeker-${t}.png`)];
const result=[];
for(const url of paths){
 const source='client/public'+url,target=source.replace(/\.png$/, '-lossless.webp');
 const png=await fs.readFile(source),encoded=await sharp(png).webp({lossless:true,effort:0}).toBuffer();
 const a=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(encoded).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(a.info.width!==b.info.width||a.info.height!==b.info.height)throw Error('Dimensions changed: '+url);
 let differences=0;for(let i=0;i<a.data.length;i+=4){if(a.data[i+3]!==b.data[i+3])differences++;if(a.data[i+3])for(let c=0;c<3;c++)if(a.data[i+c]!==b.data[i+c])differences++;}
 if(differences)throw Error('Visible RGBA changed: '+url);
 if(encoded.length>=png.length)throw Error('No saving: '+url);
 await fs.writeFile(target,encoded);result.push({source:url,target:target.slice('client/public'.length),width:a.info.width,height:a.info.height,before:png.length,after:encoded.length,visiblePixelDifferences:differences});console.log(result.at(-1));
}
await fs.mkdir('docs/performance/2026-10-12',{recursive:true});await fs.writeFile('docs/performance/2026-10-12/lossless-assets.json',JSON.stringify(result,null,2)+'\n');

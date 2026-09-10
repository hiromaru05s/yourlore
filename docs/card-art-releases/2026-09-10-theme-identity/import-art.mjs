/** Format conversion only: preserve the generated image's full composition. Run from repository root. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../../..');
const spec=JSON.parse(await fs.readFile(path.join(dir,'prompts.json'),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const baseline=path.join(dir,'baseline.json');
if(!await fs.stat(baseline).catch(()=>null)){
 const files={};for(const sub of ['cards','cards-sm','cards-xs'])for(const f of await fs.readdir(path.join(root,'client/public/art',sub))){if(f.endsWith('.webp')){const p=`client/public/art/${sub}/${f}`;files[p]=hash(await fs.readFile(path.join(root,p)));}}
 await fs.writeFile(baseline,JSON.stringify(files,null,2)+'\n');
}
await fs.mkdir(path.join(dir,'before'),{recursive:true});
const assets=[];
for(const job of spec.jobs){
 const resultPath=path.join(dir,'results',job.id+'.json');if(!await fs.stat(resultPath).catch(()=>null))continue;
 const a=JSON.parse(await fs.readFile(resultPath,'utf8'));const src=path.join(dir,a.file),bytes=await fs.readFile(src);if(hash(bytes)!==a.sha256)throw Error('PNG hash mismatch '+a.id);
 const before=path.join(dir,'before',a.id+'.webp');if(!await fs.stat(before).catch(()=>null))await fs.copyFile(path.join(root,'client/public/art/cards',a.id+'.webp'),before);
 const outputs=[];for(const [sub,width,quality] of [['cards',832,90],['cards-sm',384,78],['cards-xs',192,76]]){
  const relative=`client/public/art/${sub}/${a.id}.webp`,out=path.join(root,relative);
  await sharp(bytes).rotate().resize({width,withoutEnlargement:true}).webp({quality,effort:5}).toFile(out);
  const b=await fs.readFile(out),m=await sharp(b).metadata();if(m.width!==width)throw Error('width '+a.id);
  outputs.push({file:relative,width:m.width,height:m.height,sha256:hash(b),bytes:b.length});
 }
 assets.push({...a,name:job.name,theme:job.theme,number:job.number,outputs});
}
await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({date:'2026-09-10',generator:'built-in image_gen',expected:spec.jobs.length,generated:assets.length,conversion:'Preserve full aspect ratio; WebP 832/384/192 widths. No paint edits.',assets},null,2)+'\n');
console.log(JSON.stringify({imported:assets.length,variants:assets.length*3}));

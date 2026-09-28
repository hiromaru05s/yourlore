// Format conversion only. Generated illustrations are not painted or composited here.
import fs from 'node:fs/promises';import sharp from 'sharp';import {createHash} from 'node:crypto';
const dir='docs/card-rework/2026-09-29-dew-shield';const jobs=JSON.parse(await fs.readFile(dir+'/generated-art-v2.json','utf8'));const assets=[];
for(const j of jobs){const outputs=[];for(const [sub,width,height,quality] of [['cards',1472,1344,92],['cards-sm',384,351,78],['cards-xs',192,175,76]]){const file=`client/public/art/${sub}/${j.id}.webp`;await sharp(j.sourcePath).resize(width,height,{fit:'fill'}).webp({quality}).toFile(file);const bytes=await fs.readFile(file);outputs.push({file,width,height,sha256:createHash('sha256').update(bytes).digest('hex')});}assets.push({id:j.id,outputs});}
await fs.writeFile(dir+'/art-manifest.json',JSON.stringify({revision:2,generated:jobs.length,assets},null,2)+'\n');console.log('Imported',jobs.length,'revised illustrations');

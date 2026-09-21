// Package original imagegen art as small transparent PNGs; no redraw or recoloring.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
const docs='docs/ui-rework/2026-09-21-game-polish';
const {assets}=JSON.parse(await fs.readFile(docs+'/icon-prompts.json','utf8'));
const manifest=[];
for(const asset of assets){
 const file=`client/public/art/lounge/icons/v2/${asset.name}.png`;
 await sharp(asset.master).resize({width:256,withoutEnlargement:true}).png({compressionLevel:9}).toFile(file);
 const buf=await fs.readFile(file),meta=await sharp(buf).metadata(),stats=await sharp(buf).stats();
 if(!meta.hasAlpha||stats.channels[3].min!==0)throw Error('Missing transparency: '+asset.name);
 manifest.push({name:asset.name,file,master:asset.master,width:meta.width,height:meta.height,bytes:buf.length,sha256:crypto.createHash('sha256').update(buf).digest('hex'),alphaPreserved:true});
}
await fs.writeFile(docs+'/icon-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Packaged',manifest.length,'transparent PNGs:',manifest.reduce((n,x)=>n+x.bytes,0),'bytes total');

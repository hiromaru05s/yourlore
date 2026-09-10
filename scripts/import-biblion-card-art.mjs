/** Deterministic format conversion only. The generated PNG originals remain intact. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {build} from 'esbuild';
const hash=b=>createHash('sha256').update(b).digest('hex');
const root=process.cwd(),out=path.join(root,'docs/card-art-releases/2026-09-10-biblion');
const folders=['2026-09-10-biblion-full-pool','2026-09-10-biblion-starters/remaining-batch','2026-09-10-biblion-starters/revision-02'];
const starters={'attune-v2':'STARTER_MANA','cull-v2':'STARTER_TRASH','chest-v2':'STARTER_CHEST'};
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'lore-art-ids-'));
let cards;
try{await build({entryPoints:['client/src/shared/cards.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'cards.mjs')});const m=await import(pathToFileURL(path.join(temp,'cards.mjs')).href);cards=[...Object.values(m.DB),...Object.values(m.STARTERS)];}finally{await fs.rm(temp,{recursive:true,force:true});}
const mapped=new Map();
for(const folder of folders){
 const dir=path.join('docs/card-art-exploration',folder),m=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
 for(const a of m.assets){const id=starters[a.id]||a.id;if(mapped.has(id))throw Error(`Duplicate ${id}`);
  const source=path.join(dir,a.file),bytes=await fs.readFile(source);if(hash(bytes)!==a.sha256)throw Error(`Source hash changed: ${id}`);
  const meta=await sharp(bytes).metadata();if(meta.width!==a.width||meta.height!==a.height)throw Error(`Source dimensions changed: ${id}`);
  mapped.set(id,{id,source,sourceSha256:a.sha256,width:meta.width,height:meta.height});
 }
}
const live=new Set(cards.map(c=>c.id)),missing=[...live].filter(id=>!mapped.has(id)),extra=[...mapped.keys()].filter(id=>!live.has(id));
if(missing.length||extra.length)throw Error(JSON.stringify({missing,extra}));
await fs.mkdir(out,{recursive:true});
const assets=[],queue=[...mapped.values()];
const worker=async()=>{for(let a=queue.pop();a;a=queue.pop()){
 const outputs=[];
 for(const [dir,width,quality] of [['cards',832,90],['cards-sm',384,78],['cards-xs',192,76]]){
  const file=`client/public/art/${dir}/${a.id}.webp`;
  await sharp(a.source).rotate().resize({width,withoutEnlargement:true}).webp({quality,effort:5}).toFile(file);
  const b=await fs.readFile(file),meta=await sharp(b).metadata();outputs.push({file,width:meta.width,height:meta.height,bytes:b.length,sha256:hash(b)});
 }
 assets.push({...a,title:cards.find(c=>c.id===a.id).nameJa,outputs});
}};
await Promise.all(Array.from({length:4},worker));assets.sort((a,b)=>a.id.localeCompare(b.id));
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({date:'2026-09-10',count:assets.length,missing,extra,conversion:'Preserve aspect ratio and full source composition; WebP 832/384/192 px, sRGB. Existing card frame handles presentation crop.',assets},null,2));
console.log(`Imported ${assets.length} live cards, ${assets.length*3} WebP variants; all source hashes verified.`);

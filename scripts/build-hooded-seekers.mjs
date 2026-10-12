import sharp from 'sharp';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source='docs/characters/2026-10-12-faceless/source',out='client/public/art/seekers/faceless-v1';
await fs.mkdir(out,{recursive:true});
// Same scale and crop for both images. Keep the painted framing and white background.
const frames=await Promise.all(['portrait','hit'].map(name=>sharp(`${source}/${name}.png`).resize(512,512,{fit:'fill'}).removeAlpha().png().toBuffer()));
await sharp(frames[0]).webp({quality:94}).toFile(`${out}/portrait.webp`);
await sharp(frames[1]).webp({quality:94}).toFile(`${out}/hit.webp`);
await sharp({create:{width:1024,height:512,channels:3,background:'#fff'}}).composite(frames.map((input,i)=>({input,left:i*512,top:0}))).webp({quality:94}).toFile(`${out}/poses.webp`);
const assets={};for(const name of ['portrait.webp','hit.webp','poses.webp']){const b=await fs.readFile(`${out}/${name}`);assets[name]={bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};}
await fs.writeFile('docs/characters/2026-10-12-faceless/asset-hashes.json',JSON.stringify(assets,null,2)+'\n');console.log(assets);

import assert from 'node:assert/strict';import {build} from 'esbuild';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {tmpdir} from 'node:os';
const dir=await fs.mkdtemp(tmpdir()+'/lore-purchase-air-');try{
 await build({stdin:{contents:"export * from './client/src/ui/manaPurchase';export * from './client/src/ui/purchaseAir';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/fx.mjs'});
 const m=await import(dir+'/fx.mjs'),manifest=JSON.parse(await fs.readFile('client/public/vfx/purchase-air/manifest.json','utf8'));
 const sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(await fs.readFile('client/public/vfx/purchase-air/crystal-72.png')),manifest.atlas.sha256);
 const values=new Float32Array(120*76*24);let i=0;for(let f=0;f<24;f++)for(let y=0;y<76;y++)for(let x=0;x<120;x++)values[i++]=m.purchaseAirDensity(-3.9+x/119*5.5,-1.65+y/75*3.3,f/24);
 assert.equal(sha(Buffer.from(values.buffer)),manifest.airField.sha256,'all 218880 density samples match approved 03');
 assert.equal(m.PURCHASE_CRYSTAL_SCALE,1.2);assert.equal(m.MANA_PURCHASE_DURATION,.94);assert.equal(m.MANA_PURCHASE_CONTACT_MS,620);assert.equal(m.manaTravelProgress(0),0);assert.equal(m.manaTravelProgress(1),1);
 for(let i=1;i<=100;i++){assert(m.manaTravelProgress(i/100)>m.manaTravelProgress((i-1)/100));assert(m.manaTravelSpeed(i/100)>m.manaTravelSpeed((i-1)/100));}assert(m.manaTravelSpeed(1)<2);
 m.disposeManaPurchase();assert.equal(await m.prepareManaPurchase(),false,'non-browser preparation safely declines');
 console.log('PASS: approved 03 density parity (218880 samples), atlas identity, size, timing, monotonic gentle acceleration, non-browser lifecycle');
}finally{await fs.rm(dir,{recursive:true,force:true});}

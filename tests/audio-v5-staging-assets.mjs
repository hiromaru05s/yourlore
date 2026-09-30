import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const origin='https://test.yourlore.xyz',out='docs/sound-redesign/2026-09-30/staging';
const hash=b=>createHash('sha256').update(b).digest('hex');
const remote=async url=>{const response=await fetch(origin+url);assert(response.ok,url+' HTTP '+response.status);return Buffer.from(await response.arrayBuffer());};
const html=await fs.readFile('client/dist/index.html');assert.equal(hash(await remote('/')),hash(html),'entry HTML equals built file');
const assets=[...html.toString().matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)].map(x=>x[1]);
const results=[];for(const url of assets){const local=await fs.readFile('client/dist'+url),actual=hash(await remote(url));assert.equal(actual,hash(local),url);results.push({url,sha256:actual});}
const manifest=JSON.parse(await fs.readFile('client/public/sfx/lore-v5/manifest.json','utf8'));
assert.deepEqual(JSON.parse((await remote('/sfx/lore-v5/manifest.json')).toString()),manifest);
for(const [cue,clips]of Object.entries(manifest.sounds))for(const clip of clips){const actual=hash(await remote(clip.url));assert.equal(actual,clip.sha256,clip.url);results.push({cue,url:clip.url,sha256:actual,preserved:!clip.url.includes('/lore-v5/')});}
assert.equal(results.filter(x=>x.cue).length,41);assert.equal(results.filter(x=>x.preserved).length,9);
await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/assets.json',JSON.stringify({at:new Date().toISOString(),origin,source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),entrySha256:hash(html),results},null,2)+'\n');
console.log('PASS deployed entry, JS/CSS, manifest and all 41 sound hashes; nine approved recordings unchanged');

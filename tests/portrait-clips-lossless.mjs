import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const report=JSON.parse(await fs.readFile('docs/performance/2026-11-18/portrait-clips.json','utf8'));
assert.equal(report.length,22);
let frames=0;
for(const r of report){
 const old=await fs.readFile('client/public'+r.source),next=await fs.readFile('client/public'+r.url),hash=b=>createHash('sha256').update(b).digest('hex');
 assert.equal(hash(old),r.sourceSha256);assert.equal(hash(next),r.sha256);assert(next.length<old.length);
 const a=sharp(old,{animated:true}),b=sharp(next,{animated:true}),am=await a.metadata(),bm=await b.metadata();
 assert.equal(bm.format,'webp');assert.equal(bm.pages,am.pages);assert.equal(bm.loop,am.loop);assert.deepEqual(bm.delay,am.delay);assert.deepEqual(bm.delay,r.durations);
 const left=await a.ensureAlpha().raw().toBuffer({resolveWithObject:true}),right=await b.ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(left.info.width,right.info.width);assert.equal(left.info.height,right.info.height);assert.equal(left.data.length,right.data.length);
 for(let i=0;i<left.data.length;i+=4){assert.equal(right.data[i+3],left.data[i+3]);if(left.data[i+3])for(let c=0;c<3;c++)assert.equal(right.data[i+c],left.data[i+c],r.url+' visible pixels');}
 frames+=bm.pages;
}
assert.equal(frames,961);
console.log('PASS 22 portrait clips / 961 frames: identical visible RGBA, frame delays and repeat counts');

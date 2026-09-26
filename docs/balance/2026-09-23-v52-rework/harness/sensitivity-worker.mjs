import fs from 'node:fs';import readline from 'node:readline';import assert from 'node:assert/strict';
import {simulate} from './sensitivity-run.mjs';import {installClone} from './clone.mjs';installClone();
const [,,plan,out]=process.argv;
let done=0,bad=0;const t=Date.now();
// Only reuse complete JSON lines; a killed write can leave an incomplete final record.
if(fs.existsSync(out)){
 const fd=fs.openSync(out,'r+');let size=fs.fstatSync(fd).size;
 if(size){const b=Buffer.alloc(1);fs.readSync(fd,b,0,1,size-1);if(b[0]!==10){let offset=size;const block=Buffer.alloc(65536);while(offset){const n=Math.min(offset,block.length);offset-=n;fs.readSync(fd,block,0,n,offset);const last=block.subarray(0,n).lastIndexOf(10);if(last>=0){size=offset+last+1;break;}if(!offset)size=0;}fs.ftruncateSync(fd,size);}}
 fs.closeSync(fd);
 const plans=readline.createInterface({input:fs.createReadStream(plan),crlfDelay:Infinity})[Symbol.asyncIterator]();
 for await(const line of readline.createInterface({input:fs.createReadStream(out),crlfDelay:Infinity})){if(!line)continue;const r=JSON.parse(line),p=JSON.parse((await plans.next()).value);for(const k of Object.keys(p))assert.deepEqual(r[k],p[k]);done++;bad+=!r.finished;}
 await plans.return?.();
}
const resumeAt=done,fd=fs.openSync(out,'a');let i=0;
console.log(JSON.stringify({done,bad,resumed:true,seconds:0}));
for await(const line of readline.createInterface({input:fs.createReadStream(plan),crlfDelay:Infinity})){
 if(!line.trim())continue;if(i++<resumeAt)continue;
 const row=simulate(JSON.parse(line));fs.writeSync(fd,JSON.stringify(row)+'\n');done++;bad+=!row.finished;
 if(done%500===0)console.log(JSON.stringify({done,bad,seconds:(Date.now()-t)/1000}));
}
fs.closeSync(fd);console.log(JSON.stringify({done,bad,seconds:(Date.now()-t)/1000,complete:true}));

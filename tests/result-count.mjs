import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/lore-result-count-');
try{
 await build({entryPoints:['client/src/ui/resultCountSound.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/count.mjs'});
 const {countEvents,resultCountPcm}=await import(dir+'/count.mjs');
 for(const delta of [1,2,16,18,24,32,34,-1,-18,-32,0]){
  const events=countEvents(1100,1100+delta);assert.equal(events.length,Math.abs(delta));
  for(const [i,e]of events.entries()){
   const t=e.at/1.7;assert(Math.abs(t*t*(3-2*t)*Math.abs(delta)-(i+.5))<1e-6);
   if(i)assert(delta>0?e.frequency>events[i-1].frequency:e.frequency<events[i-1].frequency);
  }
  const pcm=resultCountPcm(1100,1100+delta);assert.equal(pcm[0].length,101430);
  let peak=0;for(const v of pcm[0]){assert(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));}
  assert(peak<=10**(-14/20)+1e-6);assert.equal(peak===0,delta===0);
  assert.equal(pcm[0].at(-1),0);
 }
 // Selected sample keeps the exact soft synthesis profile across preview and runtime.
 const source=await readFile('client/src/ui/resultCountSound.ts','utf8');assert(!source.includes('localStorage'));
 const short=resultCountPcm(1000,1018,44100,true);assert.equal(short[0].length,26460);
 console.log('PASS: actual deltas 0/1/2/16/18/24/32/34, both directions, count timing, finite PCM, headroom, reduced-motion confirmation.');
}finally{await rm(dir,{recursive:true,force:true});}

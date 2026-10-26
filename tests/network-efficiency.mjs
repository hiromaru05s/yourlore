import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-network-efficiency-');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
try {
 await build({stdin:{contents:`export {ReadRequests} from './client/src/net/readRequests';export * from './client/src/net/presence';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const {ReadRequests,setPresence,stopPresence}=await import(dir+'/test.mjs');
 const reads=new ReadRequests(),first=deferred();let calls=0;
 const load=()=>{calls++;return first.promise};
 const pending=[reads.get('a',load),reads.get('a',load),reads.get('a',load)];
 assert.equal(calls,1);first.resolve({nested:{value:1}});const results=await Promise.all(pending);
 results[0].nested.value=9;assert.equal(results[1].nested.value,1);
 assert.equal((await reads.get('a',async()=>({fresh:true}))).fresh,true);
 const stale=deferred(),newer=deferred();const old=reads.get('a',()=>stale.promise);reads.clear();
 const next=reads.get('a',()=>newer.promise);stale.resolve('old');assert.equal(await old,'old');
 const also=reads.get('a',()=>{throw Error('old completion erased newer request')});newer.resolve('new');assert.deepEqual(await Promise.all([next,also]),['new','new']);
 await assert.rejects(reads.get('failure',async()=>{throw Error('offline')}));assert.equal(await reads.get('failure',async()=>true),true);
 console.log('PASS concurrent GETs 3 → 1, no settled cache, mutation barrier, isolated results and failed-read retry');
 const nativeFetch=globalThis.fetch,nativeSet=setInterval,nativeClear=clearInterval;
 const intervals=new Set(),sent=[];
 globalThis.setInterval=fn=>{intervals.add(fn);return fn};globalThis.clearInterval=fn=>intervals.delete(fn);
 globalThis.fetch=(_url,opts)=>{const d=deferred();opts.signal.addEventListener('abort',()=>d.reject(new DOMException('Aborted','AbortError')),{once:true});sent.push({state:JSON.parse(opts.body).state,...d});return d.promise};
 const tick=()=>new Promise(resolve=>setImmediate(resolve));
 try {
  for(let i=0;i<7;i++)setPresence('menu');assert.equal(sent.length,1);
  setPresence('queue');setPresence('online');for(const beat of intervals)beat();assert.equal(sent.length,1,'slow requests never overlap');
  sent[0].resolve(new Response('{}'));await tick();assert.equal(sent.length,2);assert.equal(sent[1].state,'online');
  sent[1].resolve(new Response('{}'));await tick();for(const beat of intervals)beat();assert.equal(sent.length,3);
  stopPresence();setPresence('menu');await tick();assert.equal(sent.length,4,'new account lifecycle can start immediately');
  sent[3].resolve(new Response('{}'));await tick();assert.equal(sent.length,4,'old completion cannot schedule another beat');
  stopPresence();assert.equal(intervals.size,0);
 } finally {stopPresence();globalThis.fetch=nativeFetch;globalThis.setInterval=nativeSet;globalThis.clearInterval=nativeClear;}
 console.log('PASS menu heartbeats 7 → 1, in-flight serialization, newest state, periodic retry, logout cancellation');
} finally {await rm(dir,{recursive:true,force:true})}

import assert from 'node:assert/strict';import {build} from 'esbuild';import {JSDOM} from 'jsdom';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir}from'node:os';import path from'node:path';
const dom=new JSDOM('<body><div id="host"></div></body>',{url:'https://example.test'});for(const k of ['document','location','MutationObserver','HTMLImageElement'])globalThis[k]=dom.window[k];
const dir=await mkdtemp(path.join(tmpdir(),'lore-retry-')),calls=new Map();let finishSlow,cleared=0;
globalThis.Image=class{set src(v){this.url=v;if(!v)cleared++;}decode(){const n=(calls.get(this.url)||0)+1;calls.set(this.url,n);if(this.url.endsWith('flaky.png'))return n<3?Promise.reject(Error('transient')):Promise.resolve();if(this.url.endsWith('bad.png'))return Promise.reject(Error('missing'));return new Promise(r=>finishSlow=r);}};
let waiterTimeout=false;const deadlines=[];
globalThis.__deadline=(promise,ms=20000,signal)=>{
 deadlines.push(ms);
 if(ms===20000&&waiterTimeout){waiterTimeout=false;return Promise.reject(new DOMException('slow waiter','TimeoutError'));}
 return new Promise((resolve,reject)=>{const abort=()=>{signal?.removeEventListener('abort',abort);reject(new DOMException('cancel','AbortError'));};signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();promise.then(v=>{signal?.removeEventListener('abort',abort);resolve(v);},e=>{signal?.removeEventListener('abort',abort);reject(e);});});
};
const tick=()=>new Promise(r=>setTimeout(r,0));
try{
 await build({entryPoints:['client/src/ui/assetReadiness.ts'],bundle:true,platform:'node',format:'esm',loader:{'.css':'empty'},outfile:path.join(dir,'test.mjs'),plugins:[{name:'controlled-deadline',setup(b){b.onResolve({filter:/net\/deadline$/},()=>({path:'deadline',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const withDeadline=(...args)=>globalThis.__deadline(...args);'}));}}]});
 const {waitAssets,hasUnloadedAssets}=await import(path.join(dir,'test.mjs')),host=document.getElementById('host');
 await waitAssets(['/flaky.png'],host);assert.equal(calls.get('https://example.test/flaky.png'),3);assert.equal(host.querySelector('.asset-retry'),null);assert.equal(hasUnloadedAssets(['/flaky.png']),false);
 const abort=new AbortController(),failed=waitAssets(['/bad.png'],host,undefined,abort.signal);await tick();assert.equal(calls.get('https://example.test/bad.png'),3,'Retries are bounded');assert(host.querySelector('.asset-retry'));abort.abort();await failed;assert.equal(host.querySelector('.asset-retry'),null);
 waiterTimeout=true;const previous=cleared;const slow=waitAssets(['/slow.png'],host);await tick();assert.equal(calls.get('https://example.test/slow.png'),1,'Slow retry joins the existing transfer');assert.equal(cleared,previous,'Waiter timeout must not discard image bytes');finishSlow();await slow;assert.equal(hasUnloadedAssets(['/slow.png']),false);assert(deadlines.includes(60000),'Shared transfers allow 60 seconds');
 console.log('PASS: transient failures recover automatically, retries are bounded, abort releases manual retry, slow requests survive waiter timeout without restarting');
}finally{dom.window.close();await rm(dir,{recursive:true,force:true});delete globalThis.__deadline;}

import assert from 'node:assert/strict';import {build} from 'esbuild';import {mkdtemp,rm} from 'node:fs/promises';import {JSDOM} from 'jsdom';
const dir=await mkdtemp('/tmp/lore-api-recovery-'),dom=new JSDOM('',{url:'http://localhost'}),nativeFetch=globalThis.fetch;
for(const key of ['window','document','location','localStorage','sessionStorage'])globalThis[key]=dom.window[key];
try{
 await build({stdin:{contents:`export {api} from './client/src/net/api';export * from './client/src/ui/collectionPurchase';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const {api,purchaseCollection,pendingPurchase}=await import(dir+'/test.mjs');
 for(const body of ['not json','null','42','[]']){globalThis.fetch=async()=>new Response(body,{status:200});await assert.rejects(api.saveDecks({sel:0,list:[]}));}
 globalThis.fetch=async()=>new Response('unavailable',{status:503});await assert.rejects(api.saveDecks({}),e=>e.status===503);
 const ids=[];let broken=true;
 globalThis.fetch=async(_url,init)=>{const {requestId}=JSON.parse(init.body);ids.push(requestId);return Response.json(broken?{}:{receipt:{requestId,rewards:[],kind:'draw'},credits:900,starterCards:{}});};
 await assert.rejects(purchaseCollection('audit',{kind:'draw',count:1}));assert(pendingPurchase('audit'),'incomplete receipt keeps retry key');
 const recoverFetch=globalThis.fetch;globalThis.fetch=async()=>Response.json({error:'unauthorized'},{status:401});
 await assert.rejects(purchaseCollection('audit',{kind:'draw',count:1}),e=>e.status===401);assert.equal(pendingPurchase('audit').requestId,ids[0],'session expiry cannot erase an uncertain prior purchase');
 globalThis.fetch=recoverFetch;broken=false;await purchaseCollection('audit',{kind:'draw',count:1});assert.equal(ids[0],ids[1],'retry recovers the same transaction');assert.equal(pendingPurchase('audit'),null);
 console.log('PASS invalid success payloads rejected; HTTP status retained; incomplete purchases keep idempotency and recover safely');
}finally{globalThis.fetch=nativeFetch;dom.window.close();await rm(dir,{recursive:true,force:true});}

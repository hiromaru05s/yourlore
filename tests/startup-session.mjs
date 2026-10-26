import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-startup-session-');
const nativeFetch=globalThis.fetch,nativeSet=globalThis.setTimeout;
try {
 await build({entryPoints:['client/src/startupSession.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/session.mjs'});
 const {startupSession}=await import(dir+'/session.mjs');
 globalThis.location={hostname:'yourlore.xyz',pathname:'/'};
 let calls=0,signal;
 globalThis.fetch=async(_url,options)=>{calls++;signal=options.signal;assert.equal(options.credentials,'include');return Response.json({user:{id:'a'}})};
 assert.equal((await startupSession()).id,'a');assert(signal.aborted);
 globalThis.fetch=async()=>Response.json({user:null});assert.equal(await startupSession(),null);
 globalThis.fetch=async()=>Response.json({error:'outage'},{status:503});await assert.rejects(startupSession(),/unavailable/);
 globalThis.fetch=async()=>Response.json({});await assert.rejects(startupSession(),/Invalid session/);
 globalThis.setTimeout=(fn,ms,...args)=>nativeSet(fn,ms===10000?20:ms,...args);
 globalThis.fetch=async(_url,options)=>{signal=options.signal;return {ok:true,json:()=>new Promise(()=>{})}};
 await assert.rejects(startupSession(),{name:'TimeoutError'});assert(signal.aborted);
 globalThis.location.hostname='admin.yourlore.xyz';globalThis.fetch=async()=>{throw Error('Admin startup must not prefetch a game session')};assert.equal(await startupSession(),undefined);
 globalThis.location.hostname='yourlore.xyz';globalThis.location.pathname='/admin';assert.equal(await startupSession(),undefined);
 console.log('PASS early startup auth: user/null, unavailable and malformed response, stalled body deadline, no admin prefetch');
}finally{globalThis.fetch=nativeFetch;globalThis.setTimeout=nativeSet;await rm(dir,{recursive:true,force:true})}

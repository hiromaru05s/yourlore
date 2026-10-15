import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-resume-'),values=new Map();
globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
try {
 await build({entryPoints:['client/src/net/resume.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/resume.mjs'});
 const {saveActiveGame,loadActiveGame,touchActiveGame,clearActiveGame}=await import(dir+'/resume.mjs');
 saveActiveGame('room-a',0,true,'a');assert.equal(loadActiveGame('a').roomId,'room-a');touchActiveGame();assert.equal(loadActiveGame('a').ranked,true);
 assert.equal(loadActiveGame('b'),null);assert.equal(values.size,0);
 const valid={roomId:'room-a',you:1,ts:Date.now(),ranked:false};
 for(const bad of [null,{},[],{...valid,ts:undefined},{...valid,ts:Date.now()+100000},{...valid,ts:Date.now()-600000},{...valid,you:3},{...valid,you:'0'},{...valid,roomId:'a/setup'},{...valid,ranked:'false'},{...valid,userId:{}}]) {
  values.set('lore_game',JSON.stringify(bad));assert.equal(loadActiveGame('a'),null,JSON.stringify(bad));assert.equal(values.size,0);
 }
 values.set('lore_game','{');assert.equal(loadActiveGame(),null);assert.equal(values.size,0);
 // Existing same-browser records survive the upgrade; the server still checks membership.
 values.set('lore_game',JSON.stringify(valid));assert.equal(loadActiveGame('a').you,1);
 clearActiveGame();assert.equal(loadActiveGame(),null);
 console.log('PASS resume account isolation, TTL/shape validation, legacy upgrade, explicit exit');
}finally{delete globalThis.localStorage;await rm(dir,{recursive:true,force:true});}

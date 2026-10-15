import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
const dir=await mkdtemp('/tmp/lore-authority-');
try {
 await build({stdin:{contents:`export {default as worker} from './server/src/index';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const {worker}=await import(dir+'/test.mjs'),env={...rewardTestEnv(),APP_ORIGIN:'*'};
 await env.DB.prepare('INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES(?,?,?,?)').bind('audit','a',Date.now(),Date.now()+60000).run();
 const post=(path,body)=>worker.fetch(new Request('https://test.yourlore.xyz/api/'+path,{method:'POST',headers:{cookie:'lore_session=audit','content-type':'application/json'},body:JSON.stringify(body)}),env);
 for(const difficulty of ['easy','normal','hard','hell']) {
  const r=await post('track/bot',{won:true,difficulty});assert.equal(r.status,200);
  assert.equal((await r.json()).experience,null,'self-reported wins must not award EXP');
 }
 assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM matches').first()).n,0,'unverified reports cannot create match history');
 assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM experience_events').first()).n,0);
 for(const key of ['tut:1','tuto:1','tuto:10'])assert.equal((await post('rewards/claim',{key})).status,410,'retired rewards require current tutorial replay');
 assert.equal((await env.DB.prepare('SELECT credits FROM users WHERE id=?').bind('a').first()).credits,0);
 console.log('PASS no self-reported BOT EXP/history or unverified legacy tutorial payout');
} finally {await rm(dir,{recursive:true,force:true});}

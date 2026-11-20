import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {DatabaseSync} from 'node:sqlite';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-default-sleeve-');
try {
 await build({entryPoints:['server/src/social.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/social.mjs'});
 const {handleSocial}=await import(dir+'/social.mjs');
 const env={DB:{prepare(){throw Error('Unavailable sleeves must be rejected before database access');}}};
 for(const path of ['/social/me','/social/buy-sleeve','/social/buy-cosmetic']){
  const body=path==='/social/me'?{sleeve:'sleeve:gacha-elfweave'}:{id:'sleeve:gacha-elfweave'};
  const response=await handleSocial(env,new Request('https://local.test'+path,{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}}),path,{id:'test'});
  assert.equal(response.status,400,path);assert((await response.json()).error);
 }
 const db=new DatabaseSync(':memory:');db.exec(await readFile('server/schema.sql','utf8'));
 db.prepare('INSERT INTO users(id,email,password,display,created_at,credits) VALUES(?,?,?,?,?,0)').run('free','free@test.invalid','fixture','Free',Date.now());
 const sqlEnv={DB:{prepare(sql){let args=[];return {bind(...values){args=values;return this;},async first(){return db.prepare(sql).get(...args)||null;},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};}}};
 for(const id of ['sleeve:indigo-eye','default']){
  const request=new Request('https://local.test/social/me',{method:'POST',body:JSON.stringify({sleeve:id}),headers:{'Content-Type':'application/json'}});
  const response=await handleSocial(sqlEnv,request,'/social/me',{id:'free'});assert.equal(response.status,200);assert.equal((await response.json()).sleeve,id);
  assert.equal(db.prepare("SELECT credits FROM users WHERE id='free'").get().credits,0);
 }
 db.close();
 console.log('PASS: both standard sleeves equip with empty inventory/zero credits; retired sleeves rejected before DB mutation');
}finally{await rm(dir,{recursive:true,force:true});}

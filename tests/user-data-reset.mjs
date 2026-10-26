import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
const dir=await fs.mkdtemp('/tmp/lore-reset-check-'),db=new DatabaseSync(':memory:');
try{
 await build({stdin:{contents:`export {default as worker} from './server/src/index';export {RetiredUserData} from './server/src/retiredUserData';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const {worker,RetiredUserData}=await import(dir+'/test.mjs');
 const env=new Proxy({USER_DATA_RESET:'1'},{get(target,key){assert.equal(key,'USER_DATA_RESET','Maintenance must not reach DB, auth or room bindings');return target[key]}});
 for(const [path,method] of [['/api/auth/me','GET'],['/api/auth/google/callback','GET'],['/api/auth/register','POST'],['/api/collection/buy','POST'],['/api/admin/gifts','POST'],['/ws/queue','GET'],['/ws/room/old','GET']]){
  const r=await worker.fetch(new Request('https://yourlore.xyz'+path,{method}),env);assert.equal(r.status,503);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal((await r.json()).maintenance,true);
 }
 const calls=[],ws={close(code){assert.equal(code,1012);calls.push('close')}};
 const retired=new RetiredUserData({blockConcurrencyWhile:fn=>fn(),getWebSockets:()=>[ws],storage:{async deleteAlarm(){calls.push('alarm')},async deleteAll(){calls.push('data')}}});
 assert.equal((await retired.fetch()).status,410);assert.deepEqual(calls,['close','alarm','data']);await retired.alarm();await retired.webSocketMessage(ws);assert.equal(calls.filter(c=>c==='data').length,2);
 const schema=await fs.readFile('server/schema.sql','utf8'),wipe=await fs.readFile('scripts/sql/production-user-wipe-20261027.sql','utf8');db.exec(schema);
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name).sort();
 const cleared=[...wipe.matchAll(/DELETE FROM (\w+);/g)].map(m=>m[1]).sort();assert.deepEqual(cleared,tables.filter(t=>t!=='coupons'),'Every user table, including future BOT additions, must be explicitly reviewed');
 db.exec("INSERT INTO users(id,email,password,display,created_at) VALUES('a','a@example.invalid','disabled','QA',1);INSERT INTO sessions VALUES('session','a',1,2);INSERT INTO matches(id,player_a,player_b,mode,created_at) VALUES('match','a','bot','bot',1);INSERT INTO ranked_match_decks VALUES('match','a','[]');INSERT INTO ranked_recent_decks VALUES('a','[]',1);INSERT INTO rewards VALUES('a','reward',7,1);INSERT INTO coupons(code,amount,uses) VALUES('KEEP-DEFINITION',13,5)");
 db.exec(wipe);for(const table of cleared)assert.equal(db.prepare('SELECT COUNT(*) AS n FROM '+table).get().n,0,table);
 assert.deepEqual({...db.prepare('SELECT code,amount,uses FROM coupons').get()},{code:'KEEP-DEFINITION',amount:13,uses:0});assert.deepEqual(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name).sort(),tables);
 console.log('PASS reset write barrier, retired room alarm/socket shutdown, complete user-table coverage, schema and coupon definitions retained');
}finally{db.close();await fs.rm(dir,{recursive:true,force:true})}

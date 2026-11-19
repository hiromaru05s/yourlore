import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-duel-profile-');
try{
 await build({stdin:{contents:"export {duelProfile} from './server/src/duelProfile';export {seasonKey} from './server/src/rank';export {redactFor} from './client/src/shared/protocol';export {createGame} from './client/src/shared/engine';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/profile.mjs'});
 const {duelProfile,seasonKey,redactFor,createGame}=await import(dir+'/profile.mjs');
 const db=new DatabaseSync(':memory:');db.exec(await readFile('server/schema.sql','utf8'));
 const env={DB:{prepare(sql){let args=[];return {bind(...a){args=a;return this;},async first(){return db.prepare(sql).get(...args)??null;},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};}}};
 for(const id of ['one','two'])db.prepare('INSERT INTO users(id,email,password,display,created_at,stats_public) VALUES(?,?,?,?,?,?)').run(id,id+'@test','unused',id,0,0);
 db.prepare('INSERT INTO player_experience(user_id,exp) VALUES(?,?)').run('one',2300);
 assert.deepEqual(await duelProfile(env,'one',false),{level:24});
 assert.deepEqual(await duelProfile(env,'two',false),{level:1});
 assert.deepEqual(await duelProfile(env,'npc',true),{level:null});
 assert.equal(db.prepare('SELECT COUNT(*) n FROM ratings').get().n,0,'casual does not create ratings');
 const season=seasonKey();
 db.prepare('INSERT INTO ratings(user_id,season,mmr,wins,losses,peak_mmr,updated_at) VALUES(?,?,?,1,0,?,0)').run('one',season,1600,1600);
 db.prepare('INSERT INTO ratings(user_id,season,mmr,wins,losses,peak_mmr,updated_at) VALUES(?,?,?,1,0,?,0)').run('two',season,1462,1462);
 const profiles=await Promise.all(['one','two'].map(id=>duelProfile(env,id,true)));
 assert.deepEqual(profiles,[{level:24,rating:{mmr:1600,tier:'gm'}},{level:1,rating:{mmr:1462,tier:'diamond'}}]);
 const {state}=createGame({mode:'online',seed:1,p0:{id:'one',name:'A'},p1:{id:'two',name:'B'}});state.duelProfiles=profiles;
 for(const side of [0,1]){const view=redactFor(state,side);assert.deepEqual(view.duelProfiles,profiles);assert(view.players[1-side].hand.every(c=>c.id==='HIDDEN'));assert(!JSON.stringify(view.duelProfiles).includes('@test'));}
 db.close();console.log('PASS: actual SQLite level, missing/NPC profile, casual without rating, ranked MMR and GM, public snapshot with private hand redaction');
}finally{await rm(dir,{recursive:true,force:true});}

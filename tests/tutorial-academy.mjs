import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/lore-academy-');
try {
await build({stdin:{resolveDir:process.cwd(),contents:`export * from './client/src/shared/tutorialLesson';export * from './client/src/shared/tutorialSteps';export {handleRewards} from './server/src/rewards';export {DB,BALANCE_VERSION} from './client/src/shared/cards';`},bundle:true,format:'esm',platform:'node',outfile:dir+'/test.mjs'});
const {createLesson,advanceLesson,replayLesson,TUT_STEPS,TUTORIAL_TOTAL,handleRewards,BALANCE_VERSION}=await import(dir+'/test.mjs');
assert.equal(TUTORIAL_TOTAL,3000);assert.equal(TUT_STEPS.length,12);assert.equal(new Set(TUT_STEPS.map(s=>s.key)).size,12);assert.equal(BALANCE_VERSION,'v58');
const transcripts=new Map();
for(const lesson of TUT_STEPS){
 const r=createLesson(lesson.id),me=()=>r.state.players[0];
 const act=a=>advanceLesson(r,a);
 const play=id=>{const idx=me().hand.findIndex(c=>c.id===id);assert(idx>=0,id);act({type:'play',idx});};
 const attack=()=>{act({type:'attack',uid:me().field.find(m=>!m.exhausted).uid});if(r.state.pending)act({type:'chooseTarget',uid:r.state.players[1].field[0].uid});};
 const pass=()=>{act({type:'endTurn'});assert.equal(r.state.cur,1);act({type:'endTurn'});};
 assert(!replayLesson(lesson.id,[]));
 const untouched=JSON.stringify(r.state);act({type:'surrender',player:1});assert.equal(JSON.stringify(r.state),untouched);
 switch(lesson.id){
 case 'mana':play('STARTER_MANA');break;
 case 'summon':play('M4');assert(!r.done);attack();break;
 case 'combat':act({type:'attack',uid:'missing'});assert(!r.done);attack();break;
 case 'spell':play('S3');assert(!r.done);act({type:'chooseTarget',uid:me().field[0].uid});break;
 case 'cycle':act({type:'buyMarket',i:0});assert(!r.done);assert(me().discard.some(c=>c.id==='M4'));pass();break;
 case 'market':{const noMana=createLesson('market');noMana.state.players[0].mana=0;advanceLesson(noMana,{type:'refresh'});assert(!noMana.done);act({type:'refresh'});break;}
 case 'rift':play('STARTER_TRASH');break;
 case 'chest':play('STARTER_CHEST');break;
 case 'enchant':play('E3');assert(!r.done);pass();break;
 case 'tribe':play('TSO2');assert(!r.done);play('TSO3');break;
 case 'hand':act({type:'endTurn'});assert.equal(r.state.pending.reason,'handCap');act({type:'pick',uid:me().hand[0].uid});assert.equal(r.state.cur,1);act({type:'endTurn'});break;
 case 'duel':play('M4');play('M4');play('S1');attack();attack();if(!r.done){pass();attack();}break;
 }
 assert(r.done,`${lesson.id}: facts ${[...r.facts]} state ${r.state.pending?.reason}`);
 assert(replayLesson(lesson.id,r.actions),`${lesson.id} replay`);
 assert(!replayLesson(lesson.id,r.actions.slice(0,-1)),`${lesson.id} premature claim`);
 assert(!replayLesson(lesson.id,[...r.actions,{type:'surrender',player:1}]),'extra transcript rejected');
 transcripts.set(lesson.id,r.actions);
 console.log('PASS actual v57 reducer + authoritative replay:',lesson.id,r.actions.length);
}
if(process.env.TUTORIAL_TRANSCRIPTS)await writeFile(process.env.TUTORIAL_TRANSCRIPTS,JSON.stringify(Object.fromEntries(transcripts)));
const sql=new DatabaseSync(':memory:');sql.exec(await readFile('server/schema.sql','utf8'));
for(const id of ['learner','other']){sql.prepare('INSERT INTO users (id,email,password,display,created_at,verified) VALUES (?,?,?,?,?,1)').run(id,id+'@example.test','fixture',id,Date.now());sql.prepare('INSERT INTO sessions (token,user_id,created_at,expires_at) VALUES (?,?,?,?)').run(id,id,Date.now(),Date.now()+1000000);}
let fail=false;
const execute=(query,args)=>{if(fail&&query.startsWith('UPDATE users SET credits'))throw Error('payment unavailable');const stmt=sql.prepare(query);if(/^\s*SELECT/i.test(query))return {results:stmt.all(...args)};return {meta:{changes:Number(stmt.run(...args).changes)}};};
const DB={prepare(query){let args=[];return{bind(...a){args=a;return this;},run:async()=>execute(query,args),first:async()=>execute(query,args).results?.[0]??null,all:async()=>execute(query,args),execute:()=>execute(query,args)};},async batch(stmts){sql.exec('BEGIN');try{const result=stmts.map(s=>s.execute());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
const request=(path,body,id='learner')=>handleRewards({DB,APP_ORIGIN:'*'},new Request('https://test'+path,{method:body?'POST':'GET',headers:{cookie:'lore_session='+id},body:body?JSON.stringify(body):undefined}),path);
assert.equal((await request('/rewards/tutorial',null,'missing')).status,401);
assert.equal((await (await request('/rewards/tutorial')).json()).offered,false);
assert.equal((await request('/rewards/tutorial/decision',{decision:'invalid'})).status,400);
await request('/rewards/tutorial/decision',{decision:'skip'});
assert.equal((await (await request('/rewards/tutorial')).json()).offered,true);
assert.equal((await (await request('/rewards/tutorial')).json()).credits,0);
assert.equal((await (await request('/rewards/tutorial',null,'other')).json()).offered,false);
assert.equal((await request('/rewards/claim',{key:TUT_STEPS[0].key})).status,400,'generic reward API cannot claim a lesson');
for(const body of [{lesson:'mana',actions:[]},{lesson:'mana',actions:[{type:'surrender',player:1}]},{lesson:'mana',actions:[{type:'play',idx:-1}]},{lesson:'missing',actions:[]},{lesson:'mana',actions:Array(121).fill({type:'refresh'})}])assert.equal((await request('/rewards/tutorial/complete',body)).status,400);
fail=true;await assert.rejects(request('/rewards/tutorial/complete',{lesson:'mana',actions:transcripts.get('mana')}));fail=false;
assert.equal((await (await request('/rewards/tutorial')).json()).keys.filter(k=>k==='tutorial:v2:mana').length,0,'failed credit write rolls back claim');
for(const s of TUT_STEPS){const body={lesson:s.id,actions:transcripts.get(s.id)};const first=await(await request('/rewards/tutorial/complete',body)).json();assert.equal(first.amount,250);const retry=await(await request('/rewards/tutorial/complete',body)).json();assert.equal(retry.amount,0);}
const status=await(await request('/rewards/tutorial')).json();assert.equal(status.credits,3000);assert.equal(status.keys.filter(k=>TUT_STEPS.some(s=>s.key===k)).length,12);
const other=await(await request('/rewards/tutorial/complete',{lesson:'mana',actions:transcripts.get('mana')},'other')).json();assert.equal(other.amount,250);
console.log('PASS authenticated rewards: skip, account isolation, rollback, replay validation, duplicate protection, exact 3,000 total');
sql.close();
}finally{await rm(dir,{recursive:true,force:true});}

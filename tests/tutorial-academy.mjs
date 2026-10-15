import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {solveTutorial} from './fixtures/tutorialCurriculum.mjs';
const dir=await mkdtemp(tmpdir()+'/lore-academy-');
try{
 await build({stdin:{resolveDir:process.cwd(),contents:`export * from './client/src/shared/tutorialLesson';export * from './client/src/shared/tutorialSteps';export * from './client/src/shared/tutorialGuide';export * from './client/src/shared/tutorialNotes';export * from './client/src/shared/tutorial/passives';export * from './client/src/shared/tutorial/victory';export * from './client/src/shared/engine';export * from './client/src/shared/botActions';export {handleRewards} from './server/src/rewards';export {DB,PASSIVES,TRIBES} from './client/src/shared/cards';`},bundle:true,format:'esm',platform:'node',outfile:dir+'/test.mjs',logLevel:'silent'});
 const lib=await import(dir+'/test.mjs'),{createLesson,advanceLesson,currentScene,replayLesson,TUT_STEPS,TUTORIAL_TOTAL,tutorialAward,handleRewards,tutorialActionAllowed,TUTORIAL_PASSIVE_LESSONS,TUTORIAL_TRIBE_LESSONS,PASSIVES,TRIBES,DB,tutorialRuleSections}=lib;
 assert.equal(TUTORIAL_TOTAL,5000);assert.equal(TUT_STEPS.length,36);assert.equal(new Set(TUT_STEPS.map(s=>s.key)).size,36);
 assert.deepEqual(Object.keys(TUTORIAL_PASSIVE_LESSONS).sort(),Object.keys(PASSIVES).sort());assert.deepEqual(Object.keys(TUTORIAL_TRIBE_LESSONS).sort(),Object.keys(TRIBES).sort());
 for(const lesson of TUT_STEPS)assert(DB[lesson.art]||lesson.art.startsWith('STARTER_'),'art '+lesson.art);
 for(let legacy=0;legacy<=3000;legacy+=250)assert.equal(TUT_STEPS.reduce((n,s)=>n+tutorialAward(s.id,legacy),0)+legacy,5000);
 for(const lang of ['ja','en','ko']){const sections=tutorialRuleSections(lang);assert.equal(sections.length,8);assert(sections.every(s=>s.title&&s.body.every(Boolean)));assert(sections[5].body.length>=12);assert(!sections.flatMap(s=>s.body).some(s=>s.includes('undefined')));}
 const observations=new Map(),transcripts={};let scenes=0;
 for(const lesson of TUT_STEPS){
  const run=solveTutorial(lib,lesson.id,r=>{scenes++;observations.set(`${lesson.id}:${r.scene}`,structuredClone(r.state));});transcripts[lesson.id]=run.actions;
  assert(replayLesson(lesson.id,run.actions));assert(!replayLesson(lesson.id,run.actions.slice(0,-1)));assert(!replayLesson(lesson.id,[...run.actions,{type:'continueLesson'}]));
  const early=createLesson(lesson.id);assert(!tutorialActionAllowed(early,{type:'continueLesson'}));assert(!tutorialActionAllowed(early,{type:'answer',choice:0}));
  const replay=createLesson(lesson.id);let wrongChecked=false;
  for(const a of run.actions){if(a.type==='answer'&&!wrongChecked){const wrong={type:'answer',choice:1-currentScene(replay).question.correct};advanceLesson(replay,wrong);assert.equal(replay.phase,'question');assert(!replay.done);assert(!tutorialActionAllowed(replay,{type:'continueLesson'}));wrongChecked=true;}advanceLesson(replay,a);}
  assert(replay.done);assert(run.actions.length<100,lesson.id+' stays comfortably within replay budget');
  console.log('PASS',lesson.id,run.scenes.length+' scenes',run.actions.length+' actions');
 }
 assert.equal(scenes,66);
 const state=(id,scene=0)=>observations.get(`${id}:${scene}`),me=(id,scene=0)=>state(id,scene).players[0],opp=(id,scene=0)=>state(id,scene).players[1];
 // Independent rule outcomes: successful navigation alone is not coverage.
 assert.equal(opp('attack').hp,36);assert.equal(opp('combat').field[0].dmg,1);assert.equal(opp('combat',1).hp,37);
 assert.equal(me('mana').mana,5);assert(me('cycle').hand.some(c=>c.id==='M4'));assert.equal(me('market').mana,1);
 assert.equal(me('rift',2).removed.length,0);assert.equal(opp('rift',2).hp,32);
 assert(me('quick').removed.some(c=>c.id==='QUICK_ATTUNE'));assert.equal(me('quick').maxMana,5);assert.equal(me('quick').hp,42);
 assert.equal(me('enchant',1).maxMana,5);assert.equal(me('enchant',1).enchants.length,0);
 assert.equal(me('quest').quests[0].progress,1);assert.equal(me('quest',1).removed.filter(c=>c.id==='STARTER_TRASH').length,17);assert.equal(me('quest',2).field.filter(c=>c.id==='INFKNIGHT').length,3);
 assert.equal(me('health').hp,42);assert.equal(me('dew').hp,36);assert.equal(me('dew').dew,3);assert.equal(me('dew',1).dew,0);
 assert.equal(me('shield').hp,40);assert.equal(me('shield',1).hp,38);assert.equal(me('shield').shield,0);
 assert.equal(me('status',1).brand,0);assert.equal(me('status',1).hp,39);assert.equal(me('timing',1).field[0].atkMod,2);
 assert.equal(me('evolution').field[0].id,'DRAGON_RIDER');assert(me('evolution').removed.some(c=>c.id==='SOLDIER2'));assert.equal(me('evolution',1).field.filter(c=>c.id==='VAMP5').length,1);
 assert.equal(me('counter').field.length,0);assert.equal(opp('counter').field.length,0);assert.equal(opp('counter',1).hp,38);assert.equal(opp('counter',1).field[0].guts,0);assert.equal(opp('counter',2).field.length,0);
 assert.equal(opp('dual').hp,4);assert.equal(opp('dual',1).hp,36);assert.equal(opp('dual',1).field.length,1);
 assert.equal(opp('aura').field.length,0);assert.equal(opp('aura',1).field[0].def+opp('aura',1).field[0].defMod,1);
 assert.equal(opp('evasion',0).field[0].dmg??0,0);assert.equal(opp('evasion',1).field[0].dmg,4);
 assert(opp('evasion',2).field.some(m=>m.id==='M2'));assert(!opp('evasion',2).field.some(m=>m.id==='CASTLE'));
 assert(!opp('evasion',3).field.some(m=>m.id==='M2'));assert(opp('evasion',3).field.some(m=>m.id==='CASTLE'));
 assert.equal(opp('decay').field.length,0);assert.equal(opp('decay').hp,37);
 assert.equal(me('void').removed[0].id,'WINE');assert(!me('void',1).removed.some(c=>c.id==='STARTER_MANA'));assert(me('void',1).discard.some(c=>c.id==='STARTER_MANA'));
 assert.equal(me('tribe',0).tribesFired.length,0);assert.equal(opp('tribe',1).summonCap,2);assert.equal(opp('tribe',2).hp,22);assert.equal(opp('tribe',3).maxMana,6);assert.equal(opp('tribe',4).spellCastCap,2);
 assert.equal(state('origin').winner,0);assert.equal(opp('origin').hp,40);assert.equal(state('chosen').winner,0);assert.equal(state('judgement').winner,0);assert.equal(state('judgement',1).winner,null);assert.equal(state('judgement',2).winner,1);assert(me('defend').hp>0);assert.equal(state('duel').winner,0);
 const chosen=createLesson('chosen');advanceLesson(chosen,transcripts.chosen[0]);assert.equal(chosen.state.over,false,'25 Culls alone do not win');
 const forged=createLesson('shield');for(const a of transcripts.shield){if(lib.actingSide(forged.state)===1){assert(!tutorialActionAllowed(forged,{type:'surrender',player:1}),'client cannot make guide surrender');break;}advanceLesson(forged,a);}
 const required=createLesson('rift');for(const a of transcripts.rift){if(required.state.pending&&['chosenMage','exilePick'].includes(required.state.pending.reason)){assert(!tutorialActionAllowed(required,{type:'pick',uid:null}),'required demonstration cannot be skipped');}advanceLesson(required,a);}
 const reviewed=createLesson('rift');for(const a of transcripts.rift.slice(0,2))advanceLesson(reviewed,a);const purging=reviewed.state.players[0].hand[0];assert(!tutorialActionAllowed(reviewed,{type:'play',idx:0,sourceUid:purging.uid,targets:[]}), 'reviewed cast cannot skip required demonstration');assert(!tutorialActionAllowed(reviewed,{type:'play',idx:0,sourceUid:purging.uid,targets:[purging.uid]}),'choose the instructed other card, not the spell itself');
 const sql=new DatabaseSync(':memory:');sql.exec(await readFile('server/schema.sql','utf8'));
 const profiles=[['new',0],['partial',1250],['graduate',3000],['other',0]];
 for(const[id,paid]of profiles){sql.prepare('INSERT INTO users(id,email,password,display,created_at,verified,credits) VALUES(?,?,?,?,?,1,?)').run(id,id+'@example.test','fixture',id,Date.now(),paid);sql.prepare('INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES(?,?,?,?)').run(id,id,Date.now(),Date.now()+1e6);for(const legacy of lib.LEGACY_TUTORIAL_IDS.slice(0,paid/250))sql.prepare('INSERT INTO rewards(user_id,key,amount,created_at) VALUES(?,?,250,?)').run(id,'tutorial:v2:'+legacy,Date.now());}
 let fail=false;
 const execute=(query,args)=>{if(fail&&query.startsWith('UPDATE users SET credits'))throw Error('payment unavailable');const stmt=sql.prepare(query);return /^\s*SELECT/i.test(query)?{results:stmt.all(...args)}:{meta:{changes:Number(stmt.run(...args).changes)}};};
 const database={prepare(query){let args=[];return{bind(...a){args=a;return this;},run:async()=>execute(query,args),first:async()=>execute(query,args).results?.[0]??null,all:async()=>execute(query,args),execute:()=>execute(query,args)};},async batch(stmts){sql.exec('BEGIN');try{const result=stmts.map(s=>s.execute());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const request=(path,body,id='new')=>handleRewards({DB:database,APP_ORIGIN:'*'},new Request('https://test'+path,{method:body?'POST':'GET',headers:{cookie:'lore_session='+id},body:body?JSON.stringify(body):undefined}),path);
 assert.equal((await request('/rewards/tutorial',null,'missing')).status,401);
 assert.equal((await(await request('/rewards/tutorial')).json()).offered,false);
 await request('/rewards/tutorial/decision',{decision:'skip'});assert.equal((await(await request('/rewards/tutorial')).json()).offered,true);
 assert.equal((await request('/rewards/claim',{key:TUT_STEPS[0].key})).status,400);
 for(const body of [{lesson:'mana',actions:[]},{lesson:'mana',actions:[{type:'continueLesson'}]},{lesson:'mana',actions:[{type:'answer',choice:99}]},{lesson:'mana',actions:[{type:'answer',choice:0,cheat:true}]},{lesson:'missing',actions:[]},{lesson:'mana',actions:Array(241).fill({type:'endTurn'})}])assert.equal((await request('/rewards/tutorial/complete',body)).status,400);
 fail=true;await assert.rejects(request('/rewards/tutorial/complete',{lesson:'mana',actions:transcripts.mana}));fail=false;
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM rewards WHERE key=?').get('tutorial:v3:mana').n,0,'payment failure rolls back completion');
 for(const[id,paid]of profiles.slice(0,3)){
  const initial=await(await request('/rewards/tutorial',null,id)).json();assert.equal(initial.legacyPaid,paid);assert.equal(initial.keys.filter(k=>k.startsWith('tutorial:v3:')&&!k.includes(':intro:')).length,0,'old money is not new learning');
  for(const s of [...TUT_STEPS].reverse()){
   const body={lesson:s.id,actions:transcripts[s.id]};const [first,retry]=await Promise.all([request('/rewards/tutorial/complete',body,id),request('/rewards/tutorial/complete',body,id)]);const payments=await Promise.all([first.json(),retry.json()]);assert.equal(payments.reduce((n,p)=>n+p.amount,0),tutorialAward(s.id,paid));assert.equal(payments.filter(p=>p.granted).length,1);
  }
  const status=await(await request('/rewards/tutorial',null,id)).json();assert.equal(status.credits,5000);assert.equal(status.awarded,5000);assert.equal(status.keys.filter(k=>TUT_STEPS.some(s=>s.key===k)).length,36);
 }
 assert.equal((await(await request('/rewards/tutorial',null,'other')).json()).credits,0);
 sql.close();
 if(process.env.TUTORIAL_TRANSCRIPTS)await writeFile(process.env.TUTORIAL_TRANSCRIPTS,JSON.stringify(transcripts));
 console.log('PASS 36 lessons / 66 scenes; rule outcomes, wrong answers, authoritative replay, 11 passives, 5 tribes, 5,000 total, migration, concurrent duplicates, rollback and isolation');
}finally{await rm(dir,{recursive:true,force:true});}

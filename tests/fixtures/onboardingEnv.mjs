import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
export async function onboardingFixture(){
 const dir=await fs.mkdtemp('/tmp/lore-onboarding-test-');
 await build({stdin:{resolveDir:process.cwd(),contents:`export {default as worker} from './server/src/index';export * from './client/src/shared/onboarding';export * from './client/src/shared/tutorialParts';export * from './client/src/shared/tutorialLesson';export * from './client/src/shared/botActions';export * from './client/src/shared/engine';export * from './client/src/shared/collection';export * from './client/src/shared/dailyStarterShop';export {deckStoreForUser} from './client/src/shared/cards';`},bundle:true,platform:'node',format:'esm',outfile:dir+'/module.mjs',logLevel:'silent'});
 const lib=await import(dir+'/module.mjs'),db=new DatabaseSync(':memory:');db.exec(await fs.readFile('server/schema.sql','utf8'));
 let failSql;
 const execute=(sql,args)=>{if(failSql?.(sql))throw Error('injected database failure');const q=db.prepare(sql);if(/^\s*SELECT/i.test(sql))return{results:q.all(...args),meta:{changes:0}};return{results:[],meta:{changes:Number(q.run(...args).changes)}};};
 const env={APP_ORIGIN:'*',DB:{prepare(sql){let args=[];return{bind(...a){args=a;return this;},first:async()=>execute(sql,args).results[0]??null,all:async()=>execute(sql,args),run:async()=>execute(sql,args),execute:()=>execute(sql,args)};},async batch(stmts){db.exec('BEGIN');try{const r=stmts.map(s=>s.execute());db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}}};
 const addUser=(id,credits=0)=>{db.prepare('INSERT INTO users(id,email,password,display,created_at,credits) VALUES(?,?,?,?,?,?)').run(id,id+'@test.invalid','fixture',id,Date.now(),credits);db.prepare('INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES(?,?,?,?)').run(id,id,Date.now(),Date.now()+172800000);db.prepare('INSERT INTO rewards(user_id,key,amount,created_at) VALUES(?,?,0,?)').run(id,'tutorial:v3:intro:start',Date.now());};
 const call=(path,body,who='onboarding')=>lib.worker.fetch(new Request('https://test.yourlore.xyz/api'+path,{method:body!==undefined?'POST':'GET',headers:{Cookie:`lore_session=${who}`,'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})}),env);
 const run=lib.createPartRun(0);
 for(let n=0;run.phase==='play'&&n<100;n++){
  const action=lib.actingSide(run.state)===1?lib.tutorialOpponentAction(run):lib.botActions(run.state).filter(a=>lib.tutorialActionAllowed(run,a)).find(a=>{const next=lib.reduce(run.state,a);return next.state.rng!==run.state.rng||lib.actionChangesState(run.state,next.state);});
  if(!action)throw Error('No valid basic tutorial action');lib.advanceLesson(run,action);
 }
 if(run.phase!=='review')throw Error('Basic tutorial unsolved');
 return{lib,db,env,call,addUser,actions:run.actions,fail:fn=>{failSql=fn;},close:async()=>{db.close();await fs.rm(dir,{recursive:true,force:true});}};
}

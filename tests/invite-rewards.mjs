import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-invite-rewards-');
try {
 await build({stdin:{contents:`export * from './server/src/invite';export {settleRanked} from './server/src/rank';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/module.mjs'});
 const {applyInviteAtSignup,handleInvite,settleRanked}=await import(dir+'/module.mjs');
 const db=new DatabaseSync(':memory:');db.exec(await readFile('server/schema.sql','utf8'));let failAfterInviteCredit=false;
 class Stmt {
  constructor(q,a=[]){this.q=q;this.a=a;}bind(...a){return new Stmt(this.q,a);}
  async first(){return db.prepare(this.q).get(...this.a)??null;}
  async all(){return {results:db.prepare(this.q).all(...this.a)};}
  async run(){return {meta:{changes:Number(db.prepare(this.q).run(...this.a).changes)}};}
 }
 const env={APP_ORIGIN:'*',DB:{prepare:q=>new Stmt(q),batch:async list=>{db.exec('BEGIN');try{const out=list.map(s=>{
  const r=db.prepare(s.q).run(...s.a);
  if(failAfterInviteCredit&&s.q.startsWith('UPDATE users SET credits=credits+')&&Number(r.changes)>0){failAfterInviteCredit=false;throw Error('injected payout outage');}
  return {meta:{changes:Number(r.changes)}};
 });db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}}};
 const at=Date.UTC(2026,9,15),season='2026-10';
 const add=(id,mmr=1000)=>{db.prepare('INSERT INTO users(id,email,password,display,created_at,invite_code) VALUES(?,?,?,?,?,?)').run(id,id+'@invalid.test','fixture',id,at,id.toUpperCase());db.prepare('INSERT INTO ratings(user_id,season,mmr,peak_mmr,updated_at) VALUES(?,?,?,?,1)').run(id,season,mmr,mmr);};
 const balance=id=>db.prepare('SELECT credits FROM users WHERE id=?').get(id).credits;
 const status=id=>db.prepare('SELECT status FROM invite_rewards WHERE invitee_id=?').get(id)?.status;
 add('host');add('friend',1135);add('opponent',1135);await applyInviteAtSignup(env,'friend','HOST');
 await settleRanked(env,'below-gold','friend','opponent',null,at);assert.equal(balance('host'),0);assert.equal(status('friend'),'pending');
 await Promise.all(Array.from({length:8},()=>settleRanked(env,'first-gold','friend','opponent','friend',at)));
 assert.equal(balance('friend'),1000);assert.equal(balance('host'),1000);assert.equal(balance('opponent'),0);assert.equal(status('friend'),'paid');
 assert.equal(db.prepare("SELECT COUNT(*) n FROM rewards WHERE key='invite:gold:friend'").get().n,2);
 await settleRanked(env,'later-win','friend','opponent','friend',at);assert.equal(balance('host'),1000);assert.equal(balance('friend'),1000);
 // Dropping below Gold, recovering, and a new season must never re-award.
 db.prepare('UPDATE ratings SET mmr=1135,updated_at=updated_at+1 WHERE user_id=?').run('friend');
 await settleRanked(env,'gold-again','friend','opponent','friend',at);assert.equal(balance('host'),1000);
 await settleRanked(env,'new-season','friend','opponent','friend',Date.UTC(2026,10,1));assert.equal(balance('host'),1000);
 console.log('PASS below-Gold eligibility, concurrent replay, both balances/receipts, later wins, Gold re-entry and season rollover');
 add('friend2',1149);add('friend3',1149);add('friend4',1149);add('opponent2',1149);add('opponent3',1149);
 await Promise.all(['friend2','friend3','friend4'].map(id=>applyInviteAtSignup(env,id,'HOST')));
 assert.equal(status('friend4'),undefined);await applyInviteAtSignup(env,'host','HOST');assert.equal(status('host'),undefined);
 failAfterInviteCredit=true;await assert.rejects(settleRanked(env,'retry','friend2','opponent2','friend2',at));
 assert.equal(balance('host'),1000);assert.equal(balance('friend2'),0);assert.equal(status('friend2'),'pending');
 assert.equal(db.prepare("SELECT COUNT(*) n FROM ranked_results WHERE match_id='retry'").get().n,0);
 assert.equal(db.prepare("SELECT mmr FROM ratings WHERE user_id='friend2'").get().mmr,1149);
 await Promise.all([settleRanked(env,'retry','friend2','opponent2','friend2',at),settleRanked(env,'third','friend3','opponent3','friend3',at)]);
 assert.equal(balance('host'),3000);assert.equal(balance('friend2'),1000);assert.equal(balance('friend3'),1000);
 await settleRanked(env,'fourth','friend4','opponent2','friend4',at);assert.equal(balance('friend4'),0);assert.equal(balance('host'),3000);
 const response=await handleInvite(env,new Request('https://test/api/invite/me'),'/invite/me',{id:'host'});
 const data=await response.json();assert.equal(data.invites.length,3);assert(data.invites.every(i=>i.status==='paid'));
 console.log('PASS three-friend limit, self-invite rejection, payout/rating atomic rollback and retry, concurrent invitees, API paid status');
 db.close();
} finally {await rm(dir,{recursive:true,force:true});}

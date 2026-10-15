/** Ephemeral accounts only: live D1, authenticated BOT reports and a private casual room. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import WebSocket from 'ws';
const origin='https://test.yourlore.xyz',dir=await fs.mkdtemp('/tmp/lore-exp-live-');
const run=crypto.randomUUID(),now=Date.now(),users=Array.from({length:7},(_,i)=>({id:`qa-exp-${run}-${i}`,token:crypto.randomUUID()+crypto.randomUUID()}));
const peers=[];let roomId;const checks=[];
const sql=async text=>{const file=dir+'/operation.sql';await fs.writeFile(file,text,{mode:0o600});execFileSync('npm',['exec','--','wrangler','d1','execute','lore-db-staging','--remote','--env','staging','-c','server/wrangler.toml','--file',file,'--json'],{stdio:'pipe',timeout:60000});};
const call=async(i,path,body)=>{const r=await fetch(origin+'/api'+path,{method:body?'POST':'GET',headers:{cookie:'lore_session='+users[i].token,'content-type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;};
const until=async fn=>{const end=Date.now()+30000;while(!fn()){if(Date.now()>end)throw Error('live socket timeout');await new Promise(r=>setTimeout(r,80));}};
try{
 await sql(users.map(u=>`INSERT INTO users(id,email,password,display,created_at,verified) VALUES('${u.id}','${u.id}@example.invalid','no-login','EXP QA',${now},1);INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES('${u.token}','${u.id}',${now},${now+600000});`).join('\n'));
 assert.equal((await call(0,'/auth/me')).user.exp,0);
 for(const [difficulty,amount]of [['easy',20],['normal',35],['hard',60],['hell',120]]){const result=await call(0,'/track/bot',{difficulty,won:true});assert.equal(result.experience.after-result.experience.before,amount);const again=await call(0,'/track/bot',{difficulty,won:true});assert.equal(again.experience,null);}
 const bot=(await call(0,'/auth/me')).user;assert.equal(bot.exp,235);assert.equal(bot.credits,200);assert.equal(bot.botClears.length,4);checks.push('four BOT first clears: 20/35/60/120 EXP; repeats pay zero; Lv3 +200 Shards');
 await call(1,'/track/bot',{difficulty:'hell',won:false});await call(1,'/track/bot',{difficulty:'hell',won:false,draw:true});assert.equal((await call(1,'/auth/me')).user.exp,0);checks.push('BOT defeat/draw do not grant EXP');
 const levels=[10,20,30,40,50],rewards=[300,500,700,1000,3000];
 await sql(levels.map((level,i)=>`INSERT INTO player_experience(user_id,exp) VALUES('${users[i+2].id}',${(level-1)*100-5});`).join('\n'));
 for(let i=0;i<levels.length;i++){const receipt=(await call(i+2,'/track/bot',{difficulty:'easy',won:true})).experience;assert.equal(receipt.shards,rewards[i]);const me=(await call(i+2,'/auth/me')).user;assert.equal(me.credits,rewards[i]);assert.equal(me.exp,Math.min(4900,(levels[i]-1)*100+15));}
 await call(6,'/track/bot',{difficulty:'hell',won:true});assert.equal((await call(6,'/auth/me')).user.exp,4900);assert.equal((await call(6,'/auth/me')).user.credits,3000);checks.push('all five milestone amounts and Lv50 cap against live D1');
 // Friend challenge bypasses the public queue and cannot match a real player.
 const challenge=await call(0,'/social/challenge',{user_id:users[1].id});const game=await call(1,'/social/challenge/respond',{id:challenge.id,accept:true});roomId=game.roomId;assert(roomId);
 await Promise.all([0,1].map(async i=>{const p={ws:new WebSocket(origin.replace('https','wss')+'/ws/room/'+roomId,{headers:{cookie:'lore_session='+users[i].token},handshakeTimeout:20000}),messages:[]};peers[i]=p;p.ws.on('message',raw=>p.messages.push(JSON.parse(raw.toString())));await new Promise((resolve,reject)=>{p.ws.once('open',resolve);p.ws.once('error',reject);});p.ws.send(JSON.stringify({type:'ready'}));}));
 await until(()=>peers.every(p=>p.messages.some(m=>m.type==='init')));
 const losingSide=peers[1].messages.find(m=>m.type==='init').you;
 peers[1].ws.send(JSON.stringify({type:'action',action:{type:'surrender',player:losingSide}}));
 await until(()=>peers.every(p=>p.messages.some(m=>m.type==='experienceResult')));
 for(const [i,expected] of [[0,20],[1,5]]){const r=peers[i].messages.find(m=>m.type==='experienceResult');assert.equal(r.after-r.before,expected);}
 assert.equal((await call(0,'/auth/me')).user.exp,255);assert.equal((await call(1,'/auth/me')).user.exp,5);checks.push('private authenticated casual room: winner +20, loser +5; persisted auth projection and socket receipts');
 const output=process.env.LORE_TEST_OUTPUT||'/tmp/lore-exp-staging-report.json';await fs.writeFile(output,JSON.stringify({origin,checkedAt:new Date().toISOString(),checks,fixture:'seven temporary QA accounts; cleaned up after verification'},null,2));console.log('PASS authenticated staging EXP:',checks.length,'groups');
}finally{
 for(const p of peers)p?.ws.close();
 const ids=users.map(u=>`'${u.id}'`).join(',');
 await sql(`DELETE FROM experience_events WHERE user_id IN (${ids});DELETE FROM player_experience WHERE user_id IN (${ids});DELETE FROM matches WHERE player_a IN (${ids}) OR player_b IN (${ids});DELETE FROM challenges WHERE challenger IN (${ids}) OR target IN (${ids});DELETE FROM sessions WHERE user_id IN (${ids});DELETE FROM user_days WHERE user_id IN (${ids});DELETE FROM users WHERE id IN (${ids});`);
 await fs.rm(dir,{recursive:true,force:true});
}

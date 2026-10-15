/** Authenticated live checks, restricted to disposable QA accounts and private rooms. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import WebSocket from 'ws';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-collapse-tools/node_modules/playwright/index.mjs');
const origin='https://test.yourlore.xyz',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-medals-staging';await fs.mkdir(out,{recursive:true});
const temp=await fs.mkdtemp('/tmp/lore-medal-auth-'),now=Date.now(),run=crypto.randomUUID();
const users=[0,1].map(i=>({id:`qa-medal-${run}-${i}`,token:crypto.randomUUID()+crypto.randomUUID()}));
const checks=[],errors=[],peers=[];let browser,activeRoom;
const sql=async text=>{const file=temp+'/operation.sql';await fs.writeFile(file,text,{mode:0o600});execFileSync('npm',['exec','--','wrangler','d1','execute','lore-db-staging','--remote','--env','staging','-c','server/wrangler.toml','--file',file,'--json'],{stdio:'pipe',timeout:120000});};
const request=async(i,path,body)=>{const r=await fetch(origin+'/api'+path,{method:body===undefined?'GET':'POST',headers:{cookie:'lore_session='+users[i].token,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});return{status:r.status,data:await r.json()};};
const call=async(i,path,body)=>{const r=await request(i,path,body);assert.equal(r.status,200,path+': '+JSON.stringify(r.data));return r.data;};
const until=async fn=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('socket timeout');await new Promise(r=>setTimeout(r,100));}};
const connect=async(i,room)=>{const p={messages:[],ws:new WebSocket(origin.replace('https','wss')+'/ws/room/'+room,{headers:{cookie:'lore_session='+users[i].token}})};peers.push(p);p.ws.on('message',r=>p.messages.push(JSON.parse(r)));await new Promise((resolve,reject)=>{p.ws.once('open',resolve);p.ws.once('error',reject);});p.ws.send(JSON.stringify({type:'ready'}));await until(()=>p.messages.some(m=>m.type==='init'));return p;};
try{
 await sql(users.map((u,i)=>`INSERT INTO users(id,email,password,display,created_at,verified) VALUES('${u.id}','${u.id}@example.invalid','disabled','勲章QA ${i+1}',${now},1);INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES('${u.token}','${u.id}',${now},${now+1800000});INSERT INTO rewards(user_id,key,amount,created_at) VALUES('${u.id}','tutorial:v3:intro:skip',0,${now});INSERT INTO earned_medals(user_id,medal_id,earned_at) VALUES('${u.id}','tier:gold',${now}),('${u.id}','feat:chosen',${now});`).join('\n'));
 for(const i of [0,1]){const profile=(await call(i,'/social/profile')).profile;assert.equal(profile.medals.entries.length,217);assert.equal(profile.medals.entries.filter(m=>m.earnedAt).length,2);}
 assert.equal((await request(0,'/social/me',{badge:'feat:perfect'})).status,400);
 await call(0,'/social/me',{badge:'tier:gold'});await call(1,'/social/me',{badge:'feat:chosen'});
 assert.equal((await call(0,'/social/profile')).profile.medals.equipped,'tier:gold');
 assert.equal((await call(1,'/social/profile?id='+users[0].id)).profile.medals,undefined);
 console.log('PASS live profile API');checks.push('real D1 profile ownership, 217 entries, equipped persistence, unauthorized medal rejected, private progression');
 browser=await chromium.launch({channel:'chrome',headless:true});const contexts=[],pages=[];
 for(const i of [0,1]){const c=await browser.newContext({viewport:{width:1280,height:800}});contexts.push(c);await c.addCookies([{name:'lore_session',value:users[i].token,url:origin}]);await c.addInitScript(()=>localStorage.setItem('lore_lang','ja'));const p=await c.newPage();p.setDefaultTimeout(120000);pages.push(p);p.on('pageerror',e=>errors.push(e.message));await p.goto(origin);await p.locator('[data-profile]').first().waitFor({timeout:120000});}
 await pages[0].locator('[data-profile]').first().click();await pages[0].locator('[data-tab="owned"]').click();await pages[0].locator('[data-equip="feat:chosen"]').click();await pages[0].waitForFunction(()=>document.querySelector('[data-equip="feat:chosen"]')?.getAttribute('aria-pressed')==='true');
 assert.equal((await call(0,'/social/profile')).profile.medals.equipped,'feat:chosen');await pages[0].locator('[data-equip="tier:gold"]').click();await pages[0].waitForFunction(()=>document.querySelector('[data-equip="tier:gold"]')?.getAttribute('aria-pressed')==='true');
 await pages[0].screenshot({path:out+'/profile-owned.png'});await pages[0].locator('[data-tab="progress"]').click();await pages[0].setViewportSize({width:390,height:844});await pages[0].screenshot({path:out+'/profile-progress-mobile.png'});console.log('PASS live profile browser');checks.push('real browser profile equip/readback and separate owned/progression tabs');
 await sql(`INSERT INTO friends(user_a,user_b,status,created_at) VALUES('${users[0].id}','${users[1].id}','accepted',${now});`);
 const challenge=await call(0,'/social/challenge',{user_id:users[1].id}),game=await call(1,'/social/challenge/respond',{id:challenge.id,accept:true});
 const room=game.roomId;activeRoom=room;assert(room);const ps=await Promise.all([connect(0,room),connect(1,room)]);
 for(const p of ps){const initial=p.messages.find(m=>m.type==='init');assert.deepEqual(initial.state.medals,['tier:gold','feat:chosen']);assert.equal(initial.state.medalDuel,undefined);}
 await call(0,'/social/me',{badge:'feat:chosen'});
 ps[0].ws.close();const rejoined=await connect(0,room);assert.deepEqual(rejoined.messages.find(m=>m.type==='init').state.medals,['tier:gold','feat:chosen']);console.log('PASS live sockets and reconnect');checks.push('both authenticated sockets receive server medals; reconnect preserves room snapshot after profile change');
 // Resume the real private room in both browsers. No API/state mocking.
 for(const i of [0,1]){await pages[i].evaluate(({room,userId,i})=>localStorage.setItem('lore_game',JSON.stringify({roomId:room,you:i,ranked:false,userId,ts:Date.now()})),{room,userId:users[i].id,i});await pages[i].setViewportSize({width:i?390:1280,height:i?844:800});await pages[i].reload();await pages[i].locator('.portrait .medal-inscription').first().waitFor({timeout:120000});await pages[i].locator('.duel-opening').waitFor({state:'detached',timeout:120000});assert.equal(await pages[i].locator('.portrait .medal-inscription').count(),2);const texts=await pages[i].locator('.portrait .medal-inscription').allTextContents();assert(texts.some(x=>x.includes('選ばれし者')));assert(texts.some(x=>x.includes('黄金')));await pages[i].screenshot({path:out+`/duel-side-${i}.png`});}
 console.log('PASS live duel browser');checks.push('both real browser seats render both equipped medals, desktop and mobile');
 // The browser replaces its websocket, so finish through the actual UI.
 await pages[1].locator('#giveupBtn').click();const confirm=pages[1].locator('.modal .btn-danger,.modal-overlay .btn-danger').first();if(await confirm.isVisible())await confirm.click();
 let profile;const deadline=Date.now()+60000;do{profile=(await call(0,'/social/profile')).profile;if(profile.medals.entries.find(m=>m.id==='wins:1').earnedAt)break;await new Promise(r=>setTimeout(r,500));}while(Date.now()<deadline);
 assert(profile.medals.entries.find(m=>m.id==='wins:1').earnedAt);assert.equal(profile.medals.entries.find(m=>m.id==='feat:perfect').earnedAt,null);assert.equal(profile.medals.entries.find(m=>m.id==='feat:speed').earnedAt,null);checks.push('authoritative surrender settles win while excluding perfect/speed feats');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({origin,at:new Date().toISOString(),checks,errors,fixture:'two disposable QA accounts; private room only; cleaned in finally'},null,2));console.log('PASS',checks);
}finally{
 await browser?.close();for(const p of peers)p.ws.close();
 if(activeRoom){try{const fin=await connect(0,activeRoom);if(!fin.messages.find(m=>m.type==='init').state.over){fin.ws.send(JSON.stringify({type:'action',action:{type:'surrender',player:0}}));await until(()=>fin.messages.some(m=>m.type==='rewardsSettled'));}fin.ws.close();}catch(e){console.error('QA room cleanup:',String(e));}}
 const ids=users.map(u=>`'${u.id}'`).join(',');
 await sql(`DELETE FROM duel_reward_receipts WHERE user_id IN (${ids});DELETE FROM daily_challenges WHERE user_id IN (${ids});DELETE FROM matches WHERE player_a IN (${ids}) OR player_b IN (${ids});DELETE FROM challenges WHERE challenger IN (${ids}) OR target IN (${ids});DELETE FROM friends WHERE user_a IN (${ids}) OR user_b IN (${ids});DELETE FROM ratings WHERE user_id IN (${ids});DELETE FROM rewards WHERE user_id IN (${ids});DELETE FROM sessions WHERE user_id IN (${ids});DELETE FROM presence WHERE user_id IN (${ids});DELETE FROM user_days WHERE user_id IN (${ids});DELETE FROM users WHERE id IN (${ids});`);
 await fs.rm(temp,{recursive:true,force:true});
}

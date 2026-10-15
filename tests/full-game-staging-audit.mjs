/** Real staging only, isolated temporary users, private rooms, no public queue. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pbkdf2Sync,randomBytes} from 'node:crypto';
import WebSocket from 'ws';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin='https://test.yourlore.xyz',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-full-game-staging';await fs.mkdir(out,{recursive:true});
const temp=await fs.mkdtemp('/tmp/lore-full-game-auth-'),run=crypto.randomUUID(),now=Date.now();
const users=[0,1].map(i=>({id:`qa-full-${run}-${i}`,email:`qa-full-${run}-${i}@example.invalid`,password:randomBytes(24).toString('hex')}));
const checks=[],layouts=[],errors=[],peers=[];let browser,page;
const sql=async contents=>{const file=temp+'/operation.sql';await fs.writeFile(file,contents,{mode:0o600});const result=execFileSync('npm',['exec','--','wrangler','d1','execute','lore-db-staging','--remote','--env','staging','-c','server/wrangler.toml','--command',contents,'--json'],{encoding:'utf8',timeout:120000});return result;};
const request=async(i,path,body)=>{const r=await fetch(origin+'/api'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(users[i]?.token?{cookie:'lore_session='+users[i].token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});return{status:r.status,data:await r.json(),headers:r.headers};};
const call=async(i,path,body)=>{const r=await request(i,path,body);assert.equal(r.status,200,`${path}: ${JSON.stringify(r.data)}`);return r.data;};
const until=async fn=>{const deadline=Date.now()+60000;while(!fn()){if(Date.now()>deadline)throw Error('socket state timeout');await new Promise(r=>setTimeout(r,100));}};
const connect=async(i,room)=>{const p={messages:[],ws:new WebSocket(origin.replace('https','wss')+'/ws/room/'+room,{headers:{cookie:'lore_session='+users[i].token}})};peers.push(p);p.ws.on('message',raw=>p.messages.push(JSON.parse(raw)));await new Promise((resolve,reject)=>{p.ws.once('open',resolve);p.ws.once('error',reject)});p.ws.send(JSON.stringify({type:'ready'}));await until(()=>p.messages.some(m=>m.type==='init'));return p;};
try {
 await sql(users.map(u=>{const salt=randomBytes(16).toString('hex'),hash=pbkdf2Sync(u.password,Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex');return `INSERT INTO users(id,email,password,display,created_at,verified,credits) VALUES('${u.id}','${u.email}','${salt}:${hash}','Audit Seeker',${now},1,5000); INSERT INTO rewards(user_id,key,amount,created_at) VALUES('${u.id}','tutorial:v3:intro:skip',0,${now});`;}).join('\n'));
 for(const u of users){const r=await request(users.indexOf(u),'/auth/login',{email:u.email,password:u.password});assert.equal(r.status,200);assert.equal(r.data.user.id,u.id);u.token=r.headers.get('set-cookie').match(/lore_session=([^;]+)/)[1];}
 checks.push('two real password logins');console.log('PASS real password logins');
 if(!process.argv.includes('--before')){
  for(const difficulty of ['easy','normal','hard','hell'])assert.equal((await call(0,'/track/bot',{won:true,difficulty})).experience,null);
  for(const key of ['tut:1','tuto:1','tuto:10'])assert.equal((await request(0,'/rewards/claim',{key})).status,410);
  const me=(await call(0,'/auth/me')).user;assert.equal(me.exp,0);assert.equal(me.credits,5000);checks.push('forged BOT/legacy tutorial claims do not award EXP or Shards');
 }
 const me=(await call(0,'/auth/me')).user;
 const saved=await call(0,'/deck',{decks:me.decks});assert.equal(saved.deck.length,8);assert.deepEqual((await call(0,'/auth/me')).user.decks,saved.decks);checks.push('deck save/readback and ownership constraints');
 const id='STARTER_CHEST',requestId=crypto.randomUUID();const purchases=await Promise.all([call(0,'/collection/buy',{id,requestId}),call(0,'/collection/buy',{id,requestId})]);assert(purchases.every(r=>r.credits===4800&&r.starterCards[id]===3));assert.equal((await call(0,'/collection/history')).receipts.length,1);checks.push('concurrent starter purchase charged exactly once, ownership/history persisted');
 console.log('PASS API deck and collection checks');
 if(!process.argv.includes('--api-only')){
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});
 const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addCookies([{name:'lore_session',value:users[0].token,url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);await context.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
 page=await context.newPage();page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin,{waitUntil:'domcontentloaded',timeout:120000});await page.locator('.lounge-home').waitFor();await page.locator('.screen-loader').waitFor({state:'detached',timeout:300000});
 for(const [width,height]of [[1280,900],[390,844],[320,740],[844,390]]){
  await page.setViewportSize({width,height});
  for(const name of ['home','deck','cards','leaderboard','friends','shop','tutorial']){
   await page.locator(`[data-nav="${name}"]`).click();await page.locator('.lounge-'+name).waitFor();await page.locator('.screen-loader').waitFor({state:'detached',timeout:300000});
   if(name==='cards')await page.waitForFunction(()=>document.querySelector('#grid .card')&&!document.querySelector('#grid[aria-busy=true]'));
   if(name==='deck')await page.locator('#deckCur .card').first().waitFor();
   await page.waitForTimeout(300);
   const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,broken:[...document.images].filter(i=>i.getClientRects().length&&i.complete&&!i.naturalWidth).map(i=>new URL(i.src).pathname)}));
   assert(metrics.scroll<=width+1,`${name} overflow ${width}: ${metrics.scroll}`);assert.deepEqual(metrics.broken,[],name+' broken images');layouts.push({name,...metrics});await page.screenshot({path:`${out}/${name}-${width}.jpg`});console.log('PASS menu',name,width);
  }
 }
 await page.locator('[data-profile]').click();await page.locator('[data-tab="settings"]').click();await page.locator('#langSel').waitFor();await page.screenshot({path:out+'/settings.jpg'});checks.push('seven real authenticated menus in four viewport sizes plus profile/settings');
 assert.deepEqual(errors,[]);await browser.close();browser=undefined;
 }
 await sql(`INSERT INTO friends(user_a,user_b,status,created_at) VALUES('${users[0].id}','${users[1].id}','accepted',${now});`);
 const challenge=await call(0,'/social/challenge',{user_id:users[1].id}),game=await call(1,'/social/challenge/respond',{id:challenge.id,accept:true});
 // Both sides must connect before init is broadcast.
 const [p0,p1]=await Promise.all([connect(0,game.roomId),connect(1,game.roomId)]);
 const initial=p0.messages.find(m=>m.type==='init');assert.equal(initial.you,0);
 p0.ws.close();await new Promise(r=>setTimeout(r,500));const rejoined=await connect(0,game.roomId);assert.equal(rejoined.messages.find(m=>m.type==='init').state.turn,initial.state.turn);checks.push('private two-user match and real WebSocket reconnect preserve turn');
 p1.ws.send(JSON.stringify({type:'action',action:{type:'surrender',player:1}}));await until(()=>rejoined.messages.some(m=>m.type==='rewardsSettled')&&p1.messages.some(m=>m.type==='rewardsSettled'));
 assert.equal(rejoined.messages.find(m=>m.type==='experienceResult').after-rejoined.messages.find(m=>m.type==='experienceResult').before,20);assert.equal(p1.messages.find(m=>m.type==='experienceResult').after-p1.messages.find(m=>m.type==='experienceResult').before,5);checks.push('authoritative private duel result, EXP receipts and reward settlement');
 const bot=await call(0,'/rewards/bot/start',{difficulty:'easy',lang:'ja'}),bp=await connect(0,bot.roomId);bp.ws.send(JSON.stringify({type:'action',action:{type:'surrender',player:0}}));await until(()=>bp.messages.some(m=>m.type==='rewardsSettled'));assert.equal((await call(0,'/auth/me')).user.exp,20);checks.push('real server BOT start/surrender settles with no victory EXP');
 await fs.writeFile(out+'/report.json',JSON.stringify({origin,at:new Date().toISOString(),checks,layouts,errors,fixture:'two isolated QA users; no public matchmaking'},null,2));console.log('PASS staging audit',checks);
}catch(error){console.error('AUDIT FAILURE',String(error));if(page){console.error(await page.locator('body').innerText().catch(()=>''));await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}throw error;}finally{
 await browser?.close();for(const p of peers)p.ws.close();
 const ids=users.map(u=>`'${u.id}'`).join(',');
 await sql(`DELETE FROM collection_transactions WHERE user_id IN (${ids}); DELETE FROM duel_reward_receipts WHERE user_id IN (${ids}); DELETE FROM daily_challenges WHERE user_id IN (${ids}); DELETE FROM matches WHERE player_a IN (${ids}) OR player_b IN (${ids}); DELETE FROM challenges WHERE challenger IN (${ids}) OR target IN (${ids}); DELETE FROM friends WHERE user_a IN (${ids}) OR user_b IN (${ids}); DELETE FROM ratings WHERE user_id IN (${ids}); DELETE FROM email_tokens WHERE user_id IN (${ids}); DELETE FROM rewards WHERE user_id IN (${ids}); DELETE FROM sessions WHERE user_id IN (${ids}); DELETE FROM presence WHERE user_id IN (${ids}); DELETE FROM user_days WHERE user_id IN (${ids}); DELETE FROM users WHERE id IN (${ids});`);
 await fs.rm(temp,{recursive:true,force:true});
}

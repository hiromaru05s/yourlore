// Requires two authenticated, tutorial-complete local QA users; never registers or modifies production accounts.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import fs from 'node:fs/promises';
const base=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:8798';
assert(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname),'Use isolated local test accounts');
const users=JSON.parse(await fs.readFile(process.env.LORE_TEST_USERS,'utf8'));
const ranked=process.env.LORE_TEST_RANKED==='1',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-duel-audit';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const contexts=[],pages=[],errors=[];
for(const u of users){const c=await browser.newContext({viewport:{width:1280,height:800}});await c.addCookies([{name:'lore_session',value:u.cookie.split('=')[1],url:base}]);await c.addInitScript(()=>localStorage.setItem('lore_lang','ja'));contexts.push(c);const p=await c.newPage();p.setDefaultTimeout(90000);p.on('pageerror',e=>errors.push(e.message));pages.push(p);}
const [p,q]=pages;

try{
 await q.goto(base);await q.locator('.lounge-home').waitFor();
 await q.evaluate(ranked=>{window.msgs=[];const connectRoom=m=>{window.roomId=m.roomId;window.side=m.you;window.roomSocket=new WebSocket('ws://'+location.host+'/ws/room/'+m.roomId);roomSocket.onopen=()=>roomSocket.send(JSON.stringify({type:'ready',openingVersion:2,mulliganVersion:1,turnReadyVersion:1,battleLogVersion:1}));roomSocket.onmessage=e=>{const m=JSON.parse(e.data);msgs.push(m);if(m.type==='preview')roomSocket.send(JSON.stringify({type:'startReady'}));if(m.type==='init'||m.type==='update'){window.state=m.state;roomSocket.send(JSON.stringify({type:'openingReady'}));if(m.state.mulligan&&!m.state.mulligan[side])setTimeout(()=>roomSocket.send(JSON.stringify({type:'action',action:{type:'mulligan',player:side,uids:[]}})),10000);roomSocket.send(JSON.stringify({type:'turnReady',turn:m.state.turn,cur:m.state.cur}));}};};window.queue=new WebSocket('ws://'+location.host+'/ws/queue'+(ranked?'?mode=ranked':''));queue.onopen=()=>queue.send(JSON.stringify({type:'queue'}));queue.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='matched'){connectRoom(m);queue.close();}};},ranked);
 await q.waitForTimeout(1000);console.log('OPP QUEUE',await q.evaluate(()=>window.queue.readyState));
 await p.goto(base);await p.locator('.lounge-home').waitFor();await p.locator('.screen-loader').waitFor({state:'detached'});console.log('HOME READY');if(!ranked)await p.locator('#online').click();await p.locator('#ranked').click();console.log('QUEUE CLICKED');if(ranked)await p.locator('#pvReady').click();
 await p.locator('.game').waitFor({timeout:45000});console.log('PASS matched and mounted the real online game');
 await p.locator('.hand-study .study-action').click();
 await q.waitForFunction(()=>window.state&&!state.mulligan);console.log('PASS mulligan');
 if(await q.evaluate(()=>state.cur===side))await q.evaluate(()=>roomSocket.send(JSON.stringify({type:'action',action:{type:'endTurn'}})));
 await q.waitForFunction(()=>state.cur!==side&&!state.turnReady);await p.waitForTimeout(1500);
 const before=await q.evaluate(()=>state.turn);await p.locator('#endBtn').click();await q.waitForFunction(t=>state.turn>t,before);console.log('PASS player endTurn');
 const room=await q.evaluate(()=>roomId),turn=await q.evaluate(()=>state.turn);
 await p.reload();await p.locator('.game').waitFor();await p.waitForTimeout(4000);
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('lore_game')).roomId),room);assert.equal(await q.evaluate(()=>state.turn),turn);console.log('PASS reload rejoined same room and turn');
 await p.screenshot({path:out+'/reconnected.png'});
 await q.evaluate(()=>roomSocket.send(JSON.stringify({type:'action',action:{type:'surrender',player:side}})));
 await p.locator('.finale-home').waitFor({timeout:45000});assert.equal(await p.evaluate(()=>localStorage.getItem('lore_game')),null);console.log('PASS surrender result and resume cleared');
 await p.screenshot({path:out+'/result.png'});
 await p.locator('.finale-home').click();await p.locator('.lounge-home').waitFor();
 if(ranked){const result=await p.evaluate(id=>fetch('/api/rank/result?matchId='+id).then(r=>r.json()),room);assert(result.result,'rank settlement receipt');console.log('PASS ranked settlement');}
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({errors,ranked,roomId:room,turn,checks:['matchmaking','opening','mulligan','endTurn','reload same room','opponent surrender','result','return HOME']},null,2));

}catch(e){console.log('PVP FAIL',e.message,'BODY',(await p.locator('body').innerText()).slice(-1800));console.log('OPP',await q.evaluate(()=>({queue:window.queue?.readyState,turn:window.state?.turn,over:window.state?.over})));await p.screenshot({path:out+'/failure.png'});throw e;}finally{await browser.close();}

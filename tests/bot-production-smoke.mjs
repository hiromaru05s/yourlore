/** Explicit live release QA: isolated temporary account/session, four private NPC
 * rooms, one observed BOT response and surrender per tier. Never public queue. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import WebSocket from 'ws';
assert.equal(process.env.LORE_BOT_LIVE_QA,'1','Explicit live QA opt-in required');
const origin=process.env.BOT_ORIGIN;
assert(['https://yourlore.xyz','https://test.yourlore.xyz'].includes(origin));
const out=process.env.BOT_QA_OUT;assert(out,'Set BOT_QA_OUT');await fs.mkdir(out,{recursive:true});
const staging=origin.includes('test.'),temp=await fs.mkdtemp('/tmp/lore-live-npc-'),id='qa-npc-'+randomUUID(),token=randomBytes(24).toString('hex'),now=Date.now(),peers=[],results=[];
let created=false,cleanup=false,failure;
const sql=async query=>{const file=temp+'/operation.sql';await fs.writeFile(file,query,{mode:0o600});const raw=execFileSync('npm',['exec','--','wrangler','d1','execute',staging?'lore-db-staging':'lore-db','--remote',...(staging?['--env','staging']:[]),'-c','server/wrangler.toml','--file',file,'--json'],{encoding:'utf8',timeout:120000});return JSON.parse(raw).flatMap(r=>r.results??[]);};
const call=async(path,body)=>{const r=await fetch(origin+'/api'+path,{method:body===undefined?'GET':'POST',headers:{cookie:'lore_session='+token,'content-type':'application/json',origin},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});const data=await r.json();assert.equal(r.status,200,path+': '+JSON.stringify(data));return data;};
const until=async(predicate,ms=50000)=>{const end=Date.now()+ms;while(!predicate()){if(Date.now()>end)throw Error('live NPC state timeout');await new Promise(r=>setTimeout(r,150));}};
try{
 created=true; // Cleanup also covers a partially completed insertion.
 await sql(`INSERT INTO users(id,email,password,display,username_set,verified,created_at,stats_public) VALUES('${id}','${id}@example.invalid','disabled:release-qa','NPC Release QA',1,1,${now},0); INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES('${token}','${id}',${now},${now+3600000});`);
 for(const tier of ['easy','normal','hard','hell']){
  const started=await call('/rewards/bot/start',{difficulty:tier,lang:'ja'}),peer={roomId:started.roomId,state:null,response:null,settled:false,errors:[],timer:null};
  assert.equal(started.difficulty,tier);
  const ws=peer.ws=new WebSocket(origin.replace('https','wss')+'/ws/room/'+peer.roomId,{handshakeTimeout:30000,headers:{cookie:'lore_session='+token,origin}});peers.push(peer);
  ws.on('message',raw=>{let msg;try{msg=JSON.parse(raw);}catch{return;}
   if(msg.type==='error')peer.errors.push(msg.message);
   if(msg.type==='rewardsSettled')peer.settled=true;
   if(msg.type==='init'||msg.type==='update'){
    const previous=peer.state;peer.state=msg.state;
    if(previous&&!msg.state.over&&msg.type==='update'){
     const a=previous.players[1],b=msg.state.players[1];
     if(JSON.stringify(a.uses)!==JSON.stringify(b.uses)||JSON.stringify(a.buys)!==JSON.stringify(b.buys)||(previous.cur===1&&msg.state.turn>previous.turn))peer.response={turn:msg.state.turn,uses:b.uses,buys:b.buys,eventTypes:[...new Set((msg.events??[]).map(e=>e.type))]};
    }
   }
  });
  await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
  ws.send(JSON.stringify({type:'ready',openingVersion:2,battleLogVersion:1}));ws.send(JSON.stringify({type:'openingReady'}));
  await until(()=>peer.state);assert.equal(peer.state.botDifficulty,tier);assert.equal(!!peer.state.botMarket,tier==='hard'||tier==='hell');
  if(peer.state.botMarket){assert.equal(peer.state.botMarket.side,1);assert(peer.state.botMarket.recent.length>=7);}
  const initialMarket=peer.state.market.map(c=>c.id);
  peer.timer=setInterval(()=>{const g=peer.state;if(!peer.response&&g&&!g.over&&g.cur===0&&!g.pending&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'action',action:{type:'endTurn'}}));},900);
  await until(()=>peer.response);clearInterval(peer.timer);peer.timer=null;
  ws.send(JSON.stringify({type:'action',action:{type:'surrender',player:0}}));await until(()=>peer.settled);
  const receipt=await call('/rewards/result?roomId='+peer.roomId);assert(receipt.settled);assert.equal(receipt.amount,0);assert.equal(peer.errors.length,0,peer.errors.join('; '));
  results.push({tier,authenticatedStart:true,marketBias:tier==='hard'||tier==='hell',initialMarket,botResponse:peer.response,surrenderSettled:true,receiptAmount:receipt.amount});ws.close();console.log('PASS live NPC',tier);
 }
}catch(e){failure=String(e.stack??e);}
finally{
 for(const p of peers){clearInterval(p.timer);if(p.ws.readyState===WebSocket.OPEN&&!p.settled){p.ws.send(JSON.stringify({type:'action',action:{type:'surrender',player:0}}));await until(()=>p.settled,30000).catch(()=>{});}p.ws.close();}
 try{
  if(created){
   assert(peers.every(p=>p.settled),'Keep isolated QA account until every room has settled; prevents a late result recreating deleted records');
   const tables=await sql("SELECT DISTINCT m.name FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type='table' AND p.name='user_id' ORDER BY m.name;");
   assert(tables.every(t=>/^[A-Za-z0-9_]+$/.test(t.name)));
   const botIds=['easy','normal','hard','hell'].map(t=>`'lore-challenge-bot-${t}'`).join(',');
   await sql(tables.map(t=>`DELETE FROM "${t.name}" WHERE user_id='${id}';`).join('\n')+`\nUPDATE users SET wins=MAX(0,wins-(SELECT COUNT(*) FROM matches WHERE winner=users.id AND player_a='${id}')) WHERE id IN (${botIds}); DELETE FROM matches WHERE player_a='${id}' OR player_b='${id}'; DELETE FROM friends WHERE user_a='${id}' OR user_b='${id}'; DELETE FROM challenges WHERE challenger='${id}' OR target='${id}'; DELETE FROM users WHERE id='${id}';`);
   assert.equal((await sql(`SELECT COUNT(*) AS n FROM users WHERE id='${id}';`))[0].n,0);
  }
  cleanup=true;
 }catch(e){failure=(failure?failure+'\n':'')+'QA cleanup failed: '+String(e);}
 await fs.writeFile(out+'/authenticated-npc.json',JSON.stringify({origin,at:new Date().toISOString(),scope:'temporary QA account and persisted session; authenticated API/WebSocket NPC start, observed BOT response and surrender settlement; not human strength or a full played match',results,cleanup,...(failure?{failure,...(!cleanup?{qaAccountId:id,rooms:peers.map(p=>({id:p.roomId,settled:p.settled}))}:{})}:{})},null,2));
 await fs.rm(temp,{recursive:true,force:true});
}
if(failure)throw Error(failure);

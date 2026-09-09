/** Uses two explicitly provisioned ephemeral staging accounts; no public queue. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import WebSocket from 'ws';
import {build} from 'esbuild';
const origin='https://test.yourlore.xyz';
const users=JSON.parse(await fs.readFile(process.env.LORE_QA_AUTH_FILE,'utf8'));
assert.equal(users.length,2);assert(users.every(u=>u.id.startsWith('qa-release-')));
const output='docs/ui-rework/2026-09-09-release';
await build({stdin:{contents:"export {greedyDecide,candidates} from './client/src/shared/bot';export {actingSide} from './client/src/shared/engine';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:'/tmp/lore-online-release-bot.mjs'});
const {greedyDecide,candidates,actingSide}=await import('/tmp/lore-online-release-bot.mjs');
const api=async(i,path,body)=>{const res=await fetch(origin+'/api'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',cookie:'lore_session='+users[i].token},body:body?JSON.stringify(body):undefined});assert.equal(res.status,200,path);return res.json();};
const {id}=await api(0,'/social/challenge',{user_id:users[1].id});
const game=await api(1,'/social/challenge/respond',{id,accept:true});
assert(game.roomId);await fs.writeFile('/tmp/lore-release-qa-room.json',JSON.stringify(game));
const peers=[],events=[],errors=[];let actions=0,reconnected=false;
async function connect(i){
 const peer={ws:new WebSocket(origin.replace('https','wss')+'/ws/room/'+game.roomId,{headers:{cookie:'lore_session='+users[i].token}}),state:null,revision:0};
 peer.ws.on('message',raw=>{const m=JSON.parse(raw.toString());if(m.type==='error')errors.push(m.message);if(m.state){peer.state=m.state;peer.revision++;events.push(...(m.events||[]).map(e=>e.type));}});
 await new Promise((r,j)=>{peer.ws.once('open',r);peer.ws.once('error',j);});peer.ws.send(JSON.stringify({type:'ready'}));peers[i]=peer;await until(()=>!!peer.state);return peer;
}
async function until(test,ms=12000){const end=Date.now()+ms;while(!test()){if(Date.now()>end)throw Error('Staging response timeout');await new Promise(r=>setTimeout(r,80));}}
try{
 await Promise.all([connect(0),connect(1)]);
 for(const [i,p]of peers.entries()){
  assert(p.state.players[1-i].hand.every(c=>c.id==='HIDDEN'));assert.equal(p.state.rng,0);assert(p.state.players[i].quests==null||Array.isArray(p.state.players[i].quests));
  assert([...p.state.market,...p.state.players[i].supply].filter(Boolean).every(c=>c.t!=='trap'));
 }
 for(let n=0;n<140&&!peers[0].state.over;n++){
  const side=actingSide(peers[0].state),peer=peers[side];const g=peer.state;
  const options=candidates(g);const quick=options.find(a=>['buyMarket','buySupply'].includes(a.type)&&((a.type==='buyMarket'?g.market:g.players[g.cur].supply)[a.i]?.quick));
  const quest=options.find(a=>['buyMarket','buySupply'].includes(a.type)&&((a.type==='buyMarket'?g.market:g.players[g.cur].supply)[a.i]?.t==='quest'));
  const action=quick||quest||greedyDecide(g),rev=peer.revision;
  peer.ws.send(JSON.stringify({type:'action',action}));await until(()=>peer.revision>rev);actions++;
  // Pace below the production flood guard (60 messages/10 seconds/socket).
  await new Promise(r=>setTimeout(r,210));
  if(n===35){const old=peers[1].ws;old.close();await connect(1);reconnected=true;assert(peers[1].state.turn>=g.turn);}
 }
 if(!peers[0].state.over){const rev=peers[0].revision;peers[0].ws.send(JSON.stringify({type:'action',action:{type:'surrender',player:0}}));await until(()=>peers[0].revision>rev&&peers[0].state.over);}
 assert(peers[0].state.over);assert(peers[0].state.turn>3);assert(events.includes('buy'));assert(events.includes('playSpell'));assert.deepEqual(errors,[]);
 const report={origin,roomId:game.roomId,actions,turn:peers[0].state.turn,reconnected,over:peers[0].state.over,events:[...new Set(events)],errors,checks:['two isolated authenticated users','friendly room creation','live authoritative actions','hidden opponent hand and RNG','public quest arrays','no traps in market','reconnect restores live state','completed match']};
 await fs.writeFile(output+'/staging-online.json',JSON.stringify(report,null,2));console.log('PASS:',JSON.stringify(report));
}finally{for(const p of peers)p?.ws.close();}

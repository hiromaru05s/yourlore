import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import WebSocket from 'ws';
import {build} from 'esbuild';
const origin='https://test.yourlore.xyz';
const users=JSON.parse(await fs.readFile(process.env.LORE_QA_AUTH_FILE,'utf8'));assert.equal(users.length,2);assert(users.every(u=>u.id.startsWith('qa-lounge-')));
const out='docs/ui-rework/2026-09-21-lounge';
await build({stdin:{contents:"export {greedyDecide} from './client/src/shared/bot';export {actingSide} from './client/src/shared/engine';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:'/tmp/lore-lounge-bot.mjs'});
const {greedyDecide,actingSide}=await import('/tmp/lore-lounge-bot.mjs');
const api=async(i,path,body)=>{const r=await fetch(origin+'/api'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',cookie:'lore_session='+users[i].token},body:body?JSON.stringify(body):undefined});assert.equal(r.status,200,path);return r.json();};
async function until(f,ms=20000){const end=Date.now()+ms;while(!f()){if(Date.now()>end)throw Error('Timed out');await new Promise(r=>setTimeout(r,100));}}
const queues=[],peers=[],errors=[];let actions=0;
const queue=i=>new Promise((resolve,reject)=>{const w=new WebSocket(origin.replace('https','wss')+'/ws/queue?mode=ranked',{headers:{cookie:'lore_session='+users[i].token}});queues.push(w);w.on('open',()=>w.send(JSON.stringify({type:'queue'})));w.on('error',reject);w.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='matched'){if(m.oppName!==users[1-i].display){w.close();reject(Error('Unexpected opponent: aborted before joining'));return;}resolve(m);}if(m.type==='error')reject(Error(m.message));});setTimeout(()=>reject(Error('Queue timeout')),12000).unref();});
const connect=async(i,game)=>{const peer={ws:new WebSocket(origin.replace('https','wss')+'/ws/room/'+game.roomId,{headers:{cookie:'lore_session='+users[i].token}}),state:null,revision:0,rank:null};peer.ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='preview')peer.ws.send(JSON.stringify({type:'startReady'}));if(m.type==='error')errors.push(m.message);if(m.state){peer.state=m.state;peer.revision++;}if(m.type==='rankResult')peer.rank=m;});await new Promise((r,j)=>{peer.ws.once('open',r);peer.ws.once('error',j);});peer.ws.send(JSON.stringify({type:'ready'}));peers[i]=peer;await until(()=>peer.state);return peer;};
try{
 const before=await Promise.all(users.map((_,i)=>api(i,'/rank/me')));assert(before.every(r=>r.rating.mmr===2000000));
 const games=await Promise.all([queue(0),queue(1)]);assert.equal(games[0].roomId,games[1].roomId);queues.forEach(w=>w.close());await Promise.all([connect(0,games[0]),connect(1,games[1])]);
 const bySide=()=>[0,1].map(side=>peers[games.findIndex(g=>g.you===side)]);
 for(let n=0;n<16&&!peers[0].state.over;n++){const side=actingSide(peers[0].state),peer=bySide()[side],rev=peer.revision;peer.ws.send(JSON.stringify({type:'action',action:greedyDecide(peer.state)}));await until(()=>peer.revision>rev);actions++;await new Promise(r=>setTimeout(r,250));}
 if(!peers[0].state.over){const loserSide=games[0].you;peers[0].ws.send(JSON.stringify({type:'action',action:{type:'surrender',player:loserSide}}));}
 await until(()=>peers.every(p=>p.rank&&p.state.over));
 const final=await Promise.all(users.map((_,i)=>api(i,'/rank/me')));const changes=final.map((r,i)=>r.rating.mmr-before[i].rating.mmr);assert.deepEqual(changes,[-16,18]);
 const profile=await api(1,'/social/profile');assert.equal(profile.profile.wins,1);assert.equal(profile.profile.recent[0].mode,'ranked');
 peers[0].ws.close();const resumed=await connect(0,games[0]);await until(()=>resumed.rank);assert.equal(resumed.rank.after,1999984);
 resumed.ws.send(JSON.stringify({type:'action',action:{type:'surrender',player:games[0].you}}));await new Promise(r=>setTimeout(r,500));const duplicate=await api(0,'/rank/me');assert.equal(duplicate.rating.mmr,1999984);assert.equal(duplicate.rating.losses,1);
 const leaderboard=await api(0,'/rank/leaderboard');assert(leaderboard.entries.some(e=>e.display===users[1].display&&e.mmr===2000018));assert.deepEqual(errors,[]);
 const report={origin,actions,roomId:games[0].roomId,changes,reconnected:true,duplicateResultUnchanged:true,profileAndLeaderboard:true,errors,checks:['authenticated ranked queue with two isolated QA ratings','opponent identity checked before joining','authoritative actions','surrender settlement +18/-16','rankResult over WebSocket','profile/leaderboard use committed MMR','reconnect repeats same outcome without applying twice']};await fs.writeFile(out+'/staging-online.json',JSON.stringify(report,null,2));console.log('PASS',JSON.stringify(report));
}finally{queues.forEach(w=>w.close());peers.forEach(p=>p?.ws.close());}

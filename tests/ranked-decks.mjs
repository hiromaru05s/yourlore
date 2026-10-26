import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {journalState} from './fixtures/journalStorage.mjs';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
const dir=await mkdtemp('/tmp/lore-ranked-decks-');
try {
 await build({stdin:{contents:`export {recordRankedDecks} from './server/src/rankedDecks';export {handleRank,seasonKey} from './server/src/rank';export {GameRoom} from './server/src/gameRoom';export {DEFAULT_DECK_8,DECK_POOL} from './client/src/shared/cards';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const {recordRankedDecks,handleRank,seasonKey,GameRoom,DEFAULT_DECK_8,DECK_POOL}=await import(dir+'/test.mjs');
 const env=rewardTestEnv(),sql=async(q,...args)=>env.DB.prepare(q).bind(...args).run();
 const season=seasonKey();
 // A private profile is still public in the top 100; bare high MMR is ineligible.
 for(let i=1;i<=101;i++){
  const id='leader-'+i;
  await sql('INSERT INTO users(id,email,password,display,stats_public,created_at) VALUES (?,?,?,?,0,0)',id,id+'@invalid.test','disabled',id);
  await sql('INSERT INTO ratings(user_id,season,mmr,wins,losses,peak_mmr,updated_at) VALUES (?,?,?,1,0,?,1)',id,season,2000-i,2000-i);
 }
 await sql('INSERT INTO ratings(user_id,season,mmr,wins,losses,peak_mmr,updated_at) VALUES (?,?,9999,0,0,9999,0)','a',season);
 const get=async(id,method='GET')=>handleRank(env,new Request('https://local/api/rank/decks?userId='+encodeURIComponent(id),{method}),'/rank/decks',null);
 assert.equal((await get('leader-100')).status,200);assert.equal((await get('leader-101')).status,404);assert.equal((await get('a')).status,404);
 assert.deepEqual((await (await get('leader-1')).json()).decks,[]);
 const variants=DECK_POOL.filter(id=>id!=='STARTER_TRASH').slice(0,4).map(id=>[...DEFAULT_DECK_8.slice(1),id]);
 const record=(deck,at)=>recordRankedDecks(env,[{id:'leader-100',deck:deck.join(',')}],at);
 for(let i=0;i<4;i++)await record(variants[i],100+i);
 let result=await (await get('leader-100')).json();
 assert.equal(result.rank,100);assert.equal(result.decks.length,3);
 assert.deepEqual(result.decks.map(d=>d.lastUsedAt),[103,102,101]);
 assert(result.decks.every(d=>d.cards.length===9&&d.cards[0]==='STARTER_MANA'));
 await record([...variants[1]].reverse(),104);await record(variants[1],104);
 result=await (await get('leader-100')).json();assert.deepEqual(result.decks.map(d=>d.lastUsedAt),[104,103,102]);
 assert.deepEqual(result.decks[0].cards.slice(1),[...variants[1]].sort(),'same multiset, including counts, deduplicates');
 await record(variants[0],1);assert.deepEqual((await (await get('leader-100')).json()).decks,result.decks,'late retry cannot displace recent decks');
 await sql('UPDATE ratings SET mmr=0 WHERE user_id=?','leader-100');assert.equal((await get('leader-100')).status,404,'falling outside 100 revokes direct API access');
 assert.equal((await get('leader-1','POST')).status,405);assert.equal((await get('')).status,400);
 const lb=await (await handleRank(env,new Request('https://local/rank/leaderboard'),'/rank/leaderboard',null)).json();assert.equal(lb.entries[0].userId,'leader-1');
 // Room result path: neither casual, void nor unfinished rooms record decks.
 async function completedRoom(ranked,ready=[true,true]) {
  const roomEnv=rewardTestEnv();let saved;
  const state=journalState({id:{toString:()=>`test-${ranked}-${ready}`},storage:{get:async()=>saved,put:async(k,v)=>{saved=structuredClone(v);},setAlarm:async()=>{},deleteAlarm:async()=>{}},getWebSockets:()=>[]});
  const room=new GameRoom(state,roomEnv);
  await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({seed:42,ranked,players:[{id:'a',name:'A'},{id:'b',name:'B'}]})}));
  room.room.readied=ready;room.room.game.over=true;room.room.game.winner=null;
  await room.settleResult();
  assert(room.room.recorded,'settlement completes');
  const count=()=>roomEnv.DB.prepare('SELECT COUNT(*) AS n FROM ranked_recent_decks').first();
  const expected=ranked&&ready.every(Boolean)?2:0;
  assert.equal((await count()).n,expected);
  assert.equal((await roomEnv.DB.prepare('SELECT COUNT(*) AS n FROM ranked_match_decks').first()).n,expected,'completed ranked room records per-match starting decks');
  await room.settleResult();assert.equal((await count()).n,expected,'retry never duplicates');
 }
 await completedRoom(true);await completedRoom(false);await completedRoom(true,[true,false]);
 console.log('PASS ranked decks: current top 100 including private profiles, 101 blocked, ineligible excluded, 3 distinct multisets, 9 cards, recency, retries, rank revocation, methods, empty, identity, void rooms');
} finally {await rm(dir,{recursive:true,force:true});}

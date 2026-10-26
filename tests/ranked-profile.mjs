import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
const dir=await mkdtemp('/tmp/lore-ranked-profile-');
try{
 await build({stdin:{contents:`export {rankedProfile,rankedPurchases} from './server/src/rankedProfile';export {recordRankedDecks} from './server/src/rankedDecks';export {handleSocial} from './server/src/social';export {handleRank,seasonKey} from './server/src/rank';export {DEFAULT_DECK_8,DB} from './client/src/shared/cards';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const {rankedProfile,rankedPurchases,recordRankedDecks,handleSocial,handleRank,seasonKey,DEFAULT_DECK_8,DB}=await import(dir+'/test.mjs');
 const env=rewardTestEnv(),run=async(q,...args)=>env.DB.prepare(q).bind(...args).run();
 const [c1,c2,c3,c4,c5,c6]=Object.keys(DB);
 assert.equal((await rankedProfile(env,'a')).winRate,null);
 assert.deepEqual((await rankedProfile(env,'a')).recentDecks,[]);
 async function match(id,at,buys,winner='a',mode='ranked',ended=at,reverse=false){await run('INSERT INTO matches(id,player_a,player_b,winner,mode,created_at,ended_at,buys_a,buys_b) VALUES (?,?,?,?,?,?,?,?,?)',id,reverse?'b':'a',reverse?'a':'b',winner,mode,at-10,ended,reverse?'{}':buys,reverse?buys:'{}');}
 await match('old',1,JSON.stringify({[c1]:1}));
 await match('one',100,JSON.stringify({[c1]:50,[c2]:1,[c3]:1,[c4]:1,[c5]:1,[c6]:1}));
 await match('two',200,JSON.stringify({[c1]:1,[c2]:3}),'b','ranked',200,true);
 await match('three',300,'{}',null);
 await match('missing',400,null,'a');
 await match('bad',500,'broken','b');
 await match('not-object',600,'[]','b');
 await match('casual',700,JSON.stringify({[c6]:999}),'a','online');
 await match('ongoing',800,JSON.stringify({[c6]:999}),'a','ranked',null);
 const snapshot=id=>recordRankedDecks(env,[{id:'a',deck:DEFAULT_DECK_8.join(',')}],id==='three'?300:200,id);
 await snapshot('two');await snapshot('three');await snapshot('three');
 let data=await rankedProfile(env,'a');
 assert.deepEqual([data.games,data.wins,data.losses,data.draws],[7,3,3,1]);assert.equal(data.winRate,3/7);
 assert.deepEqual(data.recentDecks.map(d=>d.matchId),['not-object','bad','missing']);assert(data.recentDecks.every(d=>d.cards===null),'no substituting older distinct decks');
 assert.equal(data.purchases.sampleGames,4);assert.equal(data.purchases.cards.length,5);assert.equal(data.purchases.cards[0].id,c1);assert.equal(data.purchases.cards[0].rate,3/4,'multiple purchases in one game count once');
 assert.equal(data.purchases.cards.find(c=>c.id===c2).rate,2/4);
 await run("DELETE FROM matches WHERE id IN ('missing','bad','not-object')");
 data=await rankedProfile(env,'a');assert.deepEqual(data.recentDecks.map(d=>d.matchId),['three','two','one']);
 assert.deepEqual(data.recentDecks[0].cards,data.recentDecks[1].cards,'consecutive identical decks remain separate');assert.equal(data.recentDecks[0].cards.length,9);assert.equal(data.recentDecks[2].cards,null);
 assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM ranked_match_decks').first()).n,2,'retries are idempotent');
 const batch=await rankedPurchases(env,['a','b','qa-a']);assert.equal(batch.get('qa-a').sampleGames,0);assert.equal(batch.get('b').cards.length,0,'player sides stay isolated');
 const viewer={id:'b',email:'b@fixture.invalid',display:'b'};
 const profile=async()=> (await (await handleSocial(env,new Request('https://local/api/social/profile?id=a'),'/social/profile',viewer)).json()).profile;
 await run('UPDATE users SET stats_public=1 WHERE id=?','a');assert.equal((await profile()).ranked.games,4);
 await run('UPDATE users SET stats_public=0 WHERE id=?','a');assert.equal((await profile()).ranked,undefined,'private profiles must not disclose telemetry');
 await run('INSERT OR REPLACE INTO ratings(user_id,season,mmr,wins,losses,peak_mmr,updated_at) VALUES (?,?,1100,2,1,1100,1)','a',seasonKey());
 const leaderboard=async()=> (await (await handleRank(env,new Request('https://local/api/rank/leaderboard'),'/rank/leaderboard',null)).json()).entries;
 assert.deepEqual((await leaderboard())[0].purchases.cards,[],'leaderboard must honor purchase-history privacy');
 await run('UPDATE users SET stats_public=1 WHERE id=?','a');assert.equal((await leaderboard())[0].purchases.cards[0].id,c1);
 // Additive migration can be applied twice and does not fabricate a legacy deck.
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE users(id TEXT PRIMARY KEY);CREATE TABLE matches(id TEXT PRIMARY KEY,player_a TEXT,player_b TEXT,mode TEXT,ended_at INTEGER);');
 const migration=await readFile('server/migrations/0027_ranked_match_decks.sql','utf8');db.exec(migration);db.exec(migration);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ranked_match_decks').get().n,0);db.close();
 console.log('PASS ranked profile: ranked-only totals and draws, duplicate decks per game, unknown historical decks, purchases per game and player, top five, missing/malformed telemetry, privacy, idempotent migration');
}finally{await rm(dir,{recursive:true,force:true})}

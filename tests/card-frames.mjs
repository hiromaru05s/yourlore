import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
const dir=await fs.mkdtemp('/tmp/lore-frames-');
try{
 await build({stdin:{contents:`export {default as worker} from './server/src/index';export {getUser} from './server/src/auth';export {CARD_FRAMES} from './client/src/shared/cardFrames';export {createGame,reduce} from './client/src/shared/engine';export {DB,STARTERS,sanitizeDecks} from './client/src/shared/cards';export {syncCardFrames,frameForCard,clearCardFrameContext} from './client/src/ui/cardFrame';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/module.mjs'});
 const {worker,getUser,CARD_FRAMES,createGame,reduce,DB,STARTERS,sanitizeDecks,syncCardFrames,frameForCard,clearCardFrameContext}=await import(dir+'/module.mjs');
 assert.deepEqual(CARD_FRAMES.map(x=>x.price),[30000,50000,200000,100000,200000]);
 const db=new DatabaseSync(':memory:');db.exec(`CREATE TABLE player_experience(user_id TEXT,exp INT);CREATE TABLE experience_events(user_id TEXT,key TEXT);CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT,display TEXT,wins INT,losses INT,credits INT,avatar TEXT,badge TEXT,sleeve TEXT,furniture TEXT,deck TEXT,decks TEXT,sleeves TEXT,starter_cards TEXT,username_set INTEGER DEFAULT 1);CREATE TABLE sessions(token TEXT,user_id TEXT,expires_at INT);CREATE TABLE challenges(id TEXT,challenger TEXT,target TEXT,status TEXT,created_at INT,room_id TEXT);`);
 for(const id of ['a','b']){db.prepare('INSERT INTO users(id,email,display,wins,losses,credits,sleeves) VALUES(?,?,?,0,0,?,?)').run(id,id+'@test',id,id==='a'?580000:29999,'[]');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(id+'-session',id,Date.now()+600000);}
 let queued,setup;const env={APP_ORIGIN:'*',DB:{prepare(sql){let args=[];return {bind(...values){args=values;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};}},MATCHMAKER:{idFromName:x=>x,get(){return {fetch(req){queued=new URL(req.url);return new Response('queued');}};}},GAME_ROOM:{idFromName:x=>x,get(){return {fetch:async(url,init)=>{setup=JSON.parse(init.body);return new Response('{}');}};}}};
 const req=(path,body,who='a')=>new Request('https://test.yourlore.xyz'+path,{method:body?'POST':'GET',headers:{Cookie:`lore_session=${who}-session`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const call=(path,body,who)=>worker.fetch(req(path,body,who),env);
 let store=(await getUser(env,req('/api/auth/me'))).decks;
 const forged=structuredClone(store);forged.list[0].frame=CARD_FRAMES[0].id;assert.equal((await call('/api/deck',{decks:forged})).status,400,'unowned frame rejected');
 assert.equal((await call('/api/social/buy-cosmetic',{id:CARD_FRAMES[0].id,price:0},'b')).status,400,'server rejects insufficient balance and ignores forged price');
 assert.equal((await call('/api/social/buy-cosmetic',{id:'frame:missing'})).status,400);
 assert.equal((await call('/api/social/buy-cosmetic',{id:'sleeve:gacha-goldfault'})).status,400,'gacha-only rewards remain unavailable for direct sale');
 for(const item of CARD_FRAMES){const rs=await Promise.all([call('/api/social/buy-cosmetic',{id:item.id}),call('/api/social/buy-cosmetic',{id:item.id})]);for(const r of rs)assert.equal(r.status,200);}
 const row=db.prepare("SELECT credits,sleeves FROM users WHERE id='a'").get();assert.equal(row.credits,0);assert.equal(JSON.parse(row.sleeves).length,5,'retries grant/debit once');
 for(let i=0;i<5;i++)store.list[i].frame=CARD_FRAMES[i].id;store.sel=2;assert.equal((await call('/api/deck',{decks:store})).status,200);
 let user=await getUser(env,req('/api/auth/me'));assert.equal(user.frame,CARD_FRAMES[2].id);assert.deepEqual(user.frames,CARD_FRAMES.map(x=>x.id));
 const old=structuredClone(store);for(const d of old.list)delete d.frame;assert.equal((await call('/api/deck',{decks:old})).status,200);user=await getUser(env,req('/api/auth/me'));assert.deepEqual(user.decks,store,'legacy saves preserve frames');
 await call('/ws/queue?frame=frame:flowing-gold');assert.equal(queued.searchParams.get('frame'),CARD_FRAMES[2].id,'queue ignores client equipment forgery');
 db.prepare('INSERT INTO challenges VALUES(?,?,?,?,?,?)').run('challenge','a','b','pending',Date.now(),null);assert.equal((await call('/api/social/challenge/respond',{id:'challenge',accept:true},'b')).status,200);assert.equal(setup.players[0].frame,CARD_FRAMES[2].id);assert.equal(setup.players[1].frame,'default');
 store.list[2].frame='default';assert.equal((await call('/api/deck',{decks:store})).status,200);assert.equal((await getUser(env,req('/api/auth/me'))).frame,'default');assert.equal(sanitizeDecks({list:[{frame:'effect:stardust-foil'}]}).list[0].frame,'default');
 // Ownership persists across public zones and departed-card animation; offers stay uncoated.
 const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.frames=[CARD_FRAMES[0].id,CARD_FRAMES[2].id];
 syncCardFrames(g,0);const starter=g.players[0].hand[0]??g.players[0].deck[0];assert.equal(frameForCard(starter.uid),CARD_FRAMES[0].id);
 const bought={...DB.ELF,uid:'bought'};g.players[0].discard.push(bought);syncCardFrames(g,0);assert.equal(frameForCard(bought.uid),CARD_FRAMES[0].id);assert.equal(frameForCard(g.market[0].uid),'default');
 g.players[0].discard=[];g.players[0].field.push({...bought,dmg:0});syncCardFrames(g,0);assert.equal(frameForCard(bought.uid),CARD_FRAMES[0].id);g.players[0].field=[];syncCardFrames(g,0);assert.equal(frameForCard(bought.uid),CARD_FRAMES[0].id,'departed UID remains available');
 g.players[1].discard.push(bought);syncCardFrames(g,0);assert.equal(frameForCard(bought.uid),CARD_FRAMES[2].id,'transfer follows current owner');clearCardFrameContext();assert.equal(frameForCard(bought.uid),'default');
 db.close();console.log('PASS frame prices, atomic/retry-safe purchase, insufficient/forged price, ownership, five presets, old clients, auth/queue/friendly equipment, starter/market acquisition/zone/transfer/cleanup');
}finally{await fs.rm(dir,{recursive:true,force:true});}

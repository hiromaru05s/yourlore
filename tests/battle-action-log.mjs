import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
const dir=await mkdtemp('/tmp/lore-battle-log-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/engine'; export * from './client/src/shared/cards'; export * from './client/src/shared/battleLog'; export * from './client/src/shared/logEn'; export * from './server/src/gameInput'; export {GameRoom} from './server/src/gameRoom';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/e.mjs'});
 const {createGame,reduce,DB,STARTERS,battleLogEvents,logToEn,resolveTurnTimeout,GameRoom}=await import(dir+'/e.mjs');
 let seq=0;const card=id=>({...structuredClone(DB[id]??STARTERS[id]),uid:'log-'+(++seq)});
 const mon=id=>({...card(id),dmg:0,exhausted:false,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0});
 const fresh=(side=0)=>{const g=createGame({mode:'online',seed:42,starting:side,p0:{id:'a',name:'Alice'},p1:{id:'b',name:'Bob'}}).state;g.turn=3;g.pending=null;for(const p of g.players)Object.assign(p,{hp:200,mana:30,maxMana:30,hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],removed:[]});return g;};
 const lines=r=>battleLogEvents(r.events).filter(e=>e.type==='log');
 const ja=r=>lines(r).map(e=>e.htmlJa).join('\n');
 for(const side of [0,1]) {
  for(const token of [0,2]) {const g=fresh(side);g.players[side].refreshTokens=token;const r=reduce(g,{type:'refresh'});assert.match(ja(r),/マーケットをリロール/);assert.match(ja(r),token?/カウンター消費 · 残り1/:/1マナ/);for(const c of r.state.players[side].supply.filter(Boolean))assert(ja(r).includes(`data-card="${c.id}"`));assert(!/[가-힣]/.test(logToEn(lines(r)[0].html).replace(/<b[^>]*>.*?<\/b>/g,'')),'English refresh');}
  {const g=fresh(side);g.players[side].mana=0;assert.equal(lines(reduce(g,{type:'refresh'})).length,0);g.players[side].refreshBlockTurn=true;assert.equal(lines(reduce(g,{type:'refresh'})).length,0);}
  {const g=fresh(side);g.players[side].field=[mon('M1'),mon('M2')];const r=reduce(g,{type:'reorder',from:0,to:1});assert.match(ja(r),/並べ替え \(1 → 2\)/);assert.equal(lines(reduce(g,{type:'reorder',from:0,to:0})).length,0);}
  {const g=fresh(side);const c=card('M1');g.players[side].discard=[c];g.pending={kind:'recall',reason:'recall',allowCancel:true,hint:'recall',hintJa:'回収'};assert(ja(reduce(g,{type:'pick',uid:c.uid})).includes('data-card="M1"'));}
  {const g=fresh(side);const c=card('M2');g.players[side].deck=[c];g.pending={kind:'seek',reason:'seek',allowCancel:true,hint:'seek',hintJa:'サーチ'};const r=reduce(g,{type:'pick',uid:c.uid});assert.match(ja(r),/1枚サーチ/);assert(!ja(r).includes('data-card="M2"'),'searched private card stays hidden');}
  {const g=fresh(side);g.pending={kind:'seek',reason:'seek',allowCancel:true,hint:'seek',hintJa:'サーチ'};assert.match(ja(reduce(g,{type:'pick',uid:null})),/選択効果を終了/);g.pending.reason='attack';assert.equal(lines(reduce(g,{type:'pick',uid:null})).length,0,'uncommitted targeting stays out');}
  {const g=fresh(side);g.players[side].hand=[card('STARTER_CHEST')];g.players[side].enchants=[{card:card('FATE_WHEEL'),turns:99,bornTurn:1}];const first=reduce(g,{type:'play',idx:0});assert.equal(first.state.pending.kind,'reroll');assert.match(ja(reduce(first.state,{type:'pick',uid:null})),/出目を維持/);assert.match(ja(reduce(first.state,{type:'pick',uid:'re'})),/巻き戻して振り直す/);}
  {const g=fresh(side);g.players[side].hand=[card('M1')];const r=reduce(g,{type:'play',idx:0});assert(lines(r).length,'play');assert(lines(reduce(r.state,{type:'attack',uid:r.state.players[side].field[0].uid})).length,'direct attack');}
  {const g=fresh(side);g.players[side].field=[mon('M1')];g.players[1-side].field=[mon('M2')];const r=reduce(g,{type:'attack',uid:g.players[side].field[0].uid});assert.equal(r.state.pending?.reason,'attack');assert(lines(reduce(r.state,{type:'chooseTarget',uid:g.players[1-side].field[0].uid})).length,'targeted attack');}
  for(const type of ['buyMarket','buySupply']){const g=fresh(side);assert(lines(reduce(g,{type,i:0})).length,type);}
  {const g=fresh(side);const r=reduce(g,{type:'endTurn'});assert.match(ja(r),/ターン終了/);const h=r.events.findIndex(e=>e.type==='turnHeader');assert(h>0);assert.equal(r.events[h].player,1-side);assert.match(ja(resolveTurnTimeout(g)),/時間切れ/);assert.match(ja(reduce(g,{type:'surrender',player:side})),/降参/);}
  {const g=fresh(side);g.players[side].field=[mon('M1')];g.players[side].field[0].atk=0;const r=reduce(g,{type:'attack',uid:g.players[side].field[0].uid});assert(r.events.some(e=>e.type==='log'&&e.rejected));assert.equal(lines(r).length,0);}
  {const g=fresh(side);g.players[side].hand=[{...card('M1'),t:'trap',react:'half',name:'Hidden trap'}];const r=reduce(g,{type:'play',idx:0});assert.match(ja(r),/正体は非公開/);assert(!ja(r).includes('data-card='),'set trap identity stays hidden');}
 }
 for(const side of [0,1]) {
  for(const choice of ['shield','buff']){const g=fresh(side);g.players[side].field=[mon('M1')];g.pending={kind:'cardChoice',owner:side,reason:'ARMORER_MODE',allowCancel:false,hint:'',hintJa:'',data:{sourceId:'APPRENTICE_ARMORER',sourceUid:'absent',shield:4,buff:1}};assert.match(ja(reduce(g,{type:'pick',uid:choice})),/を選択/);}
  for(const reason of ['ARMORER_TARGET','SELECTED_SWORD']){const g=fresh(side),m=mon('M1');g.players[side].field=[m];g.pending={kind:'cardChoice',owner:side,reason,allowCancel:true,hint:'',hintJa:'',data:{sourceId:'APPRENTICE_ARMORER',sourceUid:'absent',buff:1,amount:4}};assert.match(ja(reduce(g,{type:'pick',uid:m.uid})),/攻撃力/);}
  for(const choice of ['done','remove']){const g=fresh(side),c=card('M1');g.players[1-side].hand=[c];g.pending={kind:'cardChoice',owner:side,reason:'HIGH_ELF_HAND',allowCancel:false,hint:'',hintJa:'',data:{left:1}};const r=reduce(g,{type:'pick',uid:choice==='done'?'done':c.uid});assert.match(ja(r),choice==='done'?/手札の確認を終了/:/ゲームから除外/);if(choice==='done')assert(!ja(r).includes('data-card="M1"'));}
  for(const reason of ['WORLD_TREE_ATTACK','WORLD_TREE_DEFEND'])for(const choice of ['grow','pass']){const g=fresh(),a=mon('M1'),d=mon('M2');g.players[0].field=[a,mon('WORLD_TREE')];g.players[1].field=[d,mon('WORLD_TREE')];const owner=reason==='WORLD_TREE_ATTACK'?0:1;g.players[owner].dew=2;g.pending={kind:'cardChoice',owner,reason,allowCancel:false,hint:'',hintJa:'',data:{attackerUid:a.uid,targetUid:d.uid}};assert.match(ja(reduce(g,{type:'pick',uid:choice})),choice==='grow'?/雫1を消費/:/雫を消費せず続行/);}
 }
 const effect={type:'log',html:'몬스터 존이 가득 차 소환 실패',htmlJa:'モンスターゾーンが満杯で召喚できません'};
 assert.deepEqual(battleLogEvents([effect]),[effect],'resolved failures must survive, regardless of words');
 // Real authoritative socket path, with atomic multi-key storage and hibernation.
 const values=new Map(),sockets=[0,1].map(side=>({side,connected:true,messages:[],deserializeAttachment:()=>({side,gen:0}),send(s){this.messages.push(JSON.parse(s));},close(){}}));
 let fail=false;
 const storage={get:async k=>structuredClone(values.get(k)),put:async(k,v)=>{if(fail)throw Error('write failed');for(const [key,value]of Object.entries(typeof k==='string'?{[k]:v}:k))values.set(key,structuredClone(value));},list:async({prefix})=>new Map([...values].filter(([k])=>k.startsWith(prefix)).sort(([a],[b])=>a.localeCompare(b))),setAlarm:async()=>{},deleteAlarm:async()=>{}};
 const state={storage,getWebSockets:tag=>sockets.filter(s=>s.connected&&String(s.side)===tag)};
 let room=new GameRoom(state,rewardTestEnv());await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({seed:42,players:[{id:'a',name:'Alice'},{id:'b',name:'Bob'}]})}));
 for(const s of sockets)await room.webSocketMessage(s,JSON.stringify({type:'ready',battleLogVersion:1}));
 room.room.game=fresh();room.room.opening=undefined;
 const send=action=>room.handleAction(0,action);
 await send({type:'refresh'});for(const s of sockets)assert.match(ja(s.messages.at(-1)),/マーケットをリロール/);
 sockets[1].connected=false;await send({type:'refresh'});const batchCount=room.room.logBatchCount;
 room.room.game.players[0].field=[mon('M1')];room.room.game.players[0].field[0].atk=0;await send({type:'attack',uid:room.room.game.players[0].field[0].uid});assert.equal(room.room.logBatchCount,batchCount,'private rejections never persisted');
 room=new GameRoom(state,rewardTestEnv());sockets[1].connected=true;sockets[1].messages=[];await room.webSocketMessage(sockets[1],JSON.stringify({type:'ready',battleLogVersion:1}));
 const history=sockets[1].messages.filter(m=>m.type==='logHistory');assert.equal(history.filter(m=>m.reset).length,1);assert.equal(history.flatMap(m=>m.events).filter(e=>e.htmlJa?.includes('マーケットをリロール')).length,2,'reconnect restores missed actions exactly once');assert.equal(sockets[1].messages.at(-1).type,'init');assert(!sockets[1].messages.at(-1).events.some(e=>e.type==='log'||e.type==='turnHeader'),'init cannot duplicate history');
 assert(!history.flatMap(m=>m.events).some(e=>e.rejected));
 // Multiple batches remain small; snapshot and journal stay unchanged on a failed write.
 room.recordLog(Array.from({length:150},()=>effect));await room.persist();assert([...values].filter(([k])=>k.startsWith('battle-log:')).every(([,v])=>v.length<=64));
 const before=structuredClone([...values]),messages=sockets.map(s=>s.messages.length);fail=true;await assert.rejects(room.handleAction(0,{type:'refresh'}));assert.deepEqual([...values],before);assert.deepEqual(sockets.map(s=>s.messages.length),messages);assert.equal(room.room,null);
 console.log('PASS battle action audit: both sides/all action types, market results, wheel decisions, public vs hidden choices, effect failure retention, atomic journal, disconnect/hibernate replay, rejection privacy and failed-write safety');
} finally {await rm(dir,{recursive:true,force:true});}

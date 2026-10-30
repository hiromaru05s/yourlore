import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {journalState} from './fixtures/journalStorage.mjs';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';

const dir=await mkdtemp('/tmp/lore-rotten-ground-');
try {
  await build({stdin:{contents:`export * from './client/src/shared/engine';export {DB} from './client/src/shared/cards';export {botActions} from './client/src/shared/botActions';export {logToEn} from './client/src/shared/logEn';export {GameRoom} from './server/src/gameRoom';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/core.mjs'});
  const {DB,createGame,reduce,playBlockReason,cardPlayConditionMet,botActions,logToEn,GameRoom}=await import(dir+'/core.mjs');
  let seq=0;
  const card=id=>({...structuredClone(DB[id]),uid:'ground-'+(++seq)});
  const fresh=()=>{
    const g=createGame({mode:'online',seed:42,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
    g.cur=0;g.turn=3;g.pending=null;
    for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],removed:[],hp:100,maxHp:100,mana:30,maxMana:30});
    return g;
  };
  const count=g=>g.players.flatMap(p=>p.enchants).filter(e=>e.card.id==='ROTTEN_GROUND').length;
  assert.match(DB.ROTTEN_GROUND.textJa,/【設置上限】このカードはお互いのフィールド全体で1枚しか存在できない。/);
  assert.match(DB.ROTTEN_GROUND.text,/【설치 제한】.*양쪽 필드 전체에 1장/);
  assert.match(DB.ROTTEN_GROUND.textEn,/【Field Limit】Only 1 copy.*both players' fields/);

  for(const owner of [0,1])for(const caster of [0,1]) {
    let g=fresh();g.cur=owner;g.players[owner].hand=[card('ROTTEN_GROUND')];
    assert.equal(cardPlayConditionMet(g,owner,g.players[owner].hand[0]),true);
    g=reduce(g,{type:'play',idx:0}).state;
    assert.equal(count(g),1);assert.equal(g.players[owner].mana,28);
    g.cur=caster;g.players[caster].hand=[card('ROTTEN_GROUND')];g.players[caster].spellDiscountCharges=[3];
    const p=g.players[caster],reason=playBlockReason(g,caster,p.hand[0]);
    assert.match(reason.ja,/お互いのフィールド全体で1枚/);
    assert.match(logToEn(reason.ko),/Only 1 Rotten Ground.*both players' fields/);
    assert.equal(cardPlayConditionMet(g,caster,p.hand[0]),false);
    assert(!botActions(g).some(a=>a.type==='play'),'BOT does not offer the forbidden duplicate');
    for(const action of [{type:'play',idx:0},{type:'play',idx:0,sourceUid:p.hand[0].uid,targets:[]}]) {
      const r=reduce(g,action);
      assert.equal(count(r.state),1);
      assert.deepEqual(r.state.players,g.players,'no mana, hand, usage or discount charge consumed');
      assert(!r.events.some(e=>e.type==='playSpell'));
    }
    // Both sides still receive exactly two counters on a normal summon.
    g.players[caster].hand=[card('M4')];
    const summoned=reduce(g,{type:'play',idx:0});
    assert.equal(summoned.state.players[caster].field[0].decayCnt,2);
    assert.equal(summoned.events.filter(e=>e.type==='decayCounterGrant').length,1);
  }
  for(const owner of [0,1]) {
    let g=fresh();g.cur=owner;g.players[owner].hand=[card('ROTTEN_GROUND')];g=reduce(g,{type:'play',idx:0}).state;
    const caster=1-owner;g.cur=caster;g.players[caster].hand=[card('DISARM1'),card('ROTTEN_GROUND')];
    g=reduce(g,{type:'play',idx:0,sourceUid:g.players[caster].hand[0].uid,targets:[g.players[owner].enchants[0].card.uid]}).state;assert.equal(count(g),0,'actual removal opens the field slot');
    assert.equal(cardPlayConditionMet(g,caster,g.players[caster].hand[0]),true);
    g=reduce(g,{type:'play',idx:0}).state;assert.equal(count(g),1);assert.equal(g.players[caster].enchants[0].card.id,'ROTTEN_GROUND');
  }

  // Real GameRoom action handler, both public views, then hibernation recovery.
  for(const owner of [0,1]) {
    let saved;
    class Socket {messages=[];constructor(side){this.side=side;}deserializeAttachment(){return {side:this.side,gen:0};}send(x){this.messages.push(JSON.parse(x));}close(){}}
    const sockets=[new Socket(0),new Socket(1)];
    const state=journalState({storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v);},setAlarm:async()=>{},deleteAlarm:async()=>{}},getWebSockets:tag=>sockets.filter(s=>String(s.side)===tag)});
    let room=new GameRoom(state,rewardTestEnv());
    await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({seed:42,ranked:false,players:[{id:'a',name:'A'},{id:'b',name:'B'}]})}));
    for(const socket of sockets)await room.webSocketMessage(socket,JSON.stringify({type:'ready'}));
    const send=(side,action)=>room.webSocketMessage(sockets[side],JSON.stringify({type:'action',action}));
    room.room.game=fresh();room.room.game.cur=owner;room.room.game.players[owner].hand=[card('ROTTEN_GROUND'),card('ROTTEN_GROUND')];
    await send(owner,{type:'play',idx:0});assert.equal(count(room.room.game),1);
    const paid=room.room.game.players[owner].mana;
    await send(owner,{type:'play',idx:0});assert.equal(count(room.room.game),1);assert.equal(room.room.game.players[owner].mana,paid);assert.equal(room.room.game.players[owner].hand.length,1);
    room=new GameRoom(state,rewardTestEnv());await room.webSocketMessage(sockets[owner],JSON.stringify({type:'ready'}));
    assert.equal(count(room.room.game),1,'the singleton survives recovery');
    await send(owner,{type:'endTurn'});
    const opponent=1-owner;assert.equal(room.room.game.cur,opponent);
    room.room.game.players[opponent].hand=[card('ROTTEN_GROUND')];const mana=room.room.game.players[opponent].mana;
    await send(opponent,{type:'play',idx:0});assert.equal(count(room.room.game),1);assert.equal(room.room.game.players[opponent].mana,mana);assert.equal(room.room.game.players[opponent].hand.length,1);
    for(const socket of sockets)assert.equal(count(socket.messages.filter(m=>m.state).at(-1).state),1);
  }
  console.log('PASS Rotten Ground: shared one-card field limit, both owners/casters, no resource consumption, hand/BOT legality, removal/recast, decay unchanged, three languages, server actions/views/recovery');
} finally {await rm(dir,{recursive:true,force:true});}

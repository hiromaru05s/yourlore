import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {journalState} from './fixtures/journalStorage.mjs';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';

const dir=await mkdtemp('/tmp/lore-rune-rules-');
try {
  await build({stdin:{contents:'export * from "./client/src/shared/engine";export {DB,STARTERS} from "./client/src/shared/cards";export {botActions} from "./client/src/shared/botActions";export {GameRoom} from "./server/src/gameRoom";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/core.mjs'});
  const {DB,STARTERS,createGame,reduce,spellDeckHalf,playBlockReason,botActions,GameRoom}=await import(dir+'/core.mjs');
  let seq=0;
  const card=id=>({...structuredClone(DB[id]??STARTERS[id]),uid:'rune-rule-'+(++seq)});
  const mon=(overrides={})=>({...card('M1'),cost:5,atk:1,def:5,dmg:0,exhausted:false,tempAtk:0,atkMod:0,defMod:0,...overrides});
  const fresh=(side=0)=>{
    const g=createGame({mode:'online',seed:42,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
    g.cur=side;g.turn=3;g.pending=null;
    for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],exile:[],removed:[],hp:40,mana:20,maxMana:20});
    return g;
  };
  for(const id of ['RUNE2','RUNE3'])for(const side of [0,1]) {
    for(const [label,setup,allowed] of [
      ['exact half across deck/hand/graveyard/field',p=>{p.deck=[card('S13')];p.discard=[card('STARTER_TRASH')];p.field=[mon()];},true],
      ['field monsters change denominator',p=>{p.deck=[card('M1')];p.field=[mon()];},false],
      ['starters are not spells',p=>{p.deck=[card('STARTER_MANA'),card('STARTER_CHEST')];},false],
      ['one below odd threshold',p=>{p.deck=[card('S13'),card('M1'),card('M2'),card('M3')];},false],
      ['above odd threshold',p=>{p.deck=[card('S13'),card('S10'),card('M1'),card('M2')];},true],
      ['Rift and temporary exile excluded',p=>{p.deck=[card('M1')];p.removed=[card('M2'),card('M3')];p.exile=[{card:card('M1'),turns:1}];},true],
    ]) {
      const g=fresh(side),p=g.players[side];p.hand=[card(id)];setup(p);
      assert.equal(spellDeckHalf(p),allowed,label);
      assert.equal(playBlockReason(g,side,p.hand[0])===null,allowed,label);
      assert.equal(botActions(g).some(a=>a.type==='play'&&a.idx===0),allowed,label);
      const r=reduce(g,{type:'play',idx:0}).state.players[side];
      assert.equal(r.mana,allowed?20-DB[id].cost:20,label);
      assert.equal(r.maxMana,id==='RUNE2'&&allowed?22:20,label);
      assert.equal(r.enchants.some(e=>e.card.id==='RUNE3'),id==='RUNE3'&&allowed,label);
      assert.equal(r.hand.some(c=>c.id===id),!allowed,label);
    }
  }
  assert.equal(spellDeckHalf(fresh().players[0]),false,'empty composition fails');
  for(const side of [0,1])for(const [a,b,destroy] of [
    [{def:20,dmg:19},{def:5},1],
    [{def:2,defMod:10,dmg:1},{def:8},0],
    [{def:12,defMod:-10},{def:5},1],
    [{def:5},{def:5},0],
    [{def:2,tempAtk:10},{def:8},0],
  ]) {
    const g=fresh(side),p=g.players[side],o=g.players[1-side];
    p.hand=[card('RUNE1')];p.field=[mon({def:99})];
    const targets=[mon(a),mon(b)],ineligible=mon({cost:4,atk:99,def:99});
    o.field=[...targets,ineligible];
    const result=reduce(g,{type:'play',idx:0}).state;
    assert(!result.players[1-side].field.some(m=>m.uid===targets[destroy].uid));
    assert(result.players[1-side].field.some(m=>m.uid===targets[1-destroy].uid));
    assert(result.players[1-side].field.some(m=>m.uid===ineligible.uid));
    assert.equal(result.players[side].field.length,1);
  }
  for(const count of [1,2]) {
    let g=fresh();g.players[0].enchants=Array.from({length:count},()=>({card:card('RUNE3'),turns:99,bornTurn:0}));
    g.players[0].deck=[card('M1'),card('M2'),card('M3')];g.players[0].hand=[card('S13')];
    const cost=DB.S13.play??DB.S13.cost,base=reduce({...g,players:[{...g.players[0],enchants:[]},g.players[1]]},{type:'play',idx:0}).state;
    let r=reduce(g,{type:'play',idx:0});
    assert.equal(r.state.players[1].hp,40-2*(40-base.players[1].hp),'echo repeats once even below original activation ratio');
    assert.equal(r.state.players[0].mana,20-cost,'no extra mana for echo');
    g=fresh();g.players[0].enchants=Array.from({length:count},()=>({card:card('RUNE3'),turns:99,bornTurn:0}));
    g.players[0].hand=[card('S15')];g.players[1].field=[mon(),mon()];
    r=reduce(g,{type:'play',idx:0});assert(r.state.pending,'target choice stays pending');
    const uid=r.state.players[1].field[0].uid;
    r=reduce(r.state,{type:'chooseTarget',uid});
    assert.equal(r.state.players[1].field.length,1,'choice spell destroys only one target');assert.equal(r.state.pending,null);
  }
  // Authoritative route must reject the old starter condition and preserve the valid result.
  for(const id of ['RUNE2','RUNE3']) {
    let saved;
    class Socket {messages=[];constructor(side){this.side=side;}deserializeAttachment(){return {side:this.side,gen:0};}send(x){this.messages.push(JSON.parse(x));}close(){}}
    const sockets=[new Socket(0),new Socket(1)],state=journalState({storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v);},setAlarm:async()=>{},deleteAlarm:async()=>{}},getWebSockets:tag=>sockets.filter(s=>String(s.side)===tag)});
    let room=new GameRoom(state,rewardTestEnv());
    await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({seed:42,ranked:false,players:[{id:'a',name:'A'},{id:'b',name:'B'}]})}));
    for(const socket of sockets)await room.webSocketMessage(socket,JSON.stringify({type:'ready'}));
    room.room.game=fresh();let p=room.room.game.players[0];p.hand=[card(id)];p.deck=[card('STARTER_MANA'),card('STARTER_CHEST')];
    const play=()=>room.webSocketMessage(sockets[0],JSON.stringify({type:'action',action:{type:'play',idx:0}}));
    await play();assert.equal(room.room.game.players[0].mana,20);assert.equal(room.room.game.players[0].hand.length,1);
    room.room.game.players[0].deck=[card('S13')];await play();
    room=new GameRoom(state,rewardTestEnv());await room.webSocketMessage(sockets[0],JSON.stringify({type:'ready'}));
    p=room.room.game.players[0];assert.equal(p.mana,20-DB[id].cost);assert.equal(p.maxMana,id==='RUNE2'?22:20);assert.equal(p.enchants.some(e=>e.card.id==='RUNE3'),id==='RUNE3');
  }
  console.log('PASS Runecraft composition/strict spells, both sides, BOT legality, current HP/buffs/damage/ties, echo exceptions/non-stacking, authoritative rejection and restore');
} finally {await rm(dir,{recursive:true,force:true});}

import assert from 'node:assert/strict';import {build} from 'esbuild';import fs from 'node:fs/promises';
const dir=await fs.mkdtemp('/tmp/lore-duel-regression-');
try{
 await build({stdin:{contents:`export * from './client/src/shared/cards';export * from './client/src/shared/engine';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/module.mjs'});
 const {DB,createGame,reduce,playBlockReason,monsterCanTarget}=await import(dir+'/module.mjs');let seq=0;
 const card=id=>({...structuredClone(DB[id]),uid:'reg-'+(++seq)});
 const mon=(atk=2,hp=2)=>({...card('M11'),atk,def:hp,dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
 const fresh=()=>{const g=createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;for(const p of g.players)Object.assign(p,{hp:40,mana:30,maxMana:30,hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],removed:[],uses:{},usesTurn:{}});g.turn=3;g.phase='main';g.pending=null;return g;};
 for(const id of ['WALLBREAK2','SNIPE2'])for(const side of [0,1])for(const both of [true,false]){
  const g=fresh();g.cur=side;const own=mon(),enemy=mon(),safe=mon(3,3);g.players[side].field=[own,safe];g.players[1-side].field=both?[enemy]:[];g.players[side].hand=[card(id)];
  assert.match(DB[id].textJa,/両方の場/);
  assert.equal(playBlockReason(g,side,g.players[side].hand[0]),null,`${id}: friendly-only target must be playable`);
  const r=reduce(g,{type:'play',idx:0});assert.deepEqual(r.state.players[side].field.map(m=>m.uid),[safe.uid]);assert.equal(r.state.players[1-side].field.length,0);assert.equal(r.events.filter(e=>e.type==='destroy').length,both?2:1);
 }
 {const g=fresh();const buff=mon(2,8),low=mon(1,3);buff.aura='wallDef';buff.val=4;g.players[0].field=[buff,low];g.players[0].hand=[card('SNIPE2')];assert(playBlockReason(g,0,g.players[0].hand[0]),'current HP uses its actual owner');}
 {const g=fresh();g.players[0].field=[mon(3,4)];g.players[1].field=[mon(3,4)];const attack=reduce(g,{type:'attack',uid:g.players[0].field[0].uid});assert.equal(attack.state.pending.reason,'attack');const end=reduce(attack.state,{type:'endTurn'});assert.equal(end.state.cur,1);assert(!end.events.some(e=>e.type==='attack'));}
 {const g=fresh();g.pending={kind:'myMon',reason:'buffTurn',hint:'',hintJa:'',allowCancel:false};assert.equal(reduce(g,{type:'endTurn'}).state.cur,0);assert.equal(reduce(g,{type:'endTurn'}).state.pending.reason,'buffTurn');}
 {const g=fresh(),att=mon(3,4),target=mon();g.players[0].field=[att];g.players[1].field=[target,mon(3,4)];target.exhausted=true;assert(monsterCanTarget(g,g.players[0],att,target));target.aura='eliteGuard';att.cost=6;assert(!monsterCanTarget(g,g.players[0],att,target));att.cost=7;assert(monsterCanTarget(g,g.players[0],att,target));}
 console.log('PASS: both-side Siege Collapse/Volley Fire, friendly-only activation, owner stats, atomic attack-cancel/end-turn, mandatory selection, defender eligibility');
}finally{await fs.rm(dir,{recursive:true,force:true});}

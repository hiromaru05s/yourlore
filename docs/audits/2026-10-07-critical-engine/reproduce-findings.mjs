import assert from 'node:assert/strict';
import {DB,createGame,reduce} from './api.mjs';
let uid=0;const card=id=>{assert(DB[id],id);return {...structuredClone(DB[id]),uid:'probe-'+ ++uid};};
const fresh=()=>{const g=createGame({mode:'online',seed:2,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.phase='main';g.pending=null;g.turn=3;for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],removed:[],field:[],enchants:[],traps:[],quests:[],hp:200,mana:30,maxMana:30});return g;};
const play=(g,id)=>{g.players[g.cur].hand.push(card(id));const r=reduce(g,{type:'play',idx:g.players[g.cur].hand.length-1});return r.state;};
const report=[];
{let g=fresh();for(const p of g.players)p.enchants=['BLOOD_RITE','LUCKY_ECHO',...Array(7).fill('LIFE_CYCLE')].map(id=>({card:card(id),turns:99,bornTurn:1}));g.rng=2;g.players[0].hand=[card('GRAPE')];let error;try{reduce(g,{type:'play',idx:0});}catch(e){error=e.message;}assert.equal(error,'Maximum call stack size exceeded');report.push({id:'C01',seed:2,cardsPerPlayer:9,trigger:'GRAPE',error});}
{let g=fresh();for(const p of g.players)p.enchants=['BLOOD_RITE','LUCKY_ECHO','WORLD_HEART',...Array(7).fill('LIFE_CYCLE')].map(id=>({card:card(id),turns:99,bornTurn:1}));g.rng=2;let error;try{reduce(g,{type:'endTurn'});}catch(e){error=e.message;}assert.equal(error,'Maximum call stack size exceeded');report.push({id:'C01-turn-boundary',seed:2,cardsPerPlayer:10,trigger:'endTurn',error});}
{let g=fresh();g=play(g,'TSO1');assert(g.players[0].summonLockUntil>g.turn);const before=g.players[0].field.map(c=>c.id);g=play(g,'VAMP_PACT');assert(g.players[0].field.some(c=>c.id==='VAMP1'));report.push({id:'C02-hermit',lockUntil:g.players[0].summonLockUntil,turn:g.turn,before,after:g.players[0].field.map(c=>c.id)});}
{let g=fresh();g=play(g,'GOLEM1');g=play(g,'GOLEM2');g.cur=1;g=play(g,'TSO2');g=play(g,'TSO1');assert.equal(g.players[0].summonCap,2);g.cur=0;const before=g.players[0].field.length;g=play(g,'VAMP_PACT');assert(g.players[0].field.length>2);report.push({id:'C02-solitude',cap:2,before,after:g.players[0].field.map(c=>c.id)});}
console.log(JSON.stringify(report,null,2));

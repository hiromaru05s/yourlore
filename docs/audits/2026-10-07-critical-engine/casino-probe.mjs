import {DB,createGame,reduce} from './api.mjs';
let uid=0;const card=id=>({...structuredClone(DB[id]),uid:'probe-'+ ++uid});
const g=createGame({mode:'online',seed:2,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
g.phase='main';g.pending=null;g.turn=3;
for(const p of g.players){Object.assign(p,{hand:[],deck:[],discard:[],removed:[],field:[],enchants:[],traps:[],quests:[],hp:200,mana:30,maxMana:30});p.enchants=['BLOOD_RITE','LUCKY_ECHO',...Array(11).fill('LIFE_CYCLE')].map(id=>({card:card(id),turns:99,bornTurn:1}));}
g.players[0].field=[{...card('CASINO'),exhausted:false,tempAtk:0,atkMod:0,defMod:0,dmg:0,summonedTurn:0,gcount:12}];
g.rng=2;g.players[0].hand=[card('GRAPE')];console.log('start');
const r=reduce(g,{type:'play',idx:0});console.log(JSON.stringify({events:r.events.length,hp:r.state.players.map(p=>p.hp),count:r.state.players[0].field[0]?.gcount}));

const {C,DB}=require('./sim.cjs'),assert=require('node:assert/strict'),fs=require('node:fs');
const out='/tmp/lore-card-audit-20261026';
// Reach a kill from the real opening state using only legal actions. Opponent passes:
// this proves reachability and the exploit, not a competitive win rate.
function reachable(draw='S10'){
 let g=C.createGame({seed:6275001,mode:'online',starting:0,p0:{id:'a',name:'A',deck:Array(8).fill('STARTER_TRASH')},p1:{id:'b',name:'B',deck:Array(8).fill('STARTER_TRASH')}}).state;
 const ids=['EROSION',draw,'QUICK_GRIMOIRE','S15','DISARM1','NWL3','PRIEST'];
 g.market=ids.map((id,i)=>({...DB[id],uid:'witness-market-'+i}));g.marketStock=Array(7).fill(3);
 const actions=[],bought=new Set();let n=0;
 while(!g.over&&n++<300){const p=g.players[g.cur];let a={type:'endTurn'};
  if(g.cur===0){
   const cull=p.hand.findIndex(c=>c.id==='STARTER_TRASH');
   const attune=p.hand.findIndex(c=>c.id==='STARTER_MANA');
   const erosion=p.hand.findIndex(c=>c.id==='EROSION');
   const drawIdx=p.hand.findIndex(c=>c.id===draw);
   if(cull>=0)a={type:'play',idx:cull};
   else if(p.maxMana<6&&attune>=0&&p.mana>=3)a={type:'play',idx:attune};
   else if(erosion>=0&&p.mana>=6)a={type:'play',idx:erosion};
   else if(!bought.has('EROSION')&&p.mana>=6)a={type:'buyMarket',i:0};
   else if(bought.has('EROSION')&&!bought.has(draw)&&p.mana>=DB[draw].cost)a={type:'buyMarket',i:1};
   else if(p.enchants.some(e=>e.card.id==='EROSION')&&drawIdx>=0&&p.mana>=2&&!p.spellDiscountTurn)a={type:'buyMarket',i:2};
   else if(p.enchants.some(e=>e.card.id==='EROSION')&&drawIdx>=0&&p.spellDiscountTurn)a={type:'play',idx:drawIdx};
  }
  const id=a.type==='play'?p.hand[a.idx].id:a.type==='buyMarket'?g.market[a.i].id:null;
  const prev=g,r=C.reduce(g,a);assert(!r.events.some(e=>e.type==='rejected'));g=r.state;
  assert(C.actionChangesState(prev,g)||prev.rng!==g.rng);
  if(a.type==='buyMarket')bought.add(id);
  actions.push({turn:prev.turn,side:prev.cur,action:a,id,mana:g.players[0].mana,hp:g.players.map(p=>p.hp),drawInHand:g.players[0].hand.some(c=>c.id===draw)});
 }
 assert.equal(g.winner,0);assert(g.over);const casts=actions.filter(x=>x.id===draw&&x.action.type==='play');assert(casts.length>=20);assert.equal(new Set(casts.map(x=>x.turn)).size,1);assert.equal(new Set(casts.map(x=>x.mana)).size,1);
 return {type:'legal-opening-passive-opponent',draw,market:ids,deck:Array(8).fill('STARTER_TRASH'),seed:6275001,turn:g.turn,casts:casts.length,manaAfter:g.players[0].mana,hp:g.players.map(p=>p.hp),actions};
}
let uid=0;const card=id=>({...DB[id],uid:'fixture-'+(++uid)});const mon=id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
function fixture(){const g=C.createGame({seed:982,mode:'online',p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=11;for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],removed:[],mana:6,maxMana:6,hp:40,uses:{},usesTurn:{},spellsCastTurn:0,playsTurn:0});return g;}
function dominion(){let g=fixture();g.players[0].hand=[card('DOMINION'),card('STARTER_MANA')];const firstMana=g.players[0].mana;for(let i=0;i<70;i++){g=C.reduce(g,{type:'play',idx:g.players[0].hand.findIndex(c=>c.id==='DOMINION')}).state;assert(g.players[0].hand.some(c=>c.id==='DOMINION'));assert(g.players[0].hand.some(c=>c.id==='STARTER_MANA'));}assert.equal(g.players[0].mana,firstMana);assert.equal(g.players[1].skipTurns,70);return {type:'post-acquisition-fixture',name:'DOMINION self-redraw',casts:70,skips:g.players[1].skipTurns,mana:g.players[0].mana,turn:g.turn};}
function blocker(){let g=fixture();g.players[0].hand=[card('S10')];g.players[0].spellDiscountTurn=1;g.players[1].field=[mon('NT_SEAL3')];assert(C.playBlockReason(g,0,g.players[0].hand[0]));return {type:'fixture',name:'silence stops zero-cost draw',blocked:true};}
function goblins(){let g=fixture();g.players[0].field=[...Array.from({length:3},()=>mon('GOBLIN')),...Array.from({length:3},()=>mon('GOBLIN_RAIDER'))];const atk=g.players[0].field.map(m=>C.effAtk(g.players[0],m,g));g.cur=1;g.players[1].hand=[card('WEAKEN_ALL'),card('WEAKEN_ALL')];g=C.reduce(g,{type:'play',idx:0}).state;g=C.reduce(g,{type:'play',idx:0}).state;const weak=g.players[0].field.map(m=>C.effAtk(g.players[0],m,g));assert.deepEqual(atk,[4,4,4,5,5,5]);assert.deepEqual(weak,[0,0,0,1,1,1]);return {type:'fixture',name:'starter rally attack',atk,doubleWeaken:weak,directUnblocked:atk.reduce((a,b)=>a+b,0)+3};}
function ghostCombo(){let g=fixture();g.players[0].field=Array.from({length:3},()=>mon('GHOST'));g.players[0].hand=['BLOOD_RITE','FLAME','FLAME','FLAME'].map(card);for(let i=0;i<4;i++)g=C.reduce(g,{type:'play',idx:0}).state;const atk=g.players[0].field.map(m=>C.effAtk(g.players[0],m,g));assert.deepEqual(atk,[5,5,5]);assert.equal(g.players[1].hp,46);return {type:'fixture',name:'Ghost + Blood Rite + Fire x3',atk,hp:g.players.map(p=>p.hp),mana:g.players[0].mana};}
function farm(){let g=fixture();g.players[0].hand=['FARM','FARMER'].map(card);g.market[0]=card('APPLE');g=C.reduce(g,{type:'play',idx:0}).state;g=C.reduce(g,{type:'play',idx:0}).state;assert(g.players[0].enchants.some(e=>e.card.id==='FARMER_PRAYER'));g=C.reduce(g,{type:'buyMarket',i:0}).state;assert(g.players[0].discard.some(c=>c.id==='GOLDEN_APPLE'));const paid=6-g.players[0].mana;g=C.reduce(g,{type:'endTurn'}).state;g=C.reduce(g,{type:'endTurn'}).state;const idx=g.players[0].hand.findIndex(c=>c.id==='GOLDEN_APPLE');assert(idx>=0);g=C.reduce(g,{type:'play',idx}).state;assert.equal(g.players[0].dew,8);return {type:'fixture',name:'Farm + Farmer + purchased Apple',setupAndPurchaseMana:paid,dew:g.players[0].dew,turn:g.turn};}
const results=C.withoutMonsterPresentation(()=>[reachable('S10'),reachable('ND2'),dominion(),blocker(),goblins(),ghostCombo(),farm()]);
fs.writeFileSync(out+'/witnesses.json',JSON.stringify(results,null,2));console.log(results.map(({actions,...x})=>({...x,actionCount:actions?.length})));

// Reducer-level witnesses: reachable opening versus a passing opponent, and explicit setup fixtures.
const fs=require('node:fs'),assert=require('node:assert/strict');
const [beforeFile,afterFile,out]=process.argv.slice(2);
function run(C){const DB={...C.DB,...C.STARTERS};let uid=0;const card=id=>({...DB[id],uid:'w-'+(++uid)}),mon=id=>({...card(id),exhausted:false,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0});
 function fresh(){const g=C.createGame({seed:6275001,mode:'online',starting:0,p0:{id:'a',name:'A',deck:Array(8).fill('STARTER_TRASH')},p1:{id:'b',name:'B',deck:Array(8).fill('STARTER_TRASH')}}).state;return g;}
 function fixture(){const g=fresh();g.turn=11;for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],removed:[],mana:6,maxMana:6,hp:45,uses:{},usesTurn:{},spellsCastTurn:0,playsTurn:0});return g;}
 function reachable(draw){let g=fresh();const ids=['EROSION',draw,'QUICK_GRIMOIRE','S15','DISARM1','NWL3','PRIEST'];g.market=ids.map(card);g.marketStock=Array(7).fill(3);const actions=[],bought=new Set();let started=false,casts=0,stop='action-cap';
  for(let n=0;n<300&&!g.over;n++){const p=g.players[g.cur];let a={type:'endTurn'};
   if(g.cur===0){const idx=id=>p.hand.findIndex(c=>c.id===id);const drawIdx=idx(draw);
    if(idx('STARTER_TRASH')>=0)a={type:'play',idx:idx('STARTER_TRASH')};
    else if(p.maxMana<6&&idx('STARTER_MANA')>=0&&p.mana>=3)a={type:'play',idx:idx('STARTER_MANA')};
    else if(idx('EROSION')>=0&&p.mana>=6)a={type:'play',idx:idx('EROSION')};
    else if(!bought.has('EROSION')&&p.mana>=6)a={type:'buyMarket',i:0};
    else if(bought.has('EROSION')&&!bought.has(draw)&&p.mana>=DB[draw].cost)a={type:'buyMarket',i:1};
    else if(p.enchants.some(e=>e.card.id==='EROSION')&&drawIdx>=0&&!bought.has('QUICK_GRIMOIRE')&&p.mana>=2){a={type:'buyMarket',i:2};started=true;}
    else if(started&&drawIdx>=0&&!C.playBlockReason(g,0,p.hand[drawIdx]))a={type:'play',idx:drawIdx};
    else if(started){stop='cannot-continue-this-turn';break;}
   }
   const id=a.type==='play'?p.hand[a.idx].id:a.type==='buyMarket'?g.market[a.i].id:null,prev=g,r=C.reduce(g,a);g=r.state;assert(C.actionChangesState(prev,g)||g.rng!==prev.rng);assert(!r.events.some(e=>e.type==='rejected'));
   if(a.type==='buyMarket')bought.add(id);if(a.type==='play'&&id===draw)casts++;
   actions.push({turn:prev.turn,side:prev.cur,a,id,mana:g.players[0].mana,hp:g.players.map(p=>p.hp)});
  }if(g.over)stop='game-over';return {scope:'legal opening, chosen fixed market, passive opponent; one Grimoire purchase',draw,turn:g.turn,casts,hp:g.players.map(p=>p.hp),mana:g.players[0].mana,stop,actions};
 }
 function dominion(){let g=fixture();g.players[0].hand=[card('DOMINION'),card('STARTER_MANA')];let casts=0;while(casts<70){const idx=g.players[0].hand.findIndex(c=>c.id==='DOMINION');if(idx<0||C.playBlockReason(g,0,g.players[0].hand[idx]))break;g=C.reduce(g,{type:'play',idx}).state;casts++;}return {scope:'post-acquisition fixture',casts,skips:g.players[1].skipTurns,mana:g.players[0].mana};}
 function sage(){let g=fixture();g.players[0].mana=0;g.players[0].field=[mon('NMD6')];g.players[0].enchants=[{card:card('EROSION'),turns:99}];g.players[0].hand=[card('S10')];g.players[0].deck=Array.from({length:12},()=>card('S10'));let casts=0;while(!g.over&&casts<100){const idx=g.players[0].hand.findIndex(c=>c.id==='S10');if(idx<0||C.playBlockReason(g,0,g.players[0].hand[idx]))break;g=C.reduce(g,{type:'play',idx}).state;casts++;}return {scope:'constructed post-acquisition fixture; requires Sage, Erosion and 13 Archive copies; reachability/competitive dominance not established',casts,hp:g.players.map(p=>p.hp),mana:g.players[0].mana,winner:g.winner};}
 return C.withoutMonsterPresentation(()=>({archive:reachable('S10'),foresight:reachable('ND2'),dominion:dominion(),sage:sage()}));
}
const result={before:run(require(beforeFile)),after:run(require(afterFile))};
assert.equal(result.before.archive.casts,45);assert.equal(result.after.archive.casts,9);assert.equal(result.before.foresight.casts,45);assert.equal(result.after.foresight.casts,9);assert.equal(result.after.dominion.casts,3);assert.equal(result.after.dominion.skips,1);assert.equal(result.after.sage.winner,0);
fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result,(k,v)=>k==='actions'?undefined:v,2));

const lab=require('node:path').resolve(process.env.BOT_LAB||'.bot-strength-v2');
const fs=require('fs'),C=require(process.env.BOT_BASELINE||lab+'/previous.cjs');let seed=20261013;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296};
const decks=C.BOT_ELITE_DECKS.map(d=>d.cards),initial=JSON.parse(fs.readFileSync(process.cwd()+'/ml/bot-strength/builds.json'));let champions=[...decks,...Object.values(initial)],rows=[],games=0;const started=Date.now();
function play(a,b,seed,seat){let ds=seat?[b,a]:[a,b],g=C.createGame({mode:'bot',seed,starting:0,p0:{id:'a',name:'a',deck:ds[0]},p1:{id:'b',name:'b',deck:ds[1]}}).state;for(let i=0;!g.over&&i<1600;i++){const n=C.greedyStep(g);if(!C.actionChangesState(g,n.state))return null;g=n.state;}return g.over?(g.winner==null?.5:g.winner===seat?1:0):null;}
for(let gen=0;gen<8;gen++){
 const candidates=champions.slice(),seen=new Set(candidates.map(d=>d.slice().sort().join('|')));
 while(candidates.length<64){const d=champions[Math.floor(rnd()*champions.length)].slice();for(let j=0;j<(rnd()<.3?3:1);j++)d[Math.floor(rnd()*8)]=C.DECK_POOL[Math.floor(rnd()*C.DECK_POOL.length)];const k=d.slice().sort().join('|');if(!seen.has(k)&&JSON.stringify(C.sanitizeDeck(d))===JSON.stringify(d)){seen.add(k);candidates.push(d);}}
 const opponents=[...decks,champions[0],champions[1],champions[2]],scores=[];
 for(let i=0;i<candidates.length;i++){let wins=0,valid=0;for(let o=0;o<opponents.length;o++)for(let seat=0;seat<2;seat++){const result=play(candidates[i],opponents[o],4300000+gen*60+o,seat);games++;rows.push({gen,i,o,seat,result});if(result!=null){wins+=result;valid++;}}scores.push({cards:candidates[i],wins,valid,rate:wins/12});}
 scores.sort((a,b)=>b.rate-a.rate);champions=scores.slice(0,12).map(d=>d.cards);fs.writeFileSync(lab+'/evolution.json',JSON.stringify({gen,games,seconds:(Date.now()-started)/1000,scores,rows}));console.log(JSON.stringify({gen,games,seconds:(Date.now()-started)/1000,top:scores.slice(0,3)}));
}

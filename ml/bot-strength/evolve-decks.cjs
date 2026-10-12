const fs=require('fs'),C=require(process.env.BOT_MODULE || require('node:path').resolve(process.env.BOT_LAB || '.bot-strength','candidate.cjs'));
const initial=JSON.parse(fs.readFileSync(require('node:path').resolve(process.env.BOT_LAB || '.bot-strength','results/deck-screen.json'),'utf8')).builds;
let rs=601337;const rnd=()=>{rs^=rs<<13;rs^=rs>>>17;rs^=rs<<5;return(rs>>>0)/4294967296};
const key=d=>[...d].sort().join('|');
const pool=C.DECK_POOL;const seen=new Set();let champion=Object.values(initial),rows=[],total=0;const start=Date.now();
function play(deck,opponent,seed,seat){const decks=seat===0?[deck,opponent]:[opponent,deck];let g=C.createGame({mode:'bot',seed,starting:0,p0:{id:'a',name:'a',deck:decks[0]},p1:{id:'b',name:'b',deck:decks[1]}}).state;for(let step=0;!g.over&&step<1600;step++){const n=C.greedyStep(g);if(!C.actionChangesState(g,n.state))return {score:null,pending:g.pending,action:n.action};g=n.state;}return {score:g.over?(g.winner===seat?1:0):null,turn:g.turn};}
for(let gen=0;gen<6;gen++){
 const candidates=[...champion];
 while(candidates.length<80){const d=[...champion[Math.floor(rnd()*champion.length)]];for(let j=0;j<(rnd()<.25?2:1);j++)d[Math.floor(rnd()*8)]=pool[Math.floor(rnd()*pool.length)];const legal=C.sanitizeDeck(d),k=key(legal);if(!seen.has(k)){seen.add(k);candidates.push(legal);}}
 const opps=[C.BOT_DECKS[0].cards,C.BOT_DECKS[4].cards,initial.CULL,initial.DECAY,...champion.slice(0,2)];
 const scored=[];
 for(let i=0;i<candidates.length;i++){
  const deck=candidates[i];let score=0,valid=0,bad=0;
  for(let r=0;r<opps.length;r++)for(let seat=0;seat<2;seat++){const result=play(deck,opps[r],811000+gen*101+r,seat);total++;if(result.score===null)bad++;else{score+=result.score;valid++;}rows.push({gen,i,r,seat,...result});}
  scored.push({deck,score:score/Math.max(1,valid),valid,bad});
 }
 scored.sort((a,b)=>b.score-a.score);champion=scored.slice(0,12).map(x=>x.deck);
 fs.writeFileSync(require('node:path').resolve(process.env.BOT_LAB || '.bot-strength','results/evolution.json'),JSON.stringify({gen,total,seconds:(Date.now()-start)/1000,scored,rows},null,2));
 console.error(JSON.stringify({gen,total,seconds:(Date.now()-start)/1000,top:scored.slice(0,5)}));
}

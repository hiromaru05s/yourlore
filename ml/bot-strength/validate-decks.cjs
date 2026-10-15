const fs=require('fs'),path=require('path'),root=process.env.BOT_LAB||'.bot-strength',C=require(process.env.BOT_MODULE||path.resolve(root,'candidate.cjs'));
const original=JSON.parse(fs.readFileSync(path.join(root,'results/deck-screen.json'))).builds,evolved=JSON.parse(fs.readFileSync(path.join(root,'results/evolution.json'))).scored;
const selected=[...evolved.slice(0,12).map((x,i)=>({name:'EVOLVED_'+i,deck:x.deck})),...['AGGRO','CULL','CULL_SWORD','RIFT_ENGINE','ELF_ENGINE','DECAY','CASTLE','EGG'].map(name=>({name,deck:original[name]}))];
const opponents=[...Object.entries(original).map(([name,deck])=>({name,deck})),...selected.slice(0,4)];
const rows=[],summary=[];let games=0;const begin=Date.now();
for(const {name,deck} of selected){let wins=0,losses=0,bad=0;for(let j=0;j<opponents.length;j++)for(let r=0;r<2;r++)for(let seat=0;seat<2;seat++){
 const opponent=opponents[j],decks=seat===0?[deck,opponent.deck]:[opponent.deck,deck],seed=1701000+j*17+r;
 let g=C.createGame({mode:'bot',seed,starting:0,p0:{id:'a',name:'a',deck:decks[0]},p1:{id:'b',name:'b',deck:decks[1]}}).state;let steps=0,invalid=null;
 while(!g.over&&steps++<1600){const next=C.greedyStep(g);if(!C.actionChangesState(g,next.state)){invalid={action:next.action,pending:g.pending};break;}g=next.state;}
 if(!g.over||invalid)bad++;else if(g.winner===seat)wins++;else losses++;
 rows.push({name,opponent:opponent.name,seed,seat,winner:g.over?g.winner:null,turn:g.turn,steps,invalid});games++;
 }
 summary.push({name,deck,wins,losses,bad,rate:wins/(wins+losses)});
 fs.writeFileSync(path.join(root,'results/deck-holdout.json'),JSON.stringify({games,seconds:(Date.now()-begin)/1000,summary,rows},null,2));console.error(JSON.stringify(summary.at(-1)));
}

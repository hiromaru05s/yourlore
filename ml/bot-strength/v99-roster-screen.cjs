// Fast deck-selection proxy; final strength must be measured with botDecide.
const fs=require('node:fs'),path=require('node:path');
const lab=process.env.BOT_LAB||'/tmp/lore-bot99',modulePath=process.env.BOT_MODULE||path.join(lab,'candidate.cjs'),C=require(modulePath),baselinePath=process.env.BOT_BASELINE||path.join(lab,'before.cjs'),old=require(baselinePath);
const sha=p=>require('node:crypto').createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const modules={candidate:sha(modulePath),baseline:sha(baselinePath)};
const [file,dest='screen',pairs='24',offset='0',from='0',until='999']=process.argv.slice(2);
const builds=JSON.parse(fs.readFileSync(file)), opponents=[...old.BOT_HELL_DECKS,...old.BOT_DECKS];
const rows=[],summary=[],begin=Date.now();
for(const build of builds.slice(+from,+until)){
 if(JSON.stringify(C.sanitizeDeck(build.cards))!==JSON.stringify(build.cards))throw Error('Invalid '+build.name);
 for(let r=0;r<+pairs;r++)for(let seat=0;seat<2;seat++){
  const opp=opponents[(r+(+offset))%opponents.length],decks=seat===0?[build,opp]:[opp,build];
  let g=C.createGame({mode:'bot',seed:371000+(+offset)+r,starting:0,p0:{id:'a',name:'a',deck:decks[0].cards},p1:{id:'b',name:'b',deck:decks[1].cards}}).state;
  decks.forEach((d,i)=>g.players[i].botTune={minBuy:11,minBuyEarly:6,chestTurn:6,...d.tune});
  let steps=0,bad=null;
  C.withoutMonsterPresentation(()=>{while(!g.over&&steps++<1600){const next=C.greedyStep(g);if(!C.actionChangesState(g,next.state)){bad=next.action;break;}g=next.state;}});
  rows.push({name:build.name,opp:opp.name,r,seat,winner:g.winner,finished:g.over,turns:g.turn,steps,bad});
 }
 const own=rows.filter(r=>r.name===build.name),valid=own.filter(r=>r.finished&&!r.bad);
 summary.push({name:build.name,n:own.length,valid:valid.length,wins:valid.filter(r=>r.winner===r.seat).length,draws:valid.filter(r=>r.winner==null).length,score:valid.reduce((n,r)=>n+(r.winner==null?.5:r.winner===r.seat?1:0),0)/valid.length});
 fs.writeFileSync(path.join(lab,'results',dest+'.json'),JSON.stringify({method:'greedyStep proxy, not full live difficulty; paired seats/common seeds',modules,opponents,offset:+offset,pairs:+pairs,seconds:(Date.now()-begin)/1000,builds,summary,rows},null,2));
 console.error(summary.at(-1),Math.round((Date.now()-begin)/1000)+'s');
}

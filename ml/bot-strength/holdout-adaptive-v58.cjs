const fs=require('fs'),{createHash}=require('crypto');const lab=process.env.BOT_LAB||'/tmp/lore-bot-v58-tactical';const C=require(lab+'/candidate.cjs'),B=require(lab+'/before.cjs');
const [input,out]=process.argv.slice(2);if(!out||fs.existsSync(out)||fs.existsSync(out+'.jsonl'))throw Error('Evolution input and fresh output required');
const samples=+(process.env.SAMPLES||6),offset=+(process.env.SEED_OFFSET||0),limit=+(process.env.CANDIDATE_LIMIT||24);
const source=JSON.parse(fs.readFileSync(input));const key=d=>[...d].sort().join(',');let candidates=[],seen=new Set();
for(const deck of [...B.BOT_HELL_DECKS.map(d=>d.cards),...source.history.flatMap(h=>h.scores).sort((a,b)=>b.fitness-a.fitness).map(s=>s.deck)])if(!seen.has(key(deck))){seen.add(key(deck));candidates.push(deck);if(candidates.length===limit)break;}
const opponents=source.opponents,rows=[],scores=[],begin=Date.now();const modules={candidate:createHash('sha256').update(fs.readFileSync(lab+'/candidate.cjs')).digest('hex'),baseline:createHash('sha256').update(fs.readFileSync(lab+'/before.cjs')).digest('hex')};
for(const [index,deck] of candidates.entries()){if(index<+(process.env.START_INDEX||0)||index>=+(process.env.END_INDEX||Infinity))continue;let points=0,oldHell=0,invalid=0,matchups=[];
 for(let opponent=0;opponent<opponents.length;opponent++){let subtotal=0;
  for(let r=0;r<samples;r++)for(let seat=0;seat<2;seat++){
   const seed=6210000+offset+opponent*100+r,ds=seat?[opponents[opponent],deck]:[deck,opponents[opponent]];let g=C.createGame({mode:'bot',seed,starting:0,p0:{id:'a',name:'a',deck:ds[0]},p1:{id:'b',name:'b',deck:ds[1]}}).state,steps=0,bad=false;
   while(!g.over&&steps++<1600){const side=C.actingSide(g),mod=side===seat?C:B,view=mod.observationSample(g,side,0),a=mod.legalBotAction(g,mod.safeGreedy(view),view),next=C.reduce(g,a).state;if(!C.actionChangesState(g,next)&&next.rng===g.rng){bad=true;break;}g=next;}
   const result=!bad&&g.over?(g.winner===seat?1:g.winner==null?.5:0):null;if(result==null)invalid++;else{points+=result;subtotal+=result;if(opponent<3)oldHell+=result;}
   const row={index,opponent,seed,seat,result,steps,turns:g.turn};rows.push(row);fs.appendFileSync(out+'.jsonl',JSON.stringify(row)+'\n');
  }matchups.push(subtotal/(samples*2));
 }
 scores.push({index,deck,points,oldHell,invalid,matchups,fitness:points/(opponents.length*samples*2)*.6+oldHell/(3*samples*2)*.4});
 fs.writeFileSync(out,JSON.stringify({modules,samples,offset,rowRange:[+(process.env.START_INDEX||0),+(process.env.END_INDEX||candidates.length)],plannedGames:candidates.length*opponents.length*samples*2,games:rows.length,seconds:(Date.now()-begin)/1000,candidates,opponents,scores,rows},null,2));console.log(JSON.stringify(scores.at(-1)));
}
if(scores.some(s=>s.invalid))process.exitCode=1;

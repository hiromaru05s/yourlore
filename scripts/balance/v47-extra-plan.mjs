import fs from 'node:fs';
import {catalog,rng,mixedDeck} from './run.mjs';
const root=process.argv[2],r=rng(2026091048),pick=a=>a[Math.floor(r()*a.length)];
let jobs=[];
// Fixed Scout purchase supplies the King's required other Demon in every arm.
for(const ids of [['DEMON_REALM','TDE4'],['TDE1','TDE4']])for(let rep=0;rep<160;rep++){
 const seed=Math.floor(r()*2**31),bg=mixedDeck(r),opp=mixedDeck(r);
 const controls=ids.map(id=>catalog.starters.includes(id)?'STARTER_TRASH':pick(catalog.market.filter(x=>!ids.includes(x)&&catalog.cards[x].cost===catalog.cards[id].cost)));
 for(const arm of ['00','10','01','11']){
  const deck=[...bg],priority=ids[0]==='DEMON_REALM'?['TDE1']:[];
  ids.forEach((id,i)=>{const use=arm[i]==='1'?id:controls[i];if(catalog.starters.includes(id))deck[i]=use;else priority.push(use);});
  for(const starting of [0,1])jobs.push({id:`v47-factor-${jobs.length}`,stage:'factor',combo:ids.join('|'),support:ids[0]==='DEMON_REALM'?'TDE1':null,rep,arm,controls,seed,starting,decks:[deck,opp],priority:[priority,[]],policy:'greedy',tactical:false});
 }
}
fs.writeFileSync(root+'/king-factor-plan.json',JSON.stringify(jobs));
// Identical replay of the v46 tactical and bot-coverage sensitivity plans.
if(process.argv[3])for(const name of ['validation','market-validation','coverage']){
 const prior=JSON.parse(fs.readFileSync(`${process.argv[3]}/${name}-plan.json`));
 fs.writeFileSync(`${root}/${name}-plan.json`,JSON.stringify(prior));
}
console.log({kingGames:jobs.length});

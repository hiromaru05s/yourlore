import fs from 'node:fs';
import {catalog,rng,mixedDeck} from './run.mjs';
const r=rng(2026091047),pick=a=>a[Math.floor(r()*a.length)],jobs=[];
const combos=process.argv[3]==='weak' ? [['GRAPE','BREWING'],['GUILD_CO','SLUM'],['ANCIENT_CIV','INCUBATOR_S']] : [['HALF_ELF','WORLD_HEART'],['HALF_ELF','VITAL3'],['ELF_HAVEN','WORLD_HEART'],['ELF_HAVEN','HALF_ELF'],['RIFT','SORTER'],['RIFT','Q_RIFT'],['RIFT','REFRESH_HAND'],['RIFT','TRIAL_AREA'],['GHOST','GAMBLER'],['CASTLE','QUICK_MUSTER'],['DEMON_REALM','TDE3'],['Q_DECAY','QUICK_POISON'],['Q_WINTER','QUICK_WORLD'],['GOLEM2','GOLEM3']];
for(const ids of combos)for(let rep=0;rep<160;rep++){
  const seed=Math.floor(r()*2**31),bg=mixedDeck(r).map(x=>ids.includes(x)?'STARTER_TRASH':x),opp=mixedDeck(r);
  const controls=ids.map(id=>catalog.starters.includes(id)?'STARTER_TRASH':pick(catalog.market.filter(x=>!ids.includes(x)&&catalog.cards[x].cost===catalog.cards[id].cost)));
  for(const arm of ['00','10','01','11']){
    const deck=[...bg],priority=[];
    ids.forEach((id,i)=>{const use=arm[i]==='1'?id:controls[i];if(catalog.starters.includes(id))deck[i]=use;else priority.push(use);});
    for(const starting of [0,1])jobs.push({id:`${process.argv[3]==='weak'?'factor-weak':'factor'}-${jobs.length}`,stage:'factor',combo:ids.join('|'),rep,arm,controls,seed,starting,decks:[deck,opp],priority:[priority,[]],policy:'greedy',tactical:false});
  }
}
fs.writeFileSync(process.argv[2],JSON.stringify(jobs));console.log({games:jobs.length,combos:combos.length});

import fs from 'node:fs';
import {catalog,rng,randomDeck,mixedDeck} from './run.mjs';
const out=process.argv[2],r=rng(2026091046),pick=a=>a[Math.floor(r()*a.length)],seed=()=>Math.floor(r()*2**31);
const base=['STARTER_TRASH','STARTER_TRASH','STARTER_TRASH','STARTER_TRASH','STARTER_TRASH','STARTER_TRASH','STARTER_CHEST','STARTER_CHEST'];
const build=(...ids)=>[...ids,...base].slice(0,8);
const builds={
  DEFAULT:base, ...Object.fromEntries(catalog.presets.map(x=>[x.name.split(' · ')[1],x.cards])),
  CASTLE:build('CASTLE','CASTLE','TRUMPET'),
  ASSASSIN:build('GUILD_HALL','GUILD_HALL','AMBUSH'),
  DECAY:build('RUST_SHROOM','RUST_SHROOM','ACID_RAIN'),
  CULL:build('CHOSEN_AREA','TRIAL_AREA','RIFT'),
  EGG:build('ANCIENT_CIV','INCUBATOR_S','INCUBATOR_S'),
  MERCHANT:build('GUILD_CO','SLUM','GRAPE','GRAPE','BREWING'),
  DUNGEON:build('DUNGEON_FLOOR','STARTER_CHEST','STARTER_CHEST'),
  CASINO:build('CASINO','FATE_WHEEL','GAMBLER','GAMBLER'),
  RIFT:build('RIFT','TRIAL_AREA'),
  TRIBE:build('TRIBE_PACT','TRIBE_PACT'),
};
for(const [name,deck]of Object.entries(builds))if(deck.length!==8||deck.some(id=>!catalog.starters.includes(id)))throw Error('invalid '+name);
const jobs=[];
function add(meta,decks,s){for(const starting of [0,1])jobs.push({id:jobs.length,seed:s,decks,starting,policy:'greedy',tactical:false,...meta});}
for(let i=0;i<12000;i++)add({stage:'observe',policy:i<6000?'greedy':'explore'},[mixedDeck(r),mixedDeck(r)],seed());
// Same background, opponent, RNG and opening seat for treatment and Cull control.
for(const id of catalog.starters)for(let k=0;k<200;k++){
  const bg=mixedDeck(r),opp=mixedDeck(r),s=seed();bg[0]='STARTER_TRASH';
  add({stage:'starter',card:id,rep:k,arm:'control'},[bg,opp],s);
  add({stage:'starter',card:id,rep:k,arm:'treatment'},[[id,...bg.slice(1)],opp],s);
}
// Prioritized legal purchase against a uniformly drawn card of the same printed cost.
// Both sides use identical starter lists. Neither card is granted free.
for(const id of catalog.market)for(let k=0;k<128;k++){
  const peers=catalog.market.filter(x=>x!==id&&catalog.cards[x].cost===catalog.cards[id].cost);
  const peer=pick(peers.length?peers:[id]),deck=mixedDeck(r);
  add({stage:'market',card:id,peer,rep:k,priority:[[id],[peer]]},[deck,deck],seed());
}
const names=Object.keys(builds);
for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++)for(let k=0;k<30;k++)add({stage:'build',builds:[names[i],names[j]],rep:k},[builds[names[i]],builds[names[j]]],seed());
fs.writeFileSync(out,JSON.stringify(jobs));
fs.writeFileSync(out.replace('plan.json','builds.json'),JSON.stringify(builds,null,2));
console.log(JSON.stringify({games:jobs.length,stages:jobs.reduce((a,j)=>(a[j.stage]=(a[j.stage]??0)+1,a),{})}));

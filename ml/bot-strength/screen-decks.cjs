const fs=require('node:fs'),C=require(process.env.BOT_MODULE || require('node:path').resolve(process.env.BOT_LAB || '.bot-strength','candidate.cjs'));const builds=JSON.parse(fs.readFileSync('ml/bot-strength/builds.json'));Object.assign(builds,{ELF_ENGINE:['ELF_HAVEN','ELF_HAVEN','HALF_ELF','HALF_ELF','NOURISHING_RAIN','STARTER_TRASH','STARTER_TRASH','STARTER_TRASH'],RIFT_ENGINE:['RIFT','RIFT','TRIAL_AREA','TRIAL_AREA','SELECTED_SHIELD','STARTER_TRASH','STARTER_TRASH','STARTER_TRASH'],GAMBLER_TEMPO:['GAMBLER','GAMBLER','GAMBLER','GHOST','GHOST','NOURISHING_RAIN','STARTER_TRASH','STARTER_TRASH'],ELF_GAMBLER:['ELF_HAVEN','ELF_HAVEN','GAMBLER','GAMBLER','HALF_ELF','NOURISHING_RAIN','STARTER_TRASH','STARTER_TRASH']});
const names=Object.keys(builds);for(const n of names){if(JSON.stringify(C.sanitizeDeck(builds[n]))!==JSON.stringify(builds[n]))throw Error(n+' invalid');}
const rows=[],summary={};let games=0;const start=Date.now();
for(let d=0;d<names.length;d++){
 const name=names[d];let wins=0,losses=0,bad=0;
 for(let r=0;r<10;r++)for(let seat=0;seat<2;seat++){
 const opponent=C.BOT_DECKS[r%5],deck=builds[name];const pair=r;
 const decks=seat===0?[deck,opponent.cards]:[opponent.cards,deck];
 let g=C.createGame({mode:'bot',seed:191000+pair,starting:0,p0:{id:'a',name:'a',deck:decks[0]},p1:{id:'b',name:'b',deck:decks[1]}}).state;
 let steps=0,invalid=null;
 while(!g.over&&steps++<1000){const step=C.greedyStep(g);if(!C.actionChangesState(g,step.state)){invalid={action:step.action,pending:g.pending};break;}g=step.state;}
 if(!g.over||invalid)bad++;else if(g.winner===seat)wins++;else losses++;
 rows.push({name,r,seat,winner:g.over?g.winner:null,turns:g.turn,steps,invalid});games++;
 }
 summary[name]={wins,losses,bad,rate:wins/(wins+losses)};
 fs.writeFileSync(require('node:path').resolve(process.env.BOT_LAB || '.bot-strength','results/deck-screen.json'),JSON.stringify({games,seconds:(Date.now()-start)/1000,builds,summary,rows},null,2));
 console.error(name,summary[name],games);
}

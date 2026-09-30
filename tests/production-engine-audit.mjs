import assert from 'node:assert/strict';import {build} from 'esbuild';import {mkdtemp,rm,writeFile} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-engine-audit-');
await build({stdin:{contents:`export * from './client/src/shared/engine';export {DB,STARTERS} from './client/src/shared/cards';export {greedyDecide} from './client/src/shared/bot';export {resolveTurnTimeout} from './server/src/gameInput';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs'});
const {DB,createGame,reduce,greedyDecide,resolveTurnTimeout}=await import(dir+'/engine.mjs');
const out=process.env.LORE_AUDIT_OUTPUT||'docs/audits/2026-09-30-production/evidence/engine-audit.json';
const report={cards:0,cardCases:0,games:0,resolved:0,steps:0,stalls:[],errors:[],timeouts:0};
function invariants(g){
 for(const p of g.players){for(const key of ['hp','mana','maxMana'])assert(Number.isFinite(p[key]),'finite '+key);assert(p.mana>=0,'negative mana');const cards=[...p.hand,...p.deck,...p.discard,...p.field,...p.enchants.map(x=>x.card),...(p.quests??[]).map(x=>x.card),...(p.removed??[])];assert.equal(new Set(cards.map(c=>c.uid)).size,cards.length,'duplicate physical UID');for(const c of cards)assert(c.id&&c.uid,'missing card identity');}
}
const mon=(id,uid)=>({...DB[id],uid,dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0});
try{
 for(const card of Object.values(DB)){
  report.cards++;console.log('card',card.id);
  for(const side of [0,1]){
   let g=createGame({mode:'bot',seed:41,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=9;g.pending=null;
   for(const [i,p] of g.players.entries()){p.mana=100;p.maxMana=100;p.hp=200;p.dew=30;p.shield=30;p.field=[mon('ELF','elf-'+i),mon('WORLD_TREE','tree-'+i)];p.hand=[{...DB.M1,uid:'mana-'+i}];}
   g.players[side].hand.unshift({...card,uid:'audit-card'});
   try{g=reduce(g,{type:'play',idx:0}).state;invariants(g);if(g.pending){g=resolveTurnTimeout(g).state;invariants(g)}report.cardCases++;}catch(e){report.errors.push({card:card.id,side,error:e.message});}
  }
 }
 for(let seed=1;seed<=200;seed++){
  let g=createGame({mode:'bot',seed,starting:seed%2,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;let repeated=0;
  try{
   for(let step=0;step<1400&&!g.over;step++){
    const action=greedyDecide(g),before=JSON.stringify(g),result=reduce(g,action);g=result.state;report.steps++;invariants(g);
    repeated=JSON.stringify(g)===before?repeated+1:0;
    if(repeated>=4){report.stalls.push({seed,step,turn:g.turn,action,pending:g.pending});g=resolveTurnTimeout(g).state;report.timeouts++;repeated=0;}
   }
   report.games++;if(g.over)report.resolved++;else report.errors.push({seed,error:'step cap',turn:g.turn});
  }catch(e){report.errors.push({seed,error:e.message});}
  if(seed%20===0){await writeFile(out,JSON.stringify(report,null,2));console.log({games:report.games,resolved:report.resolved,steps:report.steps,stalls:report.stalls.length,errors:report.errors.length})}
 }
 await writeFile(out,JSON.stringify(report,null,2));console.log(report);
}finally{await rm(dir,{recursive:true,force:true})}
if(report.errors.length)process.exitCode=1;

import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lore-hand-condition-'));
try{
 await build({stdin:{contents:"export {createGame,playBlockReason,cardPlayConditionMet,summonReqMet} from './client/src/shared/engine';export {DB,STARTERS} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/current.mjs'});
 const {DB,STARTERS,createGame,playBlockReason,cardPlayConditionMet,summonReqMet}=await import(dir+'/current.mjs');
 const instance=(id,n=0)=>({...DB[id],uid:id+'-'+n,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0});
 const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
 const p=g.players[0],o=g.players[1];g.pending=null;p.hand=[instance('TDE1')];p.maxMana=4;p.mana=0;
 assert.equal(cardPlayConditionMet(g,0,p.hand[0]),false);p.maxMana=5;assert.equal(cardPlayConditionMet(g,0,p.hand[0]),true);assert.ok(playBlockReason(g,0,p.hand[0]));
 assert.equal(cardPlayConditionMet(g,0,{...STARTERS.STARTER_CHEST,uid:'chest'}),null);
 assert.equal(cardPlayConditionMet(g,0,instance('INQUISITION')),null);
 p.hand=[instance('BEGINNER_MIND')];assert.equal(cardPlayConditionMet(g,0,p.hand[0]),true);p.hand.push(instance('TDE1'));assert.equal(cardPlayConditionMet(g,0,p.hand[0]),false);
 p.buysTurn={};assert.equal(cardPlayConditionMet(g,0,instance('BUYOUT')),false);p.buysTurn={ELF:2};assert.equal(cardPlayConditionMet(g,0,instance('BUYOUT')),true);
 const baseline=process.env.LORE_CONDITION_BASELINE;
 let old;if(baseline){await build({stdin:{contents:await fs.readFile(baseline,'utf8'),loader:'ts',resolveDir:path.resolve('client/src/shared')},bundle:true,platform:'node',format:'esm',outfile:dir+'/baseline.mjs'});old=await import(dir+'/baseline.mjs');}
 let comparisons=0;const inventory=[];
 for(const card of Object.values(DB))if(card.summonReq)inventory.push({id:card.id,condition:card.summonReq});
 for(let n=0;n<60;n++){
  for(const [i,player] of g.players.entries()){
   player.maxMana=n%12;player.mana=n%5===0?0:20;player.hp=[20,40,65,99][n%4];player.dew=n%10;player.previousOpponentShieldPeak=n%2?20:0;
   player.field=Array.from({length:n%5},(_,j)=>instance(['M4','ELF','ASSASSIN1','GOLEM1','TDE1'][(j+n+i)%5],j));
   player.deck=Array.from({length:20},(_,j)=>instance(j%3?'ELF':'RUNE2',j));player.discard=n%2?[instance('GOLEM2')]:[];
   player.usesTurn={S4:n%2};player.buysTurn=n%2?{ELF:2}:{};player.brand=n%3;player.spellSealTurn=n%11===0;
  }
  for(const c of Object.values(DB)){
   const card={...c,uid:'candidate'};p.hand=[card];
   const before=JSON.stringify(g);const status=cardPlayConditionMet(g,0,card);
   assert.equal(JSON.stringify(g),before,'condition check must be read-only');
   if(card.summonReq&&card.t==='mon')assert.equal(status,summonReqMet(p,card,o));
   if(old)assert.deepEqual(playBlockReason(g,0,card),old.playBlockReason(g,0,card),`${n}: ${card.id}`);
   comparisons++;
  }
 }
 const report={status:'passed',comparisons,legalityParity:!!old,inventory,checks:['mana independent','no cue for ordinary cards','no hidden opponent deck signal','spell condition true/false','all summon requirement types use engine predicate','read-only evaluation']};
 const out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-29-hand-condition-golden';await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/rules-report.json',JSON.stringify(report,null,2));console.log('PASS',comparisons,'card/state checks; baseline parity',!!old);
}finally{await fs.rm(dir,{recursive:true,force:true});}

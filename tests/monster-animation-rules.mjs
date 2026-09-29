import {build} from 'esbuild';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lore-monster-rules-'));
try{
 await build({stdin:{contents:"export {createGame,reduce,monsterCanAttack} from './client/src/shared/engine';export {DB} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/rules.mjs'});
 const {createGame,reduce,monsterCanAttack,DB}=await import(dir+'/rules.mjs');
 const mon=(uid,extra={})=>({...DB.ELF,uid,atk:5,def:8,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0,...extra});
 const fresh=()=>{const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.pending=null;g.turn=3;for(const p of g.players){p.mana=30;p.maxMana=30;p.field=[];p.enchants=[];p.traps=[];p.quests=[];p.hand=[];}return g;};
 const g=fresh(),p=g.players[0],o=g.players[1],m=mon('same-id-1');p.field=[m];assert(monsterCanAttack(g,p,m));
 for(const field of ['exhausted','noHighAtkTurn','noDirectTurn']){const x=field==='exhausted'?m:p;x[field]=true;assert.equal(monsterCanAttack(g,p,m),false,field);x[field]=false;}
 m.hatch=1;assert.equal(monsterCanAttack(g,p,m),false);delete m.hatch;
 o.field=[mon('guard',{aura:'lowAtkBan'})];m.cost=2;assert.equal(monsterCanAttack(g,p,m),false);m.cost=4;assert(monsterCanAttack(g,p,m));
 o.field[0].aura='eliteGuard';assert.equal(monsterCanAttack(g,p,m),false);m.cost=7;assert(monsterCanAttack(g,p,m));o.field=[];
 p.enchants=[{card:{...DB.ELF,ench:'noAttack'}}];assert.equal(monsterCanAttack(g,p,m),false);p.enchants=[];
 const summon=fresh();summon.players[0].hand=[mon('source-a',{onSummon:'shield',val:3,cost:0,summonReq:undefined})];const res=reduce(summon,{type:'play',idx:0});assert(res.events.some(e=>e.type==='monsterActivate'&&e.uid==='source-a'&&e.player===0));assert(res.events.findIndex(e=>e.type==='summon')<res.events.findIndex(e=>e.type==='monsterActivate'));
 const turn=fresh();turn.players[1].field=[mon('source-b',{turnFx:'growAtk',val:3}),mon('source-c',{turnFx:'payDefHeal',val:1,val2:1})];turn.players[1].mana=0;turn.players[1].maxMana=0;const tick=reduce(turn,{type:'endTurn'});assert(tick.events.some(e=>e.type==='monsterActivate'&&e.uid==='source-b'&&e.player===1));
 const attack=fresh();attack.players[0].field=[mon('multi',{mult:2,attackFx:'atkDownOnAttack',val:1})];const hit=reduce(attack,{type:'attack',uid:'multi'});assert.equal(hit.state.players[0].field[0].exhausted,false);assert(hit.events.some(e=>e.type==='monsterActivate'&&e.uid==='multi'));assert.equal(hit.state.players[0].field[0].atkMod,-1);
 const report={status:'passed',checks:['source UID for summon/turn/attack effects','summon precedes activation','multi-attack remains ready','actual attack debuff remains engine-owned','exhaustion/hatch/no-attack/no-high/no-direct/low-cost/elite-guard eligibility']};await fs.writeFile('docs/ui-rework/2026-09-29-monster-adoption/rules-report.json',JSON.stringify(report,null,2));console.log(report);
}finally{await fs.rm(dir,{recursive:true,force:true});}

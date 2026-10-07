import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import {DB,createGame,reduce,curHp,hasPassive,FIELD_MAX} from './api.mjs';
const defs=Object.values(DB).filter(c=>c.t==='mon');
const base=createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
Object.assign(base,{turn:9,phase:'main',pending:null});
for(const p of base.players)Object.assign(p,{hand:[],deck:[],discard:[],removed:[],field:[],enchants:[],traps:[],quests:[],hp:1000,maxHp:1000,mana:30,maxMana:30,dew:0,shield:0});
const mon=(c,uid,wounded)=>({...structuredClone(c),uid,exhausted:false,tempAtk:0,atkMod:0,defMod:0,dmg:wounded?Math.max(0,c.def-1):0,guts:hasPassive(c,'guts')?1:0,summonedTurn:0,...(c.hatchTurns?{hatch:c.hatchTurns,dur:c.hatchDur??4}:{})});
function inv(g){let ids=[];for(const p of g.players){assert(p.field.length<=FIELD_MAX,'field capacity');for(const k of ['hp','mana','maxMana','dew','shield'])assert(Number.isFinite(p[k]),`finite ${k}`);for(const m of p.field){for(const k of ['dmg','guts','atkMod','defMod','tempAtk'])assert(Number.isFinite(m[k]??0),`finite ${k}`);if(!g.over&&m.hatch==null)assert(curHp(p,m)>0,'dead monster left on field');}ids.push(...[...p.field,...p.hand,...p.deck,...p.discard,...p.removed,...p.enchants.map(e=>e.card),...p.quests.map(q=>q.card)].map(c=>c.uid));}assert.equal(new Set(ids).size,ids.length,'duplicate UID');}
const report={source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),monsters:defs.length,cases:0,actions:0,errors:[],deaths:0};
for(const a of defs)for(const d of defs)for(const wounded of [false,true]){let g=structuredClone(base);g.players[0].field=[mon(a,'attacker',false)];g.players[1].field=[mon(d,'defender',wounded)];try{let r=reduce(g,{type:'attack',uid:'attacker'});report.actions++;g=r.state;if(g.pending?.reason==='attack'){g=reduce(g,{type:'chooseTarget',uid:'defender'}).state;report.actions++;}inv(g);if(!g.players[1].field.some(m=>m.uid==='defender'))report.deaths++;report.cases++;}catch(e){report.errors.push({attacker:a.id,defender:d.id,wounded,error:e.message});}}
await fs.writeFile(process.env.LORE_MATRIX_OUTPUT??'docs/audits/2026-10-07-critical-engine/combat-matrix.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
if(report.errors.length)process.exitCode=1;

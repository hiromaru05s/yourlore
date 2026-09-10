import assert from 'node:assert/strict';
import fs from 'node:fs';
import {simulate} from './run.mjs';
import {createGame,DB,STARTERS,greedyDecide,reduce} from './core.bundle.mjs';
const root=process.argv[2]??'docs/balance/2026-09-10-v47';
const plan=JSON.parse(fs.readFileSync(`${root}/plan.json`));
for(const j of [plan[0],plan[12000],plan[24000],plan[24002],plan[50400],plan.find(x=>x.card==='QUICK_ATTUNE')])assert.deepEqual(simulate(j),simulate(j),`replay ${j.id}`);
const control=simulate(plan[24000]),placebo=simulate(plan[24002]);assert.equal(control.winner,placebo.winner);assert.deepEqual(control.sides,placebo.sides);
let quick=0;simulate(plan.find(x=>x.card==='QUICK_ATTUNE'),(prev,a,result)=>{for(const e of result.events)if(e.type==='buy'&&e.id==='QUICK_ATTUNE'){
  quick++;const p=result.state.players[e.player];assert(![...p.hand,...p.deck,...p.discard].some(c=>c.id===e.id));assert(p.removed.some(c=>c.id===e.id));
}});assert(quick>0);
// Known bot blind spot; a reproduction, not a production behavior change.
const g=createGame({mode:'bot',seed:42,p0:{id:'a',name:'a'},p1:{id:'b',name:'b'}}).state;
g.players[0].hand=[{...DB.CHOSEN_AREA,uid:'test-win'}];g.players[0].field=[];g.players[0].mana=7;g.players[0].maxMana=7;g.players[0].removed=Array.from({length:25},(_,i)=>({...STARTERS.STARTER_TRASH,uid:'cull'+i}));g.players[1].hp=100;g.players[1].maxHp=100;
assert.notEqual(greedyDecide(g,false).type,'play');assert.notEqual(greedyDecide(g,true).type,'play');assert.equal(reduce(g,{type:'play',idx:0}).state.winner,0);
if(process.argv.includes('--complete')){
  const r=JSON.parse(fs.readFileSync(`${root}/results.json`));
  const expected=JSON.parse(fs.readFileSync(`${root}/source-manifest.json`));assert.equal(r.summary.attempted,expected.expectedGames);assert.equal(r.market.length,240);assert.equal(r.starters.length,33);assert.equal(r.factor.length,expected.expectedCombos);assert.equal(r.builds.length,16);assert.equal(r.validation.length,expected.expectedValidation);assert.equal(r.coverage.length,expected.expectedCoverage);
  assert.equal(r.summary.finished+r.summary.failed,r.summary.attempted);
  assert.equal(r.market.filter(x=>x.peerCount>0).length,238);
  assert(r.market.filter(x=>x.peerCount>0).every(x=>x.n>0&&Number.isFinite(x.mean)&&x.mean>=0&&x.mean<=1));
  assert(r.starters.every(x=>x.n>0&&Number.isFinite(x.mean)));assert(r.factor.every(x=>x.n>0));
  assert.equal(r.starters.find(x=>x.id==='STARTER_TRASH').mean,0);
  const buildScore=r.builds.reduce((s,x)=>s+x.mean*x.games,0),buildN=r.builds.reduce((s,x)=>s+x.games,0);assert(Math.abs(buildScore/buildN-.5)<1e-12);
}
console.log('PASS: seeded replay, Cull placebo, quick purchase routing, special-win blind-spot reproduction'+(process.argv.includes('--complete')?', full coverage and score conservation':''));

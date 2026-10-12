import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const dir=await mkdtemp('/tmp/lore-contact-');
try{
 const config={stdin:{contents:"export * from './client/src/shared/engine';export * from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm'};
 await build({...config,outfile:dir+'/new.mjs'});
 const baseline=execFileSync('git',['show','e2f21172:client/src/shared/engine.ts'],{encoding:'utf8'});
 await build({...config,outfile:dir+'/old.mjs',plugins:[{name:'baseline',setup(b){b.onLoad({filter:/shared\/engine\.ts$/},()=>({contents:baseline,loader:'ts'}));}}]});
 const E=await import(dir+'/new.mjs'),old=await import(dir+'/old.mjs');
 const mon=(uid,atk=3,extra={})=>({...structuredClone(E.DB.M6),uid,atk,def:20,exhausted:false,tempAtk:0,atkMod:0,defMod:0,dmg:0,summonedTurn:0,...extra});
 const fresh=()=>{const g=E.createGame({mode:'online',seed:17,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],removed:[],field:[],enchants:[],traps:[],quests:[],hp:200,maxHp:200,mana:30,maxMana:30,uses:{},usesTurn:{}});g.phase='main';g.pending=null;g.turn=3;return g;};
 const cases=[
 ['zero face',0,null,0,0],['positive face',3,null,0,3],['full shield',3,null,5,0],['partial shield',3,null,1,2],
 ['zero monster',0,{},0,0],['positive monster',3,{},0,3],['immune monster',3,{immuneDamageTurn:3},0,0],['castle prevention',3,{id:'CASTLE',gcount:1},0,0],
 ['guts at one HP',3,{def:1,guts:1},0,0],['egg durability with zero ATK',0,{hatch:3,dur:3},0,0],['lethal with piercing',5,{def:2},0,2],
 ];
 const report=[];
 for(const [name,atk,target,shield,expected]of cases){
  let g=fresh();g.players[0].field=[mon('attacker',atk)];g.players[1].shield=shield;if(target)g.players[1].field=[mon('target',2,target)];
  const run=engine=>{let r=engine.reduce(g,{type:'attack',uid:'attacker'});if(r.state.pending?.reason==='attack')r=engine.reduce(r.state,{type:'chooseTarget',uid:'target'});return r;};
  const r=run(E);
  if(atk===0){
   assert(!r.events.some(e=>e.type==='attack'),name+' cannot declare an attack or emit contact audio');
   for(const side of [0,1])for(const key of ['field','hp','shield','hand','mana'])assert.deepEqual(r.state.players[side][key],g.players[side][key],name+' leaves '+key+' unchanged');
   assert.equal(r.state.pending,null,name+' creates no target selection');
   report.push({name,attackBlocked:true,contactDamage:0});continue;
  }
  const before=run(old);assert.deepEqual(r.state,before.state,name+' gameplay unchanged');
  const attack=r.events.find(e=>e.type==='attack');assert(attack,name+' attack emitted');assert.equal(attack.contactDamage,expected,name);
  report.push({name,contactDamage:attack.contactDamage});
 }
 await writeFile('docs/sound-redesign/2026-09-30/revision2/rules.json',JSON.stringify(report,null,2)+'\n');console.log('PASS',report);
}finally{await rm(dir,{recursive:true,force:true});}

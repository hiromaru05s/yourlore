import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-elemental-'));
try{
 const bundle=async(contents,name,resolveDir=process.cwd())=>{const outfile=path.join(dir,name+'.mjs');await build({stdin:{contents,resolveDir,loader:'ts'},bundle:true,platform:'node',format:'esm',outfile});return import(outfile);};
 const current=await bundle(`export * from './client/src/shared/engine';export {DB,STARTERS} from './client/src/shared/cards';export * from './client/src/ui/elemental/catalog';`,'current');
 // Frozen pre-adoption reducer: proves visual annotations do not alter rules or RNG.
 const baselineSource=execFileSync('git',['show','a5d44229:client/src/shared/engine.ts'],{encoding:'utf8'});
 const baseline=await bundle(baselineSource,'baseline',path.resolve('client/src/shared'));
 const {DB,STARTERS}=current;let seq=0,cases=0;
 const card=id=>({...DB[id]??STARTERS[id],uid:'qa-'+ ++seq});
 const mon=(id,hp=30)=>({...card(id),def:hp,dmg:0,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0,exhausted:false});
 function fresh(seed,owner){const g=current.createGame({mode:'online',seed,starting:owner,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.cur=owner;g.turn=3;g.phase='main';g.pending=null;for(const p of g.players)Object.assign(p,{hand:[],field:[],deck:[],discard:[],removed:[],traps:[],enchants:[],quests:[],hp:50,maxHp:50,mana:30,maxMana:30,openingDrawReady:false});return g;}
 const clean=x=>JSON.parse(JSON.stringify(x,(k,v)=>k==='sourceUid'||k==='data'&&v&&Object.keys(v).every(k=>k==='sourceUid')?undefined:v));
 function compare(g,a){const old=baseline.reduce(g,a),now=current.reduce(g,a);assert.deepEqual(clean(now.state),clean(old.state));assert.deepEqual(clean(now.events.filter(e=>!e.type.startsWith('elemental'))),clean(old.events));for(const start of now.events.filter(e=>e.type==='elementalStart')){const impacts=now.events.filter(e=>e.type==='elementalImpact'&&e.group===start.group);assert.equal(impacts.length,start.targets.length);assert(now.events.some(e=>e.type==='elementalEnd'&&e.group===start.group));assert(!start.targets.some(t=>t.uid&&(!g.players.flatMap(p=>p.field).some(m=>m.uid===t.uid))));}cases++;return now;}
 for(const owner of [0,1])for(const seed of [1,7,17,58])for(const id of ['GUNNER','HEAVY_GUNNER','FIRE_ARROW','FIRE_METEOR','FIRE_BALL','FIRE_ZONE','NGA4']){
  const g=fresh(seed,owner);g.players[1-owner].field=[mon('ELF',1),mon('INFKNIGHT',30)];
  if(id==='NGA4'){g.players[owner].field=[mon(id),mon('ELF')];compare(g,{type:'attack',uid:g.players[owner].field[0].uid});}
  else if(id.endsWith('GUNNER')){g.players[owner].field=[mon(id)];const res=compare(g,{type:'endTurn'});assert.equal(res.events.find(e=>e.type==='elementalStart').targets.length,1);}
  else{g.players[owner].hand=[card(id),card('STARTER_TRASH')];let res=compare(g,{type:'play',idx:0});if(res.state.pending)res=compare(res.state,{type:'pick',uid:id==='FIRE_ZONE'?g.players[owner].hand[1].uid:seed%2?'player-'+owner:g.players[1-owner].field[1].uid});const fx=res.events.find(e=>e.type==='elementalStart');assert(fx,id);assert.equal(fx.targets.length,id==='FIRE_ARROW'?3:id==='FIRE_METEOR'?8:id==='FIRE_ZONE'?3:1);}
 }
 // Lethal truncation: no fabricated remaining projectiles after a game ends.
 for(const id of ['FIRE_ARROW','FIRE_METEOR']){const g=fresh(17,0);g.players[1].hp=1;g.players[0].hand=[card(id)];const res=compare(g,{type:'play',idx:0});assert.equal(res.events.find(e=>e.type==='elementalStart').targets.length,1);assert(res.state.over);}
 const reflected=fresh(17,0);reflected.players[0].hand=[card('FIRE_BALL')];reflected.players[1].enchants=[{card:card('BLACK_REVERSE'),turns:6,bornTurn:0}];const chosen=compare(reflected,{type:'play',idx:0});const reflectedHit=compare(chosen.state,{type:'pick',uid:'player-1'});assert.equal(reflectedHit.events.find(e=>e.type==='elementalStart').targets[0].player,0);
 assert.equal(current.rate('berserk'),2);assert.equal(current.visualEntries.NGA4.duration/current.rate('berserk'),1500);assert(!current.visualEntries.T13);assert(!DB.T13);
 const effects=await readFile('client/src/ui/elemental/effects.ts','utf8');const zone=effects.slice(effects.indexOf('private zone('));assert(!zone.includes('mix(s,'));assert(zone.includes('this.fire.draw(c,1'));
 console.log(`PASS ${cases} reducer parity cases, authoritative targets, lethal truncation, 2x berserk and pillar-only zone`);
}finally{await rm(dir,{recursive:true,force:true});}

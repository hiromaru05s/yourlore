import assert from 'node:assert/strict';import {build} from 'esbuild';import {execFileSync} from 'node:child_process';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lore-ember-rules-'));
try{
 const bundle=async(contents,name,resolveDir=process.cwd())=>{const outfile=path.join(dir,name+'.mjs');await build({stdin:{contents,resolveDir,loader:'ts'},bundle:true,platform:'node',format:'esm',outfile});return import(outfile);};
 const current=await bundle("export * from './client/src/shared/engine';export {DB} from './client/src/shared/cards';",'now');
 const old=await bundle(execFileSync('git',['show','74483458:client/src/shared/engine.ts'],{encoding:'utf8'}),'before',path.resolve('client/src/shared'));
 const gameplay=events=>{
  for(const e of events.filter(e=>e.type==='reverseDamage')){const d=events.filter(d=>d.type==='damage'&&d.reverseId===e.id);assert.equal(d.length,1);assert.equal(d[0].player,e.to);}
  return events.filter(e=>!e.type.startsWith('elemental')).map(e=>{if(e.type==='reverseDamage'){const {id,...rest}=e;return rest;}if(e.type==='damage'){const {reverseId,...rest}=e;return rest;}return e;});
 };
 let cases=0;
 for(const owner of [0,1])for(const seed of [1,7,17,58])for(const mode of ['normal','lethal','self-lethal','shield','blood-rite','reverse','rune']){
  const g=current.createGame({mode:'online',seed,starting:owner,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  g.cur=owner;g.turn=3;g.phase='main';g.pending=null;
  for(const p of g.players)Object.assign(p,{hand:[],field:[],deck:[],discard:[],removed:[],traps:[],enchants:[],quests:[],hp:30,maxHp:30,mana:20,maxMana:20,openingDrawReady:false});
  const card=(id,uid)=>({...current.DB[id],uid});g.players[owner].hand=[card('FLAME','ember')];
  if(mode==='lethal')g.players[1-owner].hp=2;
  if(mode==='self-lethal')g.players[owner].hp=1;
  if(mode==='shield')g.players[1-owner].shield=3;
  const id=mode==='blood-rite'?'BLOOD_RITE':mode==='reverse'?'BLACK_REVERSE':mode==='rune'?'RUNE3':null;
  if(id)g.players[mode==='rune'?owner:1-owner].enchants=[{card:card(id,'reaction'),turns:6,bornTurn:0}];
  const a={type:'play',idx:0},before=old.reduce(g,a),after=current.reduce(g,a);
  // Fire-family membership is an intentional rule change; damage/VFX parity remains.
  assert.deepEqual(after.state.players[owner].expansion.firePlayed,['FLAME']);
  before.state.players[owner].expansion.firePlayed=['FLAME'];
  assert.deepEqual(after.state,before.state,mode+' state/RNG');assert.deepEqual(gameplay(after.events),gameplay(before.events),mode+' gameplay events');
  const groups=after.events.filter(e=>e.type==='elementalStart'&&e.id==='FLAME');assert.equal(groups.length,mode==='rune'?2:1);
  for(const group of groups){const impacts=after.events.filter(e=>e.type==='elementalImpact'&&e.group===group.group);assert.equal(impacts.length,group.targets.length);assert(after.events.some(e=>e.type==='elementalEnd'&&e.group===group.group));assert.equal(group.targets.length,mode==='lethal'?1:2);assert.equal(group.targets[0].player,1-owner);if(group.targets[1])assert.equal(group.targets[1].player,owner);}
  cases++;
 }
 console.log(`PASS ${cases} Ember Debt reducer parity cases: both owners, normal/lethal, shield, blood rite, reverse and rune`);
}finally{await fs.rm(dir,{recursive:true,force:true});}

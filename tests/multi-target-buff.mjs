import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-multi-buff-'));
const calls=[],finishes=[];
globalThis.__playStat=(node,kind,options)=>{calls.push({uid:node.dataset.uid,kind,options});return new Promise(resolve=>finishes.push(resolve));};
try{
 await build({stdin:{contents:"export {createBoardStatRise} from './client/src/ui/statRise';export {createGame,reduce} from './client/src/shared/engine';export {DB} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'test.mjs'),plugins:[{name:'stat-renderer-double',setup(b){b.onResolve({filter:/monster\/runtime$/},()=>({path:'runtime',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const playMonster=(...args)=>globalThis.__playStat(...args);export const syncMonsterStates=()=>{};export const clearMonsterStates=()=>{};'}));}}]});
 const {createBoardStatRise,createGame,reduce,DB}=await import(path.join(dir,'test.mjs'));
 const mon=uid=>({...DB.ELF,uid,dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0});
 const fresh=()=>{const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.pending=null;g.players.forEach((p,s)=>Object.assign(p,{field:Array.from({length:3},(_,i)=>mon(s+'-'+i)),hand:[{...DB.TRUMPET,uid:'trumpet-'+s}],mana:20,enchants:[],traps:[],quests:[]}));return g;};
 const nodes=Array.from({length:6},(_,i)=>({dataset:{uid:Math.floor(i/3)+'-'+i%3},classList:{remove(){}},closest(){return i>=3?{}:null;}}));
 const root={querySelectorAll(){return nodes;}};
 const finish=()=>{for(const f of finishes.splice(0))f(true);};
 for(const owner of [0,1]){
  let g=fresh();g.cur=owner;const track=createBoardStatRise(root);await track.update(g);calls.length=0;
  g=reduce(g,{type:'play',idx:0}).state;await track.update(g);
  for(let i=0;i<2;i++){g=reduce(g,{type:'chooseTarget',uid:owner+'-'+i}).state;await track.update(g);await track.update(g);assert.equal(calls.length,0,'intermediate/repeated selection snapshots defer feedback');}
  g=reduce(g,{type:'chooseTarget',uid:owner+'-2'}).state;
  let settled=false;const done=track.update(g).then(()=>settled=true);await Promise.resolve();
  assert.deepEqual(calls.map(c=>c.uid),[0,1,2].map(i=>owner+'-'+i));assert(calls.every(c=>c.kind==='atk'&&c.options.stats.atk.to-c.options.stats.atk.from===1));assert(calls.every(c=>c.options.side===(owner?-1:1)));assert.equal(settled,false);
  finishes.shift()(true);await Promise.resolve();assert.equal(settled,false,'completion waits for every target');finish();await done;
  calls.length=0;await track.update(g);assert.equal(calls.length,0,'completed snapshots do not replay');track.dispose();
 }
 for(const cancel of [true,false]){
  let g=fresh();const track=createBoardStatRise(root);await track.update(g);g=reduce(g,{type:'play',idx:0}).state;await track.update(g);g=reduce(g,{type:'pick',uid:'0-0'}).state;await track.update(g);
  if(cancel)g=reduce(g,{type:'pick',uid:null}).state;else{g.over=true;g.pending=null;}
  calls.length=0;const done=track.update(g);assert.equal(calls.length,cancel?1:0,'cancel flushes chosen cards; match end suppresses them');finish();await done;track.dispose();
 }
 {let g=fresh();const track=createBoardStatRise(root);await track.update(g);calls.length=0;g.players.forEach(p=>p.field.forEach(m=>m.atkMod+=3));const done=track.update(g);assert.equal(calls.length,6,'all targets on both sides start concurrently');finish();await done;track.dispose();}
 console.log('PASS multi-target baseline, both owners, repeated snapshots, all-target completion, partial cancel, match end and simultaneous buffs');
}finally{delete globalThis.__playStat;await rm(dir,{recursive:true,force:true});}

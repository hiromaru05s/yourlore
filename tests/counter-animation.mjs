import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/lore-counter-');
try{
 await build({stdin:{contents:"export * from './client/src/shared/engine';export {DB} from './client/src/shared/cards';export * from './client/src/ui/counter/model';export * from './client/src/game/counterPresentation';export * from './client/src/ui/attackVisual';export {point as selectedPoint} from './client/src/ui/counter/renderer';export {point as previewPoint} from './client/src/dev/counter-four/renderer';export {pose as previewPose} from './client/src/dev/counter-four/motion';export {EventSound} from './client/src/ui/eventSound';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const E=await import(dir+'/test.mjs');let seq=0;
 const mon=(id,mods={})=>({...structuredClone(E.DB[id]),uid:'counter-test-'+ ++seq,exhausted:false,tempAtk:0,atkMod:0,defMod:0,dmg:0,guts:0,summonedTurn:0,...mods});
 const fresh=()=>{const g=E.createGame({mode:'online',seed:71,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.phase='main';g.pending=null;g.turn=3;for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],removed:[],field:[],enchants:[],traps:[],quests:[],hp:200,mana:30,maxMana:30});return g;};
 const strike=(g,a,d)=>{const chosen=E.reduce(g,{type:'attack',uid:a.uid});return E.reduce(chosen.state,{type:'chooseTarget',uid:d.uid});};
 const checks=[];
 for(const side of [0,1])for(const lethal of [false,true]){
  const g=fresh();g.cur=side;const a=mon('M4',{atk:lethal?30:2,def:100,passivesG:['counter']}),d=mon('INFKNIGHT',{atk:8,def:20,exhausted:true,attacksUsed:1});g.players[side].field=[a];g.players[1-side].field=[d];const before=structuredClone(g),r=strike(g,a,d),counter=r.events.filter(e=>e.type==='counter');
  assert.deepEqual(g,before);assert.equal(counter.length,1);assert.deepEqual(counter[0],{type:'counter',player:1-side,uid:d.uid,targetUid:a.uid,targetPlayer:side,contactDamage:4});assert.equal(r.state.players[side].field[0].dmg,4);assert.equal(r.events.filter(e=>e.type==='attack').length,1,'no counter chain or ordinary attack trigger');
  if(!lethal){const survivor=r.state.players[1-side].field[0];assert.equal(survivor.exhausted,true);assert.equal(survivor.attacksUsed,1);}
  else{assert.equal(r.state.players[1-side].field.length,0);const visual=E.counterPresentationEvents(r.events);assert(visual.findIndex(e=>e.type==='destroy'&&e.uid===d.uid)>visual.findIndex(e=>e.type==='counter'));assert.equal(visual.length,r.events.length);assert(visual.every(e=>r.events.includes(e)));}
  checks.push({side,lethal});
 }
 for(const mode of ['cavalry','zero','no-passive','immune','guts','game-over']){
  const g=fresh(),a=mon(mode==='cavalry'?'CAVALRY':'M4',{atk:mode==='game-over'?999:2,def:100}),d=mon('INFKNIGHT',{atk:mode==='zero'?0:8,def:20});if(mode==='no-passive'){d.passives=[];d.passive=undefined;d.passivesG=[];}if(mode==='immune')a.immuneDamageTurn=g.turn;if(mode==='guts')Object.assign(a,{def:1,guts:1});g.players[0].field=[a];g.players[1].field=[d];const r=strike(g,a,d),c=r.events.filter(e=>e.type==='counter');
  if(['cavalry','zero','no-passive','game-over'].includes(mode))assert.equal(c.length,0,mode);else{assert.equal(c.length,1);assert.equal(c[0].contactDamage,0);assert.equal(r.state.players[0].field[0].dmg,0);}
  checks.push({mode});
 }
 // Berserker can strike an ally: return damage must stay on that same side.
 let friendly=0;
 for(let seed=1;seed<=60&&!friendly;seed++){
  const g=fresh();g.rng=seed;g.players[0].field=[mon('NGA4',{def:100}),mon('INFKNIGHT',{def:100})];const r=E.reduce(g,{type:'endTurn'});for(const c of r.events.filter(e=>e.type==='counter')){assert.equal(c.player,c.targetPlayer);friendly++;}
 }
 assert(friendly>0);checks.push({friendly});
 for(const to of [{left:200,top:20,width:100,height:156},{left:500,top:800,width:100,height:156}]){
  const plan=E.attackPlan({left:200,top:420,width:100,height:156},to);
  for(const t of [0,100,290,430,620,699.999,700,860,1000,1399]){
   const current=E.counterPose(plan,t),approved=E.previewPose(plan,1,t);for(const k of ['x','y','scale','turn'])assert(Math.abs(current[k]-approved[k])<1e-9);
   for(const [x,y] of [[-90,-140.625],[0,0],[90,140.625]])assert.deepEqual(E.selectedPoint(t,x,y),E.previewPoint(1,t,x,y));
  }
  const before=E.counterPose(plan,699.999),launch=E.counterPose(plan,700);assert(Math.hypot(before.x-launch.x,before.y-launch.y)<.001);
 }
 let now=0,serial=0;const frames=new Map();globalThis.requestAnimationFrame=f=>{frames.set(++serial,f);return serial;};globalThis.cancelAnimationFrame=i=>frames.delete(i);Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
 const step=t=>{now=t;const pending=[...frames.values()];frames.clear();pending.forEach(f=>f(t));};
 for(const mode of ['normal','slow-frame','cancel','reduced','detach','throw']){
  now=0;const abort=new AbortController(),cues=[];let alive=true;const p=E.runCounterTimeline({signal:abort.signal,isAlive:()=>alive,reduced:mode==='reduced',paint:()=>{if(mode==='throw')throw Error('paint failure');},onLaunch:()=>cues.push('launch'),onImpact:()=>cues.push('contact')});
  if(mode==='throw'){step(100);await assert.rejects(p,/paint failure/);}
  else if(mode==='cancel'){step(400);abort.abort();assert.equal(await p,false);assert.deepEqual(cues,[]);}
  else if(mode==='detach'){alive=false;step(300);assert.equal(await p,false);assert.deepEqual(cues,[]);}
  else{if(mode==='normal'){step(699);assert.deepEqual(cues,[]);step(700);assert.deepEqual(cues,['launch']);step(859);assert.equal(cues.length,1);step(860);assert.deepEqual(cues,['launch','contact']);}step(mode==='reduced'?320:1400);assert.equal(await p,true);assert.deepEqual(cues,['launch','contact']);}
  assert.equal(frames.size,0);checks.push({timeline:mode});
 }
 const sound=new E.EventSound();sound.contact('first',1);sound.cue({type:'counter'});sound.contact('second',0,true);assert.equal(sound.cue({type:'hit',uid:'second',amount:4}),undefined);assert.equal(sound.cue({type:'hit',uid:'first',amount:1}),'impact');
 console.log('PASS counter metadata, lethal/friendly routing, unchanged rules, approved 02 geometry, 700ms/860ms cues, cancellation and audio:',checks);
}finally{await rm(dir,{recursive:true,force:true});}

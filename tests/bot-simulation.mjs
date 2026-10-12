import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
const tmp=await mkdtemp('/tmp/lore-bot-simulation-');
try{
 await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/bot';export * from './client/src/shared/cards';export * from './client/src/shared/monsterEffects';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:tmp+'/core.mjs'});
 const C=await import(tmp+'/core.mjs');let tests=0;
 // Presentation group keys include event indexes; compare their linkage after cue removal.
 const comparable=events=>{const groups=new Map();return events.filter(e=>e.type!=='monsterActivate').map(e=>{if(!('group' in e))return e;if(!groups.has(e.group))groups.set(e.group,groups.size);return {...e,group:groups.get(e.group)};});};
 const verify=(g,a)=>{const regular=C.reduce(g,a),simulation=C.withoutMonsterPresentation(()=>C.reduce(g,a));assert.deepEqual(simulation.state,regular.state);assert.deepEqual(comparable(simulation.events),comparable(regular.events));assert.deepEqual(C.reduce(g,a),regular,'presentation restored');tests++;return regular.state;};
 for(const card of Object.values(C.DB)){
  let g=C.createGame({mode:'bot',seed:24,starting:0,p0:{id:'a',name:'a'},p1:{id:'b',name:'b'}}).state;g.turn=10;
  for(const p of g.players)Object.assign(p,{hp:500,mana:30,maxMana:30,hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[]});
  g.players[0].hand=[{...card,uid:'tested-card'}];g=verify(g,{type:'play',idx:0});
  for(let i=0;g.pending&&i<5;i++)g=verify(g,C.safeGreedy(g));
 }
 let g=JSON.parse(await readFile('tests/fixtures/bot-tactical-heavy.json','utf8'));
 for(let i=0;i<1000;i++){g=verify(g,C.safeGreedy(g));if(g.over)g=C.createGame({mode:'bot',seed:15000+i,starting:i%2,p0:{id:'a',name:'a',deck:C.BOT_HELL_DECKS[i%3].cards},p1:{id:'b',name:'b',deck:C.BOT_ELITE_DECKS[i%3].cards}}).state;}
 const events=[];const emit=()=>C.monsterActivation(g,events,g.players[0],{uid:'source'});
 C.withoutMonsterPresentation(()=>{C.withoutMonsterPresentation(emit);emit();});assert.equal(events.length,0);
 assert.throws(()=>C.withoutMonsterPresentation(()=>{throw Error('test');}));emit();assert.equal(events.length,1);
 console.log(JSON.stringify({transitions:tests,stateParity:true,nonPresentationEventParity:true,nestedAndExceptionRestoration:true}));
}finally{await rm(tmp,{recursive:true,force:true});}

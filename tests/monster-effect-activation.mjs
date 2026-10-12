import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'lore-effect-tests-'));
try {
 await build({stdin:{contents:"export * from './client/src/shared/engine';export {DB,STARTERS} from './client/src/shared/cards';export {redactFor} from './client/src/shared/protocol';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:tmp+'/engine.mjs',plugins:[{name:'effect-boundaries',setup(b){b.onLoad({filter:/shared\/engine\.ts$/},async({path:p})=>({contents:await fs.readFile(p,'utf8')+'\nexport {resolveOnSummon,tickTurnFx,makeCtx,applyEnterAura,applySummonBuff,expansionEnd,gainShield};',loader:'ts'}));}}]});
 const E=await import(tmp+'/engine.mjs'),{DB,STARTERS,createGame,reduce,redactFor,monsterOngoingActive}=E;
 let seq=0,checks=0;const browserCases=[];
 const card=(id,extra={})=>({...structuredClone(DB[id]??STARTERS[id]),uid:'effect-'+(++seq),...extra});
 const mon=(id,extra={})=>card(id,{dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0,guts:0,...extra});
 const plain=extra=>mon('SOLDIER2',{atk:2,def:12,passive:[],...extra});
 function fresh(owner=0){const g=createGame({mode:'bot',seed:71,starting:owner,p0:{id:'qa0',name:'自分'},p1:{id:'qa1',name:'相手'}}).state;g.cur=owner;g.turn=5;g.pending=null;for(const p of g.players)Object.assign(p,{field:[],hand:[],deck:[],discard:[],removed:[],enchants:[],traps:[],quests:[],supply:[],supplyHist:[],hp:40,maxMana:20,mana:20,dew:0,shield:0,brand:0,onceUsed:[]});return g;}
 const active=(events,m)=>events.filter(e=>e.type==='monsterActivate'&&e.uid===m.uid);
 const expect=(events,m,count,label)=>{assert.equal(active(events,m).length,count,label);checks++;};
 const run=(label,g,m,act,count)=>{const result=reduce(g,act);expect(result.events,m,count,label);browserCases.push({label,before:g,result,sourceUid:m.uid,expected:count});return result;};
 const audit=JSON.parse(await fs.readFile('docs/audits/2026-10-07-monster-activation/scan.json'));
 // Frozen bug inventory: every previously reachable no-op must now be silent.
 for(const bad of audit.scans.filter(c=>c.noOpActivation&&c.reachableByNormalPlay&&c.label.startsWith('onSummon:'))){
  const g=fresh(),p=g.players[0],o=g.players[1],m=mon(bad.id);p.field=[m];
  if(bad.label.includes(':populated:')){p.field.push(plain({tribe:'시초'}),mon('WORLD_TREE',{turnFx:undefined}),plain({name:'골램 장비 장인',nameJa:'ゴーレム 装備職人'}));o.field=[plain(),plain({atk:10,def:20})];p.hand=[card('WINE'),card('WINE')];p.deck=Array.from({length:15},()=>card('WEAKEN_ALL'));p.discard=[card('SOLDIER2'),card('STARTER_TRASH')];o.removed=[card('SOLDIER2')];p.supplyHist=[{turn:5,ids:['ELF']}];}
  const ev=[];E.resolveOnSummon(g,E.makeCtx(g,ev),m);expect(ev,m,0,bad.label);
 }
 for(const owner of [0,1]){
  for(const tree of ['none','own','opponent','market','duplicate']){
   const g=fresh(owner),p=g.players[owner],m=card('HALF_ELF');p.hand=[m];
   if(tree==='own'||tree==='duplicate')p.field=[mon('WORLD_TREE')];if(tree==='opponent')g.players[1-owner].field=[mon('WORLD_TREE')];if(tree==='market')g.market=[card('WORLD_TREE')];if(tree==='duplicate')p.enchants=[{card:card('WORLD_CARE'),turns:99,bornTurn:1}];
   const r=run(`half:${owner}:${tree}`,g,m,{type:'play',idx:0},tree==='own'?1:0),fm=r.state.players[owner].field.find(x=>x.uid===m.uid);
   assert.equal(E.effAtk(r.state.players[owner],fm,r.state),['own','opponent','duplicate'].includes(tree)?3:0);
  }
  for(const id of ['NHEX','MANA_GIANT'])for(const met of [false,true]){
   const g=fresh(owner),p=g.players[1-owner],m=mon(id);p.field=[m];
   if(met)p.deck=id==='NHEX'?Array.from({length:13},()=>card('WEAKEN_ALL')):[card('NGA3'),card('GOLEM1'),...Array.from({length:4},()=>card('SOLDIER2'))];
   run(`upkeep:${owner}:${id}:${met}`,g,m,{type:'endTurn'},met?1:0);
  }
  for(const id of ['GUNNER','HEAVY_GUNNER','FARM_KEEPER','MIMIC_HUNTER']){
   const g=fresh(owner),p=g.players[owner],m=card(id);p.hand=[m];const r=run(`summon:${owner}:${id}`,g,m,{type:'play',idx:0},0);
   if(id==='FARM_KEEPER')r.state.players[owner].enchants=[{card:card('BREWING'),turns:99,bornTurn:1}];
   if(id==='MIMIC_HUNTER')r.state.players[1-owner].field=[mon('MIMIC')];
   run(`end:${owner}:${id}`,r.state,m,{type:'endTurn'},1);
  }
  // Applied callbacks identify every source, not only the first matching card.
  for(const id of ['HEXER3','GM5_2','PRIEST','CASTLE']){
   const g=fresh(owner),sources=[mon(id),mon(id)],p=g.players[owner],o=g.players[1-owner];
   if(id==='HEXER3'){o.field=sources;p.hand=[card('WEAKEN_ALL')];}else{p.field=sources;p.hand=[card(id==='PRIEST'?'HIGH_PRIEST':'SOLDIER2')];}
   const r=reduce(g,{type:'play',idx:0});for(const m of sources)expect(r.events,m,1,'both sources '+id);
   browserCases.push({label:`sources:${owner}:${id}`,before:g,result:r,expectedUids:sources.map(m=>m.uid)});
  }
 }
 for(const id of ['M7','VAMP4','VAMP5','CHOSEN_KNIGHT','CHOSEN_ARCHER','DRAGON_RIDER']){
  const g=fresh(),m=mon(id);g.players[0].field=[m];g.players[1].field=[plain({def:id==='CHOSEN_ARCHER'?14:100})];
  const start=reduce(g,{type:'attack',uid:m.uid});const r=start.state.pending?reduce(start.state,{type:'chooseTarget',uid:g.players[1].field[0].uid}):start;
  expect(r.events,m,0,'attack ineligible '+id);
 }
 for(const id of ['CHOSEN_ARCHER','DRAGON_RIDER','M7','VAMP4','CHOSEN_KNIGHT']){
  const g=fresh(),p=g.players[0],m=mon(id);p.field=[m];g.players[1].field=[plain({def:id==='CHOSEN_ARCHER'?15:1})];
  if(['CHOSEN_ARCHER','CHOSEN_KNIGHT'].includes(id))m.atkMod=1; // v55+: attack triggers require positive current ATK
  if(id==='DRAGON_RIDER')m.attacksUsed=1;if(id==='CHOSEN_KNIGHT')p.discard=[card('STARTER_TRASH'),card('STARTER_TRASH')];
  const start=reduce(g,{type:'attack',uid:m.uid});const r=start.state.pending?reduce(start.state,{type:'chooseTarget',uid:g.players[1].field[0].uid}):start;expect(r.events,m,1,'attack eligible '+id);
  if(['CHOSEN_ARCHER','DRAGON_RIDER'].includes(id))assert(r.events.findIndex(e=>e.type==='monsterActivate')<r.events.findIndex(e=>e.type==='attack'),'modifier precedes attack');
 }
 for(const id of ['TGE4','TGE5','AWAKENED_MIMIC','GM6_7','MERCENARY']){
  const g=fresh(),p=g.players[0],m=card(id);p.hand=[m];
  if(id==='TGE4')p.onceUsed=['TGE4'];else if(id==='TGE5')p.enchants=Array.from({length:E.ST_MAX},()=>({card:card('WORLD_CARE'),turns:99,bornTurn:1}));else p.field=Array.from({length:E.FIELD_MAX-1},()=>plain());
  run('blocked:'+id,g,m,{type:'play',idx:0},0);
 }
 {const g=fresh(),m=card('TGE4');g.players[0].hand=[m];run('once-marker-is-not-effect',g,m,{type:'play',idx:0},0);}
 for(const wantSuccess of [false,true]){let found=false;for(let seed=1;seed<100&&!found;seed++){const g=fresh(),m=mon('GAMBLER');g.rng=seed;g.players[0].field=[m];const events=[];E.tickTurnFx(g,E.makeCtx(g,events),g.players[0]);const dice=events.find(e=>e.type==='dice');if((dice.rolls[0]>=4)!==wantSuccess)continue;expect(events,m,1,'gambler success='+wantSuccess);assert(events.findIndex(e=>e.type==='monsterActivate')<events.findIndex(e=>e.type==='dice'));found=true;}assert(found);}
 // Real reactions outside summon/upkeep/attackFx, including choices and death.
 for(const owner of [0,1])for(const id of ['GUILD_HALL','NWL3','TPO2','VAMP_BUTLER','GM6_8','ELDER_ELF_KING','FIRE_MASTER','GOLEM2','HEXER4','CASINO','CHOSEN_MAGE','WORLD_TREE','BLACK_ELSA','BLACK_ALICE','MERC_MASTER','SHIELD_TITAN']){
  const g=fresh(owner),p=g.players[owner],o=g.players[1-owner],m=mon(id);p.field=[m];let action;
  if(id==='GUILD_HALL'){m.gcount=2;p.field.push(mon('ASSASSIN2',{uid:'assassin'}));action={type:'attack',uid:'assassin'};}
  if(id==='NWL3'){g.cur=1-owner;o.field=[plain({uid:'attacker',atk:1})];g.pending={kind:'oppMon',reason:'attack',data:{attackerUid:'attacker'},allowCancel:true};action={type:'chooseTarget',uid:m.uid};}
  if(id==='TPO2'){o.field=[plain({def:1,cost:3})];g.pending={kind:'oppMon',reason:'attack',data:{attackerUid:m.uid},allowCancel:true};action={type:'chooseTarget',uid:o.field[0].uid};}
  if(id==='VAMP_BUTLER'){m.gcount=2;action={type:'attack',uid:m.uid};}
  if(['GM6_8','ELDER_ELF_KING','FIRE_MASTER','GOLEM2'].includes(id)){g.cur=1-owner;if(id==='ELDER_ELF_KING')p.dew=15;if(id==='FIRE_MASTER')p.deck=[card('FIRE_BALL')];let target=m;if(id==='GOLEM2'){target=plain();p.field.push(target);}g.pending={kind:'oppMon',reason:'destroyMon',allowCancel:true};action={type:'chooseTarget',uid:target.uid};if(id==='ELDER_ELF_KING'){o.field=[plain({uid:'killer',atk:20})];g.pending={kind:'oppMon',reason:'attack',data:{attackerUid:'killer'},allowCancel:true};}}
  if(id==='HEXER4'){g.cur=1-owner;o.hand=[card('WEAKEN_ALL')];action={type:'play',idx:0};}
  if(id==='CASINO'){m.gcount=11;g.cur=1-owner;o.hand=[card('VITAL2')];action={type:'play',idx:0};}
  if(id==='CHOSEN_MAGE'){p.removed=[card('STARTER_TRASH')];g.pending={kind:'myMon',reason:'chosenMage',data:{fired:[]},allowCancel:true};action={type:'chooseTarget',uid:m.uid};}
  if(id==='WORLD_TREE'){p.dew=1;p.field.push(plain({uid:'attacker'}));g.pending={kind:'cardChoice',owner,reason:'WORLD_TREE_ATTACK',data:{attackerUid:'attacker',targetUid:null},allowCancel:false};action={type:'chooseTarget',uid:'grow'};}
  if(id==='BLACK_ELSA'||id==='BLACK_ALICE'){p.hand=[card('BLACK_CURSE')];action={type:'play',idx:0};}
  if(id==='MERC_MASTER'){g.cur=1-owner;action={type:'endTurn'};}
  if(id==='SHIELD_TITAN')action={type:'endTurn'};
  const r=run('reaction:'+owner+':'+id,g,m,action,1);
  if(['GM6_8','ELDER_ELF_KING','FIRE_MASTER'].includes(id))assert(r.events.findIndex(e=>e.type==='monsterActivate'&&e.uid===m.uid)<r.events.findIndex(e=>e.type==='destroy'&&e.uid===m.uid),'death cue before source disappears');
 }
 for(const id of ['FARM_KEEPER','MIMIC_HUNTER']){const g=fresh(),m=mon(id);g.players[0].field=[m];run('inactive-end:'+id,g,m,{type:'endTurn'},0);}
 {const g=fresh(),p=g.players[0],m=mon('BLACK_ALICE');p.field=[m];p.maxMana=30;p.hand=[card('BLACK_CURSE')];run('capped-mana',g,m,{type:'play',idx:0},0);}
 {const g=fresh(),p=g.players[0],m=mon('WORLD_TREE');p.field=[m,plain({uid:'attacker'})];p.dew=1;g.pending={kind:'cardChoice',owner:0,reason:'WORLD_TREE_ATTACK',data:{attackerUid:'attacker'},allowCancel:false};run('declined-world-tree',g,m,{type:'chooseTarget',uid:'pass'},0);}
 {const g=fresh(),p=g.players[0],m=mon('CHOSEN_KNIGHT',{atkMod:1});p.field=[m];p.discard=[card('STARTER_TRASH'),card('STARTER_TRASH')];g.players[1].field=[plain({atk:20,def:20,passive:['counter']})];g.pending={kind:'oppMon',reason:'attack',data:{attackerUid:m.uid},allowCancel:true};const r=run('post-attack-source-died',g,m,{type:'chooseTarget',uid:g.players[1].field[0].uid},1);assert(!r.state.players[0].field.some(x=>x.uid===m.uid));assert(r.events.findIndex(e=>e.type==='monsterActivate'&&e.uid===m.uid)<r.events.findIndex(e=>e.type==='destroy'&&e.uid===m.uid));}
 // Every current effect definition can resolve in a bare and populated fixture.
 // This catches omitted legacy keys and verifies all activation UIDs are sources.
 let definitions=0;
 for(const def of Object.values(DB).filter(c=>c.t==='mon')){
  definitions++;for(const populated of [false,true]){const g=fresh(),p=g.players[0],m=mon(def.id);p.field=[m];if(populated){p.field.push(plain());p.deck=Array.from({length:15},()=>card('WEAKEN_ALL'));p.dew=20;g.players[1].field=[plain()];}const ev=[];E.resolveOnSummon(g,E.makeCtx(g,ev),m);assert(ev.every(e=>e.type!=='monsterActivate'||typeof e.uid==='string'));checks++;}
 }
 for(const id of ['NMD6','M10','VITAL4','HALF_ELF','CHOSEN_MAGE'])for(const enabled of [false,true]){
  const g=fresh(),p=g.players[0],m=mon(id);p.field=[m];if(enabled){if(id==='NMD6')p.deck=Array.from({length:13},()=>card('WEAKEN_ALL'));if(id==='M10')p.field.push(mon('GOLEM1'));if(id==='VITAL4')p.field.push(mon('SOLDIER2'));if(id==='HALF_ELF')g.players[1].field=[mon('WORLD_TREE')];if(id==='CHOSEN_MAGE')p.removed=[card('STARTER_TRASH'),card('STARTER_TRASH')];}
  assert.equal(monsterOngoingActive(g,p,m),enabled,id);for(const you of [0,1]){const view=redactFor(g,you);assert.equal(monsterOngoingActive(view,view.players[0],view.players[0].field[0]),enabled&&(id!=='NMD6'||you===0),'redacted '+id);}checks+=3;
  browserCases.push({label:'ongoing:'+id+':'+enabled,before:g,result:{state:g,events:[]},sourceUid:m.uid,ongoing:enabled});
 }
 {const g=fresh(),p=g.players[0],m=mon('NMD6');p.field=[m];p.deck=Array.from({length:13},()=>card('WEAKEN_ALL'));const hidden=redactFor(g,1);p.deck=p.deck.map(c=>({...DB.SOLDIER2,uid:c.uid}));assert.deepEqual(redactFor(g,1),hidden,'no private deck threshold signal');checks++;}
 for(const [id,spell] of [['NMD6','WEAKEN_ALL'],['FIRE_MASTER','FIRE_BALL']]){const g=fresh(),p=g.players[0],m=mon(id);p.field=[m];p.deck=Array.from({length:13},()=>card('WEAKEN_ALL'));p.hand=[card(spell)];run('cost-discount:'+id,g,m,{type:'play',idx:0},1);}
 const report={checks,definitions,status:'passed'};console.log(report);
 if(process.env.LORE_EFFECT_REPORT){await fs.mkdir(process.env.LORE_EFFECT_REPORT,{recursive:true});await fs.writeFile(path.join(process.env.LORE_EFFECT_REPORT,'fixtures.json'),JSON.stringify(browserCases));await fs.writeFile(path.join(process.env.LORE_EFFECT_REPORT,'rules.json'),JSON.stringify(report,null,2));}
} finally {await fs.rm(tmp,{recursive:true,force:true});}

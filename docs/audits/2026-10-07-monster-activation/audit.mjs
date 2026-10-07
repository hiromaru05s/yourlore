// Audit only: expose private resolution entrypoints in a temporary bundle.
// Run from repository root: node docs/audits/2026-10-07-monster-activation/audit.mjs
import {build} from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const out=path.dirname(new URL(import.meta.url).pathname),tmp=await fs.mkdtemp(path.join(os.tmpdir(),'lore-activation-audit-'));
try {
 await build({stdin:{contents:`export * from './client/src/shared/engine';export {DB,STARTERS} from './client/src/shared/cards';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:tmp+'/engine.mjs',plugins:[{name:'audit-private-entrypoints',setup(b){b.onLoad({filter:/shared\/engine\.ts$/},async({path:p})=>({contents:await fs.readFile(p,'utf8')+'\nexport {resolveOnSummon,tickTurnFx,makeCtx,applyEnterAura,applySummonBuff,expansionEnd,expansionAfterPlay,gainShield,tryHexCurseOnSpell,resolveAttackCore};',loader:'ts'}));}}]});
 const E=await import(tmp+'/engine.mjs'),{DB,createGame,reduce,makeCtx}=E;
 let seq=0;
 const card=(id,extra={})=>({...structuredClone(DB[id]??E.STARTERS[id]),uid:'audit-'+(++seq),...extra});
 const mon=(id,extra={})=>card(id,{dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0,guts:0,...extra});
 const plain=extra=>mon('SOLDIER2',{onSummon:undefined,aura:undefined,turnFx:undefined,attackFx:undefined,passive:[],atk:2,def:12,...extra});
 function fresh(){const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'qa0',name:'自分'},p1:{id:'qa1',name:'相手'}}).state;g.cur=0;g.turn=5;g.pending=null;for(const p of g.players)Object.assign(p,{field:[],hand:[],deck:[],discard:[],removed:[],enchants:[],traps:[],quests:[],supply:[],supplyHist:[],hp:40,maxMana:20,mana:20,dew:0,shield:0,brand:0,onceUsed:[]});return g;}
 const snapshot=g=>JSON.parse(JSON.stringify({players:g.players,pending:g.pending,over:g.over,expansionChoices:g.expansionChoices}));
 const diff=(a,b,p='')=>{if(JSON.stringify(a)===JSON.stringify(b))return[];if(a==null||b==null||typeof a!=='object'||typeof b!=='object')return[{path:p,before:a,after:b}];return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(k=>diff(a[k],b[k],p?`${p}.${k}`:k));};
 const inventory=Object.values(DB).filter(c=>c.t==='mon').map(c=>({id:c.id,name:c.nameJa,text:c.textJa,onSummon:c.onSummon,turnFx:c.turnFx,attackFx:c.attackFx,aura:c.aura,condAtk:c.condAtk,passive:c.passive,otherFields:Object.keys(c).filter(k=>!['id','name','nameJa','nameEn','text','textJa','textEn','t','cost','atk','def','onSummon','turnFx','attackFx','aura','condAtk','passive'].includes(k))}));
 const scans=[];
 function probe(label,g,source,fn){const before=snapshot(g),events=[];fn(g,makeCtx(g,events));const changes=diff(before,snapshot(g));const activations=events.filter(e=>e.type==='monsterActivate');const meaningfulEvents=events.filter(e=>!['monsterActivate','log'].includes(e.type));const row={label,id:source.id,name:source.nameJa,uid:source.uid,activations,changes,meaningfulEvents,logs:events.filter(e=>e.type==='log').map(e=>e.htmlJa),noOpActivation:activations.some(e=>e.uid===source.uid)&&!changes.length&&!meaningfulEvents.length};scans.push(row);return row;}
 for(const def of Object.values(DB).filter(c=>c.t==='mon'))for(const kind of ['onSummon','turnFx'])if(def[kind])for(const rich of [false,true]){
  const g=fresh(),p=g.players[0],o=g.players[1],m=mon(def.id);p.field=[m];
  if(rich){p.field.push(plain({tribe:'시초'}),mon('WORLD_TREE',{turnFx:undefined}),plain({name:'골램 장비 장인',nameJa:'ゴーレム 装備職人'}));o.field=[plain(),plain({atk:10,def:20})];p.hand=[card('WINE'),card('WINE')];p.deck=Array.from({length:15},()=>card('WEAKEN_ALL'));p.discard=[card('SOLDIER2'),card('STARTER_TRASH')];o.removed=[card('SOLDIER2')];p.supplyHist=[{turn:5,ids:['ELF']}];}
  const normal=structuredClone(g);normal.players[0].field=normal.players[0].field.filter(x=>x.uid!==m.uid);normal.players[0].hand.push(structuredClone(m));const normalResult=kind==='onSummon'?reduce(normal,{type:'play',idx:normal.players[0].hand.length-1}):null;const row=probe(`${kind}:${rich?'populated':'empty'}:${def.id}`,g,m,(g,ctx)=>kind==='onSummon'?E.resolveOnSummon(g,ctx,m):E.tickTurnFx(g,ctx,p));if(normalResult)row.reachableByNormalPlay=normalResult.events.some(e=>e.type==='monsterActivate'&&e.uid===m.uid);
 }
 const targeted=[];
 function action(label,g,source,act,verify){const before=structuredClone(g),result=reduce(g,act);verify?.(result);const r={label,id:source.id,sourceUid:source.uid,events:result.events,changes:diff(snapshot(before),snapshot(result.state))};targeted.push(r);return {before,result};}
 const browserCases=[];
 for(const tree of ['none','own','opponent','market']){const g=fresh(),p=g.players[0],m=card('HALF_ELF');p.hand=[m];if(tree==='own')p.field=[mon('WORLD_TREE')];if(tree==='opponent')g.players[1].field=[mon('WORLD_TREE')];if(tree==='market')g.market=[card('WORLD_TREE')];const r=action('half-elf:'+tree,g,m,{type:'play',idx:0},r=>{assert(r.events.some(e=>e.type==='monsterActivate'&&e.uid===m.uid));assert.equal(r.state.players[0].enchants.some(e=>e.card.id==='WORLD_CARE'),tree==='own');assert.equal(E.effAtk(r.state.players[0],r.state.players[0].field.find(x=>x.uid===m.uid),r.state),tree==='own'||tree==='opponent'?3:0);});browserCases.push({label:'half-elf:'+tree,...r});}
 for(const def of Object.values(DB).filter(c=>c.t==='mon'&&c.attackFx))for(const targetMode of ['durable-monster','direct']){const g=fresh(),p=g.players[0],o=g.players[1],m=mon(def.id);p.field=[m];if(targetMode==='durable-monster')o.field=[plain({def:def.attackFx==='giantSlayer'?14:100})];action(`attack:${def.attackFx}:${targetMode}:${def.id}`,g,m,{type:'attack',uid:m.uid});if(g.players[1].field.length){const r=targeted.at(-1);if(r.events.some(e=>e.type==='needTarget')){targeted.pop();const start=reduce(g,{type:'attack',uid:m.uid});action(`attack:${def.attackFx}:${targetMode}:${def.id}`,start.state,m,{type:'chooseTarget',uid:o.field[0].uid});}}}
 for(const key of ['hexCurse','giantGolem','gambler','payDefHeal','growMaxHp']){const def=Object.values(DB).find(c=>c.turnFx===key);if(!def)continue;const g=fresh(),m=mon(def.id);g.players[1].field=[m];g.players[1].maxMana=key==='payDefHeal'?0:20;g.players[1].mana=0;const r=action('turn:'+key+':unmet-or-roll',g,m,{type:'endTurn'});browserCases.push({label:'turn:'+key,...r});}
 for(const [label,id,setup,act,verify] of [
  ['castle:soldier-counter','CASTLE',(g,m)=>{g.players[0].field=[m];g.players[0].hand=[card('SOLDIER2')];},{type:'play',idx:0},(r,m)=>assert.equal(r.state.players[0].field.find(x=>x.uid===m.uid).gcount,1)],
  ['hexer3:spell-curse','HEXER3',(g,m)=>{g.players[1].field=[m];g.players[0].hand=[card('WEAKEN_ALL')];},{type:'play',idx:0},r=>assert(r.state.players[0].discard.some(c=>c.id==='CURSE'))],
  ['guild:third-assassin-hit','GUILD_HALL',(g,m)=>{m.gcount=2;g.players[0].field=[m,mon('ASSASSIN2',{uid:'assassin'})];},{type:'attack',uid:'assassin'},(r,m)=>assert.equal(r.state.players[0].field.find(x=>x.uid===m.uid).gcount,0)],
  ['guardian:guts-on-hit','NWL3',(g,m)=>{g.players[1].field=[m];g.players[0].field=[plain({uid:'attacker',atk:1})];g.pending={kind:'oppMon',reason:'attack',data:{attackerUid:'attacker'},hint:'',hintJa:'',allowCancel:true};},{type:'chooseTarget',uid:'placeholder'},()=>{}],
 ]){if(!DB[id])continue;const g=fresh(),m=mon(id);setup(g,m);if(act.uid==='placeholder')act.uid=m.uid;action(label,g,m,act,r=>{verify(r,m);assert(!r.events.some(e=>e.type==='monsterActivate'&&e.uid===m.uid),label);});}
 // Source callbacks bypass all three generic monsterActivate emitters.
 for(const aura of ['shieldDew','doubleShieldOther','summonBuff','rallyGuts','drainMana']){const def=Object.values(DB).find(c=>c.aura===aura);if(!def)continue;const g=fresh(),p=g.players[0],m=mon(def.id);p.field=[m,plain()];probe('callback:'+aura,g,m,(g,ctx)=>{if(aura==='shieldDew'||aura==='doubleShieldOther')E.gainShield(g,ctx,p,3,p.field[1]);else if(aura==='summonBuff')E.applySummonBuff(ctx,p,p.field[1]);else E.applyEnterAura(g,ctx,p,m);});}
 for(const id of ['GUNNER','HEAVY_GUNNER','FARM_KEEPER','MIMIC_HUNTER']){if(!DB[id])continue;const g=fresh(),p=g.players[0],m=mon(id);p.field=[m];g.players[1].field=[mon('MIMIC')];if(id==='FARM_KEEPER')p.enchants=[{card:card('BREWING'),turns:99,bornTurn:1}];probe('end-turn:'+id,g,m,(g,ctx)=>E.expansionEnd(g,ctx,p));}
 // Additional boundaries: full zones, already-used once effects, and valid Dew summons.
 for(const [id,setup] of [
 ['HALF_ELF',(g,p)=>{p.field.push(mon('WORLD_TREE'));p.enchants=[{card:card('WORLD_CARE'),turns:99,bornTurn:1}];}],
 ['TGE5',(g,p)=>{p.enchants=Array.from({length:E.ST_MAX},()=>({card:card('WORLD_CARE'),turns:99,bornTurn:1}));}],
 ['TGE4',(g,p)=>{p.onceUsed=['TGE4'];}],
 ['AWAKENED_MIMIC',(g,p)=>{while(p.field.length<7)p.field.push(plain());}],
 ['GM6_7',(g,p)=>{while(p.field.length<7)p.field.push(plain());}],
 ['MERCENARY',(g,p)=>{while(p.field.length<7)p.field.push(plain());}],
 ['DARK_ELF',(g,p)=>{p.dew=4;}],['HIGH_ELF',(g,p)=>{p.dew=10;}],['ELDER_ELF_KING',(g,p)=>{p.dew=12;}],
 ]){const g=fresh(),p=g.players[0],m=mon(id);p.field=[m];setup(g,p);const normal=structuredClone(g);normal.players[0].field=normal.players[0].field.filter(x=>x.uid!==m.uid);normal.players[0].hand.push(structuredClone(m));const nr=reduce(normal,{type:'play',idx:normal.players[0].hand.length-1});const row=probe('boundary:'+id,g,m,(g,ctx)=>E.resolveOnSummon(g,ctx,m));row.reachableByNormalPlay=nr.events.some(e=>e.type==='monsterActivate'&&e.uid===m.uid);}
 for(const id of ['GUNNER','HEAVY_GUNNER','FARM_KEEPER','MIMIC_HUNTER']){const g=fresh(),m=card(id);g.players[0].hand=[m];const r=action('summon:deferred:'+id,g,m,{type:'play',idx:0});if(id==='GUNNER')browserCases.push({label:'summon:GUNNER',...r});const state=structuredClone(r.result.state);state.players[1].field=[mon('MIMIC')];if(id==='FARM_KEEPER')state.players[0].enchants=[{card:card('BREWING'),turns:99,bornTurn:1}];const end=action('end:deferred:'+id,state,m,{type:'endTurn'},r=>assert(!r.events.some(e=>e.type==='monsterActivate'&&e.uid===m.uid)));if(id==='GUNNER')browserCases.push({label:'end:GUNNER',...end});}
 // An unsuccessful dice roll is still an actual resolution, and must retain its activation.
 for(const wantSuccess of [false,true]){let found=false;for(let rng=1;rng<100&&!found;rng++){const g=fresh(),m=mon('GAMBLER');g.rng=rng;g.players[0].field=[m];const ev=[];E.tickTurnFx(g,makeCtx(g,ev),g.players[0]);const dice=ev.find(e=>e.type==='dice');if((dice.rolls[0]>=4)!==wantSuccess)continue;assert(ev.some(e=>e.type==='monsterActivate'&&e.uid===m.uid));targeted.push({label:'gambler:roll:'+(wantSuccess?'success':'failure'),id:m.id,sourceUid:m.uid,events:ev,changes:[]});found=true;}assert(found);}
 for(const id of ['NMD6','M10','VITAL4']){const g=fresh(),m=mon(id);g.players[0].field=[m];browserCases.push({label:'aura:inactive:'+id,before:g,result:{state:g,events:[]}});}
 const summary={sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),monsterCount:inventory.length,counts:Object.fromEntries(['onSummon','turnFx','attackFx','aura','condAtk'].map(k=>[k,inventory.filter(c=>c[k]).length])),scanCases:scans.length,targetedCases:targeted.length,noOpActivations:scans.filter(r=>r.noOpActivation).map(({label,id,name,logs,reachableByNormalPlay})=>({label,id,name,logs,reachableByNormalPlay}))};
 await fs.writeFile(out+'/inventory.json',JSON.stringify(inventory,null,2)+'\n');await fs.writeFile(out+'/scan.json',JSON.stringify({summary,scans,targeted},null,2)+'\n');await fs.writeFile(out+'/browser-fixtures.json',JSON.stringify(browserCases));
 console.log(JSON.stringify(summary,null,2));console.log('Browser fixtures:',out+'/browser-fixtures.json');
} finally { await fs.rm(tmp,{recursive:true,force:true}); }

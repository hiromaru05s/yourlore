import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-vfx-'));
try{
 await build({stdin:{contents:"export * from './client/src/shared/engine';export {DB} from './client/src/shared/cards';export {createAttackRiseTracker} from './client/src/ui/statRiseChanges';export {drawBiblionEffect,EFFECT_DURATION} from './client/src/ui/biblionFx';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'test.mjs')});
 const {createGame,reduce,DB,createAttackRiseTracker,drawBiblionEffect,EFFECT_DURATION}=await import(path.join(dir,'test.mjs'));
 const fresh=()=>{const g=createGame({mode:'online',seed:42,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=2;g.cur=0;g.pending=null;for(const p of g.players)Object.assign(p,{field:[],enchants:[],quests:[],traps:[],hand:[],deck:[],discard:[],removed:[],hp:30,maxHp:40,mana:10,maxMana:10});return g;};
 const ench=(kind,uid)=>({card:{...Object.values(DB).find(c=>c.ench===kind),uid},turns:4,bornTurn:0});
 let g=fresh();g.players[1].enchants=[ench('worldBless','active'),ench('noAttack','passive')];
 let res=reduce(g,{type:'endTurn'});let events=res.events.filter(e=>e.type==='enchantActivate');
 assert(events.some(e=>e.uid==='active'&&e.player===1));assert(!events.some(e=>e.uid==='passive'),'countdown alone must not pulse');
 const cue=res.events.findIndex(e=>e.type==='enchantActivate');assert(res.events.slice(cue+1).some(e=>e.type==='log'),'cue precedes its outcome');
 g=fresh();g.players[1].enchants=[ench('sanctumField','empty')];res=reduce(g,{type:'endTurn'});assert(!res.events.some(e=>e.type==='enchantActivate'&&e.uid==='empty'),'no eligible monsters means no buff activation');
 g=fresh();g.players[0].enchants=[ench('healSummon','reactive')];g.players[0].hand=[{...DB.M4,uid:'summoned'}];res=reduce(g,{type:'play',idx:0});assert(res.events.some(e=>e.type==='enchantActivate'&&e.uid==='reactive'),'summon reaction identifies exact enchantment');
 const hp=createAttackRiseTracker('health');g=fresh();g.players[0].field=[{...DB.M4,uid:'m',dmg:1,defMod:0}];assert.deepEqual(hp(g),[]);g.players[0].field[0].dmg=0;assert.deepEqual(hp(g),[],'damage recovery is not max-health buff');g.players[0].field[0].defMod=2;assert.deepEqual(hp(g),['m']);assert.deepEqual(hp(g),[]);
 // Every drawing branch must accept actual small/large anchors and zero/end time.
 let commands=0;const gradient={addColorStop(){}};const ctx=new Proxy({}, {get:(_,key)=>key==='createRadialGradient'?()=>gradient:(...args)=>{for(const a of args)if(typeof a==='number')assert(Number.isFinite(a));commands++;},set:(_,key,v)=>{if(key==='globalAlpha')assert(v>=0&&v<=1);return true;}});
 globalThis.document={createElement:()=>({getContext:()=>ctx})};
 for(const [kind,duration] of Object.entries(EFFECT_DURATION))for(const width of [24,60,180])for(const age of [0,.1,duration*.5,duration])drawBiblionEffect(ctx,kind,{left:0,top:0,width,height:width*1.56},age);
 delete globalThis.document;assert(commands>100);
 console.log('PASS: exact enchant sources, countdown/no-op suppression, summon reaction, health vs healing, all VFX branches at mobile/desktop sizes');
}finally{await rm(dir,{recursive:true,force:true});}

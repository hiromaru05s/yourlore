import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-void-crystal-');
try{
 await build({stdin:{contents:"export * from './client/src/shared/engine';export * from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/rules.mjs'});
 const {createGame,reduce,DB}=await import(dir+'/rules.mjs');
 for(const side of [0,1])for(const count of [0,1,8,60])for(const mode of ['plain','shield','reverse','echo']){
  const g=createGame({mode:'online',seed:71,starting:side,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  g.phase='main';g.pending=null;g.turn=3;g.cur=side;delete g.opening;
  for(const p of g.players)Object.assign(p,{openingDrawReady:false,mana:30,maxMana:30,hp:300,maxHp:300,hand:[],removed:[],field:[],enchants:[],traps:[],quests:[],shield:0});
  g.players[side].hand=[{...DB.EXILE_NUKE2,uid:'cast'}];g.players[side].removed=Array.from({length:count},(_,i)=>({...DB.ELF,uid:'rift-'+i}));
  if(mode==='shield')g.players[1-side].shield=5;
  if(mode==='reverse'||mode==='echo'){const c=Object.values(DB).find(c=>c.ench===(mode==='reverse'?'blackReverse':'runeEcho'));g.players[side].enchants.push({card:{...c,uid:mode}});}
  const r=reduce(g,{type:'play',idx:0}),cast=r.events.find(e=>e.type==='playSpell'&&e.id==='EXILE_NUKE2');assert(cast,`${side}/${count}/${mode} cast`);assert.equal(cast.riftCount,count);
  const hits=r.events.filter(e=>e.type==='damage'&&e.srcKo.includes('data-card="EXILE_NUKE2"'));assert.equal(hits.reduce((s,e)=>s+e.amount,0),Math.max(0,count*2-(mode==='shield'?5:0))*(mode==='echo'?2:1));
  for(const hit of hits)assert.equal(hit.player,mode==='reverse'?side:1-side);
  assert.equal(r.state.players[side].removed.length,count,'Rift records are retained');
 }
 assert.equal(DB.EXILE_NUKE2.nameJa,'虚空の水晶魔術');console.log('PASS void crystal: 64 actual engine casts, count snapshot, shielding, reflection, echo, retained Rift');
}finally{await rm(dir,{recursive:true,force:true});}

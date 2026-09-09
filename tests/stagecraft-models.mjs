import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-stagecraft-'));
try{
 await build({stdin:{contents:"export * from './client/src/ui/coinScene';export {Box3,Vector3} from 'three';export {createGame,reduce,playBlockReason} from './client/src/shared/engine';export {DB,STARTERS} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'model.mjs')});
 const {createCoin,coinPose,Box3,Vector3,createGame,reduce,playBlockReason,DB,STARTERS}=await import(path.join(dir,'model.mjs'));
 const coin=createCoin(null,null),box=new Box3().setFromObject(coin),size=box.getSize(new Vector3());
 assert(size.y>.15&&size.y<.22);assert(coin.children.length>=77,'solid rim, reeding and two separate faces');
 for(const heads of [true,false]){
  for(let i=0;i<=1000;i++){const pose=coinPose(i/1000,heads),up=new Vector3(0,1,0).applyQuaternion(pose.q),support=Math.sqrt(Math.max(0,1-up.y**2))+.08*Math.abs(up.y);assert(pose.y>=support-1e-9);}
  const end=coinPose(1,heads);assert(Math.abs(end.y-.08)<1e-9);assert.equal(Math.sign(new Vector3(0,1,0).applyQuaternion(end.q).y),heads?1:-1);
 }
 const initial=()=>{const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.pending=null;g.players[0].mana=30;g.players[0].maxMana=30;return g;};
 for(const [card,alter] of [
  [DB.BEGINNER_MIND,g=>g.players[0].hand.push({...DB.ELF,uid:'other'})],
  [DB.ELF,g=>g.players[0].summonCap=0],
  [DB.ELF,g=>g.players[0].mana=0],
  [STARTERS.STARTER_CHEST,g=>g.players[0].spellSealTurn=true],
  [DB.PENANCE,()=>{}],
  [DB.MASSACRE,g=>g.players[1].field=[]],
 ]){
  const g=initial(),c={...card,uid:'blocked'};g.players[0].hand=[c];alter(g);const before=JSON.stringify(g);
  assert(playBlockReason(g,0,c));assert.equal(JSON.stringify(g),before,'hover legality is read-only');
  const next=reduce(g,{type:'play',idx:0}).state;assert(next.players[0].hand.some(c=>c.uid==='blocked'));assert.equal(next.players[0].mana,g.players[0].mana);
 }
 const g=initial(),c={...STARTERS.STARTER_MANA,uid:'valid'};g.players[0].hand=[c];assert.equal(playBlockReason(g,0,c),null);assert(!reduce(g,{type:'play',idx:0}).state.players[0].hand.some(c=>c.uid==='valid'));
 console.log('PASS: physical coin thickness, both landing faces, floor support, read-only shared play restrictions');
}finally{await rm(dir,{recursive:true,force:true});}

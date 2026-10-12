import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lore-dual-ready-'));
try{
 await build({stdin:{contents:"export {dualReadyActive,dualReadyPose} from './client/src/ui/monster/dualReady';export {createGame,reduce,monsterCanAttack} from './client/src/shared/engine';export {DB} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/rules.mjs'});
 const {dualReadyActive,dualReadyPose,createGame,reduce,monsterCanAttack,DB}=await import(dir+'/rules.mjs');
 let g=createGame({mode:'bot',seed:741,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
 g.turn=3;g.pending=null;g.phase='main';for(const p of g.players){p.field=[];p.enchants=[];p.traps=[];p.quests=[];p.hand=[];p.hp=200;}
 const mon=id=>({...DB[id],uid:id,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0,attacksUsed:0});
 for(const id of ['NGA4','DRAGON_RIDER','ANTIQUE_DK','ASSASSIN4']){const m=mon(id);g.players[0].field=[m];assert(dualReadyActive(m,monsterCanAttack(g,g.players[0],m)),id);}
 const m=mon('DRAGON_RIDER');g.players[0].field=[m];
 for(const change of [{exhausted:true},{hatch:1},{atk:0},{mult:undefined},{attacksUsed:1},{attacksUsed:2}]){const n={...m,...change};assert.equal(dualReadyActive(n,monsterCanAttack(g,g.players[0],n)),false,JSON.stringify(change));}
 assert.equal(dualReadyActive(m,false),false,'opponent turn, pending selection and game over are gated by board eligibility');
 assert.equal(dualReadyActive({...mon('M4'),attackFx:'chainKill'},true),false,'conditional chain attack is not dual wield');
 for(const expected of [1,2]){g=reduce(g,{type:'attack',uid:m.uid}).state;const n=g.players[0].field[0];assert.equal(n.attacksUsed,expected);assert.equal(n.exhausted,expected===2);assert.equal(dualReadyActive(n,monsterCanAttack(g,g.players[0],n)),false);}
 const first=dualReadyPose(100,.18,false,1),second=dualReadyPose(100,.44,false,1);assert(first.dx<0&&first.dy<0);assert(second.dx>0&&second.dy<first.dy);
 assert.deepEqual(dualReadyPose(100,0,false,1),dualReadyPose(100,1,false,1));
 for(const t of [0,.18,.44,.9]){const a=dualReadyPose(100,t,false,1),b=dualReadyPose(100,t,false,-1);assert.equal(a.dy,-b.dy);assert.equal(Math.abs(dualReadyPose(100,t,true,1).dy),0);}
 console.log('PASS dual ready: all four cards, authoritative 2→1→0, prohibition/chain exclusion, two beats, loop seam, both sides and reduced motion');
}finally{await fs.rm(dir,{recursive:true,force:true});}

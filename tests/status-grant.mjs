import {build} from 'esbuild';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'status-grant-'));
try{
 await build({stdin:{contents:"export * from './client/src/shared/engine';export {DB,STARTERS} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs',plugins:[{name:'resource-boundary',setup(b){b.onLoad({filter:/shared\/engine\.ts$/},async({path})=>({contents:await fs.readFile(path,'utf8')+'\nexport {gainShield,gainBrand,breakShield,makeCtx};',loader:'ts'}));}}]});
 const E=await import(dir+'/engine.mjs');let checks=0;
 const fresh=()=>{const g=E.createGame({mode:'bot',seed:73,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=4;g.pending=null;for(const p of g.players)Object.assign(p,{field:[],enchants:[],traps:[],quests:[],shield:0,brand:0,dew:0});return g;};
 for(const player of [0,1])for(const resource of ['shield','brand']){
  const g=fresh(),p=g.players[player],events=[],ctx=E.makeCtx(g,events),gain=resource==='shield'?E.gainShield:E.gainBrand;
  gain(g,ctx,p,3);gain(g,ctx,p,2);gain(g,ctx,p,0);gain(g,ctx,p,-1);
  assert.deepEqual(events.filter(e=>e.type==='statusGrant'),[{type:'statusGrant',player,resource,before:0,after:3},{type:'statusGrant',player,resource,before:3,after:5}]);
  assert.equal(p[resource],5);checks++;
 }
 {const g=fresh(),ev=[],p=g.players[0],ctx=E.makeCtx(g,ev);E.gainShield(g,ctx,p,6);E.breakShield(ctx,p);E.gainShield(g,ctx,p,2);assert.deepEqual(ev.filter(e=>e.type==='statusGrant').map(e=>[e.before,e.after]),[[0,6],[0,2]]);checks++;}
 {const g=fresh(),ev=[],p=g.players[0];p.enchants=[{card:{ench:'doubleShield'}}];p.field=[{uid:'elf',aura:'shieldDew',val2:2}];E.gainShield(g,E.makeCtx(g,ev),p,3);assert.equal(p.shield,6);assert.equal(p.dew,2);assert.equal(ev.find(e=>e.type==='statusGrant').after,6);checks++;}
 for(const before of [0,8]){const g=fresh(),p=g.players[0];p.shield=before;p.hand=[{...E.DB.DEFENSIVE_STANCE,uid:'shield'}];p.mana=20;const r=E.reduce(g,{type:'play',idx:0});assert(r.events.some(e=>e.type==='statusGrant'&&e.resource==='shield'&&e.before===before&&e.after>before));checks++;}
 // Catch future uninstrumented direct increments. Removal and initialization are intentionally excluded.
 const source=await fs.readFile('client/src/shared/engine.ts','utf8');assert(!/\.brand\s*=\s*\([^;]+\.brand\s*(?:\?\?|\|\|)\s*0\)\s*\+/.test(source));
 console.log(JSON.stringify({passed:true,checks}));
}finally{await fs.rm(dir,{recursive:true,force:true});}

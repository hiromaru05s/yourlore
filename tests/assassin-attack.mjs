import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/lore-assassin-');
try{
 await build({stdin:{contents:"export * from './client/src/ui/assassinAttack/model';export {DB} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const E=await import(dir+'/test.mjs');let checks=0;
 assert.deepEqual(E.ASSASSIN_IDS,['ASSASSIN1','ASSASSIN2','ASSASSIN3','ASSASSIN4','ASSASSIN_SQUAD']);
 for(const card of Object.values(E.DB)){assert.equal(E.usesAssassinStrike(card.id),E.ASSASSIN_IDS.includes(card.id),card.id);checks++;}
 for(const id of [undefined,'','GHOST','GUILD_HALL','GUILD_HQ','ASSASSIN5','SOLDIER2'])assert.equal(E.usesAssassinStrike(id),false);
 assert.deepEqual(E.IAI,{duration:1000,contact:310,vanish:210,returnAt:650,returnEnd:840,color:'#d8edfa'});
 let now=0,serial=0;const frames=new Map();globalThis.requestAnimationFrame=f=>{frames.set(++serial,f);return serial;};globalThis.cancelAnimationFrame=i=>frames.delete(i);Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
 const step=t=>{now=t;const pending=[...frames.values()];frames.clear();pending.forEach(f=>f(t));};
 for(const mode of ['normal','slow-frame','cancel-before-hit','cancel-after-hit','already-aborted','reduced','detach','throw','repeat']){
  const runs=mode==='repeat'?2:1;
  for(let run=0;run<runs;run++){
   now=0;const abort=new AbortController(),cues=[],paint=[];let alive=true;if(mode==='already-aborted')abort.abort();
   const p=E.runAssassinTimeline({signal:abort.signal,isAlive:()=>alive,reduced:mode==='reduced',paint:ms=>{if(mode==='throw')throw Error('paint failure');paint.push(ms);},onImpact:()=>cues.push('hit')});
   if(mode==='throw'){step(150);await assert.rejects(p,/paint failure/);}
   else if(mode==='already-aborted'){assert.equal(await p,false);assert.deepEqual(cues,[]);}
   else if(mode==='cancel-before-hit'){step(200);abort.abort();assert.equal(await p,false);assert.deepEqual(cues,[]);}
   else if(mode==='cancel-after-hit'){step(310);abort.abort();assert.equal(await p,false);assert.deepEqual(cues,['hit']);}
   else if(mode==='detach'){alive=false;step(310);assert.equal(await p,false);assert.deepEqual(cues,[]);}
   else{if(mode==='normal'||mode==='repeat'){step(309);assert.deepEqual(cues,[]);step(310);assert.deepEqual(cues,['hit']);step(600);assert.deepEqual(cues,['hit']);}if(mode==='reduced'){step(119);assert.deepEqual(cues,[]);step(120);assert.deepEqual(cues,['hit']);}step(mode==='reduced'?260:1000);assert.equal(await p,true);assert.deepEqual(cues,['hit']);}
   assert.equal(frames.size,0,mode);checks++;
  }
 }
 // Controller continues to route ordinary attacks through the common entry point.
 const anim=await readFile('client/src/ui/anim.ts','utf8');assert(anim.includes('usesAssassinStrike(source.dataset.cardId)'));assert(anim.includes("import('./assassinAttack/runtime')"));
 const runtime=await readFile('client/src/ui/assassinAttack/runtime.ts','utf8');assert(!runtime.includes('/dev/'));assert(!runtime.includes('directOnly'));
 console.log(`PASS assassin-only selection across ${Object.keys(E.DB).length} cards, approved 01 timing, exact-once contact, cancellation, reduced motion and repeat (${checks} checks)`);
}finally{await rm(dir,{recursive:true,force:true});}

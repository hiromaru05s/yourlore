import {playMonster,setMonsterSkip,clearMonsterStates} from '../../ui/monster/runtime';
import {summonPlacement} from '../../ui/summon/runtime';
import {projectedPlacement} from '../../ui/boardProjection';
import {summonFromHand} from '../../ui/anim';
import {DB} from '../../shared/cards';
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
export async function runRuntimeQA(root:HTMLElement){
 const status=document.createElement('pre');status.id='runtime-status';status.style.cssText='position:fixed;top:0;left:0;z-index:999;background:#172024;color:white;font:12px monospace;max-width:90vw;white-space:pre-wrap';document.body.append(status);
 const report:{checks:string[];errors:string[]}={checks:[],errors:[]};
 const check=(value:unknown,label:string)=>{if(!value)throw Error(label);report.checks.push(label);status.textContent=report.checks.join('\n');};
 const nodes=Array.from(root.querySelectorAll<HTMLElement>('.zone-mon .card'));
 let oldImpacts=0;const old=()=>oldImpacts++;window.addEventListener('lore:summon-impact',old);
 const present=async()=>{for(let i=0;i<100&&!document.querySelector('.slate-summon');i++)await wait(50);check(!!document.querySelector('.slate-summon'),'slate renderer mounted');};
 try{
  for(const side of [0,1]){
   const n=nodes[side*3+1];let impacts=0;
   const initial=summonPlacement(n,180,270,0),landed=summonPlacement(n,180,270,790),ground=projectedPlacement(n,180,270);
   check(landed.toString()===ground.toString()&&initial.toString()!==ground.toString(),`side ${side}: full face contact matrix`);
   const done=playMonster(n,'summon',{onImpact:()=>impacts++});await present();
   check(n.style.visibility==='hidden'&&!document.querySelector('[data-monster-kind=summon]'),'single source replacement; no old summon actor');
   check(await done,`side ${side}: completes`);check(impacts===1,'exactly one contact callback');
   check(n.style.visibility===''&&!document.querySelector('.slate-summon'),'card restored and canvas released');
  }
  const simultaneous=nodes.slice(0,3).map(n=>playMonster(n,'summon'));await present();await wait(150);check(document.querySelectorAll('.slate-summon').length===3,'three concurrent summons');await Promise.all(simultaneous);
  for(const mode of ['abort','skip','resize','clear'] as const){
   const abort=new AbortController(),n=nodes[1],done=playMonster(n,'summon',{signal:abort.signal});await present();
   if(mode==='abort')abort.abort();if(mode==='skip')setMonsterSkip(true);if(mode==='resize')window.dispatchEvent(new Event('resize'));if(mode==='clear')clearMonsterStates(root);
   check(!await done&&n.style.visibility===''&&!document.querySelector('.slate-summon'),`cleanup ${mode}`);setMonsterSkip(false);
  }
  const n=nodes[1],early=new AbortController(),pending=playMonster(n,'summon',{signal:early.signal});early.abort();check(!await pending,'abort while capturing');await wait(250);check(!document.querySelector('.slate-summon'),'late capture cannot resurrect a cancelled summon');
  const hand=summonFromHand({...DB.ELF,uid:'six-hand-0'},'six-0-1','me');await present();await hand;check(!document.querySelector('.slate-summon'),'hand reveal uses slate and cleans up');
  check(oldImpacts===0,'no legacy 3D summon impact events');
  status.textContent='PASS '+report.checks.length+' checks\n'+report.checks.join('\n');
 }catch(error){report.errors.push(String(error));status.textContent='FAIL '+String(error);}
 finally{window.removeEventListener('lore:summon-impact',old);await fetch('/__summon-evidence/runtime-report.json',{method:'POST',body:JSON.stringify(report,null,2)});}
 const replay=document.createElement('button');replay.textContent='③を両陣営で再生';replay.style.cssText='position:fixed;right:12px;top:12px;z-index:1000';replay.onclick=()=>{status.style.display='none';void Promise.all([nodes[1],nodes[4]].map(n=>playMonster(n,'summon')));};document.body.append(replay);
}

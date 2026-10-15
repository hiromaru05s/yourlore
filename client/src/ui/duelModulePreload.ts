declare const __LORE_DUEL_PRELOAD__:string;
let pending:Promise<void>|undefined;
/** The build graph covers every reachable dynamic VFX module and imported asset.
 * Module preload parses code without running effects or allocating GPU contexts. */
export function prepareDuelModules():Promise<void>{
 if(import.meta.env?.DEV||typeof __LORE_DUEL_PRELOAD__==='undefined')return Promise.resolve();
 return pending??=(async()=>{
  const response=await fetch(__LORE_DUEL_PRELOAD__,{cache:'force-cache',signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Duel module manifest unavailable');
  const {modules,assets}=await response.json() as {modules:string[];assets:string[]};
  const jobs=[...modules.map(url=>()=>new Promise<void>((resolve,reject)=>{
   const link=document.createElement('link');
   if(!link.relList.supports('modulepreload')){fetch(url,{cache:'force-cache',signal:AbortSignal.timeout(60000)}).then(r=>{if(!r.ok)throw Error('Duel module unavailable');return r.arrayBuffer();}).then(()=>resolve(),reject);return;}
   link.rel='modulepreload';link.href=url;
   const timer=setTimeout(()=>{link.remove();reject(Error('Duel module preparation timed out'));},60000);
   link.onload=()=>{clearTimeout(timer);resolve();};link.onerror=()=>{clearTimeout(timer);link.remove();reject(Error('Duel module unavailable'));};document.head.append(link);
  })),...assets.map(url=>async()=>{const r=await fetch(url,{cache:'force-cache',signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('Duel artwork unavailable');await r.arrayBuffer();})];
  await Promise.all(Array.from({length:4},async()=>{while(jobs.length)await jobs.shift()!();}));
 })().catch(error=>{pending=undefined;throw error;});
}

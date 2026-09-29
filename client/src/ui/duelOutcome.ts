export const OUTCOME_DURATION=5400;
/** Native book/seal illustration shared by the cinematic and its result panel. */
export function outcomeCrest(won:boolean|null):string {
 return `<svg class="outcome-crest" viewBox="0 0 320 240" fill="none" aria-hidden="true">
 <g class="outcome-orbit" stroke="currentColor"><circle cx="160" cy="116" r="94" opacity=".2"/><circle cx="160" cy="116" r="83" stroke-dasharray="2 13" opacity=".65"/><path d="M160 12v15m0 178v15M56 116H41m238 0h-15M85 41l10 10m130 130 10 10M85 191l10-10M225 51l10-10"/><path d="m160 4 5 12-5 12-5-12Zm0 198 5 12-5 12-5-12Z" fill="currentColor"/></g>
 <g class="outcome-pages" stroke="currentColor" stroke-linejoin="round">
 <path d="M160 163c-25-25-51-30-94-28l11-73c34-3 62 6 83 29 21-23 49-32 83-29l11 73c-43-2-69 3-94 28Z" fill="var(--outcome-ink)" stroke-width="2"/>
 <path d="M160 163V91M73 143c41-3 61 5 87 29 26-24 46-32 87-29M88 78c27 1 46 9 58 21m-60-7c25 1 46 10 60 23m-62-8c28 2 47 10 62 23m-64-8c28 2 47 10 64 23m86-67c-27 1-46 9-58 21m60-7c-25 1-46 10-60 23m62-8c-28 2-47 10-62 23m64-8c-28 2-47 10-64 23" opacity=".58"/>
 <path class="outcome-shard" d="m160 39 10 18-10 20-10-20Z" fill="currentColor" stroke-width="1"/>
 ${won===false?'<path d="m168 45-13 21 14 18-19 28 18 18-14 30" stroke="var(--outcome-ink)" stroke-width="5"/>':''}
 </g></svg>`;
}
export type OutcomeHandle=(()=>void)&{finished:Promise<void>};
let activeOutcome:OutcomeHandle|null=null;
export function cancelDuelOutcome():void {activeOutcome?.();}
/** One owned lifetime covers module loading, texture preparation, playback and cleanup. */
export function mountDuelOutcome(loser:HTMLElement|null,won:boolean,cause:string|null):OutcomeHandle {
 activeOutcome?.();const abort=new AbortController();
 const dispose=(()=>{abort.abort();if(activeOutcome===dispose)activeOutcome=null;}) as OutcomeHandle;
 activeOutcome=dispose;
 const timeout=window.setTimeout(dispose,12000);
 const canceled=new Promise<void>(resolve=>abort.signal.addEventListener('abort',()=>resolve(),{once:true}));
 dispose.finished=Promise.race([import('./crownOutcome').then(m=>abort.signal.aborted?undefined:m.playCrownOutcome(loser,won,cause,abort.signal)),canceled])
  .catch(error=>{console.warn('[crown outcome]',error);}).finally(()=>{clearTimeout(timeout);dispose();});
 return dispose;
}

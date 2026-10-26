import {detachMonsterFace,hitMonster} from './monster/runtime';
import {playManaDestruction} from './manaDestruction/runtime';
import {projectedPlacement} from './boardProjection';

/** A public exit owns frozen faces, so board commits and later input cannot cut its flight. */
export function startCombatExit(source:HTMLElement,side:'me'|'opp',signal:AbortSignal):Promise<void>{
 const pile=document.getElementById(side==='me'?'pile-myDisc':'pile-oppDisc');
 const target=pile?.querySelector<HTMLElement>('.pile-print .card')??pile;
 if(!target||signal.aborted)return Promise.resolve();
 const copy=detachMonsterFace(source);hitMonster(copy);
 const destination=document.createElement('div');
 const w=target.offsetWidth,h=target.offsetHeight,m=projectedPlacement(target,w,h);
 destination.style.cssText=`position:fixed;left:0;top:0;width:${w}px;height:${h}px;transform:${m.toString()};transform-origin:0 0;pointer-events:none;opacity:0`;
 destination.dataset.combatExit='true';destination.dataset.shelfId=pile!.id;destination.setAttribute('aria-hidden','true');document.body.append(destination);
 return playManaDestruction(copy,destination,signal).then(()=>{}).finally(()=>{copy.remove();destination.remove();});
}

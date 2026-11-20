import {rankEmblem} from './rankEmblem';
import type {DuelProfile} from '../shared/duelProfile';
/** Only server-provided public rank snapshots are shown. Preview samples are
 * deliberately separate, and an absent profile leaves the reserved frame empty. */
export function renderDuelRanks(root:HTMLElement,profiles:[DuelProfile|null,DuelProfile|null]|undefined,you:0|1):void {
 for(const [side,index] of [['Me',you],['Opp',1-you]] as const){
  let node=root.querySelector<HTMLElement>(`.identity-rank[data-side="${side}"]`);
  const tier=profiles?.[index]?.rating?.tier;
  if(!tier||root.querySelector(`.identity-rank-sample[data-side="${side}"]`)){node?.remove();continue;}
  if(!node){node=document.createElement('div');node.className='identity-rank';node.dataset.side=side;root.append(node);}
  if(node.dataset.tier!==tier){node.dataset.tier=tier;node.innerHTML=rankEmblem(tier);}
 }
}

import type {CardInst,FieldMon,GameState,Side} from '../../shared/types';
import {monsterCanAttack} from '../../shared/engine';
import {cardEl,type CardOpts} from '../cardView';
import {fieldVisualState} from '../fieldVisualState';
import {prepareSummonAppearance} from './appearance';

export type SummonFaceFactory=(card:CardInst,options?:CardOpts)=>HTMLElement;
export const defaultSummonFace:SummonFaceFactory=(card,options)=>prepareSummonAppearance(cardEl(card,{field:true,...options}));
export function summonFaceFactory(g:GameState,owner:Side,you:Side):SummonFaceFactory{
 return (card,options)=>{
  const p=g.players[owner],m=card as FieldMon,{blocked,aura}=fieldVisualState(g,p,m);
  const node=cardEl(card,{field:true,owner:p,game:g,...options});
  node.dataset.summonRest=blocked?'blocked':owner===you&&g.cur===you&&!g.pending&&monsterCanAttack(g,p,m)?'ready':'plain';
  if(blocked)node.dataset.monsterBlocked='true';if(aura)node.dataset.monsterAura=aura;
  return prepareSummonAppearance(node);
 };
}

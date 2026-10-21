import type {FieldMon,GameState,PlayerState} from '../shared/types';
import {monsterCanAttack,monsterCanTarget,monsterOngoingActive} from '../shared/engine';

/** The same public state is used at landing and by the persistent field. */
export function fieldVisualState(g:GameState,p:PlayerState,m:FieldMon){
 const active=g.players[g.cur],attacking=g.pending?.reason==='attack';
 const candidates=active.field.filter(a=>!attacking||a.uid===g.pending?.data?.attackerUid);
 const blocked=!g.over&&(p===active?!monsterCanAttack(g,p,m):
  candidates.some(a=>!a.exhausted&&a.hatch==null)&&!candidates.some(a=>monsterCanTarget(g,active,a,m)));
 return {blocked,aura:monsterOngoingActive(g,p,m)?m.aura??m.condAtk??m.id:undefined};
}

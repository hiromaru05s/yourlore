import * as Anim from '../../ui/anim';
import {captureHandLayout} from '../../ui/handGeometry';
import {DB} from '../../shared/cards';
import type {GameState,CardInst} from '../../shared/types';
export const ACTIONS=['draw','purchase','summon','attack','shuffle'] as const;
export type StudioAction=typeof ACTIONS[number];
/** Runs the real presentation functions on a disposable sample match. No account,
 * network, purchases, or authoritative match mutations leave the iframe. */
export async function replayAction(kind:StudioAction,side:'self'|'opponent',g:GameState,show:()=>void){
 const index=side==='self'?0:1,view=index?'opp':'me',player=g.players[index];
 const card:CardInst={...DB.ELF,uid:`atelier-action-${Date.now()}`};
 Anim.setFxSkip(false);
 if(kind==='draw'){
  const hand=document.getElementById(index?'oppHand':'hand')!;
  const previousHand=captureHandLayout(hand);player.hand.push(card);show();
  await Anim.animateDraw(document.getElementById(index?'oppHand':'hand'),1,view,{uids:[card.uid],previousHand});
  player.deck.pop();show();
 }else if(kind==='purchase'){
  const source=document.querySelector<HTMLElement>('#fixedMarket>.card')!;
  await Anim.buyReveal(g.market[0],view,source.getBoundingClientRect(),source,0);
  player.discard.push(g.market[0]);show();
 }else if(kind==='summon'){
  await Anim.ghostSummon(card,view,player.field.length);
 }else if(kind==='attack'){
  const attacker=player.field[0],target=g.players[1-index].field[0];
  if(attacker&&target)await Anim.attackStrike(attacker.uid,target.uid,index?'me':'opp',undefined,false,0);
 }else if(kind==='shuffle'){
  await Anim.animateReshuffle(view,player.discard.length);
  player.deck=[...player.discard];player.discard=[];show();
 }
}

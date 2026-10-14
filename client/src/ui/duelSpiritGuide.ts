import { mountManaSpirit } from './manaSpirit';
import { loungeText as text } from './loungeText';
import { openRuleNotebook } from '../screens/tutorial';
import { onLangChange } from '../i18n';
export function mountDuelSpiritGuide(root:HTMLElement,context:()=>{yourTurn:boolean;pending:boolean;mana:number;hand:number;enemyMonsters:number;over:boolean}):()=>void {
  const wrap=document.createElement('aside');wrap.className='duel-spirit-help';
  wrap.innerHTML='<button aria-expanded="false" aria-controls="duelSpiritPanel"></button><div id="duelSpiritPanel" class="duel-spirit-panel" hidden><div class="mana-spirit"></div><p class="spirit-hint" aria-live="polite"></p><button class="btn btn-ghost" data-notes></button></div>';
  root.append(wrap);const button=wrap.querySelector<HTMLButtonElement>('button')!,panel=wrap.querySelector<HTMLElement>('.duel-spirit-panel')!;
  let spirit:ReturnType<typeof mountManaSpirit>|undefined,closeNote:(()=>void)|undefined;
  const paint=()=>{button.textContent=text('ゼノの案内','Zeno’s guide','제노의 안내');wrap.querySelector('[data-notes]')!.textContent=text('ルールノートを開く','Open rule notebook','규칙 노트 열기');if(panel.hidden)return;const c=context();
    wrap.querySelector('.spirit-hint')!.textContent=c.over?text('デュエルが終わったね。ログで最後のやり取りを振り返れるよ。','The duel has ended. Review the final exchanges in the log.','듀얼이 끝났어요. 로그에서 마지막 플레이를 돌아볼 수 있어요.'):
      c.pending?text('いまは対象を選ぶ番だよ。盤面の案内と光っている候補を確認してね。','Choose a target now. Follow the board prompt and highlighted candidates.','지금은 대상을 선택할 차례예요. 필드 안내와 빛나는 후보를 확인하세요.'):
      !c.yourTurn?text('相手のターンだよ。カードを拡大して効果を読んだり、ログを振り返ったりできる。','It is your opponent’s turn. You can inspect cards and review the log.','상대 턴이에요. 카드 상세와 로그를 살펴볼 수 있어요.'):
      c.mana===0?text('マナを使い切ったね。攻撃できるモンスターがいないか確認して、ターンを終了しよう。','Your mana is spent. Check for ready attackers before ending your turn.','마나를 모두 썼어요. 공격할 몬스터가 있는지 확인하고 턴을 종료하세요.'):
      c.hand>7?text('手札が7枚を超えている。ターン終了時に超過分を墓地へ送るので、残したいカードを考えてね。','You have more than seven cards. At turn end, discard the excess and keep what you need.','손패가 7장을 넘었어요. 턴 종료 시 초과분을 묘지로 보내니 남길 카드를 생각하세요.'):
      c.enemyMonsters?text('相手にモンスターがいる。通常攻撃はその中から対象を選ぶよ。カードの購入と召喚・魔法には同じマナを使うから、使う順番も考えてね。','Enemy monsters are present, so ordinary attacks target them. Purchases, summons and spells share your mana: consider the order.','상대 몬스터가 있어 일반 공격은 그중에서 대상을 골라요. 구매·소환·마법은 같은 마나를 쓰니 순서를 생각하세요.'):
      text('相手の場が空だね。モンスターで精神力を直接攻撃できるよ。カードの詳しい効果は右クリック・長押しで読める。','The enemy field is empty. Monsters can attack Spirit directly. Right-click or long-press to inspect card effects.','상대 필드가 비었어요. 몬스터로 정신력을 직접 공격할 수 있어요. 우클릭·길게 누르기로 카드 효과를 읽으세요.');
  };
  button.onclick=()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden&&!spirit)spirit=mountManaSpirit(wrap.querySelector('.mana-spirit')!);paint();};
  wrap.querySelector('[data-notes]')!.addEventListener('click',()=>{closeNote?.();closeNote=openRuleNotebook();});
  const timer=setInterval(paint,900),unsub=onLangChange(paint);paint();
  return()=>{clearInterval(timer);unsub();closeNote?.();spirit?.destroy();wrap.remove();};
}

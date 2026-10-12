import {loungeText} from './loungeText';
import type {SeekerAction} from './seekerMotion';
export const seekerName = (id: string) => id === 'SEEKER_RED'
  ? loungeText('フードの女', 'Hooded woman', '후드를 쓴 여자')
  : loungeText('フードの男', 'Hooded man', '후드를 쓴 남자');
export function seekerActionLabel(action: SeekerAction): string {
  const labels: Record<SeekerAction, [string,string,string]> = {
    idle:['待機','Idle','대기'], mana:['マナ増加','Mana gain','마나 증가'], heal:['体力回復','Heal','회복'],
    hurt:['通常被弾・烙印','Hit / Brand','피격 / 낙인'], heavy:['強い被弾','Heavy hit','강한 피격'],
    defeat:['敗北','Defeat','패배'], victory:['勝利','Victory','승리'],
  };
  return loungeText(...labels[action]);
}

import {loungeText} from './loungeText';
import type {SeekerAction} from './seekerMotion';
export const seekerName = (_id?: string) => loungeText('フードのシーカー', 'Hooded Seeker', '후드의 시커');
export const seekerActionLabel = (action: SeekerAction) => action === 'hurt'
  ? loungeText('被弾', 'Hit', '피격') : loungeText('通常', 'Neutral', '기본');

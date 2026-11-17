/** Menu metadata must not import executable tutorial boards. */
import {copy as c,type Copy} from './tutorialSteps';
export interface TutorialPartMeta {title:Copy;intro:Copy;kind:'board'|'practice'|'home'|'deck';}
export const TUTORIAL_PARTS:TutorialPartMeta[]=[{kind:'board',title:c('デュエルの基本','Duel basics','듀얼의 기본'),intro:c('召喚・攻撃・購入・ターンの流れを、自分で操作して覚えよう。','Learn summoning, attacking, buying and turns by playing.','직접 소환하고 공격하고 구매하며 턴의 흐름을 익혀 봐.')}];
export const tutorialPartKey=(part:number,accountId?:string)=>`lore:tutorial:parts:v5:${encodeURIComponent(accountId??'guest')}:complete:${part}`;

import {PASSIVE_KEYS,frameFor,fieldFrameFor} from '../shared/cards';
import {passiveIconUrl} from './passiveIcon';
import {seekerAtlas} from './seekerMotion';
/** Pure URL inventory shared by build-time persistent preload and duel decoding. */
export const duelCardAssets=[...(['mon','spell','quest','trap'] as const).flatMap(t=>[frameFor(t),frameFor(t,true),fieldFrameFor(t)]),
 ...['cost','attack','health','shield','dew','plaque','infinity'].map(n=>`/art/biblion/modular/${n}-ui.webp`)];
export const duelImageUrls=()=>[...['surrender','help','log','sound'].map(n=>`/ui/duel-controls/v1/${n}.png`),...duelCardAssets,'/art/biblion/modular/brand-seal-ui.webp','/art/seekers/v2/mask-self.png','/art/seekers/v2/mask-opp.png',...PASSIVE_KEYS.map(passiveIconUrl),seekerAtlas(),
 '/ui/coin-toss/coin-option-1-front.png','/ui/coin-toss/coin-option-1-back.png',
 ...['base-mon','base-spell','base-quest','field-mon','field-spell','field-quest','cost','attack','health','shield','dew'].map(n=>`/art/biblion/modular/${n}-ui.webp`)];

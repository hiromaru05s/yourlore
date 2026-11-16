import {npcPortrait} from '../shared/botNpcs';
import {artUrl} from './cardArt';
import {SEEKER_ID, SEEKER_ROOT, seekerPoster} from './seekerMotion';
import {seekerName} from './seekerLabels';
import {loungeText} from './loungeText';

interface CharacterAppearance {
  id: string;
  name: () => string;
  home: string;
  portrait: string;
  icon: string;
}

/** Profile choices and HOME paintings share the same character IDs. */
export const playableCharacters: CharacterAppearance[] = [{
  id:SEEKER_ID, name:seekerName, home:SEEKER_ROOT+'/home-closeup.webp',
  portrait:SEEKER_ROOT+'/cutout/portrait.webp', icon:seekerPoster(),
}];

export function characterAppearance(avatar?: string | null): CharacterAppearance {
  if (!avatar || avatar === 'SEEKER_BLUE' || avatar === 'SEEKER_RED' || !/^[A-Za-z0-9_]+$/.test(avatar)) return playableCharacters[0];
  const character = playableCharacters.find(entry => entry.id === avatar);
  if (character) return character;
  const npc = npcPortrait(avatar);
  const portrait = npc ?? artUrl.sm(avatar);
  return {id:avatar, name:()=>loungeText('現在のアバター','Current avatar','현재 아바타'), home:npc ?? artUrl.full(avatar), portrait, icon:portrait};
}

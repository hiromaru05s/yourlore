/** User selection 2026-10-09: 01 for all four Chosen heroes. */
export const CHOSEN_HEROES=['CHOSEN_KNIGHT','CHOSEN_MAGE','CHOSEN_ARCHER','CHOSEN_ROGUE'] as const;
export const CHOSEN_SUMMON_VARIANT=0;
export function chosenHero(id:string|undefined){return id?CHOSEN_HEROES.indexOf(id as typeof CHOSEN_HEROES[number]):-1;}
export function isChosenHero(id:string|undefined){return chosenHero(id)>=0;}

import {cards,type Id} from './catalog';
/** User selected 04, 2026-10-09. Only this family uses the approved fracture. */
export const HEXER_SUMMON_VARIANT=3;
export function isHexer(id:unknown):id is Id{return typeof id==='string'&&(cards as readonly string[]).includes(id);}

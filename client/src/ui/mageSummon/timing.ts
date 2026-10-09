export const MAGE_DURATION=3800;
/** Begin with formed material, not the study's empty lead-in. Rejoin the approved
 * clock continuously by 800ms, preserving its contact and completion timing. */
export function mageVisualTime(ms:number){const t=Math.max(0,Math.min(1,ms/800));return ms+360*(1-t*t*(3-2*t));}

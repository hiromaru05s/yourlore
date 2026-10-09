export const CHOSEN_FLASH_MS=2700;
export const CHOSEN_DURATION_MS=7400;
/** A crossed frame fires once; seeking/hidden cancellation never schedules a later sound. */
export function crownCue(reduced=false){let fired=false;return (time:number)=>{if(fired||time<(reduced?0:CHOSEN_FLASH_MS))return false;fired=true;return true;};}

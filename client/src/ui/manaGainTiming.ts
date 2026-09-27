/** One clock for the resource readout, physical jewels, light and sound. */
export const MANA_GAIN_MS=1500;
export const MANA_GAIN_IMPACT_MS=520;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function manaGainPose(age:number,index=0,count=1){
 const stagger=count<=1?0:Math.min(140,(count-1)*35)*index/(count-1);
 const arrive=clamp((age-MANA_GAIN_IMPACT_MS-stagger)/220);
 const settle=clamp((age-MANA_GAIN_IMPACT_MS-stagger-220)/520);
 return {visible:age>=MANA_GAIN_IMPACT_MS,scale:arrive<1?1.12*(1-(1-arrive)**3):1+.12*(1-settle)**2,
  lift:Math.sin(Math.PI*arrive)*.009,glow:Math.exp(-(((age-MANA_GAIN_IMPACT_MS-stagger-110)/210)**2))};
}

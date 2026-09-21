const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(a:number,b:number,t:number)=>{const p=clamp((t-a)/(b-a));return p*p*(3-2*p);};
export const DRAW_DURATION=680,DRAW_STAGGER=105;
/** Separation from the deck, front reveal, then a tangent approach to the fan. */
export function drawMotion(t:number,reveal:boolean){
 t=clamp(t);const carry=smooth(.12,.94,t),settle=smooth(.75,1,t);
 return {travel:carry,lift:Math.sin(Math.PI*carry),peel:Math.sin(Math.PI*smooth(0,.32,t)),reveal:reveal?smooth(.18,.57,t):0,
  bank:Math.sin(Math.PI*carry)*(1-settle),size:Math.sin(Math.PI*smooth(.12,.86,t))*.18,settle};
}

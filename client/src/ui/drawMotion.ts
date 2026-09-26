const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const drawSmooth=(a:number,b:number,t:number)=>{const p=clamp((t-a)/(b-a));return p*p*p*(10+p*(-15+6*p));};
export const DRAW_DURATION=840,DRAW_STAGGER=150;
/** Rigid stock: separate, lift, turn, carry, and seat once. No elastic paper bend. */
export function drawMotion(t:number,reveal:boolean){
 t=clamp(t);const travel=drawSmooth(.14,1,t),settle=drawSmooth(.68,1,t),release=drawSmooth(0,.22,t);
 return {travel,lift:Math.sin(Math.PI*drawSmooth(.035,.96,t)),peel:release*(1-drawSmooth(.23,.50,t)),
  reveal:reveal?drawSmooth(.17,.58,t):0,bank:Math.sin(Math.PI*travel)*(1-settle),size:0,
  settle,pitch:18*(1-drawSmooth(.02,.72,t))-12*Math.sin(Math.PI*drawSmooth(.08,.78,t)),
  glow:drawSmooth(.06,.18,t)*(1-drawSmooth(.24,.43,t)),seat:Math.sin(Math.PI*drawSmooth(.84,1,t))*(1-drawSmooth(.9,1,t))};
}

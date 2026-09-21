const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(a:number,b:number,t:number)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q);};
export const REFORM_DURATION=1450;
/** The two stacks never translate between locations. Energy replaces matter. */
export function reformState(t:number){
 return {sourceCharge:smooth(0,.32,t),sourceAlpha:1-smooth(.32,.39,t),destinationAlpha:smooth(.48,.57,t),destinationCharge:1-smooth(.66,.94,t),burst:Math.sin(Math.PI*clamp((t-.59)/.38)),phase:t<.32?'包み込む':t<.48?'消失':t<.66?'再構成':'定着'};
}

export const DURATION=3600, CONTACT=1760, CARD_WIDTH=180, CARD_HEIGHT=281.25;
export const ease=(a:number,b:number,t:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};

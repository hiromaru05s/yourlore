export const ease=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export const tier=(n:number)=>Math.min(3,Math.max(1,Math.floor(Number.isFinite(n)?n:1)));
export const synergyDuration=(n:number)=>1150+tier(n)*250;

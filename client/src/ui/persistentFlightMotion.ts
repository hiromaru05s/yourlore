/** Approved persistent-five #02: 240ms anticipation, arrival at 880ms. */
export const DURATION=880;
export function ease(a:number,b:number,t:number){const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);}
export function motion(ms:number){const t=ms/1000,p=ease(.24,.88,t);return{p,lift:-.40*Math.sin(p*Math.PI),angle:-.19*Math.sin(p*Math.PI),morph:ease(.50,.96,p)};}

export const DURATION=2800;
export const IMPACT=1760;
export const ramp=(t:number,a:number,b:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x)};

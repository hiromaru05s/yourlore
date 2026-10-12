export const CONTACT=720, END=2320, GUTS_DURATION=END-CONTACT;
export const sat=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(a:number,b:number,t:number)=>{const q=sat((t-a)/(b-a));return q*q*(3-2*q)};
export const pulse=(a:number,b:number,c:number,t:number)=>smooth(a,b,t)*(1-smooth(b,c,t));

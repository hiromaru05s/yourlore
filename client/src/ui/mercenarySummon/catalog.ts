export const DURATION=3600,CONTACT=1670,VARIANT=1;
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const ease=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export const designs=[{hit:CONTACT},{hit:CONTACT}];
export function motion(_v:number,ms:number,reduced=false){const descent=clamp((ms-840)/(CONTACT-840));return{lift:reduced||ms<=0||ms>=CONTACT?0:43/180*ease(0,260,ms)*(1-descent*descent),hit:CONTACT};}

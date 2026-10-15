export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const ease=(a:number,b:number,t:number)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q);};
export const lerp=(a:number,b:number,q:number)=>a+(b-a)*q;
export const duration=5800;
export const spawn=(i:number)=>850+i*480;
export const landing=(i:number,_v=0)=>spawn(i)+1040;
export const cardReveal=(i:number)=>landing(i)+100;
export const fadeStart=(n:number)=>spawn(Math.max(0,n-1))+350;
export const countAt=(t:number,roll:number,slots:number,_v=0)=>Array.from({length:Math.min(roll,slots)},(_,i)=>landing(i)).filter(x=>t>=x).length;

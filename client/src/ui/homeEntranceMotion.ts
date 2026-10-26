/** Approved home-card-entry 01: the same clock and fan trajectory as the study. */
export const entranceEase=(a:number,b:number,t:number)=>{const p=Math.max(0,Math.min(1,(t-a)/(b-a)));return p*p*(3-2*p);};
export const entranceOut=(a:number,b:number,t:number)=>1-(1-Math.max(0,Math.min(1,(t-a)/(b-a))))**3;
export function silverFanPose(i:number,t:number,w:number,h:number){
 const n=i-3,spread=entranceOut(.57,1.48,t),f=entranceEase(1.62+Math.abs(n)*.035,3.12+Math.abs(n)*.035,t);
 return {spread,x:n*Math.min(w*.115,140)*spread+n*w*.21*f,y:Math.abs(n)*h*.022*spread-h*1.15*f,rz:n*10*spread+n*18*f,ry:-n*3*spread+64*f,rx:8*(1-spread),scale:1+.22*spread-.18*f};
}

/** 2026-10-27 selected study 01: 3 → 7, open the fan, leave upward. */
export function azureFanPose(i:number,t:number,w:number,h:number,height:number){
 const n=i-3,spread=entranceOut(.2,1.35,t),leave=entranceOut(1.6+Math.abs(n)*.065,3.4+Math.abs(n)*.065,t);
 return {spread,x:n*height*(.07+.27*spread)+n*w*.25*leave,y:Math.abs(n)*height*(.015+.045*spread)-h*1.1*leave,rz:n*(.12+.07*spread)+n*.13*leave,ry:leave*.9,rx:(1-spread)*.13,scale:1+.16*spread,alpha:Math.abs(n)<=1?1:entranceEase(.2,.7,t)};
}

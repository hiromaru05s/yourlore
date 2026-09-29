/** One result clock articulates the metal, gemstone and crown together. */
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(p:number)=>1-Math.pow(1-clamp(p),3);
const seat=(p:number)=>{p=clamp(p);return p===1?1:1-Math.pow(1-p,3)*Math.cos(p*Math.PI*3);};
export const RANK_REVEAL_START = 2100;
export const RANK_PROMOTION_END = 4250;
export type EmblemPose = {opacity:number;wing:number;fan:number;frame:number;core:number;crown:number;base:number;body:number;light:number};
export function assembledPose():EmblemPose{return {opacity:1,wing:0,fan:0,frame:1,core:0,crown:0,base:0,body:1,light:0};}
export function arrivingPose(ms:number,descending=false):EmblemPose {
 const open=seat((ms-180)/1050), frame=seat(ms/650), core=seat((ms-80)/850), crown=seat((ms-620)/850);
 return {opacity:ease(ms/180),wing:(1-open)*(descending?23:64),fan:(1-seat((ms-400)/1050))*23,frame:.64+.36*frame,core:(1-core)*(descending?-24:45),crown:(1-crown)*-45,base:(1-seat((ms-440)/750))*26,body:1+.035*Math.sin(clamp((ms-800)/700)*Math.PI),light:Math.sin(clamp((ms-750)/950)*Math.PI)};
}
export function departingPose(ms:number):EmblemPose {
 const p=ease(ms/440);return {opacity:1-ease((ms-190)/240),wing:p*52,fan:p*18,frame:1-p*.24,core:-p*18,crown:p*18,base:-p*14,body:1-p*.06,light:0};
}
export function applyEmblemPose(el:HTMLElement,p:EmblemPose):void {
 el.style.opacity=String(p.opacity);
 el.style.setProperty('--crest-wing',`${p.wing}deg`);el.style.setProperty('--crest-fan',`${p.fan}deg`);
 el.style.setProperty('--crest-frame',String(p.frame));el.style.setProperty('--crest-core',`${p.core}deg`);
 el.style.setProperty('--crest-crown',`${p.crown}px`);el.style.setProperty('--crest-base',`${p.base}px`);
 el.style.setProperty('--crest-body',String(p.body));el.style.setProperty('--crest-light',String(p.light));
}

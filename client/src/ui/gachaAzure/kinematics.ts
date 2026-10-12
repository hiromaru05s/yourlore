export const ease=(a:number,b:number,x:number)=>{const p=Math.min(1,Math.max(0,(x-a)/(b-a)));return p*p*p*(10+p*(-15+p*6))};
export const coverAngle=(open:number)=>Math.PI*ease(0,.25,open);
export function leafAngle(open:number,index:number){const rank=7-index;return Math.PI*ease(.28+rank*.055,.57+rank*.055,open)}
// The outermost leaf turns first. All leaf angles stay behind the fully open cover.
// A signed normal offset preserves the stack order on both sides of the binding.
export function leafPoint(open:number,index:number,u:number,v:number){
 const a=leafAngle(open,index),offset=-.112+index*.0035;
 const bend=a+.085*Math.sin(a)*Math.sin(u*Math.PI);
 return {x:Math.cos(bend)*u*2.05-Math.sin(a)*offset,y:(v-.5)*2.99,z:.32+Math.sin(bend)*u*2.05+Math.cos(a)*offset};
}

/** A single arrival. The lateral excursion is exactly zero at the destination. */
export function flightPoint(t:number,variant=0){
 const pull=ease(.065,.22,t),fly=ease(.24,.65,t),envelope=Math.sin(Math.PI*fly);
 // A full right/left sweep with vanishing lateral velocity at both ends.
 const amplitude=[2.65,2.20,2.85][variant];
 const phase=variant===1?Math.pow(fly,.84):variant===2?Math.pow(fly,1.14):fly;
 const x=amplitude*Math.sin(phase*Math.PI*2)*envelope;
 const lift=variant===0?.52*envelope:variant===1?.92*envelope+.20*Math.sin(fly*Math.PI*2)*envelope:.35*envelope+.48*Math.sin(fly*Math.PI*2)*envelope;
 return {x,y:3.23+(3.20-3.23)*fly+lift,z:(-11.06+pull*.75)*(1-fly)+3.05*fly};
}
export function flightRotation(t:number,variant=0){
 const fly=ease(.24,.65,t),face=ease(.48,.65,t),wave=Math.sin(fly*Math.PI*2)*Math.sin(fly*Math.PI);
 return {x:(.13*Math.sin(fly*Math.PI))*(1-face)-.08*face,y:(-.22+wave*.42)*(1-face)-.025*face,z:-wave*[.20,.28,.16][variant]};
}
/** Compensate for the real cover silhouette expanding left of its hinge. */
export function openingCenterOffset(open:number){return 1.11*Math.max(0,-Math.cos(coverAngle(open)))}
/** Sewn at the head. On opening the loose end swings behind the rear board. */
export function bookmarkPoint(v:number,open:number,t:number){
 const tuck=ease(.34,.86,open),fold=ease(0,.10,v),sway=Math.sin(t*3-v*4)*v*v*.050*(1-tuck);
 return {x:-.27*fold*(1-tuck)+.05*v*tuck+sway-.14*Math.sin(coverAngle(open))*v*v*(1-tuck),y:-3.49*v+.62*tuck*Math.pow(v,4),z:-.24*fold-.78*tuck*v*v+Math.sin(t*2.2-v*5)*v*v*.025*(1-tuck)};
}

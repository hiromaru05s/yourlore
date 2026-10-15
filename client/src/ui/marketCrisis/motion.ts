export const clamp=(t:number)=>Math.max(0,Math.min(1,t));
export const ease=(t:number)=>{t=clamp(t);return t*t*(3-2*t)};
/** Match monster/actor.ts: the same 2 columns × 4 rows, triangulated into 16 pieces. */
export const polygons:number[][][]=[];
const xs=[0,.47,1],ys=[0,.21,.53,.77,1];
for(let y=0;y<4;y++)for(let x=0;x<2;x++)for(let tri=0;tri<2;tri++){
 const p0=[xs[x]+(x===1?(y%2?.07:-.025):0),ys[y]],p1=[xs[x+1]+(x===0?(y%2?.07:-.025):0),ys[y]],p2=[xs[x+1]+(x===0?((y+1)%2?.07:-.025):0),ys[y+1]],p3=[xs[x]+(x===1?((y+1)%2?.07:-.025):0),ys[y+1]];
 polygons.push(tri?[p0,p2,p3]:[p0,p1,p2]);
}
export const SPLIT=100,DEBRIS_END=1080,REVEAL=1200,SETTLED=1400;
export const revealAt=(reduced:boolean)=>reduced?600:REVEAL;
export function fragmentPose(t:number,slot:number,i:number){
 const age=t-SPLIT-Math.abs(slot-3)*18-(i%5)*20;
 const split=clamp(age/520),tail=ease((age-540)/260),sign=Math.floor(i/2)%2?1:-1;
 // Existing monster destruction's lateral speed, gravity and alternating rotation.
 return{x:sign*.26*(.55+i%4*.22)*ease(split/.8),y:split*split*.19+tail*.20,angle:sign*split*25*(.55+i%5*.19),scale:1-tail*.75,opacity:1-tail,visible:t>=SPLIT&&t<DEBRIS_END&&tail<1};
}

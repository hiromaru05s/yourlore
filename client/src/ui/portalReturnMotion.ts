import {sat,smooth} from './cardReturnMotion';
export const portalTiming=(style:number)=>({returnAt:style===2?.46:style===3?.58:style===4?.55:.52,stagger:style===4?.035:.022,departSpan:style===2?.145:.17,arriveSpan:style===2?.18:style===3?.24:.21});
/** A local departure and local arrival; the hidden jump never draws across the board. */
export function portalPose(t:number,u:number,v:number,packet:number,style:number){
 const timing=portalTiming(style),arrival=t>=timing.returnAt;
 const delay=(1-u)*(style===1?.085:.065)+packet*timing.stagger+(style===1?(1-v)*.02:0);
 const d=smooth(0,1,sat((t-.14-delay)/timing.departSpan));
 const r=smooth(0,1,sat((t-timing.returnAt-delay)/timing.arriveSpan));
 const q=arrival?.55+r*.45:d*.45;
 const wave=Math.sin(Math.PI*(arrival?r:d));
 const fluid=arrival?1-smooth(.50,.98,r):smooth(.03,.80,d);
 const narrow=style===3?.93:.72;
 const width=1-fluid*narrow;
 const tilt=style===1?wave*.55:style===3?wave*.35:wave*.18;
 const localZ=-(v-.5)*1.46875*width;
 const taper=1-fluid*.35*(1-Math.sin(Math.PI*u));
 const y=smooth(.025,.13,t)*(1-smooth(.77,.92,t))*.20+wave*(style===3?.26:.14)+Math.sin(tilt)*localZ;
 const z=Math.cos(tilt)*localZ*taper+wave*Math.sin(u*Math.PI)*.08;
 return {s:arrival?1:0,q,raw:q,fluid,charge:1-smooth(.81,.94,t),localX:(u-.5)*.94,y,z,contact:wave>0,offset:arrival?-2.20*(1-r):1.92*d,arrival,d,r};
}

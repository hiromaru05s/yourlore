const sat=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{v=sat(v);return v*v*(3-2*v);};
export function overhandPose(t:number,index:number,count:number){
 const n=Math.max(1,count),packet=Math.max(1,Math.floor(n/3)),mix=sat((t-.19)/.51),cycle=8*mix**1.35;
 const round=Math.min(7,Math.floor(cycle)),phase=t>=.7?1:cycle-round;
 const rank=(index-round*packet%n+n)%n,held=rank<packet;
 const envelope=smooth((t-.13)/.06)*(1-smooth((t-.70)/.10));
 const out=smooth(phase/.26)*(1-smooth((phase-.70)/.30));
 const lift=smooth((phase-.24)/.46),stackStep=.009;
 const y=held?rank*stackStep+lift*(n-packet)*stackStep:rank*stackStep-lift*packet*stackStep;
 return {round:round+1,phase:t<.19?'lift':t<.70?(phase<.28?'pluck':phase<.70?'return':'stack'):t<.80?'square':'land',
   // Forward/lower packet extraction follows the inclination, never splits in two sideways fans.
   x:held?out*.13:0,z:held?out*.67:0,y,tilt:envelope*.27,roll:envelope*-.16,packet:held};
}

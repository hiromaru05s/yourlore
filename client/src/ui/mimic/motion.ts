const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export function ease(a:number,b:number,t:number){const u=clamp((t-a)/(b-a));return u*u*(3-2*u);}
export function normalPose(time:number,reduced=false){
 const open=ease(640,1090,time)*(1-ease(1650,2160,time));
 const roar=ease(1010,1210,time)*(1-ease(1570,1750,time));
 const prep=Math.sin(Math.PI*ease(440,640,time))*(1-ease(640,670,time));
 const yaw=open*9*(1-.45*ease(1100,1500,time));
 return {open,roar,gap:open*82*(reduced?.48:1),upper:.53,topAngle:-yaw,bottomAngle:yaw*.8,dx:reduced?0:Math.sin((time-1090)*.035)*roar*.7,dy:reduced?0:prep*4,scale:reduced?1:1-prep*.045+open*.025,squash:reduced?1:1-prep*.055,tilt:reduced?0:open*-2};
}
export function masterPose(time:number,reduced=false){
 const p=normalPose(time,reduced),open=ease(640,1090,time)*(1-ease(1770,2290,time));
 const roar=ease(1060,1270,time)*(1-ease(1700,1860,time));
 return {...p,open,roar,gap:open*100*(reduced?.48:1),topAngle:-open*10.2*(1-.45*ease(1100,1500,time)),bottomAngle:open*8.2*(1-.45*ease(1100,1500,time)),scale:reduced?1:p.scale+open*.04,dy:reduced?0:p.dy-open*5,dx:reduced?0:Math.sin((time-1090)*.035)*roar*.9,tilt:reduced?0:-open*2.8};
}
export function familyPose(t:number,id:'MIMIC_LORD'|'AWAKENED_MIMIC',reduced=false){
 const leader=id==='MIMIC_LORD',begins=leader?850:660,peaks=leader?1130:1080,closes=leader?1840:1860;
 let open=ease(begins,peaks,t)*(1-ease(closes,2360,t));
 if(leader)open*=1-.5*Math.sin(Math.PI*ease(1240,1560,t))*(1-ease(1550,1610,t));
 const prep=Math.sin(Math.PI*ease(430,begins,t)),p=normalPose(t,reduced),roar=ease(peaks-40,peaks+160,t)*(1-ease(closes-60,closes+80,t));
 const swing=leader?Math.sin(ease(950,1800,t)*Math.PI*1.5)*10:-5;
 return{...p,open,roar,gap:open*(leader?72:105)*(reduced?.48:1),upper:.54,topAngle:open*(-8.5-swing*.4),bottomAngle:open*(leader?10:5),dx:reduced?0:leader?Math.sin(ease(700,2150,t)*Math.PI*2)*open*9:Math.sin(t*.032)*roar*.6,dy:reduced?0:prep*5-open*(leader?6:8),scale:reduced?1:1-prep*.05+open*(leader?.04:.07),squash:reduced?1:1-prep*.06,tilt:reduced?0:open*swing*.5};
}
export type RoyalId='MIMIC_KING'|'MIMIC_KING2';
export const windowAt=(t:number,a:number,b:number,c:number,d:number)=>ease(a,b,t)*(1-ease(c,d,t));
const pulse=(t:number,a:number,b:number,c:number)=>windowAt(t,a,b,b,c);
export function royalPose(t:number,id:RoyalId,reduced=false){
 const second=id==='MIMIC_KING2',close=1-ease(2460,2810,t),hit=pulse(t,1000,1100,1420);
 const open=ease(second?690:1090,second?1010:1330,t)*close;
 return {open,gap:open*(second?131:150)*(reduced?.52:1),upper:.55,topAngle:(second?-13:-8)*open*(reduced?.4:1),bottomAngle:(second?8:4)*open*(reduced?.4:1),dx:0,dy:reduced?0:second?-open*8:hit*20-open*9,tilt:reduced?0:second?-4*open:0,scale:reduced?1:1+open*(second?.12:.2),squash:reduced?1:second?1:1-hit*.15,light:second?pulse(t,1820,2040,2320):hit};
}
export type RoyalPose=ReturnType<typeof royalPose>;

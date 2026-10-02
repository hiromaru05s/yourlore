import {ease,pose} from '../mimic-four/rig';
import {duration} from './catalog';import type {FamilyId} from './catalog';
export {ease};
export function clock(time:number,id:FamilyId){return time/duration[id]*3200;}
export function familyPose(time:number,id:FamilyId,variant:number,reduced=false){
 const t=clock(time,id),v=variant-1,rank=['MIMIC_LORD','AWAKENED_MIMIC','MIMIC_KING','MIMIC_KING2','ORIGIN_MIMIC'].indexOf(id);
 const begins=[660,720,850][v],peaks=[1080,1240,1130][v],closes=[1860,1950,1840][v];
 let open=ease(begins,peaks,t)*(1-ease(closes,2360,t));
 if(id==='MIMIC_LORD'&&variant===3)open*=1-.5*Math.sin(Math.PI*ease(1240,1560,t))*(1-ease(1550,1610,t));
 const prep=Math.sin(Math.PI*ease(430,begins,t)),p=pose(t,3,reduced),roar=ease(peaks-40,peaks+160,t)*(1-ease(closes-60,closes+80,t));
 const strength=[.04,.07,.10,.11,.14][rank],gap=open*([76,105,116,123,136][rank]+[0,9,-4][v])*(reduced?.48:1);
 const swing=variant===1?-5:variant===2?2:Math.sin(ease(950,1800,t)*Math.PI*1.5)*10;
 return{...p,open,roar,gap,upper:variant===2?.72:.54,topAngle:open*(variant===2?-2:-8.5-swing*.4),bottomAngle:open*(variant===1?5:variant===2?1:10),dx:reduced?0:variant===3?Math.sin(ease(700,2150,t)*Math.PI*2)*open*9:Math.sin(t*.032)*roar*.6,dy:reduced?0:prep*5-open*(variant===2?17:6+rank*2),scale:reduced?1:1-prep*.05+open*strength,squash:reduced?1:1-prep*.06,tilt:reduced?0:open*swing*.5};
}

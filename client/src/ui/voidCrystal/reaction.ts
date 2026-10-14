import {HIT} from './catalog';
const kick=(t:number,start:number,length:number)=>{const q=Math.max(0,Math.min(1,(t-start)/length));return Math.sin(q*Math.PI)*Math.pow(1-q,.65);};
export function reaction(_v:number,ms:number,reduced=false,count=8){const t=ms-HIT;if(t<0||t>2100||!count)return{x:0,y:0,sx:1,sy:1,light:0};if(reduced)return{x:0,y:0,sx:1,sy:1,light:.16*Math.max(0,1-t/450)};
const press=kick(t,0,175),blast=kick(t,95,380),recoil=kick(t,300,580),tail=kick(t,800,600);
return{x:.08*press-.065*recoil+.014*tail,y:.07*blast-.028*recoil,sx:1-.25*press+.14*blast-.05*recoil,sy:1+.16*press-.13*blast+.035*recoil,light:Math.exp(-Math.abs(t-115)/95)*.95};}

import {getLang} from '../../i18n';
import {medalName} from '../medal';
import {rankEmblem} from '../rankEmblem';
import {tierLabel,TIER_META} from '../tier';
import type {DuelProfile} from '../../shared/duelProfile';
export type ProfileArt={empty?:HTMLImageElement;ranks:Map<string,HTMLImageElement>};
export async function loadProfileArt():Promise<ProfileArt>{
 const load=async(src:string)=>{const image=new Image();image.src=src;try{await image.decode();return image;}catch{return undefined;}};
 const ranks=new Map<string,HTMLImageElement>();
 const [empty]=await Promise.all([load('/art/ui/medal-empty-azure.svg'),...Object.keys(TIER_META).map(async key=>{const svg=rankEmblem(key).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ');const image=await load('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));if(image)ranks.set(key,image);})]);
 return {empty,ranks};
}
const label=(ja:string,en:string,ko:string)=>getLang()==='ja'?ja:getLang()==='en'?en:ko;
const mobileScale=(height:number)=>Math.min(1.9,Math.max(1.15,height/1400));
export function profilePanelTop(height:number,bottom:number,mobile:boolean,opponent:boolean){return mobile?bottom-148*mobileScale(height)-(opponent?Math.max(150,height*.1):Math.max(90,height*.055)):height-215;}
/** A compact overlay inside each battle card, with background visible on every side. */
export function paintProfilePanel(g:CanvasRenderingContext2D,o:{x:number;top:number;bottom:number;height:number;mobile:boolean;name:string;profile?:DuelProfile|null;medal?:string|null;ranked?:boolean;plate?:HTMLImageElement;art:ProfileArt}){
 const scale=o.mobile?mobileScale(o.height):1,w=420,half=w/2,height=o.ranked?148:116;
 g.save();g.translate(o.x,o.top);g.scale(scale,scale);
 const path=(inset:number)=>{const a=half-inset,b=height-inset;g.beginPath();g.moveTo(-a+14,inset+9);g.lineTo(-82,inset+9);g.lineTo(-72,inset+3);g.lineTo(72,inset+3);g.lineTo(82,inset+9);g.lineTo(a-14,inset+9);g.lineTo(a,inset+23);g.lineTo(a,b-12);g.lineTo(a-14,b);g.lineTo(-a+14,b);g.lineTo(-a,b-12);g.lineTo(-a,inset+23);g.closePath();};
 path(0);const background=g.createLinearGradient(0,0,0,height);background.addColorStop(0,'#183047eb');background.addColorStop(1,'#091728e8');g.fillStyle=background;g.fill();
 const rim=g.createLinearGradient(-half,0,half,height);rim.addColorStop(0,'#577d9c');rim.addColorStop(.35,'#bdd3d9');rim.addColorStop(.6,'#58738c');rim.addColorStop(1,'#b9cfda');g.strokeStyle=rim;g.lineWidth=1.2;g.stroke();
 path(5);g.strokeStyle='#344b63';g.lineWidth=.65;g.stroke();
 for(const sign of [-1,1]){g.save();g.scale(sign,1);g.strokeStyle='#8ca6b8';g.lineWidth=.8;g.beginPath();g.moveTo(91,5);g.lineTo(174,5);g.lineTo(184,15);g.lineTo(198,15);g.moveTo(198,27);g.lineTo(198,42);g.stroke();g.beginPath();g.moveTo(185,11);g.lineTo(188,8);g.lineTo(191,11);g.lineTo(188,14);g.closePath();g.fillStyle='#9cb3c0';g.fill();g.restore();}
 const fit=(value:string,max:number)=>{if(g.measureText(value).width<=max)return value;const a=Array.from(value);while(a.length&&g.measureText(a.join('')+'…').width>max)a.pop();return a.join('')+'…';};
 const text=(value:string,x:number,y:number,size:number,color='#dce7eb',max=360)=>{g.font=`500 ${size}px "Yu Mincho",serif`;g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';g.fillText(fit(value,max),x,y);};
 if(o.plate)g.drawImage(o.plate,-190,9,380,380*44/342);
 text(o.name,0,33,o.mobile?28:22,'#f4f3eb',230);
 const level=o.profile?.level;const levelText=typeof level==='number'&&Number.isFinite(level)&&level>=1?String(Math.floor(level)):'—';
 text('Lv. '+levelText,-128,80,o.mobile?21:16,'#c0d4df',112);
 g.strokeStyle='#456078';g.lineWidth=.7;g.beginPath();g.moveTo(-58,68);g.lineTo(-58,92);g.stroke();
 const medal=medalName(o.medal),empty=label('勲章なし','No medal','훈장 없음');
 if(o.art.empty){g.save();g.globalAlpha=medal?1:.75;g.drawImage(o.art.empty,-33,64,32,32);g.restore();}
 text(medal||empty,89,80,o.mobile?21:15,medal?'#e8d5a6':'#a3b9c9',166);
 if(o.ranked){
   g.strokeStyle='#3d566e';g.beginPath();g.moveTo(-178,104);g.lineTo(178,104);g.stroke();
   const r=o.profile?.rating,key=r?.tier,icon=key?o.art.ranks.get(key):undefined;
   if(icon)g.drawImage(icon,-181,109,32,31);
   const rank=key?tierLabel(key):label('ランク —','Rank —','랭크 —');
   text(rank,-60,125,o.mobile?21:15,key?TIER_META[key]?.color:'#a9bccc',170);
   text(`MMR ${r&&Number.isFinite(r.mmr)?r.mmr:'—'}`,113,125,o.mobile?21:16,'#dce7eb',145);
 }
 g.restore();
}

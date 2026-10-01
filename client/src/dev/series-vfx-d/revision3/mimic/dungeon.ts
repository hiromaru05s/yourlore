import {W,H,ease} from '../material';type P=[number,number];
function path(c:CanvasRenderingContext2D,p:P[]){c.beginPath();p.forEach((v,i)=>i?c.lineTo(...v):c.moveTo(...v));c.closePath();}
const profiles:Record<string,{jaw:P[];floor:P[];tunnel:P[];root:P}>={
 DUNGEON:{jaw:[[182,185],[276,54],[510,7],[636,67],[664,159],[620,302],[559,269],[507,275],[486,159],[435,269],[391,167],[353,235],[327,149],[274,301],[219,349]],floor:[[181,541],[221,397],[243,361],[277,485],[293,421],[333,520],[350,458],[393,560],[591,492],[615,375],[649,479],[675,510]],tunnel:[[255,362],[348,262],[522,271],[617,379],[560,531],[395,562],[288,491]],root:[460,485]},
 QUICK_SURVIVAL:{jaw:[[297,150],[384,1],[504,25],[626,83],[654,204],[607,257],[580,206],[547,312],[513,244],[494,346],[465,307],[440,263],[407,205],[383,292],[365,204]],floor:[[362,729],[401,475],[427,548],[456,470],[483,386],[511,430],[534,370],[555,445],[597,326],[622,457],[668,576],[615,704]],tunnel:[[263,237],[365,142],[450,166],[502,297],[476,390],[381,408],[310,351]],root:[411,352]},
};
export function paintDungeon(canvas:HTMLCanvasElement,img:HTMLImageElement,id:string,variant:number,time:number,reduced:boolean){
 const c=canvas.getContext('2d')!,p=profiles[id],strength=reduced?.16:1,u=ease(630,1330,time)*(1-ease(1930,2790,time))*strength;if(!p||!u)return;
 if(variant===1){
  for(const [index,mask]of [p.jaw,p.floor].entries()){
   c.save();path(c,mask);c.clip();c.fillStyle='#141c19';c.globalAlpha=u;c.fillRect(0,0,W,H);c.restore();
   c.save();c.translate(p.root[0],p.root[1]);c.scale(1+u*.02,1-u*.055);c.translate(-p.root[0],-p.root[1]+u*(index?-24:35));path(c,mask);c.clip();c.drawImage(img,0,0,W,H);c.restore();
  }
 }else{
  // Rock-lined depth contracts around the illustration's existing vanishing point.
  c.save();path(c,p.tunnel);c.clip();c.fillStyle='#110f0b';c.fillRect(0,0,W,H);c.translate(...p.root);c.scale(1-u*.20,1-u*.11);c.translate(-p.root[0],-p.root[1]);c.drawImage(img,0,0,W,H);c.restore();
  c.save();path(c,p.jaw);c.clip();c.globalAlpha=u*.15;c.globalCompositeOperation='multiply';c.fillStyle='#405b55';c.fillRect(0,0,W,H);c.restore();
 }
}
const axe:P[]=[[174,142],[206,153],[321,305],[363,348],[388,369],[417,366],[443,393],[464,423],[454,449],[474,485],[431,499],[414,473],[386,467],[383,437],[346,412],[333,380],[292,326]];
const broken:P[]=[[447,532],[529,459],[596,475],[663,541],[711,625],[601,656],[522,620]];
export function paintHunter(canvas:HTMLCanvasElement,img:HTMLImageElement,variant:number,time:number,reduced:boolean){
 const c=canvas.getContext('2d')!,mask=variant===1?axe:broken,root:P=variant===1?[292,292]:[550,465];const u=ease(740,1170,time)*(1-ease(1600,2720,time))*(reduced?.15:1);if(!u)return;
 c.save();path(c,mask);c.clip();c.globalAlpha=u;c.fillStyle='#302c24';c.fillRect(0,0,W,H);c.restore();
 c.save();c.translate(...root);c.rotate(u*(variant===1?.13:-.085));c.scale(1,variant===1?1:1-u*.13);c.translate(-root[0],-root[1]);path(c,mask);c.clip();c.drawImage(img,0,0,W,H);c.restore();
}

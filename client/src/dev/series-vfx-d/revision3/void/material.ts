import {W,H,ease} from '../material';type P=[number,number];
interface Part {shape:P[];pivot:P}
interface ObjectStudy {kind:'blade'|'plates'|'growth'|'fruit'|'armor'|'cannon'|'core'|'scale'|'lens';parts:Part[];ground:string;names:[string,string]}
const part=(shape:P[],pivot:P):Part=>({shape,pivot});
export const studies:Record<string,ObjectStudy>={
 STARTER_TRASH:{kind:'blade',ground:'#393942',names:['刃が沈み、紋が残る','黒曜の刃が層になる'],parts:[part([[222,514],[306,421],[469,257],[470,212],[497,207],[529,234],[564,252],[560,318],[568,337],[530,348],[496,366],[379,440]],[525,276])]},
 CULL_FLOOD:{kind:'blade',ground:'#34313f',names:['大刃の押し込み','黒曜の層を開く'],parts:[part([[311,570],[411,331],[488,220],[560,225],[529,364],[470,508],[429,582]],[431,572])]},
 PAIN_HARVEST:{kind:'blade',ground:'#33313a',names:['欠けた刃の圧搾','刃の継ぎ目がずれる'],parts:[part([[216,73],[200,172],[235,230],[333,267],[378,261],[410,311],[455,286],[494,297],[482,357],[441,386],[399,359],[372,315],[254,291],[198,231],[165,143]],[224,188])]},
 CULL_FARM:{kind:'growth',ground:'#37353f',names:['黒曜の葉が開く','根元から葉脈が隆起'],parts:[part([[146,113],[257,180],[341,291],[414,447],[411,590],[367,490],[292,375],[211,258]],[410,594]),part([[423,543],[452,415],[563,352],[680,332],[612,396],[544,494],[464,591]],[423,609])]},
 PURGE_ALL:{kind:'plates',ground:'#656573',names:['紙面の縁を折り込む','刻印面が扇状に開く'],parts:[part([[102,394],[174,286],[269,304],[200,421]],[184,355]),part([[136,491],[210,365],[295,376],[246,505]],[215,436]),part([[190,541],[258,430],[330,437],[278,564]],[259,502])]},
 EXILE_NUKE1:{kind:'cannon',ground:'#3d3c49',names:['砲身の後退と復座','分節した外筒の排熱'],parts:[part([[157,310],[268,272],[466,180],[516,151],[560,147],[607,206],[585,283],[573,327],[529,287],[395,363],[275,402],[185,399]],[253,352])]},
 EXILE_NUKE2:{kind:'core',ground:'#343041',names:['黒曜核の圧縮','核を覆う岩板の開放'],parts:[part([[310,227],[353,182],[427,171],[490,193],[531,240],[533,310],[494,359],[430,386],[357,354],[314,311]],[421,282])]},
 FURNACE:{kind:'lens',ground:'#382c2c',names:['炉口のシャッター','搬送板の押し出し'],parts:[part([[259,263],[311,224],[394,218],[456,244],[469,360],[436,429],[274,431]],[365,371]),part([[584,397],[631,396],[662,412],[619,461],[578,451]],[624,426])]},
 PURGE_TOUCH:{kind:'plates',ground:'#b7a8a0',names:['汚れた紙面の剥離','中央の刻印を押し戻す'],parts:[part([[211,525],[327,278],[465,319],[386,574]],[335,428])]},
 SCRAPPER:{kind:'lens',ground:'#352f3d',names:['処理室の圧縮','ガラス面の分節開放'],parts:[part([[340,183],[389,167],[485,164],[537,183],[537,387],[446,399],[340,387]],[435,286])]},
 CROSSROADS:{kind:'blade',ground:'#6c6770',names:['左右の刃が傾く','刃の中心線を開く'],parts:[part([[204,316],[271,346],[316,416],[340,424],[335,449],[279,470],[237,457]],[293,444]),part([[506,426],[552,366],[638,317],[615,399],[576,451],[529,464],[504,446]],[552,443])]},
 TRIAL_AREA:{kind:'blade',ground:'#42404b',names:['刃が台座を押す','刃の結晶層が開く'],parts:[part([[367,331],[382,333],[429,324],[430,367],[407,439],[386,501],[371,434],[365,377]],[402,341])]},
 VOID_FRUIT:{kind:'fruit',ground:'#51464e',names:['果肉が脈打つ','果皮が筋に沿って開く'],parts:[part([[339,279],[391,236],[466,221],[544,242],[590,284],[612,337],[600,413],[553,467],[481,485],[461,501],[429,480],[370,446],[338,395],[329,336]],[482,247])]},
 VOID_APOSTLE:{kind:'armor',ground:'#292235',names:['肩と前腕の装甲が浮上','装甲が根元から開く'],parts:[part([[354,140],[373,137],[411,157],[441,191],[455,236],[443,255],[425,219],[414,181],[389,158],[361,151]],[365,149]),part([[267,203],[311,192],[353,201],[379,223],[395,262],[394,298],[378,313],[374,281],[356,248],[324,223],[291,217],[266,218]],[276,211]),part([[206,257],[250,260],[280,278],[322,274],[325,297],[295,313],[284,354],[279,382],[271,416],[260,353],[247,310],[229,282]],[213,264])]},
 REFRESH_HAND:{kind:'plates',ground:'#719198',names:['新しい札の縁が開く','表面の象嵌が裏返る'],parts:[part([[220,339],[298,92],[462,137],[388,383]],[343,237]),part([[526,287],[598,313],[626,466],[550,432]],[576,378])]},
 FOCUS:{kind:'plates',ground:'#3b3549',names:['選んだ札の縁を折る','三枚の面を順に開く'],parts:[part([[82,591],[154,416],[258,459],[210,645]],[172,531]),part([[331,659],[371,466],[493,486],[476,688]],[413,578]),part([[584,456],[690,417],[761,595],[649,642]],[672,528])]},
 RIFT:{kind:'lens',ground:'#29203c',names:['鏡面の厚みが変わる','鏡枠の象嵌が開く'],parts:[part([[341,117],[413,63],[490,87],[505,153],[503,505],[465,553],[368,555],[334,507]],[420,321])]},
 FREE_REWARD:{kind:'scale',ground:'#b7b3a6',names:['左右の皿が釣り合う','秤から札を押し出す'],parts:[part([[130,345],[347,345],[335,374],[288,390],[190,389],[153,372]],[240,161]),part([[484,346],[708,346],[687,372],[638,391],[554,391],[507,372]],[594,158]),part([[362,517],[464,512],[501,639],[376,650]],[431,575])]},
 ORIGIN_QUEST:{kind:'fruit',ground:'#61492b',names:['琥珀の核が脈打つ','化石の殻が開く'],parts:[part([[393,344],[414,310],[443,305],[475,322],[499,365],[500,415],[472,452],[433,456],[405,425],[390,380]],[445,375]),part([[514,211],[555,241],[603,270],[668,305],[708,371],[710,438],[676,501],[614,540],[523,550],[489,502],[534,444],[563,399],[542,351]],[526,476])]},
 Q_RIFT:{kind:'lens',ground:'#665d78',names:['観測レンズの絞り','レンズ受けが展開する'],parts:[part([[357,145],[379,128],[407,141],[428,170],[414,198],[387,211],[361,193]],[391,170]),part([[468,320],[505,371],[510,437],[461,480],[402,502],[327,512],[239,506],[142,490],[83,465],[89,440],[180,469],[326,477],[420,458],[475,417]],[287,462])]},
 SORTER:{kind:'plates',ground:'#726b80',names:['手元の札を選り分ける','選ばれた札の面が開く'],parts:[part([[180,110],[238,75],[301,248],[238,270]],[239,167]),part([[281,394],[369,369],[466,552],[384,580]],[374,475])]},
 BLACK_INFINITY:{kind:'armor',ground:'#504b63',names:['黒曜の接合部が収束','銀の留め具が開く'],parts:[part([[357,257],[390,227],[423,270],[442,316],[414,361],[385,333]],[409,294]),part([[133,199],[186,136],[261,103],[361,82],[412,105],[325,112],[231,152],[203,235],[192,294],[211,339],[259,354],[312,339],[341,332],[294,371],[244,372],[179,347],[133,291]],[244,242])]},
 STARTER_MANA:{kind:'core',ground:'#79b6c7',names:['結晶面が受け止める','金属環が閉じて守る'],parts:[part([[333,216],[369,194],[401,125],[434,159],[459,244],[488,218],[507,241],[495,291],[478,331],[488,360],[446,427],[418,471],[382,428],[336,354],[317,317],[347,291]],[415,310])]},
};
function outline(c:CanvasRenderingContext2D,points:P[]){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();}
function fragment(c:CanvasRenderingContext2D,img:HTMLImageElement,p:Part,dx:number,dy:number,angle:number,sx=1,sy=1){c.save();c.translate(p.pivot[0]+dx,p.pivot[1]+dy);c.rotate(angle);c.scale(sx,sy);c.translate(-p.pivot[0],-p.pivot[1]);outline(c,p.shape);c.clip();c.drawImage(img,0,0,W,H);c.restore();}
export function paintVoid(canvas:HTMLCanvasElement,img:HTMLImageElement,id:string,variant:number,time:number,reduced:boolean){
 const c=canvas.getContext('2d')!,s=studies[id];if(!s)return;const active=ease(570,920,time)*(1-ease(2270,2800,time)),force=reduced?.15:1;if(!active)return;
 for(const [index,p]of s.parts.entries()){
  const u=ease(680+index*80,1340+index*70,time)*(1-ease(1750+index*60,2670,time))*force;
  c.save();outline(c,p.shape);c.clip();c.fillStyle=s.ground;c.globalAlpha=active;c.fillRect(0,0,W,H);c.restore();
  c.save();c.shadowColor='#171322';c.shadowOffsetY=u*8;c.shadowBlur=u*9;
  if(id==='VOID_APOSTLE'){
   const delta=variant===1?[-44*u,-30*u,-.085*u] : [-5*u,-5*u,-.62*u];
   // A narrow physical linkage spans the original root and the shifted plate.
   c.save();c.beginPath();c.moveTo(p.pivot[0]-3,p.pivot[1]+1);c.lineTo(p.pivot[0]+delta[0]-3,p.pivot[1]+delta[1]+1);c.lineTo(p.pivot[0]+delta[0]+4,p.pivot[1]+delta[1]+7);c.lineTo(p.pivot[0]+4,p.pivot[1]+7);c.closePath();c.fillStyle='#332a3e';c.fill();c.strokeStyle='#ad9bb4';c.lineWidth=1.5;c.stroke();c.restore();
   fragment(c,img,p,delta[0],delta[1],delta[2],1,1);
   c.save();c.translate(p.pivot[0]+delta[0],p.pivot[1]+delta[1]);c.rotate(delta[2]);c.translate(-p.pivot[0],-p.pivot[1]);outline(c,p.shape);c.strokeStyle=`rgba(242,235,222,${u*.78})`;c.lineWidth=2.6;c.stroke();c.restore();
  }else if(variant===1){
   const kind=s.kind;
   if(kind==='cannon')fragment(c,img,p,-u*38,u*16,-u*.012);
   else if(kind==='blade')fragment(c,img,p,-u*8,u*22,u*(index%2?-.055:.035));
   else if(kind==='growth')fragment(c,img,p,index%2?u*9:-u*9,-u*12,u*(index%2?.085:-.085),1,1+u*.06);
   else if(kind==='fruit'||kind==='core')fragment(c,img,p,0,-u*7,0,1+u*.075,1-u*.055);
   else if(kind==='scale')fragment(c,img,p,0,u*(index%2?-21:21),0);
   else if(kind==='armor')fragment(c,img,p,(index%2?-1:1)*u*12,-u*16,u*(index%2?-.02:.02));
   else fragment(c,img,p,-u*7,-u*15,u*.035,1-u*.13,1);
  }else{
   // Separate the existing object along five bounded material laminations.
   const minX=Math.min(...p.shape.map(p=>p[0])),maxX=Math.max(...p.shape.map(p=>p[0]));
   for(let band=0;band<5;band++){const x=minX+(maxX-minX)*band/5,w=(maxX-minX)/5;const bend=u*Math.sin((band+1)*Math.PI/6);c.save();c.beginPath();c.rect(x,0,w+1,H);c.clip();fragment(c,img,p,(band-2)*bend*3,-bend*(s.kind==='cannon'?5:15),bend*(band-2)*.012,1,s.kind==='fruit'?1+bend*.04:1);c.restore();}
  }
  c.restore();
 }
}

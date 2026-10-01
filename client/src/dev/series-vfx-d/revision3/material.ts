export const W=832,H=760;
export const ease=(a:number,b:number,t:number)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
type V=[number,number];
interface Anatomy {lid:V[];front:V[];hinge:V;tongue?:V[];tongueRoot?:V}
// Hand traced on the current source illustrations, in original image pixels.
const anatomy:Record<string,Anatomy>={
 DUNGEON_FLOOR:{lid:[[177,169],[198,103],[250,89],[531,178],[579,216],[600,320],[562,373],[534,314],[446,263],[362,241],[270,205],[211,202]],front:[[124,314],[484,444],[546,423],[542,571],[372,548],[93,436]],hinge:[181,170],tongue:[[280,320],[330,308],[380,326],[434,387],[468,457],[507,494],[550,501],[554,522],[520,526],[464,511],[419,475],[381,412],[346,379],[297,361]],tongueRoot:[296,335]},
 GEM_RAIN:{lid:[[221,159],[256,100],[319,87],[625,175],[680,186],[700,238],[691,333],[648,357],[602,276],[513,250],[422,224],[321,196],[247,187]],front:[[174,331],[569,403],[659,386],[672,548],[515,579],[151,431]],hinge:[230,170],tongue:[[483,326],[433,288],[365,270],[301,287],[273,340],[236,379],[231,399],[255,412],[278,402],[316,365],[370,331],[424,338],[465,355]],tongueRoot:[470,338]},
 GREED_PRICE:{lid:[[109,319],[162,169],[197,154],[430,232],[475,273],[498,340],[474,374],[428,341],[340,313],[255,284],[204,273]],front:[[98,347],[397,427],[474,418],[467,511],[314,542],[75,446]],hinge:[115,312],tongue:[[258,345],[296,344],[330,365],[356,414],[384,455],[418,471],[419,485],[393,496],[354,472],[328,433],[305,388],[275,378]],tongueRoot:[270,358]},
 QUICK_MIMIC:{lid:[[166,169],[200,109],[249,85],[544,159],[594,190],[623,244],[617,361],[574,388],[543,304],[471,276],[396,247],[309,218],[231,194]],front:[[162,282],[534,399],[596,368],[605,513],[476,573],[136,429]],hinge:[176,174],tongue:[[455,322],[411,282],[350,277],[305,298],[282,344],[250,379],[223,383],[233,403],[260,414],[295,396],[335,357],[385,339],[430,356]],tongueRoot:[437,336]},
 MIMIC_HIDEOUT:{lid:[[325,188],[361,149],[429,115],[474,9],[493,46],[531,23],[553,64],[653,54],[692,123],[690,211],[658,233],[637,170],[600,162],[553,175],[503,185],[434,218],[374,243]],front:[[315,302],[544,265],[684,224],[697,337],[558,386],[338,375]],hinge:[336,191]},

 MIMIC:{lid:[[160,326],[201,176],[277,141],[615,273],[615,377],[550,362],[492,333],[416,312],[348,284],[255,293]],front:[[164,345],[297,396],[551,452],[562,534],[363,516],[145,458]],hinge:[180,325],tongue:[[280,332],[341,331],[416,351],[446,405],[495,448],[488,477],[448,477],[402,432],[360,390],[300,376]]},
 MIMIC2:{lid:[[204,135],[235,89],[291,64],[659,190],[694,225],[716,349],[664,343],[602,290],[526,261],[449,232],[382,210],[291,177]],front:[[189,306],[595,396],[673,365],[680,487],[491,557],[161,458]],hinge:[204,141],tongue:[[488,288],[452,265],[402,263],[297,298],[242,267],[204,226],[166,214],[118,237],[100,275],[103,304],[145,319],[126,300],[121,278],[142,252],[176,250],[213,292],[280,332],[370,316],[327,346],[263,357],[218,393],[210,427],[225,447],[229,410],[262,390],[329,391],[404,340],[504,345]],tongueRoot:[484,309]},
 MIMIC_LORD:{lid:[[231,141],[279,57],[360,72],[621,182],[655,220],[674,352],[616,360],[570,277],[467,241],[401,201],[314,184]],front:[[207,286],[590,383],[650,363],[664,522],[543,582],[135,431]],hinge:[231,146],tongue:[[478,308],[432,272],[371,257],[331,281],[313,323],[276,356],[273,382],[295,390],[344,365],[395,315],[454,334],[494,347]],tongueRoot:[477,318]},
 AWAKENED_MIMIC:{lid:[[194,141],[238,76],[291,70],[614,160],[646,201],[683,351],[626,364],[576,276],[485,237],[402,211],[331,182],[241,166]],front:[[157,286],[574,416],[650,379],[676,523],[530,571],[115,407]],hinge:[196,147],tongue:[[516,302],[429,277],[380,274],[331,303],[290,358],[226,414],[224,435],[245,439],[289,413],[342,365],[416,319],[481,359],[524,350]],tongueRoot:[511,322]},
 MIMIC_KING:{lid:[[192,174],[208,118],[261,109],[274,68],[293,111],[328,62],[341,103],[405,34],[425,66],[418,98],[466,113],[499,79],[510,109],[507,147],[550,158],[574,112],[593,149],[591,171],[621,140],[628,182],[658,212],[686,352],[645,364],[587,277],[498,245],[424,212],[341,197],[234,191]],front:[[171,293],[607,403],[658,363],[725,525],[559,596],[108,430]],hinge:[194,178],tongue:[[494,307],[451,280],[393,269],[351,281],[316,332],[276,386],[272,409],[295,415],[343,383],[388,337],[438,325],[487,348]],tongueRoot:[487,322]},
 MIMIC_KING2:{lid:[[244,109],[280,51],[347,43],[632,106],[655,138],[654,200],[674,236],[674,367],[621,406],[597,283],[464,243],[362,218],[259,221],[186,190],[206,145]],front:[[214,348],[569,408],[627,388],[651,520],[535,584],[183,465]],hinge:[197,190],tongue:[[490,324],[440,307],[366,304],[293,328],[236,291],[180,282],[130,305],[114,351],[119,396],[154,426],[203,429],[228,406],[217,377],[181,380],[162,365],[169,340],[205,330],[256,375],[317,397],[400,357],[484,362]],tongueRoot:[488,345]},
 ORIGIN_MIMIC:{lid:[[168,158],[206,99],[258,78],[618,173],[652,204],[674,333],[626,358],[586,277],[493,243],[411,218],[328,195],[217,180]],front:[[139,286],[560,420],[622,378],[659,530],[531,575],[93,438]],hinge:[170,164],tongue:[[501,309],[447,307],[393,304],[341,315],[303,360],[250,408],[226,427],[232,442],[258,439],[309,412],[364,371],[423,353],[484,374]],tongueRoot:[492,334]},
 STARTER_CHEST:{lid:[[158,239],[190,162],[277,140],[622,146],[671,177],[715,341],[706,370],[181,272]],front:[[114,354],[572,390],[576,627],[91,544]],hinge:[180,269]},
 LUCKY_CHEST:{lid:[[156,174],[200,94],[273,73],[619,174],[658,204],[677,350],[645,374],[555,300],[257,227]],front:[[153,209],[556,336],[631,382],[647,546],[516,548],[81,383]],hinge:[166,202]},
 GUILD_CHEST:{lid:[[239,376],[368,318],[615,351],[649,411],[616,479],[263,436]],front:[[263,434],[615,479],[582,588],[294,549]],hinge:[264,432]},
};
function path(c:CanvasRenderingContext2D,points:V[]){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
function piece(c:CanvasRenderingContext2D,img:HTMLImageElement,points:V[],pivot:V,dx:number,dy:number,angle:number,sy=1){c.save();c.translate(pivot[0]+dx,pivot[1]+dy);c.rotate(angle);c.scale(1,sy);c.translate(-pivot[0],-pivot[1]);path(c,points);c.clip();c.drawImage(img,0,0,W,H);c.restore();}
function hollow(c:CanvasRenderingContext2D,points:V[],amount:number){c.save();path(c,points);c.clip();const g=c.createLinearGradient(200,200,550,550);g.addColorStop(0,'#111412');g.addColorStop(.5,'#2a1510');g.addColorStop(1,'#6b3c19');c.globalAlpha=amount;c.fillStyle=g;c.fillRect(0,0,W,H);c.restore();}
function rim(c:CanvasRenderingContext2D,points:V[],amount:number){c.save();path(c,points);c.strokeStyle=`rgba(237,206,126,${amount*.7})`;c.lineWidth=2;c.stroke();c.restore();}
export function paint(canvas:HTMLCanvasElement,image:HTMLImageElement,id:string,variant:number,time:number,reduced=false){
 const c=canvas.getContext('2d')!;c.clearRect(0,0,W,H);const a=anatomy[id];if(!a)return;
 const enter=ease(420,820,time),settle=1-ease(2350,2840,time),active=enter*settle;
 if(active<=0)return;
 const tension=ease(560,980,time),snap=ease(1040,1230,time),recover=ease(1700,2220,time);
 const mouth=(tension*(1-snap*.58)+ease(1280,1630,time)*.75)*(1-recover)*active;
 const isMimic=!!a.tongue;const strength=reduced?.16:1;
 if(isMimic&&variant===1){
  // Only the lid, teeth and lower jaw are articulated; the card never splits.
  hollow(c,a.lid,active);hollow(c,a.front,mouth*.75);
  c.save();c.shadowColor='#060705';c.shadowBlur=14;c.shadowOffsetY=12;
  piece(c,image,a.lid,a.hinge,-mouth*4,-mouth*18,-mouth*.13*strength);c.restore();
  piece(c,image,a.front,[166,346],mouth*3,mouth*21*strength,mouth*.025*strength);
  rim(c,a.front,mouth*.28);
 }else if(isMimic){
  // The tongue curls from its actual painted root; jaw catches it on recoil.
  const reach=ease(690,1230,time)*(1-ease(1450,2150,time))*active*strength;
  hollow(c,a.tongue!,active);c.save();c.shadowColor='#160704';c.shadowBlur=8;c.shadowOffsetY=9;
  piece(c,image,a.tongue!,a.tongueRoot||[295,346],reach*(id==='MIMIC'?48:-48),reach*54,-reach*.13,1+reach*.32);c.restore();
  const bite=(ease(1390,1510,time)-ease(1540,1840,time))*strength;
  hollow(c,a.lid,active);piece(c,image,a.lid,a.hinge,bite*5,bite*13,bite*.055);
 }else if(variant===1){
  // The object lid is the moving surface. Its hinge follows the illustration.
  const lift=ease(670,1380,time)*(1-ease(2080,2800,time))*strength;
  hollow(c,a.lid,active);c.save();c.shadowColor='#140e08';c.shadowBlur=13;c.shadowOffsetY=10;
  piece(c,image,a.lid,a.hinge,0,-lift*52,-lift*.09,1-lift*.10);c.restore();
  const glow=ease(1080,1600,time)*(1-ease(2070,2500,time));
  c.save();path(c,a.front);c.clip();const g=c.createLinearGradient(0,360,0,560);g.addColorStop(0,`rgba(248,206,98,${glow*.30})`);g.addColorStop(1,'#d89e3500');c.fillStyle=g;c.fillRect(0,0,W,H);c.restore();
 }else{
  // A distinct opening construction: the front folds down and releases the seal.
  const unfold=ease(770,1550,time)*(1-ease(2180,2810,time))*strength;
  hollow(c,a.front,active);c.save();c.shadowColor='#160f08';c.shadowBlur=12;c.shadowOffsetY=9;
  const pivot=a.front[a.front.length-1];piece(c,image,a.front,pivot,unfold*5,unfold*17,-unfold*.055,1-unfold*.46);c.restore();
  rim(c,a.front,ease(620,1100,time)*(1-ease(1450,1900,time)));
 }
}

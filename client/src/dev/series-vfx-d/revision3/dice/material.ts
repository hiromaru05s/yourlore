import {ease,W,H} from '../material';
import {paintDice} from './painter';
type Point=[number,number];
interface PrintedDie {polygon:Point[];center:Point;ground:string;sample:Point}
// Coordinates are traced in the original 832 × 760 illustration space.
const dice:Record<string,PrintedDie[]>={
 GAMBLER:[{polygon:[[349,466],[392,447],[432,475],[427,522],[390,547],[350,518]],center:[391,498],ground:'#382724',sample:[310,548]}],
 LEGEND_GAMBLER:[{polygon:[[349,453],[387,471],[392,506],[355,535],[324,518],[325,487]],center:[357,495],ground:'#30262a',sample:[302,529]},{polygon:[[426,500],[457,524],[452,560],[415,580],[394,550],[393,523]],center:[426,541],ground:'#2e252b',sample:[470,476]},{polygon:[[487,542],[526,568],[524,600],[496,625],[458,601],[464,566]],center:[490,584],ground:'#6b3937',sample:[521,633]}],
 GAMBLE:[{polygon:[[174,477],[211,436],[255,437],[302,474],[303,528],[265,566],[220,567],[180,531]],center:[239,500],ground:'#41685d',sample:[375,534]}],
 ND3:[{polygon:[[376,311],[423,288],[468,316],[461,369],[410,392],[377,357]],center:[419,341],ground:'#343c47',sample:[506,384]}],
 FATE_WHEEL:[{polygon:[[378,243],[408,237],[448,257],[472,310],[444,344],[405,357],[372,338],[361,284]],center:[417,299],ground:'#919c9c',sample:[490,291]}],
 LUCKY_ECHO:[{polygon:[[289,254],[340,257],[406,286],[418,337],[383,410],[327,450],[279,431],[251,374],[256,312]],center:[333,355],ground:'#655340',sample:[478,351]}],
 NO_PAIN:[{polygon:[[394,340],[423,337],[455,363],[466,404],[440,433],[408,436],[378,411],[367,377]],center:[417,385],ground:'#514e46',sample:[553,375]}],
 CASINO:[{polygon:[[268,449],[302,433],[336,436],[350,458],[342,496],[319,513],[278,509],[266,484]],center:[307,473],ground:'#242c40',sample:[228,492]},{polygon:[[353,408],[383,398],[410,410],[417,441],[399,461],[365,458],[352,440]],center:[384,430],ground:'#273348',sample:[422,438]},{polygon:[[495,439],[521,422],[547,447],[567,470],[554,488],[527,514],[500,501],[474,476]],center:[520,470],ground:'#253046',sample:[591,460]}],
 Q_CHEAT:[{polygon:[[365,130],[405,127],[441,163],[431,193],[395,220],[370,198]],center:[402,174],ground:'#707b83',sample:[330,185]},{polygon:[[262,237],[295,217],[324,239],[333,276],[308,319],[267,301],[253,272]],center:[294,267],ground:'#53656b',sample:[221,264]},{polygon:[[529,341],[558,314],[602,321],[629,343],[623,376],[601,412],[552,395]],center:[581,363],ground:'#474b4d',sample:[482,390]}],
};
function polygon(c:CanvasRenderingContext2D,points:Point[]){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();}
function erase(c:CanvasRenderingContext2D,img:HTMLImageElement,d:PrintedDie,alpha:number){
 c.save();polygon(c,d.polygon);c.clip();c.globalAlpha=alpha;c.fillStyle=d.ground;c.fillRect(0,0,W,H);
 // Texture is sampled from the local painted support, never from a card frame.
 c.globalAlpha*=.40;c.drawImage(img,d.sample[0]*img.width/W,d.sample[1]*img.height/H,30*img.width/W,30*img.height/H,d.center[0]-85,d.center[1]-100,170,200);c.restore();
}
export function paintDiceMaterial(canvas:HTMLCanvasElement,img:HTMLImageElement,id:string,variant:number,time:number,rolls:number[],reduced:boolean){
 const c=canvas.getContext('2d')!;const amount=ease(520,760,time)*(1-ease(2450,2800,time));if(amount<=0)return;
 const traced=dice[id]||[];
 for(const [index,d]of traced.entries()){
  erase(c,img,d,amount);
  if(rolls.length)continue;
  const t=ease(730+index*55,1540+index*55,time)*(1-ease(1750,2290,time));const move=reduced?.14:1;
  // Summon previews articulate the printed object; there is no invented roll.
  c.save();c.translate(...d.center);const y=variant===1?-Math.sin(t*Math.PI)*58*move:0;c.translate(0,y);c.rotate((variant===1?Math.sin(t*Math.PI)*.32:(1-Math.cos(t*Math.PI))*-.16)*move);c.scale(variant===2?1-t*.35*move:1,1);c.translate(-d.center[0],-d.center[1]);polygon(c,d.polygon);c.clip();c.drawImage(img,0,0,W,H);c.restore();
 }
 if(rolls.length)paintDice(c,img,id,variant,time,rolls,reduced);
 if(id==='NO_PAIN'){
  const travel=ease(1100,1920,time),fade=1-ease(2220,2640,time);c.save();c.beginPath();c.moveTo(147,319);c.bezierCurveTo(164,383,277,382,370,387);c.bezierCurveTo(478,390,598,462,681,412);c.strokeStyle=`rgba(206,195,157,${fade*.8})`;c.lineWidth=8;c.setLineDash([30,570]);c.lineDashOffset=-travel*550;c.stroke();c.restore();
 }
}

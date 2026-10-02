import {ease} from '../material';
type Point=[number,number];
function polygon(c:CanvasRenderingContext2D,p:Point[]){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
/** One receiving-card material, constrained to the illustration's lower-right area. */
export function paintRite(c:CanvasRenderingContext2D,time:number,variant:number,edge:number,reduced=false){
 if(time<1080)return;
 if(variant===1){
  const grow=ease(1080,1400,time),open=reduced?.25:ease(1420,1830,time)*(1-ease(2200,2830,time));
  const half=3+58*open,top=151,bottom=151+258*grow;
  const spine:Point[]=[[329,top],[316,216],[337,279],[315,345],[330,409]];
  const points=spine.filter(p=>p[1]<bottom);points.push([330,bottom]);
  const widths=points.map((p,i)=>half*Math.sin(Math.PI*(p[1]-top)/258)*(i===0?0:1));
  const left=points.map(([x,y],i)=>[x-widths[i],y] as Point),right=points.map(([x,y],i)=>[x+widths[i],y] as Point);
  // The painted surface opens once, holds, and closes to one recessed seam.
  polygon(c,[...left,...[...right].reverse()]);c.fillStyle='#100e1b';c.fill();
  if(open>.015){
   polygon(c,[...left,...[...left].reverse().map(([x,y])=>[x-8-open*7,y] as Point)]);c.fillStyle='#67576f';c.fill();
   polygon(c,[...right,...[...right].reverse().map(([x,y])=>[x+6+open*5,y] as Point)]);c.fillStyle='#262031';c.fill();
  }
  c.lineJoin='bevel';c.beginPath();left.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle='#dfd9e4';c.lineWidth=edge;c.stroke();
  c.beginPath();right.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle='#8f819f';c.lineWidth=edge*.65;c.stroke();
 }else{
  const spread=ease(1120,1910,time),settle=ease(2180,2690,time),width=185*spread;
  if(width<1)return;
  // A single silver leaf unfolds from the right edge and remains inset there.
  const hinge=438,y=169+(reduced?0:10*(1-settle)),tip=hinge-width;
  const plate:Point[]=[[hinge,y],[tip+21,y+27],[tip,y+188],[hinge-16,y+245]];
  polygon(c,plate);c.save();c.shadowColor='#171223';c.shadowBlur=0;c.shadowOffsetX=-7*(1-settle);c.shadowOffsetY=7*(1-settle);c.fillStyle='#30283d';c.fill();c.restore();
  const silver=c.createLinearGradient(tip,y,hinge,y+100);silver.addColorStop(0,'#79758b');silver.addColorStop(.34,'#e0dce5');silver.addColorStop(.66,'#b8b3c5');silver.addColorStop(1,'#696377');
  c.fillStyle=silver;c.globalAlpha=.89;polygon(c,plate);c.fill();c.globalAlpha=1;
  // Broad face and narrow edge only: no extra plates or fine ornament.
  c.strokeStyle='#ebe6ef';c.lineWidth=edge; c.stroke();
  c.beginPath();c.moveTo(hinge-13,y+7);c.lineTo(hinge-27,y+232);c.strokeStyle='#514858';c.lineWidth=edge*.7;c.stroke();
 }
}

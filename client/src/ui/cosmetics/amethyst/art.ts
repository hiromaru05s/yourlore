import * as T from 'three';
import {AMETHYST_PALETTE} from '../../../shared/amethystCosmetics';
const W=384,H=600;
/** An opaque physical cut edge surrounds a moving inset. Same authored surface
 * is used by stock meshes, native draw copies and hidden opponent hand cards. */
export function sleeveArt(){
 const canvas=document.createElement('canvas');canvas.width=W*2;canvas.height=H*2;
 const c=canvas.getContext('2d')!;c.scale(2,2);const theme=AMETHYST_PALETTE;
 const mask=document.createElement('canvas');mask.width=W;mask.height=H;const m=mask.getContext('2d')!;m.fillStyle='#333';m.fillRect(0,0,W,H);m.strokeStyle='#ccc';m.lineWidth=4;m.strokeRect(23,30,338,540);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
 const finish=new T.CanvasTexture(mask);let last=NaN;
 function path(points:number[][],fill:string,stroke?:string,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function line(points:number[][],color:string|CanvasGradient,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 function rim(inset:number,color:string,width:number){c.beginPath();c.roundRect(inset,inset*1.35,W-inset*2,H-inset*2.7,35-inset*.4);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 function rune(x:number,y:number,size:number,phase:number){c.save();c.translate(x,y);c.strokeStyle=`rgba(216,205,243,${.25+.35*Math.pow(.5+.5*Math.sin(phase),4)})`;c.lineWidth=1.1;c.beginPath();c.moveTo(-size*.45,0);c.lineTo(0,-size);c.lineTo(size*.45,0);c.lineTo(0,size);c.closePath();c.moveTo(-size*.65,0);c.lineTo(size*.65,0);c.moveTo(0,-size);c.lineTo(0,size);c.stroke();c.restore();}
 function paint(t:number){if(Number.isFinite(last)&&Math.abs(t-last)<1/24)return;last=t;
  const bg=c.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#0c0c14');bg.addColorStop(.45,theme.body);bg.addColorStop(1,'#08080e');c.fillStyle=bg;c.fillRect(0,0,W,H);
  // Recessed panel with metal hatch and corner joints, all inside runtime crop.
  for(let y=55;y<550;y+=7){line([[34,y],[42,y+4]],'#645c77',.6);line([[342,y+4],[350,y]],'#645c77',.6);}
  c.save();c.beginPath();c.roundRect(46,63,292,474,14);c.clip();
   const shift=7+7*Math.sin(t*Math.PI/5),middle=[177,204,186,214,176,207,185,210,190];
   c.fillStyle='#070610';c.fillRect(48,65,288,470);
   for(const side of [-1,1])for(let j=0;j<8;j++){
    const y=72+j*58,a=middle[j]+side*shift,b=middle[j+1]+side*shift,edge=side<0?49:335;
    path([[edge,y-6],[a,y],[b,y+60],[edge,y+72]],['#47305e','#291f40','#69517e','#352544'][(j+(side>0?2:0))%4],'#847095',.8);
    path([[edge,y-6],[a,y],[edge,y+38]],side<0?'#66506f':'#211b31');
    line([[a,y],[b,y+60]],`rgba(206,167,255,${.45+.3*Math.sin(t*.6-j*.8)})`,2.5);
    line([[edge,y+7],[a+side*13,y+7],[b+side*13,y+54]],'#bca2d4',.65);
    rune(edge+(-side)*36,y+29,7,t*.6+j);
   }
   for(let j=0;j<5;j++){const y=130+j*77;line([[185,y-10],[196,y+7],[189,y+19]],'#583f83',.7);}
  c.restore();
  // The black cut + pale metal bevel survive 3% UV crop and rounded masks.
  rim(15,'#060710',12);rim(23,'#c4b9d4',6);rim(29,'#51445e',2);
  for(const y of [63,537])for(const x of [53,331]){path([[x-8,y],[x,y-9],[x+8,y],[x,y+9]],'#777086','#d3c7df',1);}
  c.textAlign='center';c.fillStyle='#d3c5df';c.font='12px Georgia';c.fillText('L O R E',192,562);
  for(const side of [-1,1])line([[192+side*51,559],[192+side*123,559]],'#9a8da6',.8);
  map.needsUpdate=true;
 }
 paint(0);
 return {canvas,map,finish,paint,dispose(){map.dispose();finish.dispose();}};
}
export function animatedSleeve(art:ReturnType<typeof sleeveArt>,_clock:{value:number}){
 return new T.MeshPhysicalMaterial({map:art.map,metalness:.38,roughness:.38,clearcoat:.6,clearcoatRoughness:.25});
}

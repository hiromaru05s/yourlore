import {begin,native,plane,line,smooth,type Surface} from './surface';
import {isolateRegion} from './regions';
import {drawArticulated} from './articulated-materials';
import {drawSecond} from './second-materials';
import {drawThird} from './third-materials';
export const firstSeries=['S02','S09','S10'];
export const duration=1700;
// Centers/limb pivots read from current card-art thumbnails; they select parts of
// the native image. No weapon, face, egg or creature is redrawn as a new asset.
const subject:Record<string,[number,number]>={HALF_ELF:[.43,.50],ELF:[.53,.50],DARK_ELF:[.52,.51],HIGH_ELF:[.48,.53],ELDER_ELF_KING:[.51,.51],ELF_HAVEN:[.52,.52],GM6_0:[.53,.61],M7:[.56,.48],GM5_3:[.55,.54],D_BLACK:[.48,.53],D_RED:[.53,.58],D_BLUE:[.48,.56],DRAGON_RIDER:[.55,.47],ANTIQUE_DK:[.5,.45],DRAGON_EGG:[.51,.56],BEAST_EGG:[.49,.58],DIVINE:[.54,.49],EGG_HUNTER:[.46,.51],EGG_MASTER:[.55,.54],INCUBATOR:[.5,.59],INCUBATOR_S:[.5,.59],ANCIENT_CIV:[.48,.60]};
function background(c:CanvasRenderingContext2D,family:string){const g=c.createLinearGradient(0,1,1,0);g.addColorStop(0,family==='S09'?'#17202b':family==='S10'?'#d3ceba':'#24372c');g.addColorStop(1,family==='S09'?'#393c44':family==='S10'?'#eeebde':'#8b936e');c.fillStyle=g;c.fillRect(0,0,1,1);}
function finish(s:Surface,c:CanvasRenderingContext2D,p:number){const a=smooth(.86,1,p);if(a){c.save();c.globalAlpha=a;native(s);c.restore();}c.restore();}
function scaleRise(s:Surface,p:number,id:string){const c=begin(s),[cx]=subject[id]||[.5,.6];native(s);isolateRegion(s,id);
 // Overlapping scale courses arrive from the spine outwards; each course keeps
 // the dragon's own painted scales/wing texture and its original hue.
 for(let row=0;row<6;row++)for(let col=0;col<4;col++){
  const x=col*.30-.09,y=row*.21-.08,delay=.04*row+.045*Math.abs(x+.15-cx),k=smooth(delay,.60+delay,p),path=new Path2D();
  path.moveTo(x,y);path.quadraticCurveTo(x+.15,y-.055,x+.30,y);path.lineTo(x+.30,y+.16);path.quadraticCurveTo(x+.15,y+.30,x,y+.16);path.closePath();
  const shift=(x+.15-cx)*.58*(1-k);plane(s,path,shift,.22*(1-k),0,1,.5+.5*k,[x+.15,y]);
  if(k>0&&k<1)line(c,path,.006,'#d7c8a1',k*(1-k)*.55);
 }
 finish(s,c,p);
}
function wings(s:Surface,p:number,id:string){const c=begin(s),[cx,cy]=subject[id]||[.5,.6];native(s);isolateRegion(s,id);
 const open=smooth(.15,.79,p),body=new Path2D(`M ${cx-.10} -.1 L ${cx+.15} -.1 L ${cx+.22} 1.1 L ${cx-.2} 1.1 Z`);plane(s,body,0,.12*(1-open),0,1,.7+.3*open,[cx,cy]);
 // Two large image-bearing membranes hinge around the native torso. Wing ribs
 // break their contour, rather than adding independent geometric particles.
 for(const side of [-1,1]){const edge=side<0?-.1:1.1,path=new Path2D();path.moveTo(cx,cy);path.lineTo(edge,-.1);path.lineTo(edge,1.1);path.lineTo(cx,.96);path.closePath();plane(s,path,0,0,side*.25*(1-open),.05+.95*open,1,[cx,cy]);
  const rib=new Path2D();rib.moveTo(cx,cy);rib.quadraticCurveTo(cx+side*.24*open,.3,edge,.13);line(c,rib,.009,'#c3b599',(1-open)*smooth(.05,.25,p)*.4);
 }
 finish(s,c,p);
}
function shell(s:Surface,p:number,id:string){const c=begin(s),[cx,cy]=subject[id]||[.5,.56];native(s);isolateRegion(s,id);const k=smooth(.09,.84,p);
 // A nacreous lamination opens along three curved seams. The native artwork is
 // revealed beneath; the egg/incubator silhouette is not replaced by a ring.
 c.save();c.beginPath();c.ellipse(cx,cy,.12+k*.63,.16+k*.75,0,0,Math.PI*2);c.clip();native(s);c.restore();
 for(let side=-1;side<=1;side+=2){const seam=new Path2D();const x=cx+side*(.02+k*.56);seam.moveTo(x,-.05);seam.bezierCurveTo(x-side*.13,.28,x+side*.16,.61,x,1.05);line(c,seam,.033*(1-k)+.002,'#716c57',smooth(0,.12,p)*(1-smooth(.76,.96,p)));line(c,seam,.012,'#fff2ca',smooth(0,.16,p)*(1-smooth(.73,.95,p)));}
 finish(s,c,p);
}
function feather(s:Surface,p:number,id:string){const c=begin(s),[cx]=subject[id]||[.5,.5];native(s);isolateRegion(s,id);
 // Broad overlapping vanes rise in a fan. Mechanical hatch support uses fitted
 // vertical shutters instead of moving a person's face as if it had wings.
 const mechanical=['INCUBATOR','INCUBATOR_S','ANCIENT_CIV','EGG_MASTER','EGG_HUNTER'].includes(id);
 for(let i=0;i<8;i++){const k=smooth(i*.037,.54+i*.033,p),x=.5+(i-3.5)*.16,path=new Path2D();
  if(mechanical){path.rect(x-.15,-.1,.32,1.2);plane(s,path,0,(i%2?1:-1)*.85*(1-k),0,1,1);}
  else{path.moveTo(cx,1.05);path.bezierCurveTo(x-.28,.57,x-.13,.03,x,-.10);path.bezierCurveTo(x+.24,.14,x+.27,.62,cx,1.05);plane(s,path,0,.32*(1-k),(i-3.5)*.16*(1-k),1,.48+.52*k,[cx,.96]);}
 }
 finish(s,c,p);
}
export function drawSummon(s:Surface,family:string,id:string,variant:number,p:number,reduced=false){
 if(reduced){const c=begin(s);background(c,family);c.globalAlpha=smooth(0,.5,p);native(s);c.restore();return;}
 if(family==='S02')drawArticulated(s,family,id,variant,p);
 else if(family==='S09')variant===1?scaleRise(s,p,id):wings(s,p,id);
 else if(family==='S10')variant===1?shell(s,p,id):feather(s,p,id);
 else if(['S03','S16','S18'].includes(family))drawSecond(s,family,id,variant,p);
 else drawThird(s,family,id,variant,p);
}

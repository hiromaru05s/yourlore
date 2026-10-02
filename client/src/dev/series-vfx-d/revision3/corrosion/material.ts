import {W,H,ease} from '../material';
type P=[number,number];
interface Organ {mask:P[];root:P;tips:P[];kind:'cap'|'blade'|'bottle'|'ground'}
const organs:Record<string,Organ>={
 RUST_SHROOM:{mask:[[190,224],[228,141],[338,84],[433,25],[581,31],[674,93],[751,193],[795,328],[738,335],[643,290],[548,261],[493,353],[410,397],[323,336],[232,287]],root:[476,530],tips:[[264,226],[407,171],[578,204],[702,281]],kind:'cap'},
 RUST_SLUG:{mask:[[145,205],[214,132],[328,83],[455,85],[544,154],[586,263],[543,300],[439,277],[333,324],[247,353],[145,305]],root:[472,529],tips:[[236,246],[377,180],[506,231]],kind:'cap'},
 POISON_MASTER:{mask:[[228,57],[263,55],[286,81],[282,105],[260,123],[232,106],[215,90]],root:[244,56],tips:[[232,95],[266,99]],kind:'bottle'},
 DECAY_CRAFT:{mask:[[247,166],[290,218],[335,302],[364,390],[409,495],[440,570],[418,621],[371,553],[305,448],[267,345],[230,266]],root:[416,599],tips:[[248,192],[288,292],[343,425]],kind:'blade'},
 ACID_RAIN:{mask:[[360,302],[435,260],[581,250],[667,322],[671,429],[591,525],[508,571],[416,572],[319,526],[326,408]],root:[455,553],tips:[[365,395],[467,325],[590,326]],kind:'blade'},
 STRONG_ACID:{mask:[[611,201],[702,160],[715,259],[704,337],[679,420],[645,502],[620,478],[641,380]],root:[642,476],tips:[[661,239],[682,293],[674,355]],kind:'blade'},
 ROTTEN_GROUND:{mask:[[225,181],[284,144],[401,114],[489,154],[509,208],[472,251],[383,271],[273,242]],root:[384,446],tips:[[279,206],[374,184],[453,224]],kind:'ground'},
 QUICK_POISON:{mask:[[372,178],[426,178],[466,210],[480,236],[458,269],[442,317],[428,309],[427,270],[390,259],[369,227]],root:[418,257],tips:[[441,331],[441,418],[435,482]],kind:'bottle'},
 Q_DECAY:{mask:[[43,504],[332,272],[381,61],[408,241],[467,357],[576,584],[519,554],[407,434],[311,396],[137,490]],root:[329,386],tips:[[376,114],[104,464],[524,533]],kind:'blade'},
};
function path(c:CanvasRenderingContext2D,p:P[]){c.beginPath();p.forEach((v,i)=>i?c.lineTo(...v):c.moveTo(...v));c.closePath();}
/** Living lamella expansion versus lifted rust rind; both remain anchored to printed anatomy. */
export function paintCorrosion(canvas:HTMLCanvasElement,img:HTMLImageElement,id:string,variant:number,time:number,reduced:boolean){
 const c=canvas.getContext('2d')!,o=organs[id];if(!o)return;const entry=ease(580,990,time),end=1-ease(2330,2810,time),u=entry*end,strength=reduced?.16:1;if(!u)return;
 c.save();path(c,o.mask);c.clip();c.fillStyle=variant===1?'#202f24':'#392920';c.globalAlpha=u*.85;c.fillRect(0,0,W,H);c.restore();
 const pivot=o.kind==='cap'?o.root:[o.root[0],o.root[1]];
 if(variant===1){
  // The source texture opens along its lamellae, not along the rectangular card.
  const tension=Math.sin(ease(700,2350,time)*Math.PI)*strength;
  for(let band=0;band<12;band++){
   c.save();c.beginPath();c.rect(0,band*H/12,W,H/12+.8);c.clip();c.translate(pivot[0],pivot[1]);c.scale(1+tension*.032,1+tension*(o.kind==='bottle'?.035:.08));c.translate(-pivot[0]+Math.sin(band*.5)*tension*4,-pivot[1]);path(c,o.mask);c.clip();c.drawImage(img,0,0,W,H);c.restore();
  }
  // Illuminate the existing lamella texture through its authored organic silhouette.
  c.save();path(c,o.mask);c.clip();c.globalCompositeOperation='screen';c.globalAlpha=u*.08;c.drawImage(img,0,0,W,H);c.restore();
 }else{
  // Five rind lamellae lift in an ordered wave and settle onto the same object.
  const minX=Math.min(...o.mask.map(p=>p[0])),maxX=Math.max(...o.mask.map(p=>p[0])),width=(maxX-minX)/5;
  for(let band=0;band<5;band++){
   const lift=ease(780+band*90,1420+band*90,time)*(1-ease(1840+band*35,2610,time))*strength;const x=minX+band*width;
   c.save();c.translate(o.root[0],o.root[1]);c.rotate(lift*(band%2?-.028:.036));c.translate(-o.root[0],-o.root[1]-lift*(o.kind==='bottle'?15:26));c.beginPath();c.rect(x,0,width+1,H);c.clip();path(c,o.mask);c.clip();c.shadowColor='#080b07';c.shadowBlur=10*lift;c.shadowOffsetY=8*lift;c.drawImage(img,0,0,W,H);c.restore();
   c.save();path(c,o.mask);c.clip();c.beginPath();c.moveTo(x,o.root[1]);c.lineTo(x+Math.sin(band)*16,Math.min(...o.mask.map(p=>p[1]))+30);c.strokeStyle=`rgba(126,70,31,${lift*.9})`;c.lineWidth=4;c.stroke();c.restore();
  }
 }
 if(o.kind==='bottle'&&id==='QUICK_POISON'){
  const t=ease(1170,2180,time),y=278+t*191;c.save();c.globalAlpha=u;c.fillStyle='#86b986';c.strokeStyle='#d5eab1';c.lineWidth=1.5;c.beginPath();c.moveTo(440,y-18);c.bezierCurveTo(416,y+13,430,y+26,440,y+28);c.bezierCurveTo(457,y+22,463,y+11,440,y-18);c.fill();c.stroke();c.restore();
 }
}

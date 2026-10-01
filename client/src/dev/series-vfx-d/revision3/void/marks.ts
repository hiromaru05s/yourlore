import {paintRite} from './rite';
import {hasPassive} from '../../../../shared/cards';
import type {Fixture} from '../fixture';import {ease} from '../material';
/** New void is a change to the receiving card surface. It never substitutes the native Rift route. */
export class VoidMarks {
 private rite=false;
 private rebirth=false;
 private targets=new Map<string,HTMLCanvasElement>();
 constructor(f:Fixture,destroySource=false){this.rite=f.source.id==='VOID_RITE';this.rebirth=f.source.id==='QUICK_REBIRTH';if(destroySource){const c=document.createElement('canvas');c.width=512;c.height=512;c.className='d3-void-mark';c.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:4;pointer-events:none';this.targets.set(f.source.uid,c);}for(const [s,p]of f.after.players.entries())for(const card of p.field){const before=f.before.players[s].field.find(c=>c.uid===card.uid);if(hasPassive(card,'void')&&(!before||!hasPassive(before,'void'))){const c=document.createElement('canvas');c.width=512;c.height=512;c.className='d3-void-mark';c.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:4;pointer-events:none';this.targets.set(card.uid,c);}}}
 draw(time:number,variant:number,find:(uid:string)=>HTMLElement|null,dark=false,reduced=false){
  const p=ease(1100,2350,time);for(const [uid,canvas]of this.targets){const art=find(uid)?.querySelector('.card-art');if(art&&canvas.parentElement!==art)art.append(canvas);const screenWidth=art?.getBoundingClientRect().width||80,edge=Math.max(3.2,.85*512/Math.max(16,screenWidth));canvas.style.filter=dark&&art?.closest('#app')?'brightness(1.35)':'';const c=canvas.getContext('2d')!;c.clearRect(0,0,512,512);if(this.rite){paintRite(c,time,variant,edge,reduced);continue;}if(this.rebirth){
    // The resurrected receiver first becomes visible at 2220ms. Keep the whole
    // surface change on that visible card, then carry the same canvas to the field.
    if(time>=2260)paintRite(c,1080+(time-2260)*1.6,variant,edge,reduced);continue;
   }if(!p)continue;
   if(variant===1){
    // Shallow, branching inlays follow one bounded fracture on the material.
    const lines=[[[348,478],[290,404],[310,327],[258,250],[272,147]],[[291,405],[216,386],[166,292]],[[308,329],[374,292],[406,211]],[[259,251],[196,210],[166,154]]];
    c.lineJoin='bevel';for(const [i,line]of lines.entries()){const q=ease(i*.14,.6+i*.12,p);if(!q)continue;const pts=line as number[][];c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let j=1;j<pts.length;j++){const t=Math.max(0,Math.min(1,q*(pts.length-1)-(j-1)));c.lineTo(pts[j-1][0]+(pts[j][0]-pts[j-1][0])*t,pts[j-1][1]+(pts[j][1]-pts[j-1][1])*t);if(t<1)break;}c.strokeStyle='#201c2cf0';c.lineWidth=Math.max(24-i*3,edge*3.2);c.stroke();c.translate(-1,-1);c.strokeStyle='#c5bfce';c.lineWidth=edge;c.stroke();c.translate(1,1);}
   }else{
    // Three distinct relief plates slide into a small mortise, not a full-card split.
    for(let i=0;i<3;i++){const q=ease(i*.16,.55+i*.15,p),x=209+i*49,y=370-i*52;if(!q)continue;c.save();c.translate((1-q)*(-18+i*6),(1-q)*20);c.beginPath();c.moveTo(x,y-64);c.lineTo(x+47,y-18);c.lineTo(x+30,y+79);c.lineTo(x-33,y+33);c.closePath();c.fillStyle='#30273edb';c.fill();c.strokeStyle='#d8cddb';c.lineWidth=edge;c.stroke();c.beginPath();c.moveTo(x,y-59);c.lineTo(x+8,y+27);c.lineTo(x-30,y+33);c.strokeStyle='#7d6d8e';c.stroke();c.restore();}
   }
  }
 }
 dispose(){for(const c of this.targets.values())c.remove();this.targets.clear();}
}

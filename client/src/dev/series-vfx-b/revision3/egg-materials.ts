import {begin,native,plane,line,smooth,type Surface} from './surface';
export function drawEgg(s:Surface,cue:string,id:string,variant:number,p:number,reduced=false){
 const c=begin(s),wait=cue==='A105',support=cue==='A107',rise=smooth(.1,.64,p),fall=smooth(.64,1,p),stress=Math.sin(Math.PI*rise)*(1-fall),pale=id==='BEAST_EGG';
 if(reduced){native(s);c.restore();return;}
 c.fillStyle=pale?'#676657':id==='DRAGON_EGG'?'#25252b':'#514b37';c.fillRect(0,0,1,1);
 // The shell's painted body is deformed around its foot; the native egg remains
 // visible beneath the fracture, including through the default destroy handoff.
 if(variant===1){
  for(let i=0;i<34;i++){const y=i/34,path=new Path2D();path.rect(-.05,y,1.1,1/34+.006);const belly=Math.sin(y*Math.PI);plane(s,path,belly*.012*stress,0,0,1+belly*stress*(wait?.028:.09),1-stress*.04,[.51,.85]);}
 }else{
  for(const side of [-1,1]){const path=new Path2D();path.moveTo(side<0?-.1:1.1,-.1);path.lineTo(.51,-.1);path.lineTo(.47,.28);path.lineTo(.55,.45);path.lineTo(.48,.62);path.lineTo(.52,1.1);path.lineTo(side<0?-.1:1.1,1.1);path.closePath();const pressure=wait?.012:support?.035:.065;plane(s,path,side*stress*pressure,-stress*.02,side*stress*.035,1,1,[.5,.86]);}
 }
 if(!wait){
  const seam=new Path2D();seam.moveTo(.51,.17);seam.lineTo(.47,.28);seam.lineTo(.55,.45);seam.lineTo(.48,.62);seam.lineTo(.52,.81);
  // Reinforcement seams close; damage seams remain until the game state changes.
  const alpha=support?Math.sin(Math.PI*rise)*(1-fall):smooth(.24,.51,p);
  line(c,seam,support?.015:.021,pale?'#34332c':'#11151b',alpha);
  line(c,seam,.005,pale?'#f3ead1':'#cfb37b',alpha*.85);
  if(variant===1&&!support){const branch=new Path2D();branch.moveTo(.55,.45);branch.lineTo(.69,.38);branch.lineTo(.75,.41);branch.moveTo(.48,.62);branch.lineTo(.34,.54);line(c,branch,.008,'#171c24',alpha);}
 }
 c.restore();
}

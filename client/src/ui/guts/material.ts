// Selected 04, frozen from the approved guts-four material study.
import {sat,smooth,pulse,CONTACT,END} from './timing';
type C=CanvasRenderingContext2D;
type P=[number,number];
const clarity=new WeakMap<C,number>();
const line=(c:C,p:P[])=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));};
function stroke(c:C,p:P[],color:string,width:number){line(c,p);c.strokeStyle=color;c.lineWidth=width*(clarity.get(c)??1);c.lineJoin='round';c.lineCap='round';c.stroke()}
function partial(p:P[],from:number,to:number):P[]{
 const lengths=p.slice(1).map((q,i)=>Math.hypot(q[0]-p[i][0],q[1]-p[i][1])),total=lengths.reduce((a,b)=>a+b,0),out:P[]=[];let d=0;
 for(let i=0;i<lengths.length;i++){const l=lengths[i],a=Math.max(d,from*total),b=Math.min(d+l,to*total);if(b>a){for(const v of [a,b]){const q=(v-d)/l;out.push([p[i][0]+(p[i+1][0]-p[i][0])*q,p[i][1]+(p[i+1][1]-p[i][1])*q])}}d+=l}return out;
}
function metal(c:C,p:P[],w:number,hot:number,steel=false){
 if(p.length<2||w<.02)return;
 stroke(c,p,'rgba(12,10,14,.8)',w+2.5);
 const g=c.createLinearGradient(20,0,172,190);
 const colors=steel?['#14282e','#65909b','#e1eff0','#31474d','#b3c5ba']:['#392115','#966331','#ffe8a4','#b57732','#ffdd8d'];
 colors.forEach((s,i)=>g.addColorStop(i/4,s));line(c,p);c.strokeStyle=g;c.lineWidth=w*(clarity.get(c)??1);c.stroke();
 c.save();c.translate(-.55,-.75);stroke(c,p,steel?'#f0fff9':'#fff2c9',Math.max(.32,w*.14));c.restore();
 if(hot>0){c.save();c.globalAlpha=hot*.8;stroke(c,p,'#fff6d4',Math.max(.5,w*.35));c.restore();}
}
function amber(c:C,t:number){
 const age=t-CONTACT,birth=smooth(0,200,age),release=smooth(580,1390,age),amount=birth*(1-release),dent=pulse(0,160,850,age);
 if(amount<=.001)return;
 // A continuously deformed sheet. Each band has a dark body, warm midtone and
 // one narrow specular edge; no full-card white veil or circular shield bubble.
 const pos=(u:number,v:number):P=>{
  const pinch=Math.sin(u*Math.PI)*Math.sin(v*Math.PI),w=pinch*dent;
  return [9+182*u+Math.sin(v*7+u*3)*w*11,35+235*v+Math.sin(u*Math.PI)*w*40-11*amount*Math.sin(v*Math.PI)];
 };
 for(let j=0;j<19;j++){
  const v=j/19,v1=(j+1)/19,front=sat(birth*1.5-v*.5),taper=amount*front;
  if(taper<.001)continue;
  const p:P[]=[];for(let i=0;i<=32;i++)p.push(pos(i/32,v));for(let i=32;i>=0;i--)p.push(pos(i/32,v1));
  const value=.5+.5*Math.sin(v*13-age*.006),g=c.createLinearGradient(10,0,190,0);g.addColorStop(0,`rgba(96,46,20,${taper*.42})`);g.addColorStop(.5,`rgba(246,180,65,${taper*(.03+.15*value)})`);g.addColorStop(1,`rgba(109,45,14,${taper*.44})`);line(c,p);c.closePath();c.fillStyle=g;c.fill();
  const curve:P[]=[];for(let i=0;i<=40;i++)curve.push(pos(i/40,v));
  if(j%3===0){c.save();c.globalAlpha=taper*.54;stroke(c,curve,'#8c491d',1.3);c.translate(-.35,-.7);stroke(c,curve,'#ffe2a1',.8);c.restore()}
 }
 // The folded rim breaks into two tapered strips and drains back into the badge.
 for(let s=0;s<2;s++){
  const p:P[]=[];const tail=release*.93;
  for(let i=0;i<=40;i++){const v=tail+(1-tail)*i/40;p.push(pos(s?1:0,v))}
  metal(c,p,(3.4+dent*2.3)*amount,pulse(70,230,600,age));
 }
 const sweep=sat((age-130)/710),rim:P[]=[];
 for(let i=0;i<=40;i++){const u=i/40;rim.push(pos(u,sat(1-sweep+.035*Math.sin(u*Math.PI))))}
 c.save();c.globalAlpha=amount*Math.sin(sweep*Math.PI);metal(c,rim,2.4,1);c.restore();
}

export function paintAmber(c:C,t:number,source:P,reduced=false,cardWidth=160){
 clarity.set(c,Math.max(1,Math.min(2.4,85/cardWidth)));
 c.clearRect(-30,-30,260,373);
 if(t<CONTACT||t>=END)return;
 if(reduced){const a=pulse(CONTACT,CONTACT+45,CONTACT+280,t);c.save();c.globalAlpha=a;metal(c,[[13,267],[13,248]],3,0);metal(c,[[187,267],[187,248]],3,0);c.restore();return;}
 const age=t-CONTACT;
 // The consumed native icon is the source, and the transfer touches the material.
 const flow=smooth(0,185,age),tail=smooth(120,340,age),route:P[]=[source,[100,277],[100,254]];
 if(flow>tail)metal(c,partial(route,tail,flow),2.2,pulse(0,55,240,age));
 c.save();c.beginPath();c.roundRect(6,30,188,247,6);c.clip();
 amber(c,t);c.restore();
 // Compact contact accent ends in 80ms, so the material is immediately clear.
 if(age<80){const a=(1-age/80)*.65;c.save();c.globalAlpha=a;stroke(c,[[87,58],[105,86],[97,108]],'#fff1ce',1.8);c.restore()}
}

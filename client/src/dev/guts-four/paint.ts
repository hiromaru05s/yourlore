import {sat,smooth,pulse,CONTACT,END,type Variant} from './catalog';
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
function bezier(a:P,b:P,d:P,e:P,q:number):P{const p=1-q;return [p*p*p*a[0]+3*p*p*q*b[0]+3*p*q*q*d[0]+q*q*q*e[0],p*p*p*a[1]+3*p*p*q*b[1]+3*p*q*q*d[1]+q*q*q*e[1]]}
const cracks:P[][]=[
 [[103,274],[96,236],[111,208],[89,180],[112,144],[98,122],[124,89],[108,60],[115,32]],
 [[111,208],[146,199],[158,175],[190,160]],[[89,180],[58,170],[65,140],[27,112],[11,105]],
 [[112,144],[143,130],[148,106],[174,91],[191,74]],[[98,122],[70,98],[67,74],[36,58]],
 [[96,236],[64,223],[42,234],[11,214]],[[124,89],[142,62],[139,38]],[[58,170],[35,185],[13,179]],
];

function gild(c:C,t:number){
 const age=t-CONTACT,open=pulse(0,75,740,age),fill=smooth(40,430,age),sink=smooth(820,1490,age);
 // The split remains on the face; the painted image itself never vanishes.
 cracks.forEach((p,i)=>{
  const reach=smooth(i*17,i*17+120,age),path=partial(p,0,reach);
  stroke(c,path,`rgba(30,15,16,${open*.84})`,(i?2.9:5.1)*open);
  const tail=sink,head=sat(fill*1.3-i*.04);if(head<=tail)return;
  metal(c,partial(p,tail,head),(i?2.0:3.7)*(1-sink*.74),pulse(0,155,630,age));
  // Small branching scratches and a thin secondary reflection, not particles.
  if(i<5){c.save();c.globalAlpha=(1-sink)*fill*.6;for(let j=1;j<p.length-1;j++){const [x,y]=p[j];stroke(c,[[x,y],[x+(j%2?5:-6),y-7]],'#d3a050',.45)}c.restore()}
 });
 // A short molten meniscus travels along the source-connected central seam.
 if(age>45&&age<580){const q=sat((age-45)/450),p=partial(cracks[0],Math.max(0,q-.11),q);c.save();c.globalAlpha=Math.sin(q*Math.PI);metal(c,p,6*(1-q*.5),.9);c.restore()}
}

function ribbon(c:C,points:P[],width:number,brightness:number){
 width*=Math.min(1.6,clarity.get(c)??1);
 if(points.length<2||width<.02)return;
 const left:P[]=[],right:P[]=[];
 for(let i=0;i<points.length;i++){const p=points[i],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],dx=next[0]-prev[0],dy=next[1]-prev[1],len=Math.hypot(dx,dy)||1,q=i/(points.length-1),w=width*(.26+.74*Math.sin(q*Math.PI)**.5);left.push([p[0]-dy/len*w/2,p[1]+dx/len*w/2]);right.unshift([p[0]+dy/len*w/2,p[1]-dx/len*w/2]);}
 c.save();c.translate(1.2,2.7);line(c,[...left,...right]);c.closePath();c.fillStyle='rgba(30,9,17,.55)';c.fill();c.restore();
 const g=c.createLinearGradient(15,90,185,180);g.addColorStop(0,'#321622');g.addColorStop(.30,'#a42d49');g.addColorStop(.49,'#f0a0a0');g.addColorStop(.57,'#af314a');g.addColorStop(.83,'#73172f');g.addColorStop(1,'#271321');
 line(c,[...left,...right]);c.closePath();c.fillStyle=g;c.fill();c.save();c.clip();
 for(let i=0;i<points.length;i+=2){const [x,y]=points[i];stroke(c,[[x-7,y-2],[x+7,y+2]],'rgba(255,202,166,.3)',.45)}c.restore();
 stroke(c,left,'#f2bc9e',.65+brightness*.4);stroke(c,right,'#360e26',.6);
}
function suture(c:C,t:number){
 const age=t-CONTACT,grow=smooth(30,280,age),taut=smooth(185,310,age),unwind=smooth(820,1430,age),strength=grow*(1-unwind),cut=pulse(0,90,600,age);
 stroke(c,[[92,65],[109,107],[88,149],[109,191],[97,241]],`rgba(34,12,24,${cut*.9})`,4*cut);
 // Six woven bridges grow from the frame, tighten with a delayed snap, and unlace.
 for(let i=0;i<6;i++){
  const local=smooth(20+i*25,190+i*25,age),withdraw=smooth(820+i*36,1160+i*42,age),reach=local*(1-withdraw),y=62+i*33,sgn=i%2?-1:1;
  const a:P=[sgn>0?8:192,y],d:P=[sgn>0?192:8,y+44],sag=(1-taut)*46*sgn;
  const pts:P[]=[];for(let j=0;j<=48;j++){const q=j/48*reach;pts.push(bezier(a,[67,y+28+sag],[136,y+15-sag],d,q))}
  ribbon(c,pts,8.5*strength*(.8+.2*Math.sin(i)),taut*(1-unwind));
  // Gold selvedge stays attached to the red cloth instead of floating sparkles.
  if(reach>.95&&strength>.1){c.save();c.globalAlpha=strength;metal(c,[[a[0],y-4],[a[0]+sgn*4,y],[a[0],y+6]],2,0);c.restore()}
 }
 // One longitudinal backbone physically joins the spent counter to the lacing.
 metal(c,partial([[100,278],[102,251],[97,214],[103,177],[98,139],[102,102],[100,59]],unwind,grow),1.2,0);
}

function plate(c:C,x:number,y:number,w:number,h:number,sgn:number,t:number){
 c.save();c.translate(x,y);c.scale(sgn,1);
 const pts:P[]=[[0,0],[w-4,0],[w,5],[w,h-5],[w-5,h],[0,h],[2,h*.64],[0,h*.5]];
 c.save();c.translate(1.6,3);line(c,pts);c.closePath();c.fillStyle='rgba(16,21,23,.64)';c.fill();c.restore();
 const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#9cb4af');g.addColorStop(.18,'#29434b');g.addColorStop(.46,'#759ca1');g.addColorStop(.50,'#dce7d9');g.addColorStop(.58,'#567a85');g.addColorStop(1,'#172b35');
 line(c,pts);c.closePath();c.fillStyle=g;c.fill();stroke(c,[[1,1],[w-5,1],[w-1,5]],'#e2ebcf',.9);stroke(c,[[w,h-5],[w-5,h],[0,h]],'#182730',1.7);
 stroke(c,[[3,5],[w-7,5],[w-5,7],[w-5,h-6]],'#314c52',.8);
 // Engraved chevrons and a narrow pressure-lit groove.
 for(let i=0;i<3;i++)stroke(c,[[5+i*3.7,10],[7+i*3.7,13],[5+i*3.7,16]],'#bfbe9a',.6);
 c.globalAlpha=.25+.75*t;stroke(c,[[2,h-4],[w-8,h-4]],'#f4c877',1.1);c.restore();
}
function temper(c:C,t:number){
 const age=t-CONTACT,retreat=smooth(680,1440,age),jam=pulse(90,245,600,age);
 for(let side=0;side<2;side++)for(let i=0;i<6;i++){
  const born=30+i*35+side*26,advance=smooth(born,born+130,age)*(1-retreat),sgn=side?-1:1,y=45+i*37;
  // Plate height and width unfold out of the existing frame; nothing teleports in.
  if(advance<.001)continue;
  const w=4+21*advance,h=30*advance;c.save();c.globalAlpha=Math.min(1,advance*4);
  plate(c,side?191:9,y,w,h,sgn,jam);c.restore();
 }
 const a=smooth(15,180,age)*(1-retreat);
 if(a>0){metal(c,[[12,35],[49,35-2*jam],[76,38],[100,35],[124,38],[151,35-2*jam],[188,35]],3.1*a,jam,true);metal(c,partial([[100,276],[50,276],[12,272],[12,35]],retreat,smooth(0,240,age)),2.5*a,jam,true);metal(c,partial([[100,276],[150,276],[188,272],[188,35]],retreat,smooth(0,240,age)),2.5*a,jam,true)}
 // Broad, low-value compression facets remain confined to both edges.
 for(let s=0;s<2;s++){c.save();c.globalAlpha=jam*.35;const x=s?184:16,dx=s?-1:1;line(c,[[x,56],[x+dx*36,90],[x+dx*14,182],[x,261]]);c.closePath();c.fillStyle='#456770';c.fill();c.restore()}
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

export function paintMaterial(c:C,variant:Variant,t:number,source:P,reduced=false,cardWidth=160){
 clarity.set(c,Math.max(1,Math.min(2.4,85/cardWidth)));
 c.clearRect(-30,-30,260,373);
 if(t<CONTACT||t>=END)return;
 if(reduced){const a=pulse(CONTACT,CONTACT+45,CONTACT+280,t);c.save();c.globalAlpha=a;metal(c,[[13,267],[13,248]],3,0);metal(c,[[187,267],[187,248]],3,0);c.restore();return;}
 const age=t-CONTACT;
 // The consumed native icon is the source, and the transfer touches the material.
 const flow=smooth(0,185,age),tail=smooth(120,340,age),route:P[]=[source,[100,277],[100,254]];
 if(flow>tail)metal(c,partial(route,tail,flow),2.2,pulse(0,55,240,age));
 c.save();c.beginPath();c.roundRect(6,30,188,247,6);c.clip();
 [gild,suture,temper,amber][variant](c,t);c.restore();
 // Compact contact accent ends in 80ms, so the material is immediately clear.
 if(age<80){const a=(1-age/80)*.65;c.save();c.globalAlpha=a;stroke(c,[[87,58],[105,86],[97,108]],'#fff1ce',1.8);c.restore()}
}

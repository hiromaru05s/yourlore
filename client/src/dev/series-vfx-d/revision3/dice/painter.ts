type P=[number,number];type V=[number,number,number];
const smooth=(a:number,b:number,t:number)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
const vertices:V[]=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
const faces=[[4,5,6,7],[0,3,2,1],[0,4,7,3],[1,2,6,5],[0,1,5,4],[3,7,6,2]];
const pips:Record<number,P[]>={1:[[.5,.5]],2:[[.28,.28],[.72,.72]],3:[[.28,.28],[.5,.5],[.72,.72]],4:[[.28,.28],[.72,.28],[.28,.72],[.72,.72]],5:[[.28,.28],[.72,.28],[.5,.5],[.28,.72],[.72,.72]],6:[[.28,.25],[.72,.25],[.28,.5],[.72,.5],[.28,.75],[.72,.75]]};
function mix(q:P[],u:number,v:number):P{return [q[0][0]*(1-u)*(1-v)+q[1][0]*u*(1-v)+q[2][0]*u*v+q[3][0]*(1-u)*v,q[0][1]*(1-u)*(1-v)+q[1][1]*u*(1-v)+q[2][1]*u*v+q[3][1]*(1-u)*v];}
function polygon(c:CanvasRenderingContext2D,p:P[]){c.beginPath();p.forEach((v,i)=>i?c.lineTo(...v):c.moveTo(...v));c.closePath();}
function face(c:CanvasRenderingContext2D,q:P[],number:number,light:number){
 polygon(c,q);const g=c.createLinearGradient(q[0][0],q[0][1],q[2][0],q[2][1]);g.addColorStop(0,`rgb(${225*light},${209*light},${176*light})`);g.addColorStop(1,`rgb(${184*light},${158*light},${112*light})`);c.fillStyle=g;c.fill();c.strokeStyle='#57492e';c.lineWidth=2;c.stroke();
 const inner=[mix(q,.055,.055),mix(q,.945,.055),mix(q,.945,.945),mix(q,.055,.945)];polygon(c,inner);c.strokeStyle='#f3e2b98c';c.lineWidth=1.2;c.stroke();
 for(const [u,v]of pips[number]||[[.5,.5]]){const p=mix(q,u,v);const r=Math.hypot(q[0][0]-q[1][0],q[0][1]-q[1][1])*.058;c.beginPath();c.moveTo(p[0],p[1]-r*1.5);c.lineTo(p[0]+r*.4,p[1]-r*.35);c.lineTo(p[0]+r,p[1]);c.lineTo(p[0]+r*.35,p[1]+r*.4);c.lineTo(p[0],p[1]+r*1.5);c.lineTo(p[0]-r*.35,p[1]+r*.4);c.lineTo(p[0]-r,p[1]);c.lineTo(p[0]-r*.4,p[1]-r*.35);c.closePath();c.fillStyle='#594229';c.fill();c.strokeStyle='#ac8854';c.lineWidth=.8;c.stroke();}
}
function cube(c:CanvasRenderingContext2D,x:number,y:number,size:number,pitch:number,yaw:number,result:number){
 const ca=Math.cos(yaw),sa=Math.sin(yaw),cb=Math.cos(pitch),sb=Math.sin(pitch);const v=vertices.map(([x,y,z])=>{const xx=x*ca+z*sa,zz=-x*sa+z*ca;return [xx,y*cb-zz*sb,y*sb+zz*cb]as V;});
 const visible=faces.map((f,i)=>({i,depth:f.reduce((s,j)=>s+v[j][2],0)/4,p:f.map(j=>[x+v[j][0]*size,y+v[j][1]*size]as P)})).filter(f=>(f.p[1][0]-f.p[0][0])*(f.p[2][1]-f.p[0][1])-(f.p[1][1]-f.p[0][1])*(f.p[2][0]-f.p[0][0])>0).sort((a,b)=>a.depth-b.depth);
 for(const f of visible)face(c,f.p,f.i===0?result:((result+f.i)%6)+1,.70+(f.depth+1)*.15);
}
const anchors:Record<string,P>={GAMBLER:[391,556],LEGEND_GAMBLER:[424,597],CASINO:[416,521],GAMBLE:[416,480],ND3:[419,399],FATE_WHEEL:[417,357],LUCKY_ECHO:[333,413],NO_PAIN:[417,443],Q_CHEAT:[416,370]};
/** Bone cube toss versus hinged inlay unfolding. Outcome data is supplied by reduce. */
export function paintDice(c:CanvasRenderingContext2D,_img:HTMLImageElement,id:string,variant:number,time:number,rolls:number[],reduced:boolean){
 const a=anchors[id]||[416,465],enter=smooth(520,840,time),leave=1-smooth(2400,2800,time);if(!enter||!leave)return;
 if(!rolls.length)return;const data=rolls.slice(0,10);const count=data.length,columns=Math.min(5,count),size=count>4?29:count>1?42:58;
 c.save();c.globalAlpha=enter*leave;
 for(let i=0;i<count;i++){
  const x=a[0]+(i%columns-(columns-1)/2)*(size*2.6),y=a[1]+Math.floor(i/columns)*(size*2.5);
  const land=smooth(860+i*30,1850+i*30,time);const flight=reduced?0:Math.abs(Math.sin(land*Math.PI*3))*Math.pow(1-land,1.6)*80;
  c.save();c.translate(x,y);c.scale(1,.28);c.beginPath();c.ellipse(0,0,size*(1.1-flight/300),size,0,0,Math.PI*2);c.fillStyle=`rgba(12,9,5,${.28*(1-flight/150)})`;c.fill();c.restore();
  if(variant===1){const spin=reduced?0:(1-land)*Math.PI*3.7;cube(c,x,y-size-flight,size,.26+spin,.38+spin*.71,data[i]);}
  else{
   const fold=smooth(690+i*25,1470+i*25,time),recoil=reduced?0:Math.sin(fold*Math.PI)*18;
   if(fold<.99){for(let f=0;f<3;f++){const offset=(f-1)*size*2*(1-fold),squeeze=Math.max(.12,Math.cos(fold*Math.PI*.44));const px=x+offset,py=y-size-recoil-(f===1?fold*size:0);face(c,[[px-size*squeeze,py-size],[px+size*squeeze,py-size],[px+size*squeeze,py+size],[px-size*squeeze,py+size]],f===1?data[i]:((data[i]+f)%6)+1,.82+f*.055);}}
   if(fold>.72){c.save();c.globalAlpha*=smooth(.72,.99,fold);cube(c,x,y-size,size,.26,.38,data[i]);c.restore();}
  }
 }
 // A fine etched material seam connects the revealed die to its card illustration.
 c.strokeStyle='#d5b575';c.lineWidth=1.2;c.globalAlpha*=.35;for(let i=0;i<3;i++){c.beginPath();c.moveTo(a[0]-65+i*12,a[1]+size);c.lineTo(a[0]+62-i*9,a[1]+size+9);c.stroke();}
 c.restore();
}

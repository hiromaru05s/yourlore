// Approved 01「黄光の一閃」, frozen from the 2026-10-14 comparison.
export const HIT=1750;
export const END=HIT+720;
export type Anchor={x:number;y:number;w:number;h:number};
export type Layout={summon:Anchor;source:Anchor;target:Anchor;grave:Anchor;name:string};
type P={x:number;y:number};type C=CanvasRenderingContext2D;
const clamp=(n:number)=>Math.max(0,Math.min(1,n)),mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const smooth=(a:number,b:number,t:number)=>{const p=clamp((t-a)/(b-a));return p*p*(3-2*p);};
function path(c:C,pts:P[],close=false){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));if(close)c.closePath();}
function line(c:C,pts:P[],color:string,width:number){path(c,pts);c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke();}
function poly(c:C,pts:P[],fill:string,stroke?:string){path(c,pts,true);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.8;c.stroke();}}
function rune(c:C,x:number,y:number,s:number,angle:number,color='#fbe2a5'){c.save();c.translate(x,y);c.rotate(angle);line(c,[{x:-s*.5,y:0},{x:0,y:-s*.65},{x:s*.5,y:0},{x:0,y:s*.65},{x:0,y:-s*.9}],color,Math.max(.6,s*.1));line(c,[{x:-s*.34,y:s*.45},{x:s*.34,y:s*.45}],color,Math.max(.6,s*.08));c.restore();}
function label(c:C,p:P,text:string,light:boolean,size=11){c.font=`500 ${size}px "Hiragino Sans",sans-serif`;c.textAlign='center';c.fillStyle=light?'#574b36':'#d8cfbb';c.fillText(text,p.x,p.y);}
function curve(a:P,b:P,bend:number,t:number):P{const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;return{x:mix(a.x,b.x,t)-dy/len*Math.sin(t*Math.PI)*bend,y:mix(a.y,b.y,t)+dx/len*Math.sin(t*Math.PI)*bend};}
/** Perceptual light: broad low-energy spill, a narrow yellow envelope, a white-hot core.
 * No solid shadow or outline: every layer shares the very same trajectory. */
function lightStroke(c:C,pts:P[],width:number,alpha=1,core=true){
 if(pts.length<2||alpha<=0||width<=0)return;c.save();
 const a=pts[0],b=pts[pts.length-1];
 for(const [size,opacity,color] of [[9,.035,'255,188,0'],[5,.065,'255,199,0'],[2.8,.13,'255,211,15'],[1.5,.32,'255,220,38'],[.7,.92,'255,239,134']] as const){
 const g=c.createLinearGradient(a.x,a.y,b.x+.001,b.y);g.addColorStop(0,`rgba(${color},${opacity*alpha*.06})`);g.addColorStop(.3,`rgba(${color},${opacity*alpha*.55})`);g.addColorStop(1,`rgba(${color},${opacity*alpha})`);path(c,pts);c.lineCap='round';c.lineJoin='round';c.lineWidth=width*size;c.strokeStyle=g;c.stroke();
 }
 if(core){const g=c.createLinearGradient(a.x,a.y,b.x+.001,b.y);g.addColorStop(0,'#fff7b800');g.addColorStop(.35,`rgba(255,251,215,${alpha*.6})`);g.addColorStop(1,`rgba(255,255,241,${alpha})`);path(c,pts);c.lineWidth=Math.max(.45,width*.24);c.strokeStyle=g;c.stroke();}c.restore();
}
function opticalHead(c:C,p:P,w:number,energy:number){if(energy<=0)return;c.save();const g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,w);g.addColorStop(0,`rgba(255,255,236,${energy})`);g.addColorStop(.09,`rgba(255,252,189,${energy})`);g.addColorStop(.23,`rgba(255,226,45,${energy*.6})`);g.addColorStop(.52,`rgba(255,197,0,${energy*.12})`);g.addColorStop(1,'#ffc30000');c.fillStyle=g;c.fillRect(p.x-w,p.y-w,w*2,w*2);c.restore();}
function samples(fn:(u:number)=>P,start:number,end:number,n=48){return Array.from({length:n+1},(_,i)=>fn(mix(start,end,i/n)));}
function sourceSurface(c:C,a:Anchor,t:number){const v=smooth(580,850,t)*(1-smooth(2050,2530,t));if(v<=0)return;c.save();c.globalAlpha=v;c.beginPath();c.roundRect(a.x-a.w*.47,a.y-a.h*.47,a.w*.94,a.h*.94,3);c.clip();
 // The engraved structure radiates inward to the emission point, keeping the art visible.
 for(let i=0;i<5;i++){const x=a.x+(i-2)*a.w*.16,y=a.y+a.h*.41;const p=smooth(600+i*35,1040+i*20,t);const end={x:a.x,y:a.y-a.h*.04};lightStroke(c,samples(u=>curve({x,y},end,(i-2)*a.w*.09,u),0,p,16),Math.max(.7,a.w*.011),.65);}
 opticalHead(c,a,a.w*.55,.48);c.restore();
}
function signal(c:C,l:Layout,a:Anchor,t:number){const m=l.summon,p=smooth(420,820,t),tail=smooth(750,1020,t);if(p>tail){lightStroke(c,samples(u=>curve(m,a,m.w*.15,u),tail,p,32),Math.max(.9,m.w*.018),.85);opticalHead(c,curve(m,a,m.w*.15,p),m.w*.15,.6);}
 sourceSurface(c,a,t);const q=smooth(820,970,t)*(1-smooth(1100,1240,t));if(q>0){c.save();c.globalAlpha=q;rune(c,a.x,a.y,a.w*.24,0,'#fff0a0');c.restore();}
 if(t>=740&&t<HIT+200){c.save();c.globalAlpha=smooth(740,880,t)*(1-smooth(HIT,HIT+200,t));c.font='500 11px sans-serif';const tw=c.measureText(l.name).width;c.fillStyle='#25231eee';c.beginPath();c.roundRect(a.x-tw/2-7,a.y-a.h*.6-22,tw+14,20,3);c.fill();label(c,{x:a.x,y:a.y-a.h*.6-8},l.name,false,11);c.restore();}
}
function outgoing(c:C,a:Anchor,b:Anchor,t:number,brand:boolean){
 const hit=HIT,end=brand?hit:hit-70,dst=brand?b:{x:b.x-b.w*.5,y:b.y+b.h*.5};
 const p=clamp((t-1140)/(end-1140)),fade=1-smooth(hit+45,hit+320,t),tail=smooth(hit-10,hit+300,t);
 if(p<=tail||fade<=0)return;
 const route=(u:number)=>curve(a,dst,-b.w*.45,u);
 lightStroke(c,samples(route,tail,p),b.w*.03,fade);
 const q=route(p),prev=route(Math.max(0,p-.01));c.save();c.translate(q.x,q.y);c.rotate(Math.atan2(q.y-prev.y,q.x-prev.x));c.scale(1.6,.58);opticalHead(c,{x:0,y:0},b.w*.15,fade*.85);c.restore();
 opticalHead(c,a,a.w*.6,smooth(1140,1230,t)*(1-smooth(hit-30,hit+150,t))*.35);
}
function cutStroke(c:C,b:Anchor,t:number,hit:number){
 if(t<hit-70||t>hit+160)return;const p=smooth(hit-70,hit,t),fade=1-smooth(hit+12,hit+90,t),a={x:b.x-b.w*.5,y:b.y+b.h*.5};const dst={x:b.x+b.w*.5,y:b.y-b.h*.5};
 lightStroke(c,[a,{x:mix(a.x,dst.x,p),y:mix(a.y,dst.y,p)}],b.w*.036,fade);
 if(t<hit+65)opticalHead(c,{x:mix(a.x,dst.x,p),y:mix(a.y,dst.y,p)},b.w*.3,fade*.9);
 // The continuing slash leaves the same cut, then rapidly contracts to the severed edge.
 if(t>=hit){const q=smooth(hit,hit+65,t),f=1-smooth(hit+40,hit+160,t);lightStroke(c,[dst,{x:dst.x+b.w*.22*q,y:dst.y-b.h*.22*q}],b.w*.018,f);}
}
type V3=P&{z:number};
function affine(c:C,s:P[],d:P[]){const [a,b,e]=s,[u,v,w]=d;const det=(b.x-a.x)*(e.y-a.y)-(b.y-a.y)*(e.x-a.x);if(Math.abs(det)<.001)return;const aa=((v.x-u.x)*(e.y-a.y)-(w.x-u.x)*(b.y-a.y))/det,bb=((v.y-u.y)*(e.y-a.y)-(w.y-u.y)*(b.y-a.y))/det,cc=((w.x-u.x)*(b.x-a.x)-(v.x-u.x)*(e.x-a.x))/det,dd=((w.y-u.y)*(b.x-a.x)-(v.y-u.y)*(e.x-a.x))/det;c.transform(aa,bb,cc,dd,u.x-aa*a.x-cc*a.y,u.y-bb*a.x-dd*a.y);}
/** Two rigid, textured card halves. Their face, edge extrusion and shadow share a 3D transform. */
function fragments(c:C,b:Anchor,g:Anchor,face:CanvasImageSource|undefined,t:number,hit:number){
 if(!face||t<hit||t>=hit+720)return;const age=t-hit,motion=smooth(0,410,age),travel=smooth(300,720,age),alpha=1-smooth(620,720,age),scale=1-smooth(420,720,age)*.92;
 const halves=[[{x:-b.w/2,y:-b.h/2},{x:b.w/2,y:-b.h/2},{x:-b.w/2,y:b.h/2}],[{x:b.w/2,y:-b.h/2},{x:b.w/2,y:b.h/2},{x:-b.w/2,y:b.h/2}]];
 for(let i=0;i<2;i++){
  const sign=i?1:-1,src=halves[i],cx=src.reduce((s,p)=>s+p.x,0)/3,cy=src.reduce((s,p)=>s+p.y,0)/3;
  const rx=sign*motion*.28,ry=sign*motion*.35,rz=sign*motion*.085;
  const slip=motion*b.w*.17,dx=sign*slip*.83,dy=sign*slip*.56,lift=Math.sin(motion*Math.PI*.8)*b.w*(i?.13:.2);
  function world(q:P,z=0):V3{const x=q.x-cx,y=q.y-cy;const y1=y*Math.cos(rx)-z*Math.sin(rx),z1=y*Math.sin(rx)+z*Math.cos(rx);const x2=x*Math.cos(ry)+z1*Math.sin(ry),z2=-x*Math.sin(ry)+z1*Math.cos(ry);return{x:(x2*Math.cos(rz)-y1*Math.sin(rz)+cx+dx)*scale,y:(x2*Math.sin(rz)+y1*Math.cos(rz)+cy+dy)*scale,z:(z2+lift)*scale};}
  function project(q:V3):P{const f=b.w*5/(b.w*5-q.z);return{x:mix(b.x,g.x,travel)+q.x*f,y:mix(b.y,g.y,travel)+q.y*f-q.z*.24};}
  const xyz=src.map(q=>world(q)),top=xyz.map(project),bottom=src.map(q=>project(world(q,-Math.max(.8,b.w*.018))));
  c.save();c.globalAlpha=alpha;
  // Ground shadow becomes softer and separates in proportion to actual lift.
  const shadow=xyz.map(q=>({x:mix(b.x,g.x,travel)+q.x+q.z*.25,y:mix(b.y,g.y,travel)+q.y+q.z*.32+3}));
  c.save();c.globalAlpha*=.23*(1-travel);c.shadowColor='#171c20';c.shadowBlur=3+lift*.24;c.fillStyle='#20272b';path(c,shadow,true);c.fill();c.restore();
  for(let e=0;e<3;e++){const n=(e+1)%3;poly(c,[bottom[e],bottom[n],top[n],top[e]],e===(i?2:1)?'#bba979':'#413b31');}
  c.save();path(c,top,true);c.clip();affine(c,src,top);c.drawImage(face,-b.w/2,-b.h/2,b.w,b.h);c.restore();
  c.save();path(c,top,true);c.clip();const shade=c.createLinearGradient(top[0].x,top[0].y,top[2].x+1,top[2].y);shade.addColorStop(0,`rgba(255,248,207,${motion*(i?.08:.25)})`);shade.addColorStop(.4,'rgba(0,0,0,0)');shade.addColorStop(1,`rgba(19,24,28,${motion*(i?.42:.19)})`);c.fillStyle=shade;c.fillRect(b.x-b.w*2-travel*Math.abs(g.x-b.x),b.y-b.h*2-travel*Math.abs(g.y-b.y),b.w*4+travel*Math.abs(g.x-b.x)*2,b.h*4+travel*Math.abs(g.y-b.y)*2);c.restore();
  const edge=i?[top[2],top[0]]:[top[1],top[2]],edgeBottom=i?[bottom[2],bottom[0]]:[bottom[1],bottom[2]];
  poly(c,[edge[0],edge[1],edgeBottom[1],edgeBottom[0]],'#cfc4a7');line(c,edge,'#f3e8c7',Math.max(.5,b.w*.005)*scale);
  // Heat is restricted to the freshly severed edge, cooling while the face stays legible.
  lightStroke(c,edge,b.w*.014*scale,(1-smooth(40,300,age))*.8);
  // Sparse striations reveal card stock thickness, all attached to the cut edge.
  for(let k=1;k<12;k++){const u=k/12;line(c,[{x:mix(edge[0].x,edge[1].x,u),y:mix(edge[0].y,edge[1].y,u)},{x:mix(edgeBottom[0].x,edgeBottom[1].x,u),y:mix(edgeBottom[0].y,edgeBottom[1].y,u)}],'#71634c88',.45);}
  c.restore();
 }
 // No free-floating replacement geometry or decorative particle cloud.

}

export function renderGolden(c:C,ms:number,l:Layout,face:CanvasImageSource|undefined,outcome:'destroy'|'brand'|'blocked',reduced=false){
 const a=l.source,b=l.target;
 if(reduced){if(ms<HIT+200){sourceSurface(c,a,1000);if(ms>=HIT)rune(c,b.x,b.y,b.w*.2,0,'#d3a52e');}return;}
 signal(c,l,a,ms);
 if(ms<1080)return;
 if(outcome==='brand'){
  const compact={...b,w:Math.min(b.w,a.w)*.6,h:Math.min(b.h,a.h)*.6};outgoing(c,a,compact,ms,true);
  if(ms>=HIT){const p=smooth(HIT,HIT+420,ms),alpha=1-smooth(HIT+400,HIT+720,ms);c.save();c.globalAlpha=alpha;opticalHead(c,b,b.w*.34,.24*alpha);rune(c,b.x,b.y,b.w*(.23-.1*p),0,'#d3a52e');c.restore();}
 }else{
  outgoing(c,a,b,ms,outcome==='blocked');
  if(outcome==='destroy'){fragments(c,b,l.grave,face,ms,HIT);cutStroke(c,b,ms,HIT);}
 }
}

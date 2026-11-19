/** Approved result renderer: one clock owns material, illumination and inscription. */
export type VictoryStyle=1|2|3;
export type ResultOutcome='victory'|'defeat'|'draw';
export const VICTORY_LENGTH=7400;
const clamp=(x:number)=>Math.min(1,Math.max(0,x));
const smooth=(a:number,b:number,t:number)=>{const p=clamp((t-a)/(b-a));return p*p*(3-2*p);};
type Point={x:number;y:number};
type Ribbon={top:Point[];bottom:Point[];outline:Path2D};

function shape(w:number,h:number,time:number,kind:VictoryStyle,layer=0):Ribbon{
 const top:Point[]=[],bottom:Point[]=[];const outline=new Path2D();
 for(let i=0;i<=100;i++){
  const u=i/100,env=Math.pow(Math.sin(Math.PI*u),kind===3?.65:1.1);
  const axis=kind===2?Math.sin(u*Math.PI*1.4+time*.4+layer*.5)*h*.85-u*h*.65:Math.sin(u*6+time*.5+layer)*h*.3;
  const fold=Math.sin(u*(kind===3?19:7)+time*.65+layer*1.7)*h*(kind===3?.13:.16);
  const thickness=h*env*(kind===2?.5:.6)*(1+.15*Math.sin(u*13+layer));
  top.push({x:(u-.5)*w,y:axis+fold-thickness});bottom.push({x:(u-.5)*w,y:axis+fold+thickness});
 }
 outline.moveTo(top[0].x,top[0].y);top.slice(1).forEach(p=>outline.lineTo(p.x,p.y));[...bottom].reverse().forEach(p=>outline.lineTo(p.x,p.y));outline.closePath();return {top,bottom,outline};
}
function edge(c:CanvasRenderingContext2D,points:Point[],color:string|CanvasGradient,width:number){
 c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.stroke();
}
function sheet(c:CanvasRenderingContext2D,w:number,h:number,time:number,kind:VictoryStyle,opacity:number,layer=0,warm=false){
 const s=shape(w,h,time,kind,layer);c.save();c.globalAlpha=opacity;
 const g=c.createLinearGradient(-w*.4,-h,w*.3,h);
 if(warm){g.addColorStop(0,'#fff5c9');g.addColorStop(.2,'#f2d59d');g.addColorStop(.46,'#b49462');g.addColorStop(.68,'#5c5760');g.addColorStop(1,'#c7ac75');}
 else if(kind===3){g.addColorStop(0,'#b3c4d4');g.addColorStop(.14,'#526788');g.addColorStop(.45,'#142640');g.addColorStop(.72,'#0d1d34');g.addColorStop(1,'#30425b');}
 else {g.addColorStop(0,'#e4e4d4');g.addColorStop(.16,'#b4cedb');g.addColorStop(.38,'#7092b3');g.addColorStop(.65,'#344d6d');g.addColorStop(1,'#92aabe');}
 c.fillStyle=g;c.fill(s.outline);
 // Ink is clipped to the moving surface, so it follows the page instead of floating.
 c.save();c.clip(s.outline);
 if(kind===2){
  for(let k=0;k<4;k++){
   c.beginPath();c.moveTo(-w*.5,h);
   for(let i=0;i<=80;i++){const u=i/80;const y=h*(.2+k*.1)-Math.abs(Math.sin(u*9+k*.7)*Math.sin(u*19+k))*h*.38;c.lineTo((u-.5)*w,y);}
   c.lineTo(w*.5,h*2);c.lineTo(-w*.5,h*2);c.closePath();c.fillStyle=`rgba(16,38,63,${.10+k*.025})`;c.fill();
  }
 }
 for(let n=0;n<(kind===3?5:8);n++){
  c.beginPath();const y=(n-3)*h*.12;c.moveTo(-w*.4,y);
  c.bezierCurveTo(-w*.2,y-h*.32,w*.05,y+h*.3,w*.3,y-h*.16);
  c.strokeStyle=kind===2?'#e6e3cc33':'#bacbdd17';c.lineWidth=.65;c.stroke();
 }
 c.restore();
 const rim=c.createLinearGradient(-w*.5,0,w*.5,0);rim.addColorStop(0,'#f3f2d900');rim.addColorStop(.1,warm?'#fff5c9dc':'#e8ecdfbd');rim.addColorStop(.32,warm?'#f5cf8eaa':'#a9c6d388');rim.addColorStop(.6,'#819cbf20');rim.addColorStop(1,'#e7eee000');
 c.globalAlpha=Math.min(1,opacity*1.8);c.shadowColor='#d7e7ee';c.shadowBlur=kind===2?2:0;edge(c,s.top,rim,1.1);c.shadowBlur=0;edge(c,s.bottom,'#c8d8e355',.7);c.restore();
}
function victoryMantle(c:CanvasRenderingContext2D,width:number,unit:number,t:number){
 const fade=smooth(.3,1.05,t),open=smooth(.85,1.55,t),release=smooth(1.85,3.65,t);
 const strength=fade*(1-release),breadth=width*.68*(.94+.38*open+.08*release);
 if(strength<.001)return;
 for(let layer=0;layer<4;layer++){
  c.save();c.rotate((layer%2?1:-1)*(.025+.085*open)*(1-release*.5));
  const wide=breadth*(1-layer*.075),thick=(8+layer*5)*unit*(.45+open*.95)*(1-release*.93);
  const surface=shape(wide,thick,t*.65,1,layer+2);
  sheet(c,wide,thick,t*.65,1,strength*(.10-layer*.0125),layer+2,true);
  c.save();c.clip(surface.outline);
  // Light travels within each folded silver face, exposing its curved surface lines.
  const sweep=(-.7+smooth(.85,2.25,t)*1.4)*wide;
  const shine=c.createLinearGradient(sweep-wide*.19,0,sweep+wide*.19,0);
  shine.addColorStop(0,'#f8bd6d00');shine.addColorStop(.42,'#ffdc9666');shine.addColorStop(.52,'#fff9dfcc');shine.addColorStop(1,'#f8bd6d00');
  c.globalAlpha=strength*.21;c.fillStyle=shine;c.fillRect(-wide*.5,-thick*3,wide,thick*6);
  c.restore();
  const rim=c.createLinearGradient(-wide*.5,0,wide*.5,0);
  rim.addColorStop(0,'#ffdc9600');rim.addColorStop(.2,'#f5ca7caa');rim.addColorStop(.46,'#fff8dc');rim.addColorStop(.57,'#fff2c5dd');rim.addColorStop(.83,'#d9ad6555');rim.addColorStop(1,'#d9ad6500');
  c.globalAlpha=strength*(.26-layer*.04);c.shadowColor='#f8bd6d';c.shadowBlur=8*unit;
  edge(c,layer%2?surface.bottom:surface.top,rim,(layer===0?1.9:1.1)*unit);
  c.restore();
 }
}

/** Warm diffraction vocabulary from adopted clickBurst.ts, tied to the unfolding material. */
function victoryLight(c:CanvasRenderingContext2D,width:number,unit:number,t:number){
 const p=clamp((t-.85)/1.85),flight=1-Math.pow(1-p,3),hot=smooth(1.1,1.44,t)*(1-smooth(1.52,2.35,t));
 if(p<=0||p>=1)return;
 c.save();c.globalCompositeOperation='screen';
 // Short bright heart behind the inscription, with the cursor's cream-to-amber falloff.
 c.save();c.scale(1,.52);const radius=width*.27;
 const glow=c.createRadialGradient(0,0,0,0,0,radius);
 glow.addColorStop(0,`rgba(255,249,223,${hot*.13})`);glow.addColorStop(.35,`rgba(248,189,109,${hot*.05})`);glow.addColorStop(1,'#f8bd6d00');
 c.fillStyle=glow;c.fillRect(-radius,-radius,radius*2,radius*2);c.restore();
 // The first sparks leave as the veil starts opening, from its luminous edge.
 for(let i=0;i<16;i++){
  const angle=i*Math.PI/8+.16*Math.sin(i*4),spread=width*(.19+(.32+(i%3)*.025)*flight),x=Math.cos(angle)*spread,y=Math.sin(angle)*spread*.34;
  const fade=Math.sin(Math.PI*p)*(i%2?.6:.9);
  c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=fade;
  const len=(12+(i%3)*5)*unit*Math.sin(Math.PI*p),beam=c.createLinearGradient(-len,0,len*.2,0);
  beam.addColorStop(0,'#ae803000');beam.addColorStop(.7,'#ffdc96');beam.addColorStop(1,'#ffffeb');
  c.fillStyle=beam;c.beginPath();c.moveTo(-len,0);c.lineTo(0,-1.1*unit);c.lineTo(len*.2,0);c.lineTo(0,.7*unit);c.closePath();c.fill();
  if(i%3===0){const l=(3.5+2.5*hot)*unit,w=.8*unit;c.rotate(-angle-.32);c.fillStyle='#fffbe2';c.shadowBlur=6*unit;c.shadowColor='#f8bd6d';c.beginPath();c.moveTo(0,-l);c.quadraticCurveTo(w,-w,l*.8,0);c.quadraticCurveTo(w,w,0,l);c.quadraticCurveTo(-w,w,-l*.8,0);c.quadraticCurveTo(-w,-w,0,-l);c.fill();}
  c.restore();
 }
 c.restore();
}

function word(c:CanvasRenderingContext2D,x:number,y:number,size:number,shine:number,outcome:ResultOutcome,energy=0){
 const label=outcome==='victory'?'VICTORY':outcome==='draw'?'DRAW':'DEFEAT',gap=size*.19;c.font=`400 ${size}px Baskerville, 'Times New Roman', serif`;c.textBaseline='middle';
 const widths=[...label].map(s=>c.measureText(s).width),total=widths.reduce((a,b)=>a+b,0)+gap*(label.length-1);
 c.save();c.translate(x-total/2,y);
 c.shadowColor='#050d19';c.shadowBlur=10;c.shadowOffsetY=2;
 const fill=c.createLinearGradient(0,-size*.6,0,size*.5);fill.addColorStop(0,outcome==='victory'?'#fff8d8':'#ced7e0');fill.addColorStop(.6,outcome==='victory'?'#ffe5a4':'#aab9cb');fill.addColorStop(1,outcome==='victory'?'#cfae73':'#75869e');c.fillStyle=fill;
 let at=0;[...label].forEach((l,i)=>{c.fillText(l,at,0);at+=widths[i]+gap;});
 if(energy>0){c.save();c.globalCompositeOperation='screen';c.globalAlpha*=energy*.48;c.shadowOffsetY=0;c.shadowBlur=size*.26;c.shadowColor='#f8bd6d';c.fillStyle='#fff7df';at=0;[...label].forEach((l,i)=>{c.fillText(l,at,0);at+=widths[i]+gap;});c.restore();}
 c.shadowOffsetY=0;c.shadowBlur=0;
 if(shine>0&&shine<1){
  c.save();c.globalCompositeOperation='screen';c.globalAlpha*=Math.sin(shine*Math.PI)*.16;c.shadowBlur=size*.19;c.shadowColor='#f8bd6d';c.fillStyle='#f4f7e9';at=0;[...label].forEach((l,i)=>{c.fillText(l,at,0);at+=widths[i]+gap;});c.restore();
  c.globalCompositeOperation='screen';const head=total*shine,g=c.createLinearGradient(head-size*.7,0,head+size*.7,0);g.addColorStop(0,'#ffdc9600');g.addColorStop(.48,'#ffdc9677');g.addColorStop(.52,'#ffffffc0');g.addColorStop(1,'#ffdc9600');c.fillStyle=g;c.shadowBlur=5;c.shadowColor='#f8bd6d';at=0;[...label].forEach((l,i)=>{c.fillText(l,at,0);at+=widths[i]+gap;});
 }
 c.restore();
}

export function drawVictory(c:CanvasRenderingContext2D,w:number,h:number,style:VictoryStyle,milliseconds:number,outcome:ResultOutcome='victory'){
 const t=milliseconds/1000,won=outcome==='victory';
 const arrival=smooth(.18,1.5,t),reveal=smooth(.62,won?1.8:2.15,t),settle=smooth(2.15,4.6,t);
 const crest=smooth(.85,1.45,t)*(1-smooth(1.7,3.1,t));
 const triumph=won&&style===1?smooth(1.05,1.48,t)*(1-smooth(1.7,2.65,t)):0;
 c.clearRect(0,0,w,h);const dim=smooth(0,.8,t);
 c.fillStyle=`rgba(6,18,34,${dim*(won?.62:.7)})`;c.fillRect(0,0,w,h);
 const vignette=c.createRadialGradient(w*.5,h*.46,w*.12,w*.5,h*.46,Math.max(w,h)*.74);vignette.addColorStop(0,'#12243c00');vignette.addColorStop(1,`rgba(4,13,27,${dim*.6})`);c.fillStyle=vignette;c.fillRect(0,0,w,h);
 const cx=w*.5,cy=h*.46,unit=Math.min(w/1050,h/660),width=Math.min(w*.62,650),inkWidth=width*(style===3?.95:1);
 // Every layer fades in at the final center. No portrait anchor or vertical travel.
 const span=won?1:.94-.16*settle;
 const amount=arrival*(1-settle*(style===1?.93:style===2?.68:.89))*(won?1:.5);
 if(style===1&&won){
  // Broad illumination sits behind the same silver surface; the bright rim stays narrow.
  c.save();c.translate(cx,cy+16*unit);c.scale(1,.40);
  const glow=c.createRadialGradient(0,0,0,0,0,width*.50);
  glow.addColorStop(0,`rgba(255,226,166,${crest*.12})`);glow.addColorStop(.5,`rgba(248,189,109,${crest*.045})`);glow.addColorStop(1,'#f8bd6d00');
  c.fillStyle=glow;c.fillRect(-width,-width,width*2,width*2);c.restore();
 }
 c.save();c.translate(cx,cy+16*unit);
 if(style===1&&won){
  victoryMantle(c,inkWidth,unit,t);
  victoryLight(c,inkWidth,unit,t);
 }else if(style===1){
  for(let i=0;i<3;i++){
   c.save();c.rotate((i-1)*.025);
   sheet(c,inkWidth*span*(1-i*.08),(12+7*i)*unit*(1+crest*.68)*(1-settle*.84),t*(won?1:.5),1,amount*((won?.40:.32)-i*.055),i);
   c.restore();
  }

 }else if(style===2){
  c.rotate(-.3+.18*settle);
  sheet(c,inkWidth*span,65*unit*(1-settle*.75),t,2,amount*.50);
  c.translate(width*.15,-65*unit);c.rotate(.15);sheet(c,inkWidth*.55*span,38*unit*(1-settle*.7),t+3,2,amount*.25,2);
 }else{
  for(let i=0;i<4;i++)sheet(c,inkWidth*span*(1-i*.065),(72-i*10)*unit*(1-settle*.90),t,3,amount*(.54-i*.08),i);
 }
 c.restore();
 if(style===1&&reveal>0){
  c.save();c.globalAlpha=reveal*(won?.85:.48);c.translate(cx,cy-64*unit);c.scale(unit,unit);
  c.strokeStyle=won?'#ffe0a2':'#a8b7cb';c.lineWidth=1;
  // The same eye signature opens with victory, settles closed with defeat.
  const eye=won?1:1-.82*smooth(1.4,3.5,t);
  c.shadowColor=won?'#f8bd6d':'#d0efff';c.shadowBlur=won?crest*9:0;
  c.beginPath();c.moveTo(-39,0);c.bezierCurveTo(-16,0,-14,-12*eye,0,-12*eye);c.bezierCurveTo(15,-12*eye,19,0,39,0);c.moveTo(-22,2*eye);c.bezierCurveTo(-8,14*eye,7,14*eye,22,2*eye);c.stroke();
  c.fillStyle=won?'#fff4cd':'#a8b7cb';c.beginPath();c.ellipse(0,0,2,8*eye,0,0,Math.PI*2);c.fill();c.restore();
 }
 // Restrained fragments detach from the silver surface only during its victorious crest.
 if(won)for(let i=0;i<(style===1?9:2);i++){
  const p=smooth(1.35+i*.13,3.5+i*.22,t),a=Math.sin(p*Math.PI)*.52;if(a<=.001)continue;
  const x=cx+(i%2?1:-1)*width*(.36+p*.28),y=cy+16*unit+(i-4)*6*unit-p*(15+i*5)*unit;
  c.save();c.globalAlpha=a;c.translate(x,y);c.rotate(-.6+p);c.fillStyle='#ffdc96';c.beginPath();c.moveTo(-4*unit,0);c.quadraticCurveTo(0,-2*unit,8*unit,-2*unit);c.quadraticCurveTo(2*unit,4*unit,-4*unit,0);c.fill();c.restore();
 }
 if(reveal>0){c.save();c.globalAlpha=reveal;word(c,cx,cy,Math.min(w*.079,72)*Math.min(1,h/500)*(1+triumph*.075),won?smooth(1.15,2.5,t):0,outcome,triumph);c.restore();}
}

export function mountVictoryAtmosphere(host:HTMLElement,style:VictoryStyle,onTime:(ms:number,playing:boolean)=>void,outcome:ResultOutcome='victory'){
 const canvas=document.createElement('canvas');canvas.className='result-atmosphere';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',outcome==='victory'?'VICTORY':outcome==='draw'?'DRAW':'DEFEAT');host.append(canvas);
 const c=canvas.getContext('2d');let time=0,playing=true,rate=1,raf=0,last=0,dead=false;
 const media=matchMedia('(prefers-reduced-motion: reduce)');
 const paint=()=>{const w=innerWidth,h=innerHeight,d=Math.min(devicePixelRatio,2);if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);}if(c){c.setTransform(d,0,0,d,0,0);
  drawVictory(c,w,h,style,time,outcome);}canvas.dataset.time=String(Math.round(time));canvas.dataset.variant=String(style);canvas.dataset.outcome=outcome;onTime(time,playing);
 };
 const tick=(now:number)=>{raf=0;if(dead||!playing||document.hidden)return;if(last)time=Math.min(VICTORY_LENGTH,time+(now-last)*rate);last=now;if(time>=VICTORY_LENGTH)playing=false;paint();if(playing)raf=requestAnimationFrame(tick);};
 const schedule=()=>{last=0;if(playing&&!document.hidden&&!raf)raf=requestAnimationFrame(tick);};
 const visibility=()=>{cancelAnimationFrame(raf);raf=0;schedule();};
 const reduce=()=>{if(media.matches){time=VICTORY_LENGTH;playing=false;cancelAnimationFrame(raf);raf=0;paint();}};
 const resize=()=>paint();document.addEventListener('visibilitychange',visibility);window.addEventListener('resize',resize);media.addEventListener('change',reduce);
 if(media.matches){time=VICTORY_LENGTH;playing=false;}paint();schedule();
 return {canvas,replay(){time=media.matches?VICTORY_LENGTH:0;playing=!media.matches;paint();schedule();},pause(){playing=!playing;if(time>=VICTORY_LENGTH&&playing)time=0;cancelAnimationFrame(raf);raf=0;paint();schedule();},seek(ms:number){time=Math.min(VICTORY_LENGTH,Math.max(0,ms));playing=false;cancelAnimationFrame(raf);raf=0;paint();},speed(value:number){rate=value;last=0;},destroy(){dead=true;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',resize);media.removeEventListener('change',reduce);canvas.remove();canvas.width=canvas.height=1;}};
}

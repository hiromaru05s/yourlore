const CONTACT=560,DURATION=1000;
export const GROWTH_START=205,GROWTH_HEAL=CONTACT-GROWTH_START,GROWTH_DURATION=DURATION-GROWTH_START;
export type Point={x:number;y:number};
export type Anchor=Point&{w:number;h:number;corners?:Point[];bottom?:number};
export type Scene={source:Anchor;hp:Anchor;dark:boolean;reduced:boolean;sourceName?:string};
type C=CanvasRenderingContext2D;
const PI=Math.PI;
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const ease=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x)};
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
function path(c:C,p:Point[],close=false){c.beginPath();p.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));if(close)c.closePath()}
function stroke(c:C,p:Point[],color:string,w:number){path(c,p);c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.stroke()}
function sourceSpace(c:C,s:Anchor){const p=s.corners;if(p){c.transform((p[1].x-p[0].x)/s.w,(p[1].y-p[0].y)/s.w,(p[3].x-p[0].x)/s.h,(p[3].y-p[0].y)/s.h,p[0].x,p[0].y);c.translate(s.w/2,s.h/2)}else c.translate(s.x,s.y)}
// Ownership is a local surface response. No geometry connects the source to HP.
function sourceCue(c:C,s:Scene,t:number){
 const on=ease(205,265,t)*(1-ease(500,640,t));if(!on)return;
 c.save();sourceSpace(c,s.source);const w=s.source.w,h=s.source.h;
 c.beginPath();c.roundRect(-w*.49,-h*.49,w*.98,h*.98,Math.min(4,w*.08));c.clip();c.globalAlpha=on;
 const y=mix(h*.58,-h*.65,ease(210,475,t));
 const g=c.createLinearGradient(0,y-h*.22,0,y+h*.22);g.addColorStop(0,'#d8f5b000');g.addColorStop(.43,'#8ebd8a44');g.addColorStop(.55,'#fff4ccbb');g.addColorStop(1,'#d8f5b000');c.fillStyle=g;c.fillRect(-w/2,-h/2,w,h);
 c.strokeStyle='#f5e6b2';c.lineWidth=Math.max(.8,w*.018);c.strokeRect(-w*.46,-h*.46,w*.92,h*.92);
 // Small intaglio leaf stays on the artwork, with a shaded vein rather than an emitter.
 c.translate(0,h*.17);c.scale(w/70,w/70);c.beginPath();c.moveTo(-8,8);c.bezierCurveTo(-14,-5,-2,-15,13,-14);c.bezierCurveTo(14,0,1,11,-8,8);c.fillStyle='#295b4877';c.fill();c.strokeStyle='#e5f2bb';c.lineWidth=1;c.stroke();stroke(c,[{x:-7,y:7},{x:9,y:-10}],'#f7edbd',1);c.restore();
 if(s.sourceName){c.save();c.globalAlpha=on;c.fillStyle=s.dark?'#142a23':'#294b3d';c.beginPath();c.roundRect(s.source.x-18,(s.source.bottom??s.source.y+s.source.h*.5)+2,36,16,4);c.fill();c.font='10px sans-serif';c.textAlign='center';c.fillStyle='#f1edc6';c.fillText(s.sourceName,s.source.x,(s.source.bottom??s.source.y+s.source.h*.5)+14);c.restore()}
}
function leaf(c:C,x:number,y:number,length:number,width:number,angle:number,open:number){
 if(open<=0)return;c.save();c.translate(x,y);c.rotate(angle);c.scale(open,open);
 const p=new Path2D();p.moveTo(0,0);p.bezierCurveTo(length*.12,-width,length*.7,-width*.9,length,0);p.bezierCurveTo(length*.62,width*.6,length*.1,width*.7,0,0);
 const g=c.createLinearGradient(0,-width,length,width);g.addColorStop(0,'#e8edb6');g.addColorStop(.39,'#a5d491');g.addColorStop(.51,'#447d65');g.addColorStop(1,'#68a77e');
 c.shadowColor='#18382f44';c.shadowBlur=2;c.shadowOffsetY=1;c.fillStyle=g;c.fill(p);c.shadowColor='transparent';c.strokeStyle='#f0edbf';c.lineWidth=.7;c.stroke(p);
 stroke(c,[{x:1,y:0},{x:length*.9,y:-.4}],'#e9edb5',.8);
 for(let k=1;k<5;k++){const q=k/6;for(const side of [-1,1])stroke(c,[{x:length*q,y:0},{x:length*(q+.13),y:side*width*Math.sin(q*PI)*.55}],'#d9e7ae88',.4)}c.restore();
}
// HP effects use only HP-local coordinates. H is the existing badge half-height.
function awakening(c:C,w:number,h:number,t:number){
 const open=ease(365,CONTACT+10,t),fold=ease(690,960,t),alive=1-fold;
 for(const side of [-1,1]){
  const x=side*w*.24,y=h*.91;
  leaf(c,x,y,35,11,side===1?mix(-1.4,-.48,open)+fold*.6:mix(-1.74,-2.66,open)-fold*.6,open*alive);
  leaf(c,side*w*.56,h*.43,26,8,side===1?mix(-1.55,-.9,open):mix(-1.59,-2.24,open),ease(415,600,t)*alive);
 }
 if(t>=CONTACT){const p=ease(CONTACT,690,t),a=1-ease(700,870,t);c.save();c.globalAlpha=a;for(const side of [-1,1])stroke(c,[{x:side*w*.80,y:h*.48},{x:side*w*.55,y:h*(.7-p*.6)},{x:side*w*.58,y:-h*.12}],'#eff6c7',1.4*alive);c.restore()}
}
function badge(c:C,w:number,h:number){c.beginPath();c.moveTo(0,-h);c.bezierCurveTo(w*.45,-h*.7,w*.91,-h*.84,w,-h*.62);c.bezierCurveTo(w,h*.32,w*.55,h*.76,0,h);c.bezierCurveTo(-w*.55,h*.76,-w,h*.32,-w,-h*.62);c.bezierCurveTo(-w*.91,-h*.84,-w*.45,-h*.7,0,-h);c.closePath()}
function localHeal(c:C,s:Scene,t:number){
 if(t<350)return;const hp=s.hp;
 // Same physical scale for portrait badges and the comparison panel; capped on large screens.
 const unit=Math.max(.55,Math.min(1.25,hp.h/48)),w=Math.min(44,hp.w/2/unit),h=Math.min(29,hp.h/2/unit);
 c.save();c.translate(hp.x,hp.y);c.scale(unit,unit);
 // Hard locality boundary also protects nearby mana/cards during concurrent activations.
 c.beginPath();c.rect(-w-26,-h-20,(w+26)*2,(h+22)*2);c.clip();
 if(s.reduced){if(t>=CONTACT&&t<800){c.globalAlpha=(1-ease(650,800,t))*.8;badge(c,w+2,h+2);c.strokeStyle='#a6ce9e';c.lineWidth=1.4;c.stroke()}}
 else awakening(c,w,h,t);
 c.restore();
}
export function drawGrowth(c:C,s:Scene,t:number,heal=true){
 if(t<=0||t>=DURATION)return;
 c.save();sourceCue(c,s,t);if(heal)localHeal(c,s,t);c.restore();
}

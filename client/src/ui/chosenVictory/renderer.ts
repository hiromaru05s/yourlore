import {MaterialRenderer} from './material';
import {CHOSEN_FLASH_MS,CHOSEN_DURATION_MS} from './timing';
type C=CanvasRenderingContext2D;type P={x:number;y:number};
export const DURATION=CHOSEN_DURATION_MS;
const variants=[{color:'#c8a8ed'}];
const TAU=Math.PI*2;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(a:number,b:number,t:number)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q);};
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const noise=(i:number)=>{const v=Math.sin(i*78.233+12.456)*43758.5453;return v-Math.floor(v);};
function stroke(c:C,pts:P[],col:string,width=1){c.strokeStyle=col;c.lineWidth=width;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}
function diamond(c:C,x:number,y:number,r:number,col:string){c.fillStyle=col;c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r*.42,y);c.lineTo(x,y+r);c.lineTo(x-r*.42,y);c.closePath();c.fill();}
function glow(c:C,x:number,y:number,r:number,color:string,alpha:number){if(alpha<=0)return;c.save();c.globalAlpha*=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(.2,color+'65');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}
export class ChosenRenderer{
 private material:MaterialRenderer|null;readonly imageAssets:HTMLImageElement[];
 constructor(images:HTMLImageElement[]){this.imageAssets=images;try{this.material=new MaterialRenderer(images);}catch(e){this.material=null;console.warn('Static reduced material fallback',e);}}
 draw(c:C,w:number,h:number,id:number,ms:number,opts:{board?:boolean;source?:P;rift?:P;dark?:boolean;reduced?:boolean;labels?:boolean;title?:string;victoryLabel?:string}={}){
 c.clearRect(0,0,w,h);if(ms>=DURATION)return;const t=opts.reduced?3.75:ms/1000;const scale=Math.min(w/960,h/620),cx=w/2,cy=h*.45;
 const live=ease(.2,.8,t)*(1-ease(6.25,7.1,t));
 if(opts.board){c.fillStyle=`rgba(8,10,22,${.62*ease(.65,1.6,t)*(1-ease(6.2,7.2,t))})`;c.fillRect(0,0,w,h);}
 c.save();c.translate(cx,cy);c.scale(scale,scale);
 const tint=variants[id].color;
 // Contact/reflected light appears beneath, not uniformly around every edge.
 c.save();c.translate(0,175);c.scale(1,.16);glow(c,0,0,310,opts.dark||opts.board?'#615574':'#80758c',live*.55);c.restore();
 const source=opts.source?{x:(opts.source.x-cx)/scale,y:(opts.source.y-cy)/scale}:{x:0,y:205};
 const rift=opts.rift?{x:(opts.rift.x-cx)/scale,y:(opts.rift.y-cy)/scale}:{x:310,y:147};
 // Source continuity: the light follows the source card before condensing at center.
 const gather=ease(.35,1.5,t);if(t<1.8){const x=lerp(source.x,0,gather),y=lerp(source.y,25,gather)-Math.sin(gather*Math.PI)*45;glow(c,x,y,38,tint,(1-ease(1.4,1.8,t))*.65);c.save();c.globalAlpha=(1-ease(1.25,1.7,t));c.strokeStyle=tint;c.lineWidth=1.3;c.strokeRect(x-17*(1-gather),y-25*(1-gather),34*(1-gather),50*(1-gather));c.restore();}
 for(let j=0;j<25;j++){const f=ease(.25+j*.024,1.15+j*.031,t);if(f<=0||f>=1)continue;const x=lerp(rift.x,0,f)+Math.sin(f*Math.PI)*(j%2?1:-1)*30,y=lerp(rift.y,32,f)-Math.sin(f*Math.PI)*(35+j%5*14);c.save();c.globalAlpha=Math.sin(f*Math.PI)*.65;diamond(c,x,y,3.5,tint);stroke(c,[{x:x+(rift.x-x)*.1,y:y+(rift.y-y)*.1},{x,y}],tint+'70',.6);c.restore();}
 c.save();c.translate(0,-30);this.behind(c,id,t,live,opts.reduced??false);c.restore();
 c.restore();
 // Independent material shader; texture alpha is preserved over white or real board.
 if(this.material){const mw=Math.round(Math.min(w,1152)),mh=Math.round(h*mw/w);const layer=this.material.draw(mw,mh,id,t,opts.reduced);c.drawImage(layer,0,h*.45-h*.5-30*scale,w,h);}else{const im=this.imageAssets[id],iw=Math.min(w*.9,h*1.3);c.globalAlpha=live;c.drawImage(im,cx-iw/2,cy-iw/3,iw,iw/1.5);c.globalAlpha=1;}
 c.save();c.translate(cx,cy);c.scale(scale,scale);c.save();c.translate(0,-30);this.front(c,id,t,live,opts.reduced??false);c.restore();
 if(opts.labels!==false)this.label(c,t,!!(opts.dark||opts.board),scale,opts.title,opts.victoryLabel);c.restore();
 }
 behind(c:C,id:number,t:number,live:number,reduced:boolean){
 const p=ease(1.2,2.75,t)*(1-ease(5.3,6.4,t));const col=variants[id].color;
 if(id===0){for(let j=0;j<7;j++){const f=ease(.8+j*.08,2.25+j*.06,t);if(f>=1||f<=0)continue;const x=(j-3)*53,y=150-f*260;c.save();c.globalAlpha=Math.sin(f*Math.PI)*.5;stroke(c,[{x:x*1.6,y:175},{x,y}],col,1.2);glow(c,x,y,30,col,.3);c.restore();}}
 // Paired grazing light provides depth without hiding the dark material cores.
 if(id!==3){glow(c,-145,-35,145,col,p*.075);glow(c,180,60,95,'#ebd9b9',p*.08);}
 void live;void reduced;
 }
 front(c:C,id:number,t:number,live:number,reduced:boolean){
 const lock=CHOSEN_FLASH_MS/1000,impact=ease(lock-.06,lock+.09,t)*(1-ease(lock+.12,lock+.48,t));
 if(impact>0){glow(c,0,id===0?45:0,90,variants[id].color,impact*.42);c.save();c.globalAlpha=impact*.7;stroke(c,[{x:-100*impact,y:0},{x:100*impact,y:0}],'#fff0ca',.8);stroke(c,[{x:0,y:-48*impact},{x:0,y:48*impact}],'#fff6e0',1);c.restore();}
 const hold=ease(lock,lock+.65,t)*(1-ease(5.1,6,t));
 if(id===0){glow(c,0,48,31,'#f4e4bd',hold*.4);}
 // Sparse angular flecks are tied to the moment the primary material locks.
 for(let j=0;j<18;j++){const p=clamp((t-lock-.02*j)/1.7);if(p<=0||p>=1)continue;const a=noise(j+id*50)*TAU,r=70+220*(1-(1-p)**3);c.save();c.globalAlpha=Math.sin(p*Math.PI)*(1-p)*.62;const x=Math.cos(a)*r,y=Math.sin(a)*r*.55;diamond(c,x,y,(2+noise(j+90)*4)*(1-p),variants[id].color);c.restore();}
 void live;void reduced;
 }
 label(c:C,t:number,dark:boolean,scale:number,title="選ばれし領域",victoryLabel="VICTORY"){const f=ease(3.35,3.85,t)*(1-ease(6.5,7.25,t));if(f<=0)return;c.save();c.globalAlpha=f;c.translate(0,250+(1-f)*12);c.textAlign='center';c.shadowColor='#050712';c.shadowBlur=dark?8:0;c.fillStyle=dark?'#e2cfac':'#796543';c.font=`${Math.max(12,9/scale)}px Georgia`;c.letterSpacing='7px';c.fillText(victoryLabel,3,0);c.letterSpacing='5px';c.font=`${Math.max(27,15/scale)}px "Yu Mincho",serif`;c.fillStyle=dark?'#f5ebd8':'#303142';c.fillText(title,2,41);c.shadowBlur=0;for(const s of [-1,1]){const g=c.createLinearGradient(s*95,0,s*250,0);g.addColorStop(0,'#dbc29590');g.addColorStop(1,'#dbc29500');stroke(c,[{x:s*95,y:-4},{x:s*250,y:-4}],g as unknown as string,.65);diamond(c,s*89,-4,3,'#d3b987');}c.restore();}
 destroy(){this.material?.destroy();}
}

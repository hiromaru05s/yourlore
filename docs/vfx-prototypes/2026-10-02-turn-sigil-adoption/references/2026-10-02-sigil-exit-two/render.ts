import {draw as drawSelected} from '../2026-10-02-sigil-five/render';
/** Round 2: LORE-shaped arcane motion, with one clock for body, engraving and light. */
export type Side='me'|'opp';
export const studies=[
 {id:'recall',name:'還流の封印',en:'01 / RECALL',duration:2320,material:'翼の巻き戻り → 刻印の収束 → 閉眼',me:'端の結晶から光が戻り、上下の曲線が眼へ巻き込まれる。刻印環が締まり、最後に瞳が閉じる。',opp:'深紅の光が端から魔眼へ戻り、曲線と刻印を順に封じる。',note:'左右から力を回収する、重みのある閉じ方。'},
 {id:'spiral',name:'旋紋の収束',en:'02 / SPIRAL',duration:2320,material:'曲線の旋回 → 紋様の巻取り → 瞳の残光',me:'金属の曲線と表面紋が細い帯へほどけ、魔眼の周りを旋回しながら巻き取られる。',opp:'深紅の帯が逆方向に旋回し、魔眼の芯へ吸い込まれる。',note:'同じ造形が流れる帯へ変わる、動きの強い閉じ方。'},
] as const;
export type Variant=typeof studies[number]['id'];
type C=CanvasRenderingContext2D;
type P={deep:string;mid:string;bright:string;core:string;line:string};
const palette=(s:Side):P=>s==='me'?{deep:'#071c42',mid:'#1763a3',bright:'#55c8fc',core:'#dbf7ff',line:'#90c9f5'}:{deep:'#330c21',mid:'#922a48',bright:'#f57989',core:'#ffe2d5',line:'#e1a8b7'};
const cl=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{x=cl(x);return x*x*(3-2*x);};
const serif='"Hiragino Mincho ProN","Yu Mincho",serif';
function path(c:C,pts:number[][]){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
function grad(c:C,x:number,y:number,x2:number,y2:number,cols:string[]){const g=c.createLinearGradient(x,y,x2,y2);cols.forEach((s,i)=>g.addColorStop(i/(cols.length-1),s));return g;}
function line(c:C,x:number,y:number,x2:number,y2:number,color:string,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();}
function diamond(c:C,x:number,y:number,r:number,col:string){path(c,[[x,y-r],[x+r*.38,y],[x,y+r],[x-r*.38,y]]);c.fillStyle=col;c.fill();}
function glow(c:C,x:number,y:number,r:number,color:string,alpha=1){c.save();c.globalAlpha*=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(.3,color.slice(0,7)+'55');g.addColorStop(1,color.slice(0,7)+'00');c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r);c.restore();}
function strokeLight(c:C,col:string,width=1.3){c.strokeStyle=col;c.lineWidth=width;c.shadowBlur=7;c.shadowColor=col;c.stroke();c.shadowBlur=0;}
function tracking(c:C,s:string,x:number,y:number,size:number,color:string,space=3){c.font=`${size}px Georgia,serif`;c.fillStyle=color;let w=0;for(const ch of s)w+=c.measureText(ch).width+space;let at=x-w/2;for(const ch of s){c.fillText(ch,at,y);at+=c.measureText(ch).width+space;}}
function title(c:C,side:Side,t:number,dur:number,y=6){const a=smooth((t-340)/200)*(1-smooth((t-dur+330)/160));c.save();c.globalAlpha*=a;c.textAlign='center';c.font=`600 40px ${serif}`;c.shadowColor='#020819';c.shadowBlur=8;c.shadowOffsetY=2;c.fillStyle=grad(c,0,y-40,0,y+10,['#fffef0','#fffaf0','#c5d9e8']);c.fillText(side==='me'?'あなたのターンです':'相手のターンです',0,y);c.shadowBlur=0;c.shadowOffsetY=0;c.textAlign='left';tracking(c,side==='me'?'YOUR TURN  ·  06':'OPPONENT’S TURN  ·  06',0,y+29,10,'#d5dde2',3);c.restore();}
function field(c:C,p:P,w=680,h=138){c.save();const g=c.createRadialGradient(0,0,5,0,0,w/2);g.addColorStop(0,'#050d21ed');g.addColorStop(.64,'#061022e8');g.addColorStop(.88,p.deep+'95');g.addColorStop(1,'#05152b00');c.scale(1,h/w);c.fillStyle=g;c.beginPath();c.arc(0,0,w/2,0,Math.PI*2);c.fill();c.restore();}
function glyph(c:C,x:number,y:number,size:number,n:number,color:string){c.save();c.translate(x,y);c.scale(size,size);c.lineWidth=.7/size;c.strokeStyle=color;c.beginPath();c.moveTo(-2,-4);c.lineTo(2,-1);c.lineTo(-2,3);c.moveTo(0,-5);c.lineTo(0,5);if(n%2)c.lineTo(3,2);if(n%3){c.moveTo(-3,0);c.lineTo(3,0);}c.stroke();c.restore();}
function metal(c:C,y=-70,h=145){return grad(c,0,y,0,y+h,['#8c7554','#fff8da','#ddd9c5','#8e8b77','#efeedd','#c6ac76','#6e5940']);}
function eye(c:C,p:P,t:number,open:number,_id:Variant){c.save();c.scale(1,Math.max(.03,open));c.beginPath();c.moveTo(-31,0);c.bezierCurveTo(-9,-22,9,-22,31,0);c.bezierCurveTo(9,22,-9,22,-31,0);c.strokeStyle='#01050f';c.lineWidth=6;c.stroke();c.strokeStyle=metal(c,-18,36);c.lineWidth=2.8;c.stroke();glow(c,0,0,25,p.bright,.35);diamond(c,0,0,19,p.bright);diamond(c,-2,0,15,p.core);line(c,0,-12,0,12,p.deep,1.8);c.restore();if(t<550)glow(c,0,0,15,p.core,Math.sin(Math.PI*cl(t/550))*.7);}

function eyeBacking(c:C,size:number,alpha:number){c.save();c.globalAlpha*=alpha;c.scale(size,size);const g=c.createRadialGradient(0,0,22,0,0,85);g.addColorStop(0,'#020816f7');g.addColorStop(.58,'#030a19f7');g.addColorStop(.8,'#040c1cad');g.addColorStop(1,'#040c1c00');c.fillStyle=g;c.beginPath();c.arc(0,0,85,0,Math.PI*2);c.fill();c.scale(1.12,.7);const g2=c.createRadialGradient(0,0,22,0,0,65);g2.addColorStop(0,'#0208169e');g2.addColorStop(.58,'#030a199e');g2.addColorStop(.8,'#040c1c6f');g2.addColorStop(1,'#040c1c00');c.fillStyle=g2;c.beginPath();c.arc(0,0,65,0,Math.PI*2);c.fill();c.restore();}
const artImages=['ASSASSIN4','ANCIENT_CIV','ANTIQUE_DK'].map(key=>{const im=new Image();im.src='/art/cards/'+key+'.webp';return im;});
export const backgroundsReady=Promise.all(artImages.map(im=>im.decode().catch(()=>{})));
function artBackdrop(c:C,w:number,h:number){c.fillStyle='#d2d1c9';c.fillRect(0,0,w,h);const cw=w/3;artImages.forEach((im,i)=>{if(!im.naturalWidth)return;const scale=Math.max((cw-4)/im.width,h/im.height),sw=(cw-4)/scale,sh=h/scale;c.drawImage(im,(im.width-sw)/2,(im.height-sh)/2,sw,sh,i*cw+2,0,cw-4,h);});}

type Pt=[number,number];
function bez(a:Pt,b:Pt,c:Pt,d:Pt,t:number):Pt{const v=1-t;return[v*v*v*a[0]+3*v*v*t*b[0]+3*v*t*t*c[0]+t*t*t*d[0],v*v*v*a[1]+3*v*v*t*b[1]+3*v*t*t*c[1]+t*t*t*d[1]];}
function curve(start:Pt,segments:Pt[][]){const pts:Pt[]=[start];let from=start;for(const [b,c,d]of segments){for(let i=1;i<=28;i++)pts.push(bez(from,b,c,d,i/28));from=d;}return pts;}
const upper=curve([34,-67],[[[102,-18],[174,-49],[230,-54]],[[277,-58],[304,-54],[338,-72]],[[315,-42],[284,-25],[235,-34]],[[162,-48],[99,-19],[34,-67]]]);
const lower=curve([86,54],[[[160,47],[220,75],[272,56]],[[298,47],[315,39],[333,44]],[[301,59],[294,78],[244,74]],[[197,71],[128,56],[86,54]]]);
const vein=curve([45,-57],[[[155,-12],[222,-62],[324,-57]]]);
function mapped(c:C,pts:Pt[],f:(p:Pt)=>Pt,closed=false){c.beginPath();pts.forEach((p,i)=>{const[x,y]=f(p);i?c.lineTo(x,y):c.moveTo(x,y);});if(closed)c.closePath();}
function exitScene(c:C,p:P,side:Side,t:number,id:Variant){
 const q=cl((t-1500)/820),d=side==='me'?1:-1;
 const body=smooth((q-.07)/.74),seal=smooth((q-.44)/.45),last=1-smooth((q-.85)/.15);
 c.save();c.globalAlpha*=1-smooth((q-.15)/.56);c.translate(0,-84*body);c.scale(1-body*.68,1-body*.3);field(c,p,720,168);c.restore();
 // Text clears before the returning body crosses its reading area.
 c.save();c.globalAlpha*=1-smooth((q-.06)/.25);c.translate(0,-8*smooth(q/.3));title(c,side,1000,2320,12);c.restore();
 for(const s of [-1,1]){
  const warp=(pt:Pt,layer=0):Pt=>{
   const x=pt[0]*s,y=pt[1]+84;
   if(id==='recall'){
    const r=smooth((q-.07-layer*.06)/(.64-layer*.05)),bend=Math.sin(Math.PI*r);
    return[x*(1-r),-84+y*(1-r)-bend*(Math.abs(x)/338)*(layer?72:44)+Math.sin(r*Math.PI)*12];
   }
   const r=smooth((q-.08-layer*.06)/.67),angle=d*r*(2.8+layer*.65)*(Math.abs(x)/338*.5+.5);
   const radius=1-r,xx=x*radius,yy=y*radius;
   return[xx*Math.cos(angle)-yy*Math.sin(angle),-84+xx*Math.sin(angle)*.24+yy*Math.cos(angle)];
  };
  for(const [layer,pts]of [upper,lower].entries()){
   const f=(pt:Pt)=>warp(pt,layer);c.save();c.globalAlpha*=last;
   mapped(c,pts,f,true);const a=f([140,layer?45:-72]),b=f([140,layer?78:-27]);c.fillStyle=grad(c,a[0],a[1],b[0],b[1],['#8c7554','#fff8da','#ddd9c5','#8e8b77','#efeedd','#c6ac76','#6e5940']);c.fill();c.strokeStyle=layer?'#dfd6bd':'#e6dbc0';c.lineWidth=.7*(1-body*.5);c.stroke();
   // Light remains clipped to its source material during the return.
   c.save();c.clip();const head=f([338*(1-smooth(q/.7)),layer?60:-48]);glow(c,head[0],head[1],28*(1-body*.6),p.core,Math.sin(Math.PI*cl(q/.82))*.7);c.restore();
   if(layer===0){mapped(c,vein,f);strokeLight(c,p.bright,1.2);for(let i=0;i<18;i++){const at=f([90+i*12,-53+Math.sin(i*.21)*10]);c.save();c.translate(...at);c.rotate(id==='spiral'?d*body*2.8:0);glyph(c,0,0,.8*(1-body*.8),i,p.line+'c0');c.restore();}}
   c.restore();
  }
  const tip=warp([338,-67]);c.save();c.globalAlpha*=1-smooth((q-.61)/.2);c.translate(...tip);c.rotate((id==='spiral'?d:s)*body*2.8);diamond(c,0,0,15*(1-body*.7),p.bright);diamond(c,0,0,10*(1-body*.7),p.core);c.restore();
 }
 c.save();c.globalAlpha*=1-smooth((q-.04)/.32);line(c,-190,56,190,56,p.line+'60',.8);diamond(c,0,61,7,'#e4d4ae');c.restore();
 // The dark backing stays under the eye until the final seal.
 c.save();c.translate(0,-84);eyeBacking(c,1-seal*.86,last);
 for(let k=0;k<3;k++){
  const r=smooth((q-.33-k*.045)/.51),radius=(40+k*8)*(1-r*.96),angle=d*(k%2?-1:1)*r*(id==='recall'?1.4:3.2);
  c.save();c.rotate(angle);c.globalAlpha*=1-smooth((q-.83)/.14);c.beginPath();c.arc(0,0,Math.max(.3,radius),.10+k*.3,Math.PI*2-.12-k*.3);const width=k===1?.95:1.65;c.strokeStyle='#020713';c.lineWidth=width+3;c.stroke();c.strokeStyle=k===1?p.line+'bb':'#e9dec2';c.lineWidth=width*(1-r*.35);c.stroke();
  for(let i=0;i<12;i++){c.save();c.rotate(i*Math.PI/6);line(c,0,(-46-k*8)*(1-r),0,(-49-k*8)*(1-r),'#ebdfc1',1);c.restore();}c.restore();
 }
 c.save();c.globalAlpha*=last;const blink=1-smooth((q-.69)/.22);if(id==='spiral')c.rotate(d*smooth((q-.64)/.3)*Math.PI*.5);eye(c,p,1000,blink,id);diamond(c,0,-63*(1-seal),9*(1-seal),'#f1dfb3');c.restore();
 // A brief slit is formed by the closing eye, then retracts to its center.
 const pulse=Math.sin(Math.PI*cl((q-.76)/.24));if(pulse>0){glow(c,0,0,22,p.bright,pulse*.45);c.save();if(id==='spiral')c.rotate(Math.PI/2);const w=30*pulse;path(c,[[-w,0],[0,-1.1],[w,0],[0,1.1]]);c.fillStyle=p.core;c.fill();c.restore();}
 c.restore();
}

export function draw(canvas:HTMLCanvasElement,id:Variant,side:Side,time:number,opts:{background?:'light'|'dark'|'art'|'none';reduced?:boolean;centerY?:number}={}){
 if(time<=1500&&!opts.reduced){drawSelected(canvas,'veil',side,time,opts);return;}
 const box=canvas.getBoundingClientRect(),w=box.width,h=box.height,dpr=Math.min(devicePixelRatio||1,2);if(!w||!h)return;
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 const c=canvas.getContext('2d')!;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
 if(opts.background!=='none'){c.fillStyle=opts.background==='light'?'#e1e3df':'#101b2c';c.fillRect(0,0,w,h);if(opts.background==='art')artBackdrop(c,w,h);}
 const dur=studies.find(s=>s.id===id)!.duration;canvas.dataset.time=String(Math.round(time));if(time<=0||time>=dur)return;
 c.save();c.translate(w/2,opts.centerY??h/2+10);const scale=Math.min((w-14)/740,1.08,h/280);c.scale(scale,scale);
 
 if(opts.reduced){c.restore();drawSelected(canvas,'veil',side,time>0&&time<dur?950:0,opts);return;}exitScene(c,palette(side),side,time,id);c.restore();
}

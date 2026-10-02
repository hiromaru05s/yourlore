/** Round 2: LORE-shaped arcane motion, with one clock for body, engraving and light. */
export type Side='me'|'opp';
export const studies=[
 {id:'veil',name:'紺影の魔眼',en:'01 / INK VEIL',duration:1920,material:'繊細な線 × 局所遮光',me:'眼の背面だけに濃紺の影が咲き、細線の輪郭を残す。',opp:'深紅の瞳と薄い刻印を、同じ紺影で背景から分離。',note:'原案に最も近い。線をほぼ維持し、魔眼の直下にだけ遮光を加える。'},
 {id:'engraved',name:'彫金の魔眼',en:'02 / ENGRAVED EDGE',duration:1920,material:'太い主線 × 暗い溝',me:'太い象牙金属の主線に、細い反射と暗い溝を重ねる。',opp:'深紅の瞳を、厚みのある金属の輪郭で強調。',note:'線の強さを優先。主線・反射・刻印の太さを分けて読みやすくする。'},
 {id:'obsidian',name:'黒曜の魔眼',en:'03 / OBSIDIAN SEAL',duration:1920,material:'黒紺の印章 × 面の反射',me:'眼と環の背面に黒紺の印章が開き、表面に細い反射が走る。',opp:'深紅の魔眼が、透けない印章の暗い面から浮かぶ。',note:'背景を最も確実に遮る。印章としての重厚さを持たせる。'},
 {id:'recess',name:'深層の魔眼',en:'04 / RECESSED HALO',duration:1920,material:'段差のある陰影 × 二重彫刻',me:'重なった暗い面の奥から眼が開き、二重の縁が光を受ける。',opp:'深紅の瞳と環を、内側の影・外側の反射で立体的に分離。',note:'局所的な奥行きを優先。外周の柔らかい影と彫刻の段差を組み合わせる。'},
 {id:'mantle',name:'紋幕の魔眼',en:'05 / ARCANE MANTLE',duration:1920,material:'紋様の遮光幕 × 連続した紺面',me:'眼から文字へつながる紺の幕が開き、彫刻の影が左右へ伸びる。',opp:'深紅の魔眼から広がる紋幕が、細線と文字をまとめて支える。',note:'魔眼と通知全体の一体感を優先。遮光を上部と文字の背面へ連続させる。'},
] as const;
export type Variant=typeof studies[number]['id'];
type C=CanvasRenderingContext2D;
type P={deep:string;mid:string;bright:string;core:string;line:string};
const palette=(s:Side):P=>s==='me'?{deep:'#071c42',mid:'#1763a3',bright:'#55c8fc',core:'#dbf7ff',line:'#90c9f5'}:{deep:'#330c21',mid:'#922a48',bright:'#f57989',core:'#ffe2d5',line:'#e1a8b7'};
const cl=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(x:number)=>1-(1-cl(x))**3;
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
function eye(c:C,p:P,t:number,open:number,id:Variant){c.save();c.scale(1,Math.max(.03,open));c.beginPath();c.moveTo(-31,0);c.bezierCurveTo(-9,-22,9,-22,31,0);c.bezierCurveTo(9,22,-9,22,-31,0);c.strokeStyle='#01050f';c.lineWidth=id==='engraved'?8:6;c.stroke();c.strokeStyle=metal(c,-18,36);c.lineWidth=id==='engraved'?4.4:id==='recess'?3.5:2.8;c.stroke();glow(c,0,0,25,p.bright,.35);diamond(c,0,0,19,p.bright);diamond(c,-2,0,15,p.core);line(c,0,-12,0,12,p.deep,1.8);c.restore();if(t<550)glow(c,0,0,15,p.core,Math.sin(Math.PI*cl(t/550))*.7);}

// Backing follows the same eye opening and closing clock; no detached particles.
function eyeBacking(c:C,p:P,id:Variant,a:number,out:number,t:number){
 c.save();c.globalAlpha*=smooth(a)*(1-out);const open=Math.max(.02,ease((t-55)/300)*(1-out*.8));
 c.scale(1,open);
 const fog=(r:number,alpha:number)=>{const g=c.createRadialGradient(0,0,22,0,0,r);g.addColorStop(0,`rgba(2,8,22,${alpha})`);g.addColorStop(.58,`rgba(3,10,25,${alpha})`);g.addColorStop(.8,`rgba(4,12,28,${alpha*.7})`);g.addColorStop(1,'rgba(4,12,28,0)');c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();};
 if(id==='veil'){fog(85,.97);c.save();c.scale(1.12,.7);fog(65,.62);c.restore();}
 if(id==='engraved'){fog(73,.82);c.beginPath();c.ellipse(0,0,36,21,0,0,Math.PI*2);c.fillStyle='#071225ee';c.fill();}
 if(id==='obsidian'){
  fog(88,.9);c.beginPath();for(let i=0;i<24;i++){const an=i*Math.PI/12-Math.PI/2,r=i%2?65:68;const x=Math.cos(an)*r,y=Math.sin(an)*r;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fillStyle=grad(c,0,-66,0,66,['#263a50','#091427','#040916','#101e34']);c.fill();c.strokeStyle='#9b967f';c.lineWidth=1.3;c.stroke();
  c.save();c.clip();const x=-100+ease((t-100)/700)*200;c.fillStyle=grad(c,x-25,0,x+25,0,['#dbeeff00','#adc6e31e','#dbeeff00']);c.fillRect(x-25,-80,50,160);c.restore();
 }
 if(id==='recess'){
  fog(90,.96);for(const [r,col] of [[69,'#17283c'],[64,'#9d9b85'],[61,'#050b18'],[38,'#24374a'],[34,'#030a18']] as const){c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fillStyle=col;c.fill();}
  c.beginPath();c.arc(0,0,67,Math.PI*.95,Math.PI*1.95);c.strokeStyle='#efe7ce';c.lineWidth=1;c.stroke();
 }
 if(id==='mantle'){
  fog(86,.95);c.beginPath();c.moveTo(0,-76);c.bezierCurveTo(59,-73,66,-35,95,-9);c.bezierCurveTo(125,25,218,36,270,42);c.lineTo(240,75);c.bezierCurveTo(125,59,68,65,0,78);c.bezierCurveTo(-68,65,-125,59,-240,75);c.lineTo(-270,42);c.bezierCurveTo(-218,36,-125,25,-95,-9);c.bezierCurveTo(-66,-35,-59,-73,0,-76);c.closePath();c.fillStyle=grad(c,0,-75,0,78,['#182b40f5','#050c1cf7','#081428f0','#0a172f99']);c.fill();
  c.save();c.clip();for(const s of [-1,1]){c.save();c.scale(s,1);for(let i=0;i<5;i++){c.beginPath();c.moveTo(52+i*4,-40);c.bezierCurveTo(66+i*7,9,108+i*18,27,208+i*10,44+i*3);c.strokeStyle=i===0?'#d4c5a56a':p.line+'26';c.lineWidth=i===0?1:.7;c.stroke();}c.restore();}c.restore();
 }
 c.restore();
}
const artImages=['ASSASSIN4','ANCIENT_CIV','ANTIQUE_DK'].map(key=>{const im=new Image();im.src='/art/cards/'+key+'.webp';return im;});
export const backgroundsReady=Promise.all(artImages.map(im=>im.decode().catch(()=>{})));
function artBackdrop(c:C,w:number,h:number){c.fillStyle='#d2d1c9';c.fillRect(0,0,w,h);const cw=w/3;artImages.forEach((im,i)=>{if(!im.naturalWidth)return;const scale=Math.max((cw-4)/im.width,h/im.height),sw=(cw-4)/scale,sh=h/scale;c.drawImage(im,(im.width-sw)/2,(im.height-sh)/2,sw,sh,i*cw+2,0,cw-4,h);});}

function sigil(c:C,p:P,side:Side,t:number,dur:number,id:Variant){const a=ease((t-90)/380),out=smooth((t-dur+420)/420),v=a*(1-out),d=side==='me'?1:-1;
 c.save();c.scale(1,Math.max(.001,1-out*.8));c.globalAlpha*=1-out;field(c,p,720,168);
 c.save();c.translate(0,-84);c.scale(.65+.35*a,.65+.35*a);
 eyeBacking(c,p,id,a,out,t);
 for(let k=0;k<3;k++){c.save();c.rotate((1-a)*d*(k+1)*.6);c.beginPath();c.arc(0,0,40+k*8,.10+k*.3,Math.PI*2-.12-k*.3);const width=id==='engraved'?(k===1?1.6:3.2):id==='recess'?(k===1?1.1:2.1):(k===1?.95:1.65);c.strokeStyle='#020713';c.lineWidth=width+3;c.stroke();c.strokeStyle=k===1?p.line+'bb':'#e9dec2';c.lineWidth=width;c.stroke();for(let i=0;i<12;i++){const an=i*Math.PI/6;c.save();c.rotate(an);line(c,0,-46-k*8,0,-49-k*8,'#ebdfc1',id==='engraved'?1.6:1);c.restore();}c.restore();}
 eye(c,p,t,ease((t-180)/300)*(1-out),id);diamond(c,0,-63,9,'#f1dfb3');c.restore();
 for(const s of [-1,1]){c.save();c.scale(s,1);c.beginPath();c.rect(0,-140,364*v,250);c.clip();
  c.beginPath();c.moveTo(34,-67);c.bezierCurveTo(102,-18,174,-49,230,-54);c.bezierCurveTo(277,-58,304,-54,338,-72);c.bezierCurveTo(315,-42,284,-25,235,-34);c.bezierCurveTo(162,-48,99,-19,34,-67);c.fillStyle=metal(c,-72,46);c.fill();c.strokeStyle='#e6dbc0';c.lineWidth=.7;c.stroke();
  c.beginPath();c.moveTo(45,-57);c.bezierCurveTo(155,-12,222,-62,324,-57);strokeLight(c,p.bright,1.2);
  c.beginPath();c.moveTo(86,54);c.bezierCurveTo(160,47,220,75,272,56);c.bezierCurveTo(298,47,315,39,333,44);c.bezierCurveTo(301,59,294,78,244,74);c.bezierCurveTo(197,71,128,56,86,54);c.fillStyle=metal(c,47,28);c.fill();c.strokeStyle='#dfd6bd';c.lineWidth=.7;c.stroke();
  for(let i=0;i<18;i++)glyph(c,90+i*12,-53+Math.sin(i*.21)*10,.8,i,p.line+'a0');
  diamond(c,338,-67,15,p.bright);diamond(c,338,-67,10,p.core);c.restore();}
 c.save();c.globalAlpha*=a;line(c,-190,56,190,56,p.line+'60',.8);diamond(c,0,61,7,'#e4d4ae');c.restore();title(c,side,t,dur,12);c.restore();}

export function draw(canvas:HTMLCanvasElement,id:Variant,side:Side,time:number,opts:{background?:'light'|'dark'|'art'|'none';reduced?:boolean;centerY?:number}={}){
 const box=canvas.getBoundingClientRect(),w=box.width,h=box.height,dpr=Math.min(devicePixelRatio||1,2);if(!w||!h)return;
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 const c=canvas.getContext('2d')!;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
 if(opts.background!=='none'){c.fillStyle=opts.background==='light'?'#e1e3df':'#101b2c';c.fillRect(0,0,w,h);if(opts.background==='art')artBackdrop(c,w,h);}
 const dur=studies.find(s=>s.id===id)!.duration;canvas.dataset.time=String(Math.round(time));if(time<=0||time>=dur)return;
 c.save();c.translate(w/2,opts.centerY??h/2+10);const scale=Math.min((w-14)/740,1.08,h/280);c.scale(scale,scale);
 if(opts.reduced){c.globalAlpha=Math.min(cl(time/90),cl((dur-time)/90));time=950;}
 sigil(c,palette(side),side,time,dur,id);c.restore();
}

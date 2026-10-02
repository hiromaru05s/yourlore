let materialImage:HTMLImageElement|undefined;
export function setMaterialImage(image:HTMLImageElement|undefined){materialImage=image}
export const sat=(n:number)=>Math.max(0,Math.min(1,n));
export const smooth=(n:number)=>{n=sat(n);return n*n*(3-2*n)};
export const pulse=(t:number,a:number,b:number,c:number)=>smooth((t-a)/(b-a))*(1-smooth((t-b)/(c-b)));
export type Point={x:number;y:number};
export function shape(c:CanvasRenderingContext2D,path:string,fill:string,stroke?:string,width=1){const p=new Path2D(path);c.fillStyle=fill;c.fill(p);if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke(p)}}
export function line(c:CanvasRenderingContext2D,points:number[][],color:string,width:number){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.stroke()}
export function polygon(c:CanvasRenderingContext2D,pts:number[][],fill:string,stroke?:string){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.7;c.stroke()}}
export function flame(c:CanvasRenderingContext2D,x:number,y:number,s:number,t:number,variant:number){
 c.save();c.translate(x,y);c.scale(s,s);const w=Math.sin(t*.008)*4;
 if(!variant){
  shape(c,`M 0 15 C -26 12 -30 -9 -18 -28 C -22 -8 -2 -15 -12 -48 C 13 -32 23 -47 17 -65 C 42 -30 20 -21 29 -10 C 22 15 11 19 0 15`,'#6b1d19','#f5782e',1.3);
  shape(c,`M -6 9 C -18 -1 -11 -18 -9 -21 C 4 -9 8 -36 10 -45 C 26 -24 ${9+w} -10 18 -5 C 14 9 7 13 -6 9`,'#f57526','#ffc366',.8);
  shape(c,'M -4 7 Q -11 -3 1 -15 L 4 -31 Q 16 -7 8 5Z','#ffe4a0');
  line(c,[[-17,2],[-21,-5],[-19,-17]],'#d8411f',1.5);
 }else{
  for(let j=0;j<4;j++){c.save();c.translate((j%2?1:-1)*(7+j*2),-j*10);c.rotate((j%2?1:-1)*(.2+j*.1));polygon(c,[[-10,10],[-14,-6],[4,-22],[13,-12],[8,12]],j%2?'#8f351b':'#bc5b26','#f7c276');polygon(c,[[-10,10],[4,-22],[0,4]],'#f39336');line(c,[[4,-22],[0,4],[8,12]],'#fff0ba',1.1);c.restore()}
  shape(c,'M -4 8 Q -10 -11 0 -26 Q 11 -6 6 9Z','#ffe4a0');
 }
 if(materialImage?.complete&&materialImage.naturalWidth){c.save();const mask=new Path2D(variant?'M -24 8 L -25 -23 L 12 -65 L 25 -26 L 15 15Z':'M 0 15 C -26 12 -30 -9 -18 -28 C -22 -8 -2 -15 -12 -48 C 13 -32 23 -47 17 -65 C 42 -30 20 -21 29 -10 C 22 15 11 19 0 15');c.clip(mask);c.globalAlpha=.34;c.globalCompositeOperation='multiply';c.drawImage(materialImage,-30,-67,64,86);c.restore()}
 for(let j=0;j<7;j++){const k=j*3.4;line(c,[[-12+k,7],[-18+k,-7],[-8+k,-20],[-14+k,-34]],j%2?'#d23e22':'#ffc873',.35)}c.restore();
}
export function hotSurface(c:CanvasRenderingContext2D,t:number,amount:number,variant:number){
 c.save();c.globalAlpha=sat(amount);c.lineCap='round';
 const veins=[[[20,112],[34,92],[26,75],[47,62],[51,32]],[[77,113],[62,94],[76,68],[59,53],[65,27]],[[12,77],[35,80],[48,63],[82,54]]];
 for(const p of veins){line(c,p,'#6d261c',4);line(c,p,'#e78339',2);line(c,p,'#ffe2aa',.55)}
 const flow=smooth((t-480)/900),peel=smooth((t-900)/950);
 for(let j=0;j<3;j++){c.save();c.translate(30+j*19,98-j*7);const bend=Math.sin(t*.007+j)*3,tip=-24-flow*24;
  if(!variant){shape(c,`M -7 7 Q -12 -7 -4 -22 Q ${bend+3} -32 ${bend-3} ${tip} Q 14 -29 6 -10 Q 12 2 3 10Z`,'#8b361d');shape(c,`M -3 7 Q -8 -6 0 -22 L ${bend-2} ${tip+7} Q 9 -22 3 -5 L 4 7Z`,'#ef8c35');line(c,[[0,5],[2,-9],[bend-1,tip+11]],'#ffe2a1',.65);}
  else {const w=6*(1-peel*.7);c.rotate((j-1)*peel*.24);polygon(c,[[-w,8],[-w-2,-18],[w*.5,-38],[w+1,-9],[w,12]],'#725035');polygon(c,[[-w-2,-18],[w*.5,-38],[w+1,-9],[0,8]],'#ad7135');line(c,[[-w-2,-18],[w*.5,-38],[w+1,-9]],'#ffe1a1',.8);shape(c,`M ${w} -9 Q ${w+9} -19 ${w+6} ${tip-15*peel} L ${w-1} -20Z`,'#e97724');}
  c.restore();}

 c.restore();
}
const weaponPaths:Record<string,string>={KNIGHT:'M 43 72 L 53 79 L 83 112 L 89 127 L 74 119 L 45 86 L 38 79Z M 42 85 L 55 72 L 61 76 L 46 91Z',MAGE:'M 22 113 L 25 47 L 28 45 L 27 113Z M 27 30 L 39 43 L 27 58 L 15 44Z M 27 36 L 33 43 L 27 51 L 20 44Z',ARCHER:'M 69 31 Q 99 69 68 114 L 74 109 Q 92 72 72 39Z M 71 35 L 74 110 L 41 65Z M 35 64 L 81 65 L 77 60 L 94 67 L 77 73 L 81 68 L 35 67Z',ROGUE:'M 13 43 L 31 51 L 29 57 L 10 47Z M 30 51 L 47 64 L 26 57Z M 59 86 L 66 83 L 82 105 L 78 109Z M 82 105 L 92 125 L 76 111Z'};
export function weapon(c:CanvasRenderingContext2D,id:string,t:number,amount:number,variant:number){
 c.save();c.globalAlpha=sat(amount);const key=Object.keys(weaponPaths).find(k=>id.includes(k))??'KNIGHT';
 if(variant){const split=smooth(t/500)*10;for(const sign of [-1,1]){c.save();c.translate(sign*split,0);const points=[[50+sign*16,35],[50+sign*28,29],[50+sign*33,99],[50+sign*18,117],[50+sign*24,73]];polygon(c,points,'#655c64','#b7a9b1');if(materialImage?.complete&&materialImage.naturalWidth){c.save();c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();c.globalAlpha*=.68;c.drawImage(materialImage,8,25,84,98);c.restore()}for(let j=0;j<4;j++)line(c,[[50+sign*20,43+j*17],[50+sign*28,46+j*17]],'#dbcec0',.55);c.restore()}}
 shape(c,weaponPaths[key],'#35313e','#e8d8bb',1.8);shape(c,weaponPaths[key],'#6c536e','#d4b8f5',.6);
 for(let j=0;j<4;j++){const x=23+j*17;line(c,[[x,112],[x+5,91],[x-2,75],[x+4,54]],'#4b365d',2.3);line(c,[[x,112],[x+5,91],[x-2,75],[x+4,54]],'#dbc9f3',.55)}
 c.restore();
}
export function projectile(c:CanvasRenderingContext2D,a:Point,b:Point,u:number,width:number,t:number,variant:number,arrow=false){
 if(u<0||u>1)return;const k=smooth(u),x=a.x+(b.x-a.x)*k,y=a.y+(b.y-a.y)*k-Math.sin(k*Math.PI)*width*.9,angle=Math.atan2(b.y-a.y,b.x-a.x)+Math.PI/2;
 c.save();c.translate(x,y);c.rotate(angle);c.scale(width/65,width/65);
 const speed=Math.sin(Math.PI*u)**.7,tail=18+speed*100,tip=-28-speed*27,sway=Math.sin(t*.018)*3;
 // One connected mass elongates from a compressed root; only the leading cut carries a bright edge.
 const contour=`M 0 ${tip} Q 17 ${tip+12} 16 -6 C 24 10 10 23 15 ${tail*.48} Q 6 ${tail*.8} 17 ${tail} Q -8 ${tail*.76} -4 ${tail*.44} C -23 25 -15 5 -18 -4 Q -12 ${tip+10} 0 ${tip}Z`;
 if(variant){
  const burn=smooth((u-.12)/.88);
  for(let j=0;j<3;j++){c.save();c.translate((j-1)*(8+burn*6),(j-1)*15);c.rotate((j-1)*(.08+burn*.1));const w=(9-j*.8)*(1-burn*.6),front=tip+8+j*5,end=tail*(.72+j*.1),cut=12+burn*29;
   const sheet=`M ${-w} ${front+17} L ${w*.4} ${front} L ${w+3} ${front+29} L ${w*.5} 4 Q ${w+8} ${end*.5} ${w-cut*.1} ${end} L ${-w*.1} ${end-cut} L ${-w*1.5} ${end*.53} L ${-w*.6} -4Z`;
   shape(c,sheet,'#b06a2a');shape(c,`M ${-w} ${front+17} L ${w*.4} ${front} L ${w*.1} -8 L ${-w*.5} ${end*.55} L ${-w*1.5} ${end*.53}Z`,'#4f3826');
   if(materialImage?.complete&&materialImage.naturalWidth){c.save();c.clip(new Path2D(sheet));c.globalAlpha=.35;c.globalCompositeOperation='multiply';c.drawImage(materialImage,-w*1.5,front,w*3,end-front);c.restore()}
   line(c,[[w*.4,front],[w+3,front+29],[w*.5,4],[w+2,end*.5]],'#ffd494',1.3);
   shape(c,`M ${w*.4} ${front+20} Q ${w+6} -2 ${w*.2} ${end*.4} Q ${w+10} ${end*.67} ${w-cut*.1} ${end} L ${w*.1} ${end-cut} Q ${w+2} ${end*.5} ${w*.1} 3Z`,'#f89536');c.restore();
  }
  if(arrow)line(c,[[0,tip-7],[0,tail*.34]],'#ffe7ad',1.4);c.restore();return;
 }
 shape(c,contour,'#d85b1e');
 shape(c,`M -8 ${tip+15} Q -19 ${tip+24} -17 0 C -12 19 -9 24 -4 ${tail*.44} Q -8 ${tail*.68} 8 ${tail*.88} Q -15 ${tail*.65} -14 ${tail*.35} C -25 8 -19 -2 -8 ${tip+15}Z`,'#78301c');
 shape(c,`M 0 ${tip+4} Q 13 ${tip+18} 10 -2 C 16 13 2 27 9 ${tail*.6} Q ${sway} ${tail*.77} 7 ${tail*.88} C -14 ${tail*.58} -5 20 -12 4 Q -10 ${tip+21} 0 ${tip+4}Z`,'#e96520');
 shape(c,`M 0 ${tip+9} Q 9 ${tip+22} 5 -1 C 11 14 -4 20 3 ${tail*.42} Q -9 18 -6 5 Q -7 ${tip+25} 0 ${tip+9}Z`,'#ffc376');
 if(materialImage?.complete&&materialImage.naturalWidth){c.save();c.clip(new Path2D(contour));c.globalAlpha=.24;c.globalCompositeOperation='multiply';c.drawImage(materialImage,-20,tip,40,tail-tip);c.restore()}
 c.beginPath();c.moveTo(0,tip+4);c.quadraticCurveTo(13,tip+15,10,-2);c.strokeStyle='#ffe4a5';c.lineWidth=.65;c.stroke();
 // Secondary tongue opens away from the trailing edge, never an independent circular glow.
 shape(c,`M -10 5 Q -22 18 -20 ${tail*.48} Q -30 ${tail*.67} -27 ${tail*.85} Q -14 ${tail*.63} -16 ${tail*.39}Z`,'#ad3c1b');

 if(arrow){polygon(c,[[-2,6],[-2,tip+8],[-7,tip+13],[0,tip-10],[7,tip+13],[2,tip+8],[2,6]],'#b76e31');line(c,[[0,tip-10],[0,6]],'#ffecb0',.8)}
 c.restore();
}
export function impact(c:CanvasRenderingContext2D,p:Point,w:number,u:number,variant:number){
 if(u<0||u>1)return;const spread=1-(1-sat(u/.32))**3,tear=smooth((u-.22)/.78);c.save();c.translate(p.x,p.y);
 // Torn sheets expand at contact, then become open tapering cuts. No intact projectile returns.
 for(let j=0;j<4;j++){c.save();c.rotate(j*1.51+.21);const length=w*(.3+spread*.68),thick=w*.2*(1-tear),inner=w*(.05+tear*.38);c.translate(0,-tear*w*.19);
  shape(c,`M ${-thick} ${inner} Q ${-thick*1.7} ${-length*.3} ${-thick*.45} ${-length*.63} L ${thick*.2} ${-length} Q ${thick*.1} ${-length*.3} ${thick} ${-length*.2} L ${thick*.3} ${inner*.2}Z`,j%2?'#a94320':'#ed7a27');
  if(tear<.83)shape(c,`M ${-thick*.5} ${-length*.1} Q ${-thick*.6} ${-length*.4} ${-thick*.1} ${-length*.66} L ${thick*.15} ${-length*.82} L ${thick*.2} ${-length*.2}Z`,'#ffd69a');
  if(variant&&u<.65){const r=thick*.35;polygon(c,[[-r,-length*.3],[r,-length*.35],[r*.4,-length*.55],[-r*.7,-length*.51]],'#74502e','#da9c4d')}
  c.restore()}
 c.restore();
}
export function relief(c:CanvasRenderingContext2D,kind:string,t:number,a:number,v:number){
 c.save();c.globalAlpha=sat(a);const settle=smooth(t/700);if(kind==='wax'){c.translate(0,-(1-settle)*26);c.translate(50,70);c.scale(1+(1-settle)*.22,1-(1-settle)*.18);c.translate(-50,-70)}
 if(kind==='stone')for(let j=0;j<5;j++){c.save();c.translate((j%2?1:-1)*(1-settle)*18,j*2);polygon(c,[[18+j*12,45+j*9],[33+j*9,44+j*9],[39+j*8,72+j*8],[20+j*10,76+j*8]],j%2?'#777064':'#b8ad96','#ebe1c6');line(c,[[22+j*10,52+j*8],[28+j*9,56+j*8],[24+j*10,69+j*8]],'#3b777d',1.4);c.restore()}
 else if(kind==='metal')for(const s of [-1,1]){c.save();c.translate(50+s*(1-settle)*23,70);c.rotate(s*(1-settle)*.3);c.scale(.35+.65*sat(a),1);polygon(c,[[s*13,-29],[s*28,-22],[s*29,35],[s*18,40],[s*11,23],[s*18,10]],'#343f46','#cfb479');polygon(c,[[s*18,-23],[s*24,-19],[s*24,27],[s*19,30]],'#668087','#e4cea1');for(let j=0;j<3;j++){c.fillStyle='#e7c681';c.fillRect(s*21-1,-14+j*16,2,2)}c.restore()}
 else if(kind==='crystal')for(let j=0;j<4;j++){c.save();c.translate(50,75);c.rotate(j*Math.PI/2+(v?1-settle:0));polygon(c,[[0,-9],[-10,-22],[0,-42],[10,-22]],'#244951','#a2d6d3');polygon(c,[[0,-9],[0,-42],[10,-22]],'#72adad');line(c,[[0,-42],[-10,-22]],'#efffe5',1);c.restore()}
 else if(kind==='banner'){for(let j=0;j<5;j++){const x=50+(19+j*12-50)*settle,y=35+Math.sin(t*.003+j*.6)*2,fold=3+10*settle;polygon(c,[[x,y],[x+fold,y+3],[x+fold-1,110-j%2*7],[x,118]],j%2?'#283e61':'#41567b','#ceb78c');for(let z=0;z<8;z++)line(c,[[x+2,43+z*8],[x+fold-2,45+z*8]],'#70839b',.35)}line(c,[[20,34],[19,122]],'#d9c392',2)}
 else if(kind==='shield'){polygon(c,[[27,46],[50,36],[73,46],[67,95],[50,110],[33,95]],'#334851','#d4bf96');polygon(c,[[31,48],[50,42],[50,103],[37,92]],'#6f8290');line(c,[[50,43],[50,97]],'#d8c398',2);line(c,[[33,65],[67,65]],'#d8c398',2)}
 else if(kind==='wax'){shape(c,'M 32 76 Q 23 59 36 51 Q 45 39 60 51 Q 79 56 68 74 Q 64 90 48 86 Q 31 90 32 76Z','#652f28','#e2a579',1.8);shape(c,'M 43 59 L 57 59 L 60 70 L 50 79 L 40 70Z','#b36948','#efce99',1);line(c,[[45,68],[50,73],[57,63]],'#502920',2)}
 else if(kind==='tags')for(let j=0;j<3;j++){c.save();c.translate(27+j*18,53+j%2*9);c.rotate((1-settle)*.6*(j-1));polygon(c,[[0,0],[15,2],[17,31],[3,36]],'#6e6e61','#dbcca2');line(c,[[4,12],[11,13],[7,24]],'#343b39',1.5);c.restore()}
 c.restore();
}
export function arrowMark(c:CanvasRenderingContext2D,x:number,y:number,s:number,up:boolean,red=false,v=0){c.save();c.translate(x,y);c.scale(s,s*(up?1:-1));const dark=red?'#6f2738':'#233f68',mid=red?'#c86470':'#5b95c1',light=red?'#ffd5c2':'#d7f0f3';shape(c,v?'M -5 18 L -5 0 L -14 0 L 0 -18 L 14 0 L 5 0 L 5 18Z':'M -8 17 L -8 1 L -16 1 L 0 -19 L 16 1 L 8 1 L 8 17Z',dark,light,1);polygon(c,[[0,-16],[-11,-1],[-4,-1],[-4,14],[0,14]],mid);line(c,[[0,-16],[0,14]],light,.65);c.restore()}
export function slash(c:CanvasRenderingContext2D,a:Point,b:Point,u:number,w:number,v:number){if(u<0||u>1)return;c.save();c.translate(a.x,a.y);c.rotate(Math.atan2(b.y-a.y,b.x-a.x));const length=Math.hypot(b.x-a.x,b.y-a.y),head=smooth(u)*length,tail=Math.max(0,head-w*2.6),width=w*.19*Math.sin(Math.PI*u);c.globalAlpha=1-smooth((u-.7)/.3);shape(c,`M ${tail} 0 Q ${head-w} ${-width*2} ${head} 0 Q ${head-w*.7} ${width} ${tail} 0Z`,v?'#b1b8b3':'#847057',v?'#f2f2d7':'#fff0c3',1);line(c,[[tail,0],[head-w*.2,-width*.3],[head,0]],'#3e4550',.7);c.restore()}
export function engraving(c:CanvasRenderingContext2D,t:number,a:number,v:number){c.save();c.globalAlpha=sat(a);const d=smooth(t/650);for(let j=0;j<4;j++){const x=23+j*17;line(c,[[x,116],[x,96],[x+(v?-8:8),85],[x+(v?-8:8),64],[x,53]],'#243c45',3);line(c,[[x,116],[x,96],[x+(v?-8:8),85],[x+(v?-8:8),64],[x,53]],'#87bbc2',1.3);line(c,[[x,116-63*d],[x,111-63*d]],'#ebf4d7',2)}c.restore()}
/** Authored along the current Attune artwork: central facets, brass pivots, stone plinth. */
export function attuneSurface(c:CanvasRenderingContext2D,t:number,amount:number,v:number){c.save();c.globalAlpha=sat(amount);const q=smooth((t-250)/950);if(v){for(let j=0;j<5;j++){c.save();c.translate(48,73);c.rotate((1-q)*(j-2)*.13);const x=(j-2)*8;polygon(c,[[x,29],[x-8,-3],[x+2,-32],[x+11,-6]],j%2?'#205b89':'#4589aa','#c1eddf');polygon(c,[[x,29],[x+2,-32],[x+6,1]],'#81c7d0');for(let z=0;z<3;z++)line(c,[[x-4,-12+z*11],[x+4,-16+z*12],[x+7,-8+z*11]],'#bcefe1',.4);c.restore()}}else{for(let j=0;j<6;j++){const x=32+j*6;line(c,[[x,104],[x-5,89],[x+3,73],[x-2,56],[x+4,36]],'#23577b',2.3);line(c,[[x,104],[x-5,89],[x+3,73],[x-2,56],[x+4,36]],'#aae1e4',.6)}}
 for(const n of [-1,1]){c.beginPath();c.ellipse(48,70,29,15,n*.55,Math.PI*.12,Math.PI*1.05);c.lineWidth=2;c.strokeStyle='#907248';c.stroke();c.lineWidth=.65;c.strokeStyle='#efd69c';c.stroke()}
 for(let j=0;j<3;j++){const y=105+j*5;line(c,[[24-j*3,y],[48,y+4],[72+j*3,y]],j%2?'#eadcc1':'#847e70',1.5)}c.restore();}
export function castleSurface(c:CanvasRenderingContext2D,t:number,amount:number,v:number){c.save();c.globalAlpha=sat(amount);const q=smooth((t-200)/1100);if(v){for(const n of [-1,1]){c.save();c.translate(50+n*19,37);c.scale(.8,.9);const bend=(1-q)*n*18;shape(c,`M -7 0 L 9 0 Q ${14+bend} 27 8 62 L 0 72 L -8 61 Q ${-12+bend} 29 -7 0`,'#263d61','#cdbb91',.7);line(c,[[0,5],[0,57]],'#cdbb91',.8);c.restore()}}else{for(const n of [-1,1])for(let j=0;j<5;j++){const x=50+n*24,y=44+j*13;polygon(c,[[x-10,y],[x+10,y-2],[x+11,y+10],[x-11,y+12]],j%2?'#aaa58f':'#ded3b6','#665f55');line(c,[[x-10,y],[x+10,y-2]],'#f5e6c7',.9)}}
 c.beginPath();c.moveTo(37,118);c.lineTo(37,88);c.quadraticCurveTo(50,60,63,88);c.lineTo(63,118);c.lineWidth=4;c.strokeStyle='#565547';c.stroke();c.lineWidth=1;c.strokeStyle='#e7d3a0';c.stroke();for(let j=0;j<5;j++){const x=39+j*5;line(c,[[x,89],[x,117]],'#bd9f66',1)}c.restore();}
/** The art itself supplies the lifted faces; cuts follow the card's local plane. */
export function fracture(c:CanvasRenderingContext2D,t:number,a:number,v:number){c.save();c.globalAlpha=a;const q=smooth((t-1700)/700);
 if(!v){for(let j=0;j<4;j++){const x=18+j*19,path=[[x,32],[x+7,57],[x-3,80],[x+10,117]];line(c,path,'#29262a',.7+q*2.5);line(c,path.map(([x,y])=>[x+1.2,y]),'#e0c9a2',.55);line(c,[[x+7,57],[x+18,48]],'#474045',q*1.3);}}
 else for(let j=0;j<3;j++){c.save();const x=15+j*25,y=43+j*17,shift=q*(3+j);c.translate(shift,-shift*.45);polygon(c,[[x,y],[x+22,y-8],[x+19,y+36],[x-3,y+46]],'#4d3b32','#d6bb8d');if(materialImage?.complete&&materialImage.naturalWidth){c.save();c.beginPath();c.moveTo(x,y);c.lineTo(x+22,y-8);c.lineTo(x+19,y+36);c.lineTo(x-3,y+46);c.closePath();c.clip();c.drawImage(materialImage,0,0,100,150);c.restore()}line(c,[[x,y],[x+22,y-8],[x+19,y+36]],'#e6d7b9',.65);c.restore();}
 c.restore();}
export function withMaterialImage(image:HTMLImageElement|undefined,draw:()=>void){const previous=materialImage;materialImage=image;try{draw()}finally{materialImage=previous}}

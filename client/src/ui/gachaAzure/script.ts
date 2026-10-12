import * as T from 'three';
import {canvasMap} from './materials';
export const themes=[
 {name:'星環の綴書',en:'SIDEREAL FOLIO',tag:'星図 / 円周へ伝う光',body:'#172c50',ink:'#17364d',glow:'#27bcff',metal:'#b7a274',duration:14,note:'目とコンパス環を掲げた白亜の回廊。深藍の魔導書が開き、星図を取り囲む秘字へ、中心からマナが伝わる。',beat:'中心 → 星図の文字帯 → 頁の周縁。'},
 {name:'紅綬の契書',en:'VERMILION COVENANT',tag:'封緘 / 綴じ目から走る光',body:'#642d37',ink:'#49282d',glow:'#ff9c35',metal:'#b99d78',duration:14,note:'赤い垂れ布と浮かぶ封架。紅革の本に刻まれた縦組みの秘字が、綴じ目に近い列から外へ順番に点灯する。',beat:'綴じ目 → 文字の列 → 外縁の封緘。'},
 {name:'枝脈の記録',en:'SILVER ARBOR',tag:'枝脈 / 分岐する文字の光',body:'#cccfbd',ink:'#203c41',glow:'#44edc0',metal:'#b7c3be',duration:14,note:'白い柱に細い銀枝が沿う回廊。象牙色の魔導書が開き、根から枝先へ、文字で編まれた記録が光を通す。',beat:'根元 → 分岐 → 葉先の注記。'},
 {name:'重層の秘字',en:'PALIMPSEST GLASS',tag:'重層 / 文字層が応答する光',body:'#20384c',ink:'#26374a',glow:'#879dff',metal:'#aebfca',duration:14,note:'宙に支えられた幾何学の書架と青白い天窓。薄い文字層が一段ずつ応答し、最後に見開き全体が静かに輝く。',beat:'欄外 → 交差する文字層 → 見開き全体。'},
] as const;
const hash=(x:number)=>Math.abs(Math.sin(x*97.713+13.4)*43758.51)%1;
// Draw an invented stroke vocabulary. No fonts, alphabets, or Unicode text are used.
export function glyph(c:CanvasRenderingContext2D,x:number,y:number,size:number,seed:number){
 c.save();c.translate(x,y);c.scale(size,size);c.lineWidth=.095;c.lineCap='round';c.lineJoin='round';
 const k=Math.floor(hash(seed)*24);c.beginPath();
 c.moveTo(-.31,-.36);c.quadraticCurveTo(.14,-.54,.25,-.16);c.lineTo(.05,.34);
 if(k%2===0){c.moveTo(-.34,.18);c.lineTo(.32,-.02);c.lineTo(.36,.21)}else{c.moveTo(-.25,-.04);c.quadraticCurveTo(-.48,.32,.13,.27)}
 if(k%3===0){c.moveTo(-.12,-.48);c.lineTo(.02,-.66);c.lineTo(.22,-.44)}
 if(k%3===1){c.moveTo(-.36,.39);c.lineTo(-.13,.48);c.lineTo(.02,.35)}
 if(k%4===0){c.moveTo(.30,-.33);c.lineTo(.48,-.46);c.lineTo(.5,-.26)}
 if(k%5===0){c.moveTo(-.38,-.1);c.lineTo(-.54,-.28)}
 c.stroke();c.beginPath();c.arc(k%2?.40:-.42,.36,.050,0,Math.PI*2);c.fill();c.restore();
}
export function manuscript(_style:number,seed=0){
 const w=768,h=1056,maskCanvas=document.createElement('canvas');maskCanvas.width=w;maskCanvas.height=h;
 const mc=maskCanvas.getContext('2d')!;mc.fillStyle='#000';mc.fillRect(0,0,w,h);
 const sheet=canvasMap(w,h,c=>{
  c.fillStyle='#ded5bd';c.fillRect(0,0,w,h);
  for(let i=0;i<6500;i++){c.fillStyle=`rgba(62,40,18,${hash(i+seed*37)*.07})`;c.fillRect(hash(i+1)*w,hash(i+3)*h,1+hash(i+6)*2,1)}
  const ink='#233843',accent='#865948';c.strokeStyle=ink;c.fillStyle=ink;c.lineWidth=1.25;
  c.globalAlpha=.42;c.strokeRect(43,48,682,960);c.strokeRect(48,53,672,950);c.globalAlpha=1;
  let serial=seed*997;
  const mark=(x:number,y:number,s:number,phase:number)=>{c.strokeStyle=ink;c.fillStyle=ink;glyph(c,x,y,s,serial++);mc.strokeStyle=mc.fillStyle=`rgb(255,${Math.floor(Math.min(.94,Math.max(.02,phase))*255)},0)`;glyph(mc,x,y,s,serial-1)};
  const row=(y:number,x1=83,x2=690,size=19,phase=.8)=>{for(let x=x1;x<x2;x+=size*1.37){if(hash(x+y+seed)>.13)mark(x,y,size,phase+(x-x1)/800*.08)}};
  const para=(y:number,rows:number,x1=83,x2=685,size=16)=>{for(let n=0;n<rows;n++)row(y+n*size*1.5,x1,x2-(n===rows-1?30+hash(seed+y)*80:0),size,.72+n*.018)};
  // Ink and emission share the exact paths, including the compass and its spokes.
  const trace=(draw:(ctx:CanvasRenderingContext2D)=>void,phase=.34)=>{
   c.beginPath();draw(c);c.stroke();
   mc.save();mc.lineWidth=1.8;mc.strokeStyle=`rgb(255,${Math.round(phase*255)},0)`;mc.beginPath();draw(mc);mc.stroke();mc.restore();
  };
  const line=(x1:number,y1:number,x2:number,y2:number)=>trace(ctx=>{ctx.moveTo(x1,y1);ctx.lineTo(x2,y2)},.23+Math.min(.5,Math.hypot((x1+x2)/2-380,(y1+y2)/2-510)/650));
  const circle=(x:number,y:number,r:number)=>trace(ctx=>ctx.arc(x,y,r,0,Math.PI*2),.13+Math.min(.65,r/400));
  const eye=(x:number,y:number,r:number)=>{trace(ctx=>{ctx.moveTo(x-r,y);ctx.quadraticCurveTo(x,y-r*.70,x+r,y);ctx.quadraticCurveTo(x,y+r*.70,x-r,y)},.12);circle(x,y,r*.28)};
  const dial=(x:number,y:number,r:number)=>{circle(x,y,r);circle(x,y,r*.87);for(let i=0;i<48;i++){let a=i/48*Math.PI*2;line(x+Math.cos(a)*r*.89,y+Math.sin(a)*r*.89,x+Math.cos(a)*r*(i%4? .96:1.04),y+Math.sin(a)*r*(i%4?.96:1.04))}};
  // Each recto/verso has a different composition, paragraph rhythm, diagram and marginalia.
  const layout=seed===17?7:seed;
  row(95,91,475,21,.84);c.strokeStyle=accent;line(80,125,690,125);for(let n=0;n<4;n++)mark(618+n*19,96,12,.94);
  if(layout===0){
   para(158,3,85,685,17);const cx=seed===0?384:360,cy=520;
   for(const r of [118,173,232]){circle(cx,cy,r);const count=Math.floor(r/5.4);for(let i=0;i<count;i++){const a=i/count*Math.PI*2;c.save();mc.save();c.translate(cx,cy);mc.translate(cx,cy);c.rotate(a);mc.rotate(a);mark(0,-r,17,r/340*.75+i/count*.11);c.restore();mc.restore()}}
   eye(cx,cy,76);for(let i=0;i<7;i++){const a=i/7*Math.PI*2+.12;line(cx+Math.cos(a)*128,cy+Math.sin(a)*128,cx+Math.cos(a)*162,cy+Math.sin(a)*162)}para(805,6,85,681,17);
  }else if(layout===1){
   para(166,4,88,660,16);for(let k=0;k<3;k++){const y=373+k*182;dial(214,y,66-k*6);eye(214,y,28);para(y-55,5,325,668,15);line(282,y,305,y)}para(929,2,90,663,15);
  }else if(layout===2){
   const cx=384,cy=442;dial(cx,cy,204);for(let i=0;i<6;i++){c.save();c.translate(cx,cy);c.rotate(i*.45);c.beginPath();c.ellipse(0,0,170,58+i*6,0,0,Math.PI*2);c.stroke();c.restore()}
   eye(cx,cy,50);for(let i=0;i<12;i++){let a=i/12*Math.PI*2;mark(cx+Math.cos(a)*226,cy+Math.sin(a)*226,21,i/16)}para(745,8,83,685,16);
  }else if(layout===3){
   for(let col=0;col<2;col++){const x=87+col*327;for(let r=0;r<9;r++){const y=190+r*82;circle(x+22,y,19);mark(x+22,y,22,r/14);para(y-14,2,x+65,x+275,14)}}
   c.strokeStyle=accent;line(384,157,384,924);para(963,1,86,660,14);
  }else if(layout===4){
   para(174,3,85,668,18);c.beginPath();let last=[111,660];c.moveTo(...last as [number,number]);for(let i=0;i<11;i++){const x=106+i*52,y=540+Math.sin(i*.81+seed)*160;c.lineTo(x,y);circle(x,y,9+i%3*3);mark(x+12,y-25,18,i/13);if(i%3===0)para(y+23,2,x-15,x+95,11)}c.stroke();para(818,7,85,670,16);
  }else if(layout===5){
   para(176,6,85,666,16);for(let k=0;k<2;k++){const x=244+k*283;dial(x,585,113);eye(x,585,42);for(let i=0;i<18;i++){const a=i/18*Math.PI*2;mark(x+Math.cos(a)*91,585+Math.sin(a)*91,15,i/23)}}line(357,585,413,585);para(780,8,85,670,16);
  }else if(layout===6){
   para(176,5,85,670,16);for(let i=0;i<5;i++){let y=395+i*93;c.strokeStyle=i%2?ink:accent;line(96,y,673,y);for(let j=0;j<7;j++){mark(119+j*84,y+35,23,(i*7+j)/45);circle(119+j*84,y+35,27)}}para(910,3,87,677,15);
  }else if(seed===7){
   para(175,4,86,680,16);const nodes=[[382,345],[178,681],[592,681]];c.beginPath();c.moveTo(382,345);c.lineTo(178,681);c.lineTo(592,681);c.closePath();c.stroke();
   for(let i=0;i<3;i++){const [x,y]=nodes[i];dial(x,y,65);eye(x,y,26);for(let n=0;n<8;n++){const a=n/8*Math.PI*2;mark(x+Math.cos(a)*85,y+Math.sin(a)*85,16,i*.22+n*.02)}}
   circle(383,565,84);for(let y=536;y<610;y+=26)row(y,327,444,14,.8);para(834,6,86,681,16);
  }else if(layout===7){
   para(169,3,83,683,16);const cx=375,cy=499;dial(cx,cy,201);
   c.strokeStyle=accent;for(let i=0;i<8;i++){const a=i/8*Math.PI*2;line(cx,cy,cx+Math.cos(a)*181,cy+Math.sin(a)*181);mark(cx+Math.cos(a)*219,cy+Math.sin(a)*219,24,.28+i*.055)}
   c.strokeStyle=ink;trace(ctx=>{ctx.moveTo(cx,cy-163);ctx.lineTo(cx+65,cy);ctx.lineTo(cx,cy+163);ctx.lineTo(cx-65,cy);ctx.closePath()},.27);eye(cx,cy,38);
   para(762,8,83,364,14);para(762,8,414,681,14);
  }else if(layout===8){
   para(175,4,86,681,17);c.strokeStyle=ink;
   for(let i=0;i<4;i++){let x=150+i*150;dial(x,475,48+i*7);circle(x,475,17);line(x,390,x,655);para(692,6,x-48,x+67,12)}line(94,475,688,475);para(918,3,86,683,14);
  }else if(layout===9){
   para(175,3,86,683,16);dial(293,510,189);for(let i=0;i<12;i++){const a=i/12*Math.PI*2;circle(293+Math.cos(a)*94,510+Math.sin(a)*94,81)}
   for(let i=0;i<5;i++){mark(567,339+i*90,29,i*.15);para(331+i*90,2,604,697,12)}para(807,7,86,681,16);
  }else if(layout===10){
   para(177,3,87,673,16);c.beginPath();for(let i=0;i<480;i++){const a=i*.059,r=20+i*.42;const x=374+Math.cos(a)*r,y=534+Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y)}c.stroke();
   for(let i=0;i<110;i++){const a=i*.255,r=20+i*1.85;mark(374+Math.cos(a)*r,534+Math.sin(a)*r,13,i/135)}para(839,5,86,683,16);
  }else if(layout===11){
   para(175,4,86,666,16);const pts=Array.from({length:18},(_,i)=>[115+hash(i+seed)*534,349+hash(i*4+seed)*355]);c.strokeStyle=ink;
   for(let i=0;i<pts.length;i++){const [x,y]=pts[i];for(let j=i+1;j<pts.length;j++)if(Math.hypot(x-pts[j][0],y-pts[j][1])<150)line(x,y,pts[j][0],pts[j][1]);circle(x,y,5+i%4*2);mark(x+12,y-11,14,i/23)}para(800,8,86,684,16);
  }else if(layout===12){
   para(175,3,86,683,16);for(let i=0;i<6;i++){const x=227+i%2*317,y=378+Math.floor(i/2)*208;circle(x,y,56);c.beginPath();c.ellipse(x,y,8+i*7,56,0,-Math.PI/2,Math.PI/2);c.stroke();row(y+80,x-103,x+118,13,.15+i*.12)}
   para(931,2,86,683,14);
  }else if(layout===13){
   para(174,16,86,346,15);para(174,12,433,684,15);c.strokeStyle=accent;line(389,163,389,587);
   dial(379,775,147);for(let i=0;i<10;i++){const a=i/10*Math.PI*2;line(379+Math.cos(a)*41,775+Math.sin(a)*41,379+Math.cos(a)*126,775+Math.sin(a)*126);mark(379+Math.cos(a)*174,775+Math.sin(a)*174,18,i*.085)}eye(379,775,40);
  }else if(layout===14){
   para(173,3,86,683,16);for(let r=0;r<4;r++)for(let col=0;col<3;col++){const x=166+col*214,y=349+r*142;c.strokeRect(x-68,y-47,136,99);eye(x,y,27+r*3);for(let n=0;n<3;n++)mark(x-25+n*25,y+35,13,(r*3+col)/15)}para(927,3,86,683,14);
  }else{
   para(176,3,86,682,16);c.strokeRect(142,297,475,403);c.strokeRect(163,319,433,359);eye(379,499,94);dial(379,499,153);
   for(let i=0;i<5;i++){const x=186+i*95;line(x,264,x,289);line(x,708,x,746);mark(x,773,18,i*.18)}
   for(let i=0;i<6;i++){const y=321+i*72;line(109,y,135,y);line(624,y,651,y);mark(677,y,15,i*.13)}para(836,6,86,683,16);
  }
  // Handwritten marginal notes and proof marks differ even when a diagram family recurs.
  c.save();mc.save();c.translate(700,280+hash(seed)*180);mc.translate(700,280+hash(seed)*180);c.rotate(Math.PI/2+.07);mc.rotate(Math.PI/2+.07);for(let n=0;n<9;n++)mark(n*16,0,11,.92);c.restore();mc.restore();
  c.strokeStyle=accent;c.lineWidth=.8;const yy=830-hash(seed+3)*180;c.beginPath();c.moveTo(57,yy-34);c.quadraticCurveTo(74,yy,57,yy+40);c.stroke();
  for(let n=0;n<3;n++)mark(361+n*23,1030,11,.94);
 });
 const mask=new T.CanvasTexture(maskCanvas);mask.anisotropy=8;mask.colorSpace=T.NoColorSpace;return {sheet,mask};
}
export function pageMaterial(style:number,seed:number,wake:{value:number},clock:{value:number}){
 const {sheet,mask}=manuscript(style,seed);const mat=new T.MeshPhysicalMaterial({map:sheet,color:'#ffffff',roughness:.91,side:T.DoubleSide,metalness:0});
 mat.userData.glyphMask=mask;mat.userData.folio=seed;
 mat.onBeforeCompile=shader=>{shader.uniforms.glyphMask={value:mask};shader.uniforms.wake=wake;shader.uniforms.scriptClock=clock;shader.uniforms.scriptColor={value:new T.Color(themes[style].glow)};
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D glyphMask;uniform float wake,scriptClock;uniform vec3 scriptColor;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 vec3 symbol=texture2D(glyphMask,vMapUv).rgb;
 float awakened=smoothstep(symbol.g-.08,symbol.g+.10,wake)*step(.002,wake)*symbol.r;
 float frontier=exp(-pow((symbol.g-wake)*15.,2.))*step(.002,wake)*symbol.r;
 totalEmissiveRadiance+=scriptColor*(awakened*4.0+frontier*3.0)*(.96+.04*sin(scriptClock*2.+symbol.g*5.));
 diffuseColor.rgb=mix(diffuseColor.rgb,scriptColor*.5,awakened*.55);`);
 };mat.customProgramCacheKey=()=>`lore-script-${style}`;
 return {mat,textures:[sheet,mask]};
}

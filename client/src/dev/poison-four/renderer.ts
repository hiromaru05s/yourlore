import {sprites} from './assets';
import {DURATION,ease,clamp,type CardId} from './catalog';
type C=CanvasRenderingContext2D;
const TAU=Math.PI*2;
const hash=(i:number)=>{const a=Math.sin(i*127.1+311.7)*43758.5453;return a-Math.floor(a);};
function ellipse(c:C,x:number,y:number,rx:number,ry:number,fill:string){c.beginPath();c.ellipse(x,y,Math.max(.001,rx),Math.max(.001,ry),0,0,TAU);c.fillStyle=fill;c.fill();}
function line(c:C,pts:number[],col:string,width:number){c.beginPath();c.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)c.lineTo(pts[i],pts[i+1]);c.strokeStyle=col;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
function gradient(c:C,x:number,y:number,r:number,a:string,b:string){const g=c.createRadialGradient(x-r*.25,y-r*.3,1,x,y,Math.max(1,r));g.addColorStop(0,a);g.addColorStop(1,b);return g;}
// Every strand has a dark mass, a coloured face and a narrow wet highlight.
function ribbon(c:C,pts:number[],w:number,col:string,light:string){
 if(w<.02||pts.length<4)return;const n=pts.length/2,edge:number[]=[],opposite:number[]=[];
 for(let i=0;i<n;i++){const j=Math.min(n-1,i+1),k=Math.max(0,i-1),dx=pts[j*2]-pts[k*2],dy=pts[j*2+1]-pts[k*2+1],len=Math.hypot(dx,dy)||1;
 const f=i/(n-1),r=w*.5*(.36+.64*Math.sin(Math.PI*f))*(1+.12*Math.sin(f*19+pts[0]));
 edge.push(pts[i*2]-dy/len*r,pts[i*2+1]+dx/len*r);opposite.push(pts[i*2]+dy/len*r,pts[i*2+1]-dx/len*r);}
 const path=new Path2D();path.moveTo(edge[0],edge[1]);for(let i=2;i<edge.length;i+=2)path.lineTo(edge[i],edge[i+1]);for(let i=opposite.length-2;i>=0;i-=2)path.lineTo(opposite[i],opposite[i+1]);path.closePath();
 c.fillStyle=col;c.fill(path);c.save();c.clip(path);if(sprites.toxin.complete){c.globalAlpha=.72;c.drawImage(sprites.toxin,-100,-150,200,300);}c.restore();line(c,edge,light,Math.max(.25,Math.min(1,w*.08)));line(c,opposite,'rgba(8,24,14,.6)',Math.min(1.3,w*.12));
}
function bead(c:C,x:number,y:number,r:number,toxic:boolean){c.save();c.fillStyle=gradient(c,x,y,r,toxic?'#d6e87f':'#b8eee0',toxic?'#35471a':'#184d43');c.beginPath();c.ellipse(x,y,r,r*.82,0,0,TAU);c.fill();ellipse(c,x-r*.3,y-r*.34,r*.2,r*.09,'#f3ffda');c.restore();}
function cap(c:C,x:number,y:number,r:number,open:number,phase:number){
 if(r<.03||!sprites.cap.complete)return;c.save();c.translate(x,y);const im=sprites.cap,n=52,ih=im.naturalHeight,iw=im.naturalWidth;
 // A scanline mesh opens the cap, while the rooted stem remains continuous.
 for(let i=0;i<n;i++){const u=i/n,sy=u*ih,sh=Math.min(ih-sy,ih/n+1),dome=u<.65?1:1-(u-.65)*.35;
 const horizontal=.48+.52*open;const ww=r*2.25*(u<.65?horizontal:1),hh=r*2.1/n;
 const sway=Math.sin(phase+u*3)*r*.012*dome;
 c.drawImage(im,0,sy,iw,sh,-ww/2+sway,-r*1.34+u*r*2.1,ww,hh+.25);}
 c.restore();
}
function mycelium(c:C,t:number,strength:number,toxic:boolean){
 const growth=ease(200,1120,t),retreat=ease(1590,2350,t);if(growth<=0||retreat>=1)return;
 for(let k=0;k<5;k++){
 const sx=-53+k*27,sy=91-(k%2)*15,len=(83+hash(k)*83)*growth;
 const pts:number[]=[];for(let j=0;j<=24;j++){const f=j/24;pts.push(sx+Math.sin(f*5+k*2)*12*f,sy-len*f);}
 const end=Math.floor(24*(1-retreat));if(end<1)continue;
 ribbon(c,pts.slice(0,(end+1)*2),(.8+strength*.55)*(1-retreat),toxic?'#6c753f':'#54896f',toxic?'#c1c995':'#abc5a0');
 for(let j=5;j<end;j+=4){const x=pts[j*2],y=pts[j*2+1],s=j%3===0?1:-1,reach=13+hash(j+k)*13;const branch:number[]=[];for(let b=0;b<=8;b++){const f=b/8;branch.push(x+s*reach*f,y-f*15-Math.sin(f*3)*3);}ribbon(c,branch,.65*(1-retreat),toxic?'#82905c':'#63987c',toxic?'#aeba78':'#a6cfb1');}
 }
}
function slug(c:C,t:number,amount:number){
 if(amount<.001||!sprites.slug.complete)return;const crawl=ease(450,1350,t),x=-21+36*crawl,y=73;
 c.save();c.translate(x,y);const im=sprites.slug,n=64,iw=im.naturalWidth,ih=im.naturalHeight;
 for(let j=0;j<n;j++){const u=j/n,sx=u*iw,sw=Math.min(iw-sx,iw/n+1),dy=Math.sin(t*.012-u*12)*2.3*Math.sin(u*Math.PI);
 const height=112*amount*(1+.035*Math.sin(t*.012-u*12));c.drawImage(im,sx,0,sw,ih,(u-.5)*186*amount,-height+dy,186*amount/n+.2,height);}
 c.restore();
}
function membrane(c:C,t:number,toxic:boolean){
 const grow=ease(380,1100,t),tear=ease(1270,2230,t);if(grow<.001||tear>=1)return;
 const r=82*grow;c.save();c.scale(1,1.27);const path=new Path2D();
 for(let i=0;i<=80;i++){const a=i/80*TAU,rr=r*(1+.045*Math.sin(a*7+t*.003));const x=Math.cos(a)*rr,y=Math.sin(a)*rr;i?path.lineTo(x,y):path.moveTo(x,y);}path.closePath();
 // Even-odd holes expand out of the same membrane, leaving tapering bridges.
 for(let i=0;i<7;i++){const a=i/7*TAU,rr=(8+35*tear)*tear;path.moveTo(Math.cos(a)*r*.51+rr,Math.sin(a)*r*.51);path.ellipse(Math.cos(a)*r*.51,Math.sin(a)*r*.51,rr,rr*.9,a,0,TAU);}
 c.fillStyle=gradient(c,-10,-10,r,toxic?'rgba(138,158,61,.8)':'rgba(89,157,128,.76)',toxic?'rgba(31,52,23,.96)':'rgba(23,64,55,.95)');c.fill(path,'evenodd');c.save();c.clip(path,'evenodd');c.globalAlpha=.82;c.drawImage(sprites.toxin,-r,-r,r*2,r*2);c.restore();c.strokeStyle=toxic?'#b3c971':'#95dac1';c.lineWidth=1.7*(1-tear);c.stroke(path);
 c.save();c.clip(path,'evenodd');for(let i=0;i<24;i++){const a=i/24*TAU;line(c,[Math.cos(a)*r*.12,Math.sin(a)*r*.12,Math.cos(a+.2)*r*.63,Math.sin(a+.2)*r*.63,Math.cos(a)*r,Math.sin(a)*r],toxic?'rgba(199,219,120,.3)':'rgba(160,238,204,.35)',.6);}
 c.restore();c.restore();
}
function pool(c:C,t:number,toxic:boolean,stretch=1){const p=ease(570,1050,t)*(1-ease(1790,2430,t));if(p<=0)return; c.save();c.translate(0,112);c.scale(stretch,1);const path=new Path2D();for(let i=0;i<=80;i++){const a=i/80*TAU,rx=(53+8*Math.sin(a*5+1)+3*Math.cos(a*9))*p;const x=Math.cos(a)*rx,y=Math.sin(a)*rx*.24;i?path.lineTo(x,y):path.moveTo(x,y);}path.closePath();c.fillStyle=gradient(c,0,112,65,toxic?'#889547':'#819e79',toxic?'#263b1a':'#233d31');c.fill(path);c.save();c.clip(path);c.globalAlpha=.8;c.drawImage(sprites.toxin,-76,-21,152,42);c.restore();c.strokeStyle=toxic?'#adc962':'#9fc9b6';c.lineWidth=.65;c.stroke(path);c.restore();}
function pour(c:C,t:number){
 const grow=ease(180,620,t),end=1-ease(1590,2180,t),tilt=ease(440,820,t)*1.9*(1-ease(1530,1890,t));
 const size=grow*end,cx=-36,cy=-21;const lipX=cx+Math.sin(tilt)*35*size,lipY=cy-Math.cos(tilt)*35*size;
 const stream=ease(650,1010,t)*(1-ease(1610,1970,t));
 if(stream>0){const pts:number[]=[];for(let i=0;i<=48;i++){const u=i/48;pts.push(lipX+(12-lipX)*u+Math.sin(u*Math.PI)*21,lipY+(109-lipY)*u);}
 ribbon(c,pts,15*stream,'#6a782e','#c7d69a');}
 pool(c,t,true,1.15);
 if(size>0){c.save();c.translate(cx,cy);c.rotate(tilt);c.scale(size,size);c.drawImage(sprites.flask,-31,-43,62,86);c.restore();}
 for(let j=0;j<5;j++){const u=clamp((t-1020-j*79)/580);if(u>0&&u<1)bead(c,12+Math.sin(j*4)*u*22,108-24*Math.sin(u*Math.PI),3*(1-u),true);}
}
function twin(c:C,t:number){const g=ease(310,1150,t),back=ease(1530,2060,t);for(const s of [-1,1]){const pts:number[]=[];for(let i=0;i<35;i++){const u=i/34*g;pts.push(s*(64*(1-u)+Math.sin(u*Math.PI)*26)*(1-back),55-(s<0?112:103)*Math.sin(u*Math.PI/2)*(1-back)+Math.sin(u*8+t*.003)*4*u);}if(g>0&&back<1)ribbon(c,pts,(10+g*5)*(1-back),s<0?'#6e862d':'#42784b',s<0?'#dce899':'#a9ddae');}
 const n=ease(820,1210,t)*(1-ease(1460,1930,t));bead(c,0,-57+ease(1350,1800,t)*130,23*n,true);pool(c,t,true);}
function peel(c:C,t:number,toxic:boolean,variant=0){const g=ease(330,1000,t),release=ease(1120,2240,t);if(g<=0||release>=1)return;for(const s of [-1,1]){c.save();const pts:number[]=[];for(let i=0;i<=42;i++){const u=i/42;const x=s*(65*g+Math.sin(u*Math.PI)*release*48+Math.sin(u*17+t*.002)*3*g)*(1-release*.15),y=-115+u*224;pts.push(x,y);}c.beginPath();c.moveTo(s*9,-112);for(let i=0;i<pts.length;i+=2)c.lineTo(pts[i],pts[i+1]);c.lineTo(s*9,112);c.bezierCurveTo(s*(8+release*74),44,s*(8+release*74),-50,s*9,-112);c.closePath();c.fillStyle=toxic?'rgba(58,76,31,.9)':'rgba(94,94,56,.9)';c.fill();c.save();c.clip();c.globalAlpha=.9;c.drawImage(sprites.toxin,-95,-125,190,250);c.restore();ribbon(c,pts,(8-5*release)*g,toxic?'#647d30':'#8b8152',toxic?'#c3d778':'#bfba8e');
 for(let j=0;j<5;j++){const y=-83+j*37;line(c,[s*(9+release*70*Math.sin(j/4*Math.PI)),y,s*(65*g+release*46*Math.sin(j/4*Math.PI)),y+Math.sin(j*2)*6],toxic?'#92a65b':'#6faa91',.8*(1-release));}
 if(variant===1){for(let j=0;j<4;j++)cap(c,s*(65+release*20),-82+j*50,12*g*(1-release),1,j);}
 c.restore();}}
function crest(c:C,t:number){
 const g=ease(280,760,t)*(1-ease(1580,2230,t));if(g<=0)return;const y=-76+ease(550,1710,t)*141;
 const p=new Path2D();p.moveTo(-69,y+32*g);p.bezierCurveTo(-75,y-4*g,-44,y-30*g,-9,y-18*g);p.bezierCurveTo(25,y-40*g,70,y-22*g,71,y+17*g);p.bezierCurveTo(38,y+6*g,8,y+45*g,-69,y+32*g);p.closePath();
 c.fillStyle=gradient(c,-18,y,90,'#b7c7a0','#284b3f');c.fill(p);c.save();c.clip(p);c.globalAlpha=.66;c.drawImage(sprites.toxin,-78,y-44,156,99);c.globalCompositeOperation='color';c.fillStyle='#4c8b79';c.fillRect(-80,y-45,160,100);c.restore();
 c.beginPath();c.moveTo(-69,y+32*g);c.bezierCurveTo(-75,y-4*g,-44,y-30*g,-9,y-18*g);c.bezierCurveTo(25,y-40*g,70,y-22*g,71,y+17*g);c.strokeStyle='#b9d1ae';c.lineWidth=1.2*g;c.stroke();
 for(let i=0;i<3;i++){const x=-44+i*44;c.beginPath();c.moveTo(x,y-10*g);c.bezierCurveTo(x+14,y+7*g,x-9,y+18*g,x+10,y+24*g);c.strokeStyle='rgba(173,204,172,.5)';c.lineWidth=.65*g;c.stroke();}
 pool(c,t,false);
}
function cocoon(c:C,t:number){
 const g=ease(260,860,t),split=ease(840,1680,t),end=1-ease(1650,2320,t);if(g*end<=0)return;
 c.save();c.scale(g*end,g*end);for(const side of [-1,1]){const y=side*(10+split*38);c.save();c.translate(0,y);c.scale(1,side);const p=new Path2D();p.moveTo(-75,0);p.bezierCurveTo(-64,-51,-3,-59,67,-21);p.bezierCurveTo(86,-6,75,10,49,3);p.bezierCurveTo(0,-12,-33,8,-75,0);p.closePath();c.fillStyle=gradient(c,-20,-14,90,'#948870','#333d30');c.fill(p);c.save();c.clip(p);c.globalAlpha=.46;c.drawImage(sprites.toxin,-90,-65,180,85);c.globalCompositeOperation='color';c.fillStyle='#887054';c.fillRect(-90,-65,180,85);c.restore();c.strokeStyle='#a7b49b';c.lineWidth=.75;c.stroke(p);c.restore();}
 for(let j=0;j<5;j++){const x=-52+j*25,reach=10+split*38;ribbon(c,[x,-reach,x+Math.sin(j*5)*10,0,x+7,reach],(4-j*.3)*(1-split*.8),'#698471','#d0d3b0');}
 for(let j=0;j<3;j++)cap(c,-43+j*37,-25-split*38,13+j*3,1,j);c.restore();
}
export function render(c:C,face:CanvasImageSource,id:CardId,v:number,t:number,width=480,height=440,reduced=false){
 c.clearRect(0,0,width,height);c.save();const s=Math.min(width/390,height/400);c.translate(width/2,height/2);c.scale(s,s);
 const land=ease(0,640,t),lift=reduced?0:(1-land)*22; c.translate(0,-lift);
 const cw=144,ch=224;const active=t>0&&t<DURATION&&!reduced;
 // Small contact shadow tightens as the surface meets the board.
 c.save();c.translate(0,lift);ellipse(c,0,113,82-12*land,9-4*land,`rgba(15,30,21,${.08+land*.17})`);c.restore();
 c.drawImage(face,-cw/2-cw*.12,-ch/2-cw*.12,cw*1.24,ch+cw*.24);
 if(active){
 const energy=ease(130,670,t)*(1-ease(1660,2280,t));const source=face as HTMLCanvasElement;
 c.save();c.beginPath();c.rect(-62,-78,124,169);c.clip();
 for(let j=0;j<44;j++){const yy=-78+j*169/44,warp=Math.sin(j*.31-t*.007)*(id==='RUST_SLUG'?3:1.7)*energy;
 const sy=(yy+ch/2+cw*.12)/(ch+cw*.24)*source.height,sh=(169/44+.35)/(ch+cw*.24)*source.height;
 c.drawImage(source,0,sy,source.width,sh,-cw/2-cw*.12+warp,yy,cw*1.24,169/44+.35);}
 c.restore();
 }
 if(active){const toxic=id==='POISON_MASTER';const charge=ease(120,470,t)*(1-ease(1580,2100,t));
 c.save();c.globalCompositeOperation='screen';c.globalAlpha=.28*charge;const g=c.createLinearGradient(-70,90,70,-90);g.addColorStop(0,toxic?'#98b745':'#71c7a0');g.addColorStop(.45,'#001308');g.addColorStop(.6,toxic?'#cee496':'#b3f5d4');g.addColorStop(1,'#07130a');c.fillStyle=g;c.fillRect(-65,-104,130,208);c.restore();
 if(id==='POISON_MASTER'){
 if(v===0)pour(c,t);if(v===1){mycelium(c,t,1,true);membrane(c,t,true);pool(c,t,true);}if(v===2)twin(c,t);if(v===3){mycelium(c,t,.3,true);peel(c,t,true);}
 }else if(id==='RUST_SLUG'){
 if(v===0){pool(c,t,false,1.3);slug(c,t,ease(280,760,t)*(1-ease(1520,2270,t)));}
 if(v===1){mycelium(c,t,.8,false);for(let j=0;j<5;j++){const q=ease(320+j*93,1000+j*45,t)*(1-ease(1660+j*38,2210+j*25,t));cap(c,(j%2?1:-1)*(28+j*5),-70+j*34,(17+j*3)*q,ease(700+j*65,1130+j*65,t),t*.003+j);}}
 if(v===2)crest(c,t);if(v===3){pool(c,t,false);cocoon(c,t);}
 }else{
 if(v===0){mycelium(c,t,1.2,false);for(let j=0;j<6;j++){const a=j/6*TAU,q=ease(690+j*40,1140+j*48,t)*(1-ease(1640+j*30,2280,t));cap(c,Math.cos(a)*60,Math.sin(a)*78,15*q,1,j);}}
 if(v===1){const q=ease(370,1050,t)*(1-ease(1690,2310,t));mycelium(c,t,.4,false);cap(c,0,15-30*q,79*q,ease(650,1230,t),t*.002);}
 if(v===2){const q=ease(270,820,t)*(1-ease(1720,2270,t));cap(c,0,-35,65*q,1,t*.006);for(let j=0;j<3;j++){const u=clamp((t-800-j*71)/850);if(u>0&&u<1){const x=(j-1)*26;const pts=[x,-20,x+Math.sin(j)*7,15+u*76,x+Math.cos(j)*10,34+u*83];ribbon(c,pts,22*Math.sin(u*Math.PI)*(1-u),'#397563','#bce8c7');}}}
 if(v===3){for(let j=0;j<3;j++){const q=ease(330+j*200,940+j*170,t)*(1-ease(1640+j*95,2220+j*90,t));const sway=Math.sin((t-500-j*150)*.007)*ease(800,1200,t)*(1-ease(1400,1800,t));c.save();c.translate((j-1)*43,-64+j*57);c.rotate(sway*.06);cap(c,0,-q*12,(24+j*13)*q,ease(620+j*130,1100+j*130,t),j+t*.003);c.restore();}mycelium(c,t,.4,false);}
 }
 }
 c.restore();
}

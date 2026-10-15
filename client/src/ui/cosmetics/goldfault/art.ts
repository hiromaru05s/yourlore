import * as T from 'three';
import {SETS,type SetIndex} from './catalog';

/** Original vector-authored enamel/engraving artwork. No stock sleeve images. */
export function sleeveArt(index:SetIndex){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=1200;
 const ctx=canvas.getContext('2d')!;ctx.scale(2,2);
 const mask=document.createElement('canvas');mask.width=768;mask.height=1200;const m=mask.getContext('2d')!;m.scale(2,2);m.fillStyle='#000';m.fillRect(0,0,384,600);
 const theme=SETS[index],g=ctx.createLinearGradient(0,0,384,600);g.addColorStop(0,index===1?'#edf2e9':'#080e1a');g.addColorStop(.48,theme.body);g.addColorStop(1,index===1?'#b6cdc7':'#060b13');ctx.fillStyle=g;ctx.fillRect(0,0,384,600);
 function line(c:CanvasRenderingContext2D,pts:number[][],color:string,width=1){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 function circle(c:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,width=1){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 function petal(c:CanvasRenderingContext2D,x:number,y:number,r:number,angle:number,color:string){c.save();c.translate(x,y);c.rotate(angle);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-r*.55,-r*.5,-r*.22,-r*.95,0,-r);c.bezierCurveTo(r*.22,-r*.95,r*.55,-r*.5,0,0);c.fillStyle=color;c.fill();c.strokeStyle=index===1?'#a5b4a1':theme.metal;c.lineWidth=.75;c.stroke();c.restore();}
 // Fine engraved hatch is local to the manufactured border, not floating dust.
 for(let i=0;i<130;i++){const y=22+i*4.3;line(ctx,[[17,y],[29,y+6]],theme.metal,.4);line(ctx,[[355,y+6],[367,y]],theme.metal,.4);}
 for(const inset of [10,15,31,35]){ctx.strokeStyle=theme.metal;ctx.lineWidth=inset===15?2:.65;ctx.strokeRect(inset,inset,384-inset*2,600-inset*2);m.strokeStyle='#bbb';m.lineWidth=1;m.strokeRect(inset,inset,384-inset*2,600-inset*2);}
 for(const y of [57,543]){line(ctx,[[52,y],[164,y],[192,y+(y<300?16:-16)],[220,y],[332,y]],theme.metal,1.4);}
 if(index===0){
  for(const r of [109,114,124,132,143])circle(ctx,192,300,r,theme.metal,r===124?2:.8);
  for(let i=0;i<80;i++){const a=i*Math.PI/40,r=134;line(ctx,[[192+Math.cos(a)*r,300+Math.sin(a)*r],[192+Math.cos(a)*(i%5===0?142:138),300+Math.sin(a)*(i%5===0?142:138)]],theme.accent,.8);}
  for(let i=0;i<12;i++){const a=i*Math.PI/6;petal(ctx,192,300,104,a,i%2?'#193b50':'#244b5b');}
  for(const r of [26,29,65,70,95]){circle(ctx,192,300,r,theme.metal,1.5);circle(m,192,300,r,'#aaa',1.5);}
  for(let i=0;i<8;i++){const a=i*Math.PI/4;line(ctx,[[192,300],[192+Math.sin(a)*94,300+Math.cos(a)*94]],'#d2b77d',1);}
  for(const a of [0,2.1,4.2]){const x=192+Math.cos(a)*68,y=300+Math.sin(a)*68;circle(ctx,x,y,9,'#e9d7a2',2);circle(m,x,y,9,'#eee',2);}
  ctx.fillStyle='#b2c8c4';ctx.beginPath();ctx.moveTo(192,266);ctx.lineTo(205,300);ctx.lineTo(192,333);ctx.lineTo(181,300);ctx.closePath();ctx.fill();
  for(const y of [103,487])for(let k=0;k<4;k++){circle(ctx,192,y,13+k*7,theme.metal,.7);}
 }else if(index===1){
  for(let side=-1;side<=1;side+=2)for(let i=0;i<8;i++){const y=150+i*41;petal(ctx,192+side*73,y,43,side*(.8+i*.04),'#ccd9cc');line(m,[[192+side*73,y],[192+side*92,y-30]],'#aaa',1.2);}
  for(let ring=0;ring<3;ring++)for(let i=0;i<8;i++){const a=i*Math.PI/4+ring*.22;petal(ctx,192,310,110-ring*25,a,['#559488','#9fc3b6','#ecdfbe'][ring]);petal(m,192,310,110-ring*25,a,['#111','#222','#333'][ring]);}
  for(let i=0;i<16;i++){const a=i*Math.PI/8;line(ctx,[[192,310],[192+Math.cos(a)*75,310+Math.sin(a)*75]],'#a9bfa9',.7);line(m,[[192,310],[192+Math.cos(a)*75,310+Math.sin(a)*75]],'#aaa',1);}
  const pearl=ctx.createRadialGradient(187,302,1,192,310,19);pearl.addColorStop(0,'#fffdf0');pearl.addColorStop(.4,'#e6f4dd');pearl.addColorStop(1,'#5f9995');ctx.fillStyle=pearl;ctx.beginPath();ctx.arc(192,310,19,0,Math.PI*2);ctx.fill();circle(ctx,192,310,21,theme.metal,1.4);
  for(const y of [104,496]){circle(ctx,192,y,23,theme.metal,.8);petal(ctx,192,y+13,28,0,'#dce7d9');}
 }else{
  const cracks=[[[43,45],[136,124],[110,203],[214,284],[176,363],[241,443],[200,553]],[[342,53],[262,158],[290,225],[214,284],[315,355],[277,472],[340,553]],[[43,225],[110,203]],[[176,363],[69,410],[43,499]],[[241,443],[277,472]],[[262,158],[136,124]]];
  const facets=[[[43,45],[136,124],[110,203],[43,225]],[[136,124],[262,158],[290,225],[214,284],[110,203]],[[43,225],[110,203],[214,284],[176,363],[69,410]],[[214,284],[315,355],[277,472],[241,443],[176,363]],[[262,158],[342,53],[341,346],[290,225]]];
  facets.forEach((p,i)=>{ctx.beginPath();p.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();const f=ctx.createLinearGradient(40,60,340,540);f.addColorStop(0,['#343e4e','#202b3b','#131b29','#343c49','#171f2c'][i]);f.addColorStop(1,'#080e19');ctx.fillStyle=f;ctx.fill();});
  cracks.forEach((p,i)=>{line(ctx,p,'#4b311d',6);line(ctx,p,'#c59245',2.5);line(ctx,p,'#ffe3a2',.65);line(m,p,i%2?'#aaa':'#fff',3);});
  for(const y of [90,510]){line(ctx,[[160,y],[192,y-21],[224,y],[192,y+21],[160,y]],theme.metal,1.6);}
 }
 // Crisp engraved maker's wordmark remains stationary on all three backs.
 ctx.textAlign='center';ctx.fillStyle=theme.metal;ctx.font='15px Georgia';ctx.fillText('L O R E',192,562);ctx.font='8px Georgia';ctx.fillText(['O R R E R Y','M O O N L O T U S','G O L D F A U L T'][index],192,51);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
 const finish=new T.CanvasTexture(mask);finish.anisotropy=8;
 return {map,finish,canvas,dispose(){map.dispose();finish.dispose();}};
}

export function animatedSleeve(index:SetIndex,art:ReturnType<typeof sleeveArt>,clock:{value:number}){
 const material=new T.MeshPhysicalMaterial({map:art.map,metalnessMap:art.finish,bumpMap:art.finish,bumpScale:.0015,metalness:index===1?.25:.85,roughness:index===1?.35:.32,clearcoat:.45,clearcoatRoughness:.25,iridescence:index===1?.28:0});
 material.onBeforeCompile=shader=>{
  shader.uniforms.loreClock=clock;shader.uniforms.loreFinish={value:art.finish};
  shader.fragmentShader='uniform float loreClock;uniform sampler2D loreFinish;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
    vec2 auv=vMapUv;vec2 p=(auv-vec2(.5,.5))*vec2(384.,600.);
    ${index===0?`if(length(p)<107.){float a=loreClock*.075;mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));auv=vec2(.5)+rot*p/vec2(384.,600.);}`:index===1?`float breath=sin(loreClock*.6283185);float local=1.-smoothstep(92.,120.,length(p));auv=vec2(.5)+(auv-vec2(.5))*(1.+.025*breath*local);`:''}
    diffuseColor*=texture2D(map,auv);
   #endif`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float path=texture2D(loreFinish,${index===0?'auv':'vMapUv'}).r;
   float flow=pow(.5+.5*cos(6.283185*(vMapUv.y*${index===2?'1.6':'0.7'}-loreClock/${index===2?'12.':'10.'})),14.);
   totalEmissiveRadiance+=vec3(${index===1?'.23,.58,.51':'.8,.49,.14'})*path*(.04+flow*.55);`);
 };
 material.customProgramCacheKey=()=>`gacha-atelier-${index}`;
 return material;
}

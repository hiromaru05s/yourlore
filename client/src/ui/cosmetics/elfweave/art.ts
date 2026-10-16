import * as T from 'three';
const theme={metal:'#a0bfb2'};

/** Living inlay drawn in card coordinates. The fixed cut edge is never warped.
 * DOM hands, native draw copies and WebGL stock share this exact surface. */
export function sleeveArt(){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=1200;
 const c=canvas.getContext('2d')!;
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
 const finish=new T.CanvasTexture(canvas);finish.anisotropy=8;
 let previous=-100;
 function stroke(path:string,color:string,width:number){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke(new Path2D(path));}
 function leaf(x:number,y:number,len:number,angle:number,color:string,width=.27){
  c.save();c.translate(x,y);c.rotate(angle);const p=new Path2D(`M0 0 C${-len*width} ${-len*.32} ${-len*width*.8} ${-len*.77} 0 ${-len} C${len*width*.7} ${-len*.75} ${len*width} ${-len*.26} 0 0Z`);
  const g=c.createLinearGradient(-len*.2,0,len*.2,-len);g.addColorStop(0,color);g.addColorStop(.48,color);g.addColorStop(.52,'#cfe8d5');g.addColorStop(1,'#8baea0');c.fillStyle=g;c.fill(p);c.strokeStyle='#f4f1cf';c.lineWidth=.65;c.stroke(p);
  stroke(`M0 -2 Q${len*.035} ${-len*.5} 0 ${-len*.94}`,'#f8f5dd',.9);
  for(let j=1;j<5;j++){const yy=-len*j/6,xx=Math.sin(j/6*Math.PI)*len*width*.55;stroke(`M0 ${yy} L${xx} ${yy-len*.1} M0 ${yy} L${-xx} ${yy-len*.1}`,'#759f8c',.45);}c.restore();
 }
 function frame(){
  c.fillStyle='#2c5147';c.fillRect(0,0,384,18);c.fillRect(0,582,384,18);c.fillRect(0,0,16,600);c.fillRect(368,0,16,600);
  for(const [inset,width,color] of [[18,13,'#071b16'],[24,6,'#dce9d1'],[30,2,'#567b66'],[36,1,theme.metal]] as const){c.beginPath();c.roundRect(inset,inset+7,384-inset*2,586-inset*2,27);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  // Elven joinery travels around the perimeter without breaking its silhouette.
  for(const sx of [-1,1])for(const sy of [-1,1]){c.save();c.translate(192,300);c.scale(sx,sy);stroke('M-151 -199 Q-149 -252 -96 -252 M-151 -205 Q-118 -208 -115 -241 M-145 -212 Q-129 -230 -104 -246',theme.metal,1.1);leaf(-140,-224,28,.8,'#b8cec1');c.restore();}
  c.fillStyle=theme.metal;c.font='13px Georgia';c.textAlign='center';c.fillText('L O R E',192,551);
  c.font='7px Georgia';c.fillText('L E A F W E A V E',192,65);
 }
 function draw(time:number){
  if(Math.abs(time-previous)<1/24)return;previous=time;c.setTransform(2,0,0,2,0,0);
  const bg=c.createLinearGradient(0,0,384,600);bg.addColorStop(0,'#e5e9d6');bg.addColorStop(.5,'#d1e1d1');bg.addColorStop(1,'#8fae9c');c.fillStyle=bg;c.fillRect(0,0,384,600);
  c.save();c.beginPath();c.roundRect(39,48,306,491,22);c.clip();
  // Fine local grain, quiet enough that the primary emblem survives at hand size.
  for(let i=0;i<65;i++){const x=40+i*4.8;stroke(`M${x} 70 Q${x+9*Math.sin(i)} 310 ${x-4} 535`,'#597e6820',.6);}
   // Two long woven boughs form an open pointed arch instead of a round medallion.
   for(const side of [-1,1]){
    const p=`M192 488 C${192+side*128} 400 ${192+side*139} 223 192 111`;
    stroke(p,'#527b68',15);stroke(p,'#f2efd7',9);stroke(p,'#b0bca1',2);
    for(let j=0;j<7;j++){const yy=428-j*40,xx=192+side*(Math.sin((j+1)/9*Math.PI)*91);leaf(xx,yy,61+j*2,side*(.7+j*.075)+Math.sin(time*.7-j*.5+side)*.065,j%2?'#78ac96':'#a2c5ac',.22);}
   }
   for(let j=0;j<5;j++){const y=219+j*49;stroke(`M155 ${y} Q192 ${y-33} 229 ${y} Q192 ${y+35} 155 ${y}`, '#91ab92',.9);}
   leaf(192,345,122,Math.sin(time*.7)*.035,'#528f78',.25);
   const dewY=334-((time%9)/9)*96;const g=c.createRadialGradient(190,dewY,0,192,dewY,4);g.addColorStop(0,'#fffde1');g.addColorStop(1,'#cce9dc00');c.fillStyle=g;c.fillRect(186,dewY-6,12,12);
  c.restore();frame();map.needsUpdate=true;finish.needsUpdate=true;
 }
 draw(0);
 return {map,finish,canvas,draw,dispose(){map.dispose();finish.dispose();}};
}
export function animatedSleeve(art:ReturnType<typeof sleeveArt>,_clock:{value:number}){
 return new T.MeshPhysicalMaterial({map:art.map,roughness:.45,metalness:.16,clearcoat:.42,clearcoatRoughness:.3});
}

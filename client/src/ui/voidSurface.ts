/** Layered cel-shaded folds: a dark depth, violet planes and thin icy edges. */
export function drawVoidSurface(c:CanvasRenderingContext2D,w:number,h:number,time:number){
 const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#121836');g.addColorStop(.42,'#28174a');g.addColorStop(.72,'#100e27');g.addColorStop(1,'#453171');c.fillStyle=g;c.fillRect(0,0,w,h);
 for(let j=0;j<9;j++){
  const a:number[][]=[],b:number[][]=[],edge:number[][]=[];
  for(let i=0;i<=32;i++){const q=i/32,phase=q*6.3+j*1.75+time*.38;
   const x=w*(.5+Math.sin(phase)*(.15+q*.25)),y=h*q,width=w*(.026+(j%3)*.015)*Math.sin(q*Math.PI)**.8;
   const offset=(j-4)*w*.065;a.push([x+offset,y]);b.unshift([x+offset+width,y]);edge.push([x+offset+width*.92,y]);}
  c.beginPath();[...a,...b].forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=['#3d2a68','#66509b','#211842'][j%3];c.fill();
  if(j%3===1){c.beginPath();edge.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle='#a3a5e3';c.lineWidth=Math.max(.65,w*.003);c.stroke();}
 }
 for(let i=0;i<13;i++){
  const x=w*(.1+((i*.618)%1)*.8),y=h*(.08+((i*.381+time*.014)%1)*.84),s=w*(i%4===0?.012:.005);
  c.beginPath();c.moveTo(x,y-s*2);c.lineTo(x+s*.4,y);c.lineTo(x,y+s*2);c.lineTo(x-s*.4,y);c.closePath();c.fillStyle=i%3?'#837bc0':'#d4e5fa';c.fill();
 }
}

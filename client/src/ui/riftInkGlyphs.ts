/** Approved 02: fictional looping script shared by the card surface and its two rings. */
type C = CanvasRenderingContext2D;
const script = [
  'M-6-10Q6-16 7-6Q8 1-3 1Q-10 1-6 8Q-2 14 6 9M0-11V-4M-9 4H-6',
  'M5-12Q-9-11-6-2Q-3 3 5-1Q11-5 7 5Q4 13-6 11M-1 2V8',
  'M-5-12Q4-14 5-7Q6 0-4 0Q-10 1-6 8Q-3 13 5 11M6-3H10',
  'M-7-9Q-1-15 5-10Q12-4 4 0Q-4 4-4 12M-4-4Q4-6 5 1Q5 7 0 7',
  'M-2-12Q-10-7-5 0Q0 5 6 0Q12-8 4-10M0 3V12M-5 8H5',
  'M-7-10Q7-13 7-5Q6 1-5 0V9Q0 14 6 8M-2-7V-3',
  'M-5-12V4Q-5 14 3 11Q11 6 5 1Q0-3-5 1M0-9Q8-10 7-4',
  'M5-12Q-8-11-7-3Q-5 4 3 1Q9-2 7 8M-6 10Q1 6 5 12M0-7V-4',
];
let paths: Path2D[] | undefined;
export const riftScript={count:20,size:.090,rows:2,rotation:.26};
export function drawRiftGlyph(c:C,index:number,size:number,lineWidth=1.35){
 paths??=script.map(s=>new Path2D(s));
 c.save();c.scale(size/32,size/32);c.lineWidth=lineWidth;c.lineCap='round';c.lineJoin='round';c.stroke(paths[((index%8)+8)%8]);c.restore();
}
export function createRiftEngraving(){
 const atlas=document.createElement('canvas');atlas.width=512;atlas.height=768;
 const c=atlas.getContext('2d')!;c.fillStyle='black';c.fillRect(0,0,512,768);
 {
  c.save();
  c.strokeStyle='white';c.lineWidth=1.1;
  const config=riftScript;
  for(const radius of [145,185]){c.beginPath();c.ellipse(256,370,radius,radius*1.36,0,0,Math.PI*2);c.stroke();}
  for(let row=0;row<config.rows;row++){
   const count=config.count-(row?4:0),rx=row?119:165,ry=rx*1.36;
   for(let i=0;i<count;i++){const a=i/count*Math.PI*2-Math.PI/2;c.save();c.translate(256+Math.cos(a)*rx,370+Math.sin(a)*ry);c.rotate(a+Math.PI/2);drawRiftGlyph(c,i+row*3,row?23:32,1.6);c.restore();}
  }
  for(const x of [49,463])for(let j=0;j<9;j++){c.save();c.translate(x,160+j*53);drawRiftGlyph(c,j+(x===49?0:3),24,1.5);c.restore();}
  c.restore();
 }
 return atlas;
}

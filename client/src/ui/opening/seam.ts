export type Point=[number,number];
export function paintSeam(g:CanvasRenderingContext2D,points:Point[],t:number){
 const p=Math.max(0,Math.min(1,(t-1.05)/.30)),charge=p*p*(3-2*p);
 g.save();g.globalAlpha*=.64+charge*.36;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.lineJoin='miter';
 g.strokeStyle='#07111ee6';g.lineWidth=6;g.stroke();g.strokeStyle='#d7dfde';g.lineWidth=1.8;g.stroke();g.restore();
}

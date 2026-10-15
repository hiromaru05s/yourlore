/** Selected 02 星砂箔, revision 2 (2026-10-15).
 * Pure painter shared by card DOM, preview and captured/mesh surfaces.
 * Caller owns clearing, the art-window clip, scheduling and resource cleanup.
 * Composite as source-over, not screen: screen loses contrast on bright art.
 */
export const STARDUST_FINISH_EDGE = '#ffe9b7';
const TAU=Math.PI*2,frac=(n:number)=>n-Math.floor(n),rand=(n:number)=>frac(Math.sin(n*127.1+311.7)*43758.5453);
function glint(c:CanvasRenderingContext2D,x:number,y:number,r:number,a:number,tint:string){
 c.globalAlpha=a;c.fillStyle=tint;c.beginPath();c.moveTo(x-r,y);c.quadraticCurveTo(x-.12*r,y-.12*r,x,y-r*1.65);c.quadraticCurveTo(x+.12*r,y-.12*r,x+r,y);c.quadraticCurveTo(x+.12*r,y+.12*r,x,y+r*1.65);c.quadraticCurveTo(x-.12*r,y+.12*r,x-r,y);c.fill();c.globalAlpha=a*.8;c.fillStyle='#fffef4';c.fillRect(x-.55,y-.55,1.1,1.1);
}

export function drawStardustFinish(
 c: CanvasRenderingContext2D, width: number, height: number,
 timeSeconds: number, seed = 0,
): void {
 if (!(width > 0 && height > 0) || !Number.isFinite(width + height + timeSeconds + seed)) return;
 const w = 256, h = height / width < 1.2 ? 256 : 400;
 const t = timeSeconds + seed * .47;
 c.save();
 c.scale(width / w, height / h);
 c.globalAlpha = 1;
 c.globalCompositeOperation = 'source-over';

  const g=c.createLinearGradient(0,h,w,0);g.addColorStop(0,'#244a7b38');g.addColorStop(.5,'#c48f2d1c');g.addColorStop(1,'#593e701a');c.fillStyle=g;c.fillRect(0,0,w,h);
  // Larger cut crystals have a dark bevel and two reflective faces. The
  // material is visible between glints rather than disappearing completely.
  for(let k=0;k<145;k++){
   const x=rand(k+11)*w,y=rand(k+809)*h,cycle=t*(1.05+rand(k+400)*.55)+rand(k+50)*TAU;
   const shine=Math.pow(Math.max(0,Math.sin(cycle)),6),size=2.2+rand(k+63)*4.6;
   c.globalAlpha=.22+shine*.48;c.fillStyle='#30283d';c.beginPath();c.moveTo(x,y-size);c.lineTo(x+size,y);c.lineTo(x,y+size);c.lineTo(x-size,y);c.closePath();c.fill();
   c.globalAlpha=.24+shine*.74;c.fillStyle=k%3?'#ffe4a7':'#b4edff';c.beginPath();c.moveTo(x,y-size);c.lineTo(x+size,y);c.lineTo(x,y+size);c.closePath();c.fill();
   c.globalAlpha=.16+shine*.65;c.fillStyle='#fff8dd';c.beginPath();c.moveTo(x,y-size);c.lineTo(x-size,y);c.lineTo(x,y);c.closePath();c.fill();
   if(k%3===0){
    const a=Math.pow(Math.max(0,Math.sin(cycle)),5),r=5.5+rand(k+70)*5.5;
    c.globalAlpha=a*.28;const halo=c.createRadialGradient(x,y,0,x,y,r*2.3);halo.addColorStop(0,'#ffe8a3');halo.addColorStop(1,'#ffe8a300');c.fillStyle=halo;c.fillRect(x-r*2.3,y-r*2.3,r*4.6,r*4.6);
    c.save();c.shadowColor='#59401b';c.shadowBlur=2;glint(c,x,y,r,a,'#fff3cb');c.restore();
   }
  }
  // Prominent scintillation sites remain inside the illustrated face even on
  // small cards. Their phase overlaps, so the finish never looks unprocessed.
  for(let k=0;k<17;k++){
   const x=(.16+rand(k+1200)*.67)*w,y=(.25+rand(k+1450)*.61)*h;
   const a=.3+.7*Math.pow(.5+.5*Math.sin(t*1.6+k*2.4),3),r=5+rand(k+1700)*5;
   c.save();c.shadowColor='#41271c';c.shadowBlur=2.2;
   glint(c,x,y,r,a,'#fff5cd');c.restore();
  }

 c.restore();
}

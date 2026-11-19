import {OPENING_EXIT_MS,OPENING_REVEAL_MS} from '../../shared/opening';
import {OPENING_REJOIN_SECONDS} from './choreography';

const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{x=clamp(x);return x*x*(3-2*x);};
const hash=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
type Spark={x:number;y:number;tx:number;ty:number;mx:number;my:number;alpha:number;width:number};
let cachedTime=-1,cachedLength=-1,cachedSparks:Spark[]=[];

/** Deterministic welding jets: particles are born on the contact edge and cool along ballistic trails. */
function sparksAt(time:number,length:number){
 if(time===cachedTime&&length===cachedLength)return cachedSparks;
 cachedTime=time;cachedLength=length;cachedSparks=[];
 const age=time-OPENING_REJOIN_SECONDS;
 for(let emitter=0;emitter<10;emitter++){
  const cycle=.24+hash(emitter+8)*.12,offset=emitter*.027;
  const current=Math.floor((age-offset)/cycle);
  for(let epoch=Math.max(0,current-2);epoch<=current;epoch++){
   const born=OPENING_REJOIN_SECONDS+offset+epoch*cycle;
   if(born>OPENING_EXIT_MS/1000-.08)continue;
   const source=(.12+.76*hash(emitter*31+epoch*7))*length;
   for(let n=0;n<10;n++){
    const seed=emitter*1049+epoch*137+n*19,a=time-born-hash(seed+1)*.035;
    const life=.23+hash(seed+2)*.25;if(a<=0||a>=life)continue;
    const sign=n%2?1:-1,speed=520+hash(seed+3)*820;
    const tangent=(hash(seed+4)-.5)*760,drag=3.3;
    const travel=(t:number)=>(1.-Math.exp(-drag*t))/drag;
    const tail=Math.max(0,a-(.017+hash(seed+5)*.042));
    const position=(t:number)=>({x:source+tangent*travel(t)+45*t*t,y:sign*speed*travel(t)});
    const p=position(a),q=position(tail),m=position((a+tail)/2);
    const alpha=smooth(a/.012)*Math.pow(1-a/life,.62);
    cachedSparks.push({x:p.x,y:p.y,tx:q.x,ty:q.y,mx:m.x,my:m.y,alpha,width:.55+hash(seed+6)*1.35});
   }
  }
 }
 return cachedSparks;
}

/** Drawn in seam-local coordinates, under the same card clip and exit transform as the material. */
export function paintContactFriction(g:CanvasRenderingContext2D,time:number,length:number){
 const age=time-OPENING_REJOIN_SECONDS;
 if(age<0||time>5.52)return;
 const envelope=smooth(age/.055)*(1-smooth((time-5.04)/.46));
 if(envelope<.001)return;
 const settled=time>=OPENING_REVEAL_MS/1000;
 g.save();g.globalCompositeOperation='screen';
 // Several moving high-pressure points light the actual seam; the jets share these origins.
 for(let emitter=0;emitter<10;emitter++){
  const cycle=.24+hash(emitter+8)*.12,local=age-emitter*.027;
  if(local<0)continue;
  const epoch=Math.floor(local/cycle),dt=local-epoch*cycle;
  const x=(.12+.76*hash(emitter*31+epoch*7))*length;
  const power=Math.exp(-dt*17)*(settled?1.35:1)*envelope;
  const radius=46+power*38;
  const glow=g.createRadialGradient(x,0,0,x,0,radius);
  glow.addColorStop(0,`rgba(225,249,255,${Math.min(1,power)})`);
  glow.addColorStop(.12,`rgba(100,203,255,${power*.8})`);
  glow.addColorStop(.38,`rgba(15,100,255,${power*.5})`);glow.addColorStop(1,'#004cff00');
  g.fillStyle=glow;g.fillRect(x-radius,-radius,radius*2,radius*2);
  g.globalAlpha=Math.min(1,power);g.strokeStyle='#a4eaff';g.lineWidth=1.1;
  g.beginPath();g.moveTo(x-10-power*35,0);g.lineTo(x+10+power*35,0);g.moveTo(x,-8-power*25);g.lineTo(x,8+power*25);g.stroke();g.globalAlpha=1;
 }
 const sparks=sparksAt(time,length);
 // Wide cobalt scatter, narrower cyan trails, then white-hot cores. No round confetti sprites.
 for(let pass=0;pass<3;pass++){
  g.strokeStyle=['#146aff','#32baff','#d9faff'][pass];g.lineCap='round';
  for(const spark of sparks){
   g.globalAlpha=spark.alpha*envelope*[.18,.6,1][pass];
   g.lineWidth=spark.width*[7,2.6,1][pass];
   g.beginPath();g.moveTo(spark.tx,spark.ty);g.quadraticCurveTo(spark.mx,spark.my,spark.x,spark.y);g.stroke();
  }
 }
 g.restore();
}

import {clasp,clamp,curve,ease,envelope,glint,polygon,pool,taper,type Brush,type Point} from './ink';

const leftHem:Point[]=[clasp,[96,183],[65,169],[45,151],[51,137],[79,114],[108,83],[135,70]];
const rightHem:Point[]=[clasp,[132,180],[164,166],[192,154],[201,143],[185,124],[164,106],[153,84],[135,70]];

// Two broad ink tongues narrow into the engraved borders, then meet at the hood's peak.
export function twinQuills(c:Brush,t:number){
  const spark=envelope(t,0,.12,.23,.48);
  pool(c,113,198,30,22,'#4fcfff',spark*.88);
  for(const [index,hem] of [leftHem,rightHem].entries()){
    const phase=t-index*.035,head=ease(.12,.67,phase),tail=ease(.32,.87,phase);
    taper(c,hem,tail,head,12,'#124fac');
    taper(c,hem,tail,head,7.2,'#4fe7fc');
    taper(c,hem,tail+.02*(head-tail),head,2.3,'#efffff');
    if(head>0 && head<1){const at=curve(hem,head);pool(c,...at,15,12,'#28bdff',.54);}
    const inkPath:Point[]=index ? [clasp,[142,191],[186,174],[207,154],[205,135]] : [clasp,[87,190],[53,174],[35,153],[40,132]];
    taper(c,inkPath,ease(.38,.76,phase),ease(.15,.47,phase),4.2,'#82bdff');
  }
  const crest=envelope(t,.58,.70,.73,.90);
  pool(c,135,72,23,12,'#76ceff',crest*.65);glint(c,135,72,12*crest,'#e4ffff');
  const seal:Point[]=[[135,70],[132,52],[122,34],[129,15]];
  taper(c,seal,ease(.75,.98,t),ease(.64,.84,t),4,'#99e7ff');
}

// A cut stone grows out of the setting; outer facets hinge open, reflect once, and fold home.
export function sapphire(c:Brush,t:number){
  const open=envelope(t,.10,.42,.64,.92),shine=envelope(t,.30,.46,.64,.89);
  pool(c,113,194,48,31,'#2798ff',open*.8);
  for(const sign of [-1,1]){
    const leg:Point[]=[clasp,[113+sign*24,207],[113+sign*51,227],[113+sign*69,249]];
    taper(c,leg,ease(.19,.44,t),1-ease(.65,.9,t),4.6,'#8ddcfa');
  }
  if(open<.002)return;
  c.save();c.translate(...clasp);
  c.scale(.36+.64*open,open);
  for(const s of [-1,1]){
    const lean=s*(16+12*open),tip:Point=[lean,-34],root:Point=[s*3,-4],elbow:Point=[s*27,-19];
    polygon(c,[root,elbow,tip],[ '#245692','#326eaf'][+(s===1)],'#81c8d6');
    polygon(c,[root,tip,[s*14,-21]],'#63bedc');
  }
  const y=-59;
  polygon(c,[[0,4],[-14,-22],[0,y],[15,-24]],'#214e96','#a4eaff');
  polygon(c,[[0,4],[-14,-22],[-1,-31],[0,y]],'#79cfe7');
  polygon(c,[[0,y],[15,-24],[-1,-31]],'#b5f5ff');
  polygon(c,[[0,4],[-1,-31],[15,-24]],'#356daa');
  const gl=ease(.29,.64,t);
  taper(c,[[0,y],[-1,-31],[0,4]],clamp(gl-.38),gl,3,'#ffffff');
  glint(c,0,y,9*shine,'#eaffff');c.restore();
}

// A book opens on its spine below the clasp. The inscribed leaf turns and is drawn into the pin.
export function manuscript(c:Brush,t:number){
  const open=envelope(t,.08,.40,.65,.94);
  const pin=ease(.64,.96,t);
  pool(c,111,210,57,29,'#5fa7ff',open*.60);
  if(open<.005)return;
  c.save();c.translate(112,211-12*pin);c.scale(open,.45+.55*open);
  const leaf=(s:number,w:number,lift:number,foreground:boolean)=>{
    const end=s*w;
    polygon(c,[[0,2],[s*7,-28],[end,-43-lift],[end-s*3,-6-lift],[s*11,2],[0,6]],foreground?'#b5dced':'#517dae','#344d78');
    polygon(c,[[s*2,1],[s*9,-26],[end-s*2,-40-lift],[end-s*6,-12-lift],[s*13,-4]],foreground?'#e0eef1':'#9ac7db');
    taper(c,[[s*3,1],[end*.48,-5-lift*.5],[end-s*4,-8-lift]],0,1,2,'#d5ab66');
    for(let row=0;row<3;row++)for(let j=0;j<4;j++){
      const x=.22+j*.149,y=-22+row*5-x*(13+lift);
      c.strokeStyle=row===0?'#5988a5':'#7794a7';c.lineWidth=1.3;c.beginPath();c.moveTo(end*x,y);
      c.lineTo(end*(x+.035),y-2);c.lineTo(end*(x+.09),y-1);c.stroke();
    }
  };
  leaf(-1,55,3,false);leaf(1,59,1,false);leaf(-1,49,7,true);leaf(1,52,7,true);
  const turn=ease(.32,.69,t),swing=Math.cos(turn*Math.PI);
  if(Math.abs(swing)>.04)leaf(Math.sign(swing),Math.abs(swing)*43,18*Math.sin(turn*Math.PI)+6,true);
  c.restore();
  taper(c,[[114,204],[125,190],[147,179],[169,165]],ease(.80,.98,t),ease(.65,.86,t),3.8,'#a4e3ff');
}

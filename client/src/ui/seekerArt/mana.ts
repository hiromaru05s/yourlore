import type {Illustration} from './layer';
import {clasp,curve,ease,envelope,glint,pool,taper,type Brush,type Point} from './ink';

const leftHem:Point[]=[clasp,[96,183],[65,169],[45,151],[51,137],[79,114],[108,83],[135,70]];
const rightHem:Point[]=[clasp,[132,180],[164,166],[192,154],[201,143],[185,124],[164,106],[153,84],[135,70]];

// Two broad ink tongues narrow into the engraved borders, then meet at the hood's peak.
function twinQuills(c:Brush,t:number){
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


export const manaReaction: Illustration = {
  id:'M1', kind:'mana', name:'双筆の金縁', duration:1550, paint:twinQuills,
  pose:t=>[0,-2.6*envelope(t,.13,.50,.65,1),-1.5*envelope(t,.04,.24,.44,.93)],
};

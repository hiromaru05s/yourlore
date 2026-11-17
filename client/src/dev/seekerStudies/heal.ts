import {clasp,curve,ease,envelope,glint,pool,taper,type Brush,type Point} from './ink';

const tornFold:Point[]=[[227,206],[206,195],[189,199],[172,192],[153,201],[136,195],clasp];

// The slit follows a shoulder fold. Short crossing threads cinch it closed behind the needle.
export function mending(c:Brush,t:number){
  const head=ease(.14,.70,t),tail=ease(.40,.91,t);
  taper(c,tornFold,tail,ease(.025,.20,t),6.5*(1-ease(.63,.93,t)),'#141936');
  for(let i=0;i<8;i++){
    const position=(i+.55)/8, start=.12+i*.056;
    const lay=ease(start,start+.12,t),tight=ease(start+.085,start+.33,t),lift=envelope(t,start,start+.09,start+.34,start+.50);
    if(lay===0||lift===0)continue;
    const [x,y]=curve(tornFold,position),length=10-5*tight;
    c.save();c.globalAlpha=lift;
    const up:Point[]=[[x+4,y+length],[x+1,y+2],[x-4,y-length]];
    const down:Point[]=[[x-5,y+length-1],[x-1,y],[x+4,y-length+1]];
    taper(c,up,0,lay,3.4,'#c9a96a');taper(c,down,0,lay,3.7,'#97dfbf');
    taper(c,down,0,lay,1.25,'#efffe0');c.restore();
  }
  const at=curve(tornFold,head),light=envelope(t,.10,.22,.70,.84);
  pool(c,...at,18,12,'#86e6c0',light*.7);
  if(light>0){
    const loop=1-ease(.57,.78,t);
    const thread:Point[]=[at,[at[0]+5,at[1]-9],[at[0]+17,at[1]-17*loop],[at[0]+27,at[1]-9*loop],[at[0]+20,at[1]+1]];
    taper(c,thread,0,light,2,'#dcf7cc');glint(c,...at,6*light,'#fff3c7');
  }
  taper(c,tornFold,tail,head,2.5,'#d2e0a7');
  pool(c,...clasp,20,15,'#ffe7a1',envelope(t,.64,.75,.77,.95)*.8);
}

const sprigs:Point[][]=[
  [clasp,[94,191],[73,184],[56,177],[48,163],[47,148]],
  [clasp,[140,187],[166,183],[181,173],[191,159],[194,145]],
];
// Each leaf unfolds around its vein, then returns to the embroidered stem from the tip inward.
export function laurel(c:Brush,t:number){
  const lit=envelope(t,0,.16,.70,.98);
  pool(c,...clasp,35,21,'#e0c77a',lit*.68);
  sprigs.forEach((stem,side)=>{
    const q=t-side*.05,reach=ease(.06,.50,q)*(1-ease(.66,.94,q));
    taper(c,stem,0,reach,4.7,'#477875');
    taper(c,stem,0,reach,2.0,'#e7cf83');
    for(let i=0;i<7;i++){
      const u=.14+i*.12,leaf=ease(u-.09,u+.10,reach);
      if(leaf<.01)continue;
      const at=curve(stem,u),next=curve(stem,u+.01);
      const direction=Math.atan2(next[1]-at[1],next[0]-at[0]);
      const spread=(i%2===0?.93:-.82)*(side===0?1:-1);
      c.save();c.translate(...at);c.rotate(direction+spread*leaf);c.scale(leaf,leaf);
      const length=16+3*Math.sin(i),width=5.2;
      c.fillStyle=i%2?'#78b697':'#538c78';
      c.beginPath();c.moveTo(0,0);c.bezierCurveTo(4,-width*1.5,11,-width,length,-1);c.quadraticCurveTo(8,width*1.7,0,0);c.fill();
      c.fillStyle='#b7dab0';c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(5,-width*1.3,length,-1);c.quadraticCurveTo(9,0,0,0);c.fill();
      taper(c,[[1,0],[8,-.6],[length,-1]],0,1,1.2,'#efdfab');c.restore();
    }
  });
}

// The cloak draws together as two fabric panels, its turned hems catch a little pearl light,
// then roll outward again. The cavity of the hood stays dark above the collar.
export function mantle(c:Brush,t:number){
  const wrap=envelope(t,.04,.48,.59,.94);
  if(wrap<.001)return;
  const fold=(s:number,delay:number)=>{
    const w=envelope(t,.04+delay,.42+delay,.56+delay,.91+delay);
    if(w<=0)return;
    c.save();c.globalAlpha=ease(0,.19,w);
    const root:Point=[113+s*92,195], tip:Point=[113+s*(85-91*w),202-24*w],
      bottom:Point=[113+s*(80-47*w),254], edge:Point=[113+s*120,241];
    const shade=c.createLinearGradient(root[0],200,tip[0],234);
    shade.addColorStop(0,'#293b75');shade.addColorStop(.43,'#536491');shade.addColorStop(.70,'#435688');shade.addColorStop(1,'#233465');
    c.beginPath();c.moveTo(...root);c.bezierCurveTo(113+s*64,185,tip[0]+s*16,tip[1]+5,...tip);
    c.quadraticCurveTo(113+s*(55-42*w),220,...bottom);c.lineTo(...edge);c.quadraticCurveTo(113+s*121,217,...root);c.fillStyle=shade;c.fill();
    const lip:Point[]=[root,[113+s*(82-19*w),191-3*w],[113+s*(81-58*w),196-13*w],tip];
    taper(c,lip,0,1,7,'#9eac99');taper(c,lip,0,1,3.4,'#dfdfb4');
    const ridge:Point[]=[tip,[113+s*(61-50*w),211],[113+s*(70-37*w),231],bottom];
    taper(c,ridge,0,1,5,'#728598');taper(c,ridge,0,1,2,'#b8d6ba');
    c.restore();
  };
  fold(1,0);fold(-1,.055);
  const breath=envelope(t,.29,.50,.61,.88);
  pool(c,113,185,29,18,'#b3f4cc',breath*.84);
  taper(c,[[87,181],[101,185],[114,183],[128,180]],ease(.63,.84,t),ease(.34,.55,t),3,'#eaffd9');
}

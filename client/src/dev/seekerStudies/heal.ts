import {clasp,ease,envelope,glint,pool,taper,type Brush,type Point} from '../../ui/seekerArt/ink';

const collar:Point[][]=[
  [clasp,[95,187],[70,179],[53,171],[45,158]],
  [clasp,[136,185],[164,176],[187,167],[199,153]],
];

function paintedShape(c:Brush,path:string,color:string|CanvasGradient){
  c.fillStyle=color;
  c.fill(new Path2D(path));
}

// The pin acts as a wick. Two tongues open around the warm heart of the flame,
// then pull back through the collar as the figure lifts its head.
export function votive(c:Brush,t:number){
  const rise=envelope(t,.04,.46,.58,.91);
  const beat=envelope(t,.28,.43,.48,.61)+.65*envelope(t,.60,.68,.71,.84);
  pool(c,115,181,55,46,'#ff9668',rise*.62);
  collar.forEach(path=>taper(c,path,ease(.73,.98,t),ease(.45,.76,t),5,'#ffc98b'));
  if(rise<=0)return;
  c.save();
  c.translate(113,198);
  c.rotate(-.07+.055*Math.sin(2*Math.PI*t));
  c.scale((.55+.45*rise+.07*beat)*rise,rise);
  const fire=c.createLinearGradient(0,-77,0,1);
  fire.addColorStop(0,'#ffe4a3');fire.addColorStop(.37,'#ffa665');
  fire.addColorStop(.70,'#ee7260');fire.addColorStop(1,'#ae4051');
  paintedShape(c,'M0 1 C-18 -4 -31 -18 -27 -35 Q-26 -43 -19 -49 Q-20 -35 -12 -33 C-16 -52 -1 -61 -5 -82 C15 -66 16 -54 12 -40 Q22 -44 23 -55 C37 -32 25 -14 12 -7 Q6 -3 0 1Z',fire);
  // A deep cut on either side lets the narrow tongues read against the dark hood.
  paintedShape(c,'M-21 -20 Q-29 -33 -21 -42 Q-24 -30 -15 -24Z','#ffd999');
  paintedShape(c,'M4 -55 Q8 -64 1 -75 Q13 -67 12 -55 Q10 -49 6 -44Z','#fff1b7');
  c.save();c.translate(0,-22);c.scale(1+.13*beat,1+.13*beat);
  paintedShape(c,'M0 12 C-7 5 -19 -2 -17 -11 C-14 -20 -4 -19 0 -11 C6 -22 18 -19 18 -10 C18 -2 6 6 0 12Z','#fff0ae');
  paintedShape(c,'M-12 -9 Q-11 -15 -5 -13 Q-9 -12 -11 -6Z','#ffffe3');
  c.restore();
  taper(c,[[0,0],[-4,-7],[-2,-13],[0,-17]],0,1,3.8,'#fff4bb');
  c.restore();
  glint(c,...clasp,5*beat,'#fff4cc');
}

// A hanging bead narrows at the hood seam, falls into the brooch, then spills
// along the two folds. Both splash crests start on the same frame as contact.
export function dew(c:Brush,t:number){
  const form=ease(.045,.28,t), fall=ease(.31,.50,t);
  const impact=envelope(t,.485,.535,.565,.77);
  const x=135-22*fall, y=78+87*fall;
  const bead=form*(1-ease(.486,.545,t));
  const seam:Point[]=[[129,51],[135,62],[138,73],[135,80]];
  taper(c,seam,ease(.20,.36,t),ease(.005,.17,t),3.8,'#9bd9bb');
  if(bead>0){
    c.save();c.translate(x,y);
    const stretch=envelope(t,.28,.41,.435,.505);
    c.scale(bead*(1-.22*stretch),bead*(1+.32*stretch));
    pool(c,0,14,26,29,'#6ee4aa',.40);
    const water=c.createLinearGradient(-12,0,11,29);
    water.addColorStop(0,'#d6ffe1');water.addColorStop(.30,'#86e6b9');
    water.addColorStop(.72,'#2aab94');water.addColorStop(1,'#18757e');
    paintedShape(c,'M0 -5 C-1 4 -15 13 -14 23 C-13 38 8 41 14 27 C19 15 4 5 0 -5Z',water);
    paintedShape(c,'M-10 18 Q-13 28 -5 31 Q-1 32 -2 28 Q-8 26 -7 17Z','#efffe8');
    paintedShape(c,'M9 16 Q18 27 5 33 Q12 27 9 16Z','#82dfbd');c.restore();
  }
  pool(c,...clasp,55,31,'#8bf0ae',impact*.87);
  collar.forEach((path,index)=>{
    const q=t-.014*index,head=ease(.49,.73,q),tail=ease(.59,.94,q);
    taper(c,path,tail,head,13,'#399e8b');
    taper(c,path,tail,head,7,'#8af2ba');
    taper(c,path,tail,head,2,'#efffd9');
    const sign=index?1:-1;
    const splash:Point[]=[clasp,[113+sign*17,191],[113+sign*30,172],[113+sign*39,169],[113+sign*41,179]];
    taper(c,splash,ease(.57,.79,q),ease(.49,.62,q),8,'#a6f4cd');
    taper(c,splash,ease(.57,.80,q),ease(.50,.63,q),2.6,'#f1ffdc');
    const down:Point[]=[clasp,[113+sign*10,216],[113+sign*18,236],[113+sign*25,254]];
    taper(c,down,ease(.71,.98,q),ease(.53,.80,q),4,'#89dcab');
  });
}

// The gold shoulder seams open like a fan. Each overlapping feather pivots
// at its root and folds back into that same seam, tips settling last.
export function pinions(c:Brush,t:number){
  for(const sign of [-1,1]){
    c.save();c.translate(...clasp);c.scale(sign,1);
    const line:Point[]=[[0,0],[23,-7],[44,-15],[62,-21],[77,-30]];
    const reach=envelope(t,.02,.34,.63,.92);
    taper(c,line,0,reach,5.5,'#ded3a4');
    const lift=envelope(t,.11,.47,.61,.91);
    if(lift>0){
      c.save();c.rotate(.52*(1-lift));c.scale(lift,.3+.7*lift);
      const cover=c.createLinearGradient(0,0,78,-64);
      cover.addColorStop(0,'#477875');cover.addColorStop(.46,'#8ec0b0');cover.addColorStop(1,'#e9eace');
      paintedShape(c,'M0 0 Q12 -22 41 -37 Q60 -45 76 -73 Q80 -62 72 -47 Q94 -62 100 -83 Q101 -58 84 -39 L94 -46 Q83 -24 61 -19 L69 -21 Q45 -4 18 -5 Q8 -5 0 0Z',cover);
      // The primaries share a folded base, with a different trailing edge on each quill.
      const tips:Point[]=[[100,-83],[96,-60],[89,-43],[75,-30],[56,-20]];
      tips.forEach(([x,y],i)=>{
        const rootX=12+i*1.8,rootY=-7+i*.5;
        c.save();c.translate(rootX,rootY);
        c.rotate((1-lift)*.09*i);
        const dx=x-rootX,dy=y-rootY;
        c.beginPath();c.moveTo(0,0);
        c.bezierCurveTo(dx*.45,dy*.53,dx*.83,dy*.46,dx,dy);
        c.bezierCurveTo(dx*.98,dy*.46,dx*.48,dy*.03,0,0);
        c.fillStyle=['#f8efd0','#e8e5c7','#c9dbc4','#a9cabc','#88b5ac'][i];c.fill();
        taper(c,[[0,0],[dx*.41,dy*.20],[dx*.74,dy*.47],[dx*.93,dy*.78]],0,1,1.8,'#749f99');
        c.restore();
      });
      paintedShape(c,'M0 0 Q11 -21 34 -33 Q50 -40 62 -55 Q61 -39 48 -29 L54 -32 Q44 -18 29 -15 L35 -17 Q24 -6 9 -5Z','#b5d5c1');
      taper(c,[[0,0],[13,-14],[34,-29],[49,-39],[62,-55]],0,1,3,'#fff0c6');
      c.restore();
    }
    taper(c,line,ease(.64,.96,t),ease(.27,.55,t),3,'#fff0bd');
    c.restore();
  }
  const open=envelope(t,.27,.5,.59,.88);
  pool(c,...clasp,28,22,'#e2dda0',open*.63);
  glint(c,...clasp,7*open,'#fff0c0');
}

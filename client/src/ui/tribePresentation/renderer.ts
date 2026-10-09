import {families,tribes,ease,synergyDuration,tier,type Tribe} from './catalog';
import {ApprovedTribeRenderer} from './approved';
type C=CanvasRenderingContext2D;
/** One readable card action, a surface response, then a quiet landing. */
export class TribeRenderer extends ApprovedTribeRenderer {
 status='canvas';
 summon(c:C,face:HTMLCanvasElement,tribe:Tribe,variant:number,ms:number,x:number,y:number,w:number,reduced=false){
  const p=Math.max(0,Math.min(1,ms/1800)),k=tribes.indexOf(tribe)*3+variant,f=families[tribe],arrive=ease(.05,.65,p),fade=1-ease(.64,.96,p);
  let dx=0,dy=0,rot=0,sx=1,sy=1,alpha=1,sheen=0,ghost=0;
  const hit=Math.sin(Math.PI*ease(.57,.88,p))*(1-ease(.76,.92,p));
  switch(k){
   case 0:dx=-68*(1-arrive);dy=-8*Math.sin(Math.PI*arrive);alpha=ease(0,.23,p);ghost=.22*fade;sheen=.12*fade;break;
   case 1:dy=24*(1-arrive);alpha=ease(.05,.57,p);sx=.97+.03*arrive;sheen=.3*fade;break;
   case 2:sx=.055+.945*ease(.18,.57,p);rot=-.08*(1-arrive);dy=-15*(1-arrive);sheen=.8*(1-ease(.45,.7,p));break;
   case 3:dy=18*ease(0,.17,p)-62*ease(.18,.39,p)+44*ease(.39,.63,p)+4*hit;sx=1-.045*hit;sy=1+.065*hit;rot=-.045*Math.sin(Math.PI*arrive);ghost=.16*fade;break;
   case 4:dx=-35+17*ease(0,.2,p)+5*ease(.25,.38,p)+13*ease(.42,.6,p);dy=-10*ease(.3,.46,p)+10*ease(.46,.65,p);rot=-.04*(1-arrive);sheen=.26*fade;break;
   case 5:dx=36*(1-ease(.16,.48,p));dy=-65*(1-ease(.16,.48,p))+6*hit;rot=.12*(1-arrive);ghost=.16*fade;sheen=.1*fade;break;
   case 6:dy=-30*Math.sin(Math.PI*ease(0,.8,p));sx=1+.025*Math.sin(Math.PI*arrive);sy=sx;sheen=.4*fade;break;
   case 7:rot=-.21*(1-arrive);dx=-24*(1-arrive);dy=-20*Math.sin(Math.PI*arrive);ghost=.15*fade;sheen=.24*fade;break;
   case 8:sy=.86+.14*arrive;dy=-34*(1-arrive);rot=.025*Math.sin(Math.PI*arrive);sheen=.85*Math.sin(Math.PI*ease(.08,.78,p));break;
   case 9:dy=-76*(1-ease(.18,.49,p))+7*hit;sy=1-.045*hit;sx=1+.04*hit;alpha=ease(0,.17,p);sheen=.2*fade;break;
   case 10:dy=20*(1-arrive);alpha=.4+.6*arrive;sheen=.6*fade;break;
   case 11:sx=.76+.24*ease(.25,.53,p)+.025*hit;sy=1.05-.05*ease(.25,.53,p);dy=-12*Math.sin(Math.PI*arrive);sheen=.5*fade;break;
   case 12:alpha=ease(0,.48,p);sx=.91+.09*arrive;sy=sx;dy=-12*Math.sin(Math.PI*arrive);sheen=.5*fade;break;
   case 13:dy=30*(1-ease(.1,.7,p));alpha=.6+.4*arrive;sheen=.35*fade;break;
   case 14:dy=-18*(1-arrive);sx=1.07-.07*arrive;sy=sx;ghost=.32*fade;sheen=.38*fade;break;
  }
  c.save();c.translate(x,y);c.scale(w/180,w/180);this.shadow(c,0,147,90+Math.abs(dy)*.3,.24-Math.abs(dy)*.0018);
  if(reduced){c.drawImage(face,-111.6,-161.6,223.2,323.2);c.restore();return;}
  // Secondary motion follows the face. Never surround it with detached props.
  if(ghost>0)for(let i=3;i>=1;i--){c.save();c.globalAlpha=ghost*(1-i/4);const offset=k===14?i*10*fade:-i*10*fade;c.translate(dx+offset,dy+(k===14?i*7*fade:i*3*fade));c.rotate(rot);c.scale(sx,sy);c.drawImage(face,-111.6,-161.6,223.2,323.2);c.restore();}
  c.translate(dx,dy);c.rotate(rot);c.scale(sx,sy);c.globalAlpha=alpha;c.drawImage(face,-111.6,-161.6,223.2,323.2);
  c.save();c.beginPath();c.roundRect(-85,-137,170,274,10);c.clip();
  if(k===1||k===10||k===13){const yy=150-310*ease(.05,.72,p),g=c.createLinearGradient(0,yy-40,0,yy+75);g.addColorStop(0,'#ffffff00');g.addColorStop(.38,k===10?'#170c23bb':k===13?'#54776f55':'#dce9ed99');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(-90,-140,180,280);}
  if(k===5){c.save();c.rotate(.33);for(let i=0;i<3;i++){const yy=-160+380*ease(.18,.6,p);c.strokeStyle=`rgba(255,193,106,${fade*.65})`;c.lineWidth=2.5-i*.55;c.beginPath();c.moveTo(-32+i*32,yy-85);c.lineTo(-24+i*32,yy);c.stroke();}c.restore();}
  if(k===12||k===11){const g=c.createRadialGradient(0,10,0,0,10,130);g.addColorStop(0,k===12?'#fff5c888':'#11071999');g.addColorStop(1,'#ffffff00');c.globalAlpha=fade*.7;c.fillStyle=g;c.fillRect(-90,-140,180,280);}
  if(sheen>0){c.globalAlpha=alpha*sheen;const xx=-180+360*ease(.08,.85,p);const g=c.createLinearGradient(xx-70,-140,xx+65,140);g.addColorStop(0,'#ffffff00');g.addColorStop(.45,f.color+'11');g.addColorStop(.5,'#fff4dccc');g.addColorStop(.57,f.color+'44');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(-90,-140,180,280);}
  c.restore();
  // Highlight rides the physical bevel; its width recedes as the card settles.
  c.globalAlpha=fade*(.15+sheen*.55);c.strokeStyle=f.color;c.lineWidth=1.15;c.shadowColor=f.color;c.shadowBlur=7*fade;c.beginPath();c.roundRect(-87,-139,174,278,10);c.stroke();c.restore();
 }
 override synergy(c:C,face:HTMLCanvasElement,n:number,ms:number,x:number,y:number,w:number,reduced=false){
  const stage=tier(n);if(stage===1){super.synergy(c,face,1,ms,x,y,w,reduced);return;}
  const p=ms/synergyDuration(n),a=ease(0,.18,p)*(1-ease(.72,1,p)),release=ease(.45,.6,p)*(1-ease(.64,.95,p));
  c.save();c.translate(x,y);c.scale(w/180,w/180);this.shadow(c,0,147,90+a*(stage===3?20:13),.29-a*.13);
  c.translate(0,reduced?0:-(stage===2?12:20)*a);if(!reduced&&stage===3){const s=1+.025*release;c.scale(s,s);}
  c.drawImage(face,-111.6,-161.6,223.2,323.2);
  c.save();c.beginPath();c.roundRect(-86,-138,172,276,10);c.clip();
  if(stage===2){
   // A broad, oblique reflection crosses the artwork and pours into its frame.
   const xx=-250+500*ease(.08,.7,p),g=c.createLinearGradient(xx-75,-120,xx+75,120);g.addColorStop(0,'#e97d0000');g.addColorStop(.35,'#ffb52d22');g.addColorStop(.5,'#fff3b9aa');g.addColorStop(.65,'#ffb52d22');g.addColorStop(1,'#e97d0000');c.globalAlpha=a;c.fillStyle=g;c.fillRect(-90,-140,180,280);
  }else{
   // The whole face gathers light inward, then the raised gold border opens out.
   const g=c.createRadialGradient(0,4,5,0,4,180);g.addColorStop(0,`rgba(255,234,167,${a*.18+release*.3})`);g.addColorStop(.6,`rgba(255,158,30,${a*.2})`);g.addColorStop(1,'#dd680000');c.fillStyle=g;c.fillRect(-90,-140,180,280);
   for(const sign of [-1,1]){const yy=sign*(130*(1-ease(.12,.52,p))+130*ease(.6,.82,p));const g=c.createLinearGradient(0,yy-24,0,yy+24);g.addColorStop(0,'#ffba4900');g.addColorStop(.5,'#ffe9a9aa');g.addColorStop(1,'#ffba4900');c.globalAlpha=a*.7;c.fillStyle=g;c.fillRect(-90,yy-24,180,48);}
   // A relief is struck into the artwork, then dissolves back into the lit bevel.
   const seal=ease(.12,.3,p)*(1-ease(.63,.87,p));c.globalAlpha=seal;c.save();c.translate(0,2);
   for(const [offset,width,color] of [[1.5,3.4,'#774016'],[0,1.6,'#ffd581'],[-.6,.55,'#fff4cd']] as const){c.save();c.translate(0,offset);c.lineWidth=width;c.strokeStyle=color;c.beginPath();c.moveTo(0,-45);c.lineTo(34,0);c.lineTo(0,45);c.lineTo(-34,0);c.closePath();c.moveTo(0,-28);c.lineTo(20,0);c.lineTo(0,28);c.lineTo(-20,0);c.closePath();for(const sign of [-1,1]){c.moveTo(sign*34,0);c.lineTo(sign*61,0);c.lineTo(sign*76,sign*16);c.moveTo(0,sign*45);c.lineTo(0,sign*85);}c.stroke();c.restore();}c.restore();
  }c.restore();
  c.globalAlpha=a;c.strokeStyle='#ffac35';c.shadowColor='#ff9420';c.shadowBlur=stage===2?10:18;c.lineWidth=stage===2?2:3;c.beginPath();c.roundRect(-88,-140,176,280,11);c.stroke();
  if(stage===2){c.shadowBlur=0;c.strokeStyle='#ffe2a1';c.lineWidth=1.1;const len=896*ease(.18,.75,p);c.setLineDash([len,896]);c.stroke();c.setLineDash([]);}
  else {c.shadowBlur=0;c.strokeStyle='#fff0b8';c.lineWidth=1.2;c.beginPath();c.roundRect(-84,-136,168,272,9);c.stroke();const spread=reduced?0:10*release;c.globalAlpha=release*.75;for(const sign of [-1,1]){c.beginPath();c.moveTo(sign*(88+spread),-112);c.lineTo(sign*(88+spread),-140-spread);c.lineTo(sign*55,-140-spread);c.moveTo(sign*(88+spread),112);c.lineTo(sign*(88+spread),140+spread);c.lineTo(sign*55,140+spread);c.stroke();}}
  c.restore();
 }
 victorySource(c:C,face:HTMLCanvasElement,ms:number,x:number,y:number,w:number,reduced=false){super.synergy(c,face,3,ms,x,y,w,reduced);}
 dispose(){}
}

/** One clock for the intact fracture, camera tremor, burst and slow-flight. */
export const BURST=1080, SLOW_START=1260, SLOW_END=2180;
export function ruptureDistance(t:number):number {
 if(t<=BURST)return 0;
 // 100 ms at full velocity, followed by an 80 ms smooth deceleration.
 if(t<1180)return (t-BURST)*.0036;
 if(t<SLOW_START){const x=(t-1180)/80;return .36+80*(.0036*x+(.00018-.0036)*(x*x*x-.5*x*x*x*x));}
 const held=.36+80*(.0036+.00018)/2;
 if(t<SLOW_END)return held+(t-SLOW_START)*.00018;
 const x=Math.min(1,(t-SLOW_END)/240),ramp=240*(.00018*x+(.0021-.00018)*(x*x*x-.5*x*x*x*x));
 return held+(SLOW_END-SLOW_START)*.00018+ramp+Math.max(0,t-SLOW_END-240)*.0021;
}
export function ruptureShake(t:number):{x:number;y:number} {
 // The intact surface trembles, then holds still for 80 ms before release.
 const pre=t<700||t>=BURST-80?0:Math.sin(Math.PI*(t-700)/(BURST-80-700));
 const age=t-BURST;
 const after=age<0||age>=1500?0:Math.min(1,age/45)*Math.min(1,(1500-age)/350);
 return {x:Math.sin(t*.071)*pre*1.65+(Math.sin(t*.041)+Math.sin(t*.063)*.32)*after*.72,
  y:Math.sin(t*.097+1)*pre*.85+Math.sin(t*.053+1.3)*after*.44};
}

/** Cosmetic cracks only: counters never become fracture geometry. */
export function counterFracturePhase(t:number):'intact'|'cracked'|'gone' {
 return t>=BURST?'gone':t>=BURST-220?'cracked':'intact';
}

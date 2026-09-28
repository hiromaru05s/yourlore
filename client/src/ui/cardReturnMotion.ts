/** Pure card-material trajectory. Every surface, silhouette, emitted fragment and
 * contact query uses this function; no separate projectile or arrival clock. */
export const sat=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(a:number,b:number,t:number)=>{const q=sat((t-a)/(b-a));return q*q*(3-2*q);};
export function materialPose(t:number,u:number,v:number,packet:number,packets:number,mode:number,strip:number,strips:number){
 const order=packet/Math.max(1,packets-1),start=.22+order*.10;
 const lag=mode===2?.07:mode===3?.055:.13;
 const span=mode===2?.30:.36;
 const lane=(strip+.5)/strips-.5;
 const raw=(t-start-(1-u)*lag-Math.abs(lane)*(mode===3?.18:.025))/span;
 const q=sat(raw),s=smooth(0,1,q),flight=Math.sin(Math.PI*q);
 const fluid=smooth(.01,.20,q)*(1-smooth(.76,.99,q));
 const charge=smooth(.018,.13,t)*(1-smooth(.89,1,t));
 const lift=smooth(.025,.13,t)*(1-smooth(.68,.84,t))*.14;
 let y=flight*(.84+order*.18),z=0,twist=0;
 if(mode===0){z=Math.sin(s*Math.PI*2)*flight*.35;twist=Math.sin(q*Math.PI*2)*1.2;}
 if(mode===1){y+=Math.sin(s*Math.PI*2+lane*3)*flight*.24;z=Math.sin(s*Math.PI*2+lane*4)*flight*.32;twist=Math.sin(s*Math.PI*2+lane*2)*flight;}
 if(mode===2){const tooth=(x:number)=>Math.abs(((x%1)+1)%1-.5)*4-1;y+=tooth(s*3+lane*.2)*flight*.18;z=tooth(s*4+lane*.4)*flight*.12;twist=lane*flight*1.4;}
 if(mode===3){y+=flight*(.28+Math.abs(lane)*.80);z=lane*flight*1.85;twist=lane*flight*2.4;}
 if(mode===4){y+=flight*(.35+lane*.60);z=Math.sin(s*Math.PI)*lane*.8;twist=Math.sin(s*Math.PI*2)*.62;}
 const squeeze=mode===3?.92:mode===4?.48:.27;
 const taper=.12+.88*Math.pow(Math.sin(Math.PI*u),.6);
 const localZ=-(v-.5)*1.46875*(1-fluid*(1-squeeze))*(1-fluid*(1-taper));
 y+=Math.sin(q*Math.PI*3+order*1.5)*flight*.12;
 z+=Math.sin(q*Math.PI*2+order*1.4)*flight*.10;
 y+=Math.sin(twist)*localZ;z+=Math.cos(twist)*localZ;
 // Lift is local to the remaining material, and completely settles by t=1.
 return {s,q,raw,fluid,charge,localX:(u-.5)*.94,y:y+lift,z,contact:q>0&&q<1};
}

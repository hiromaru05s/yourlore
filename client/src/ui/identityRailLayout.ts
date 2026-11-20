import {boardLens} from './boardLens';
import {identityNameplatePose} from './identityFurnitureLayout';
/** Physical dimensions of the enlarged, Blender-authored identity furniture. */
export const RAIL={manaX:-.405,nameDepth:.060,badgeX:.226,badgeWidth:.106,medalDepth:.075,hingeHeight:.010,deckWidth:.136,deckDepth:.198};
// Outer plinth, main bezel and silver highlight: the actual visible frame profile.
const profile=[[-.0015,.001],[.003,0],[.010,0],[.011,-.0011]] as const;
export function identityRailLayout(scale:number,width=innerWidth,height=innerHeight){
 const {cy,focal,angle}=boardLens(width,height),sin=Math.sin(angle),cos=Math.cos(angle);
 const screenY=(z:number,y=0)=>cy+(z*scale*cos-y*scale*sin)/(1-(z*scale*sin+y*scale*cos)/focal);
 const planeZ=(screen:number,y=0)=>{const v=screen-cy,e=y*scale;return (v*focal-v*cos*e+focal*sin*e)/(focal*cos+v*sin)/scale;};
 const portraitSize=Math.min(210,Math.max(104,scale*.30),height*.195);
 const farTop=Math.max(2,cy-scale*.326-portraitSize);
 // Visible alpha bounds of the actual 1254px portrait frames, not their transparent canvases.
 const portraitLine=height-farTop-portraitSize+portraitSize*12/1254;
 // Requested optical adjustment: move the self rail 4px down at a 210px portrait.
 const line=portraitLine+portraitSize*4/210;
 const opponentLine=farTop+portraitSize*1244/1254;
 const nameTop=(side:'Me'|'Opp',depth:number,manaDistance=.397)=>{
  const p=identityNameplatePose(side,depth,RAIL.hingeHeight),c=Math.cos(p.radians),s=Math.sin(p.radians),manaZ=side==='Me'?manaDistance:-manaDistance;
  return Math.min(...profile.map(([y,extra])=>{const z=-depth/2-extra*depth/RAIL.nameDepth;return screenY(manaZ+p.centerZ+z*c+y*s,.012+p.centerY-z*s+y*c);}));
 };
 const solve=(value:(d:number)=>number,target:number,lo:number,hi:number)=>{for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(value(mid)>target)lo=mid;else hi=mid;}return (lo+hi)/2;};
 const nameDepth=Math.max(.050,solve(d=>nameTop('Me',d),portraitLine,.015,.11));
 // Taller windows need the rail slightly nearer the rim, not a thin unreadable name face.
 const manaDistance=nameTop('Me',nameDepth)<line?solve(z=>-nameTop('Me',nameDepth,z),-line,.397,.47):.397;
 // The near-facing edge of the lower plinth is the visible bottom of both lower trays.
 const opponentManaZ=planeZ(opponentLine,.012-.00345)-.0385;
 const side=(id:'Me'|'Opp')=>{
  const manaZ=id==='Me'?manaDistance:opponentManaZ,top=nameTop(id,nameDepth,Math.abs(manaZ));
  return {manaZ,name:identityNameplatePose(id,nameDepth,RAIL.hingeHeight),nameTop:top};
 };
 return {line,opponentLine,nameDepth,Me:side('Me'),Opp:side('Opp'),planeZ,screenY,pileSelfZ:planeZ(line)-RAIL.deckDepth/2,pileOppZ:-(planeZ(portraitLine)-RAIL.deckDepth/2)};
}

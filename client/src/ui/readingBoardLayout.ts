/** Meter-authored 01–06 mounts. Every DOM hit area uses the same model-space units. */
export const READING_ASSETS='/models/reading-board/v1/';
export const CARD_METERS=.110;
// ANCHOR_rift_player/opponent from board.glb, shared by visuals and hit targets.
export const RIFT_MOUNT={x:.725,z:.245,height:.012};
export const STOCK_THICKNESS=.0008/CARD_METERS;
export const marketHeight=(supply=false)=>(supply?.0218:.0158)/CARD_METERS;
export const pileCenter=(count:number,shelf:boolean)=>((shelf?.009:.0088)+.0004+Math.max(0,Math.min(count,40)-1)*.0008)/CARD_METERS;
export const pileFace=(count:number,shelf:boolean)=>pileCenter(count,shelf)+STOCK_THICKNESS/2;
/** Fill the viewport with the table; portraits overlap its outer rim rather
 * than reserving two extra rows outside it. Keep the near rim on screen. */
export function readingScale(width=innerWidth,height=innerHeight){return Math.min(width/1.72,height/.94);}
/** Containers are display:contents, so placements have the viewport as offset parent. */
export function placeReadingBoard(root:HTMLElement):void {
 const s=readingScale(),cx=innerWidth/2,cy=innerHeight/2;
 // Preserve the large desktop portrait; shorter windows need room for all
 // seven monsters without the center card covering the player's face.
 const portraitSize=Math.min(210,Math.max(104,s*.30),innerHeight*.195);root.style.setProperty('--portrait-size',`${portraitSize}px`);
 root.classList.add('reading-board');root.style.setProperty('--board-meter',`${s}px`);
 function place(selector:string,x:number,z:number,w:number,d:number,local=false){
  for(const el of root.querySelectorAll<HTMLElement>(selector)){
   el.style.left=`${(local?0:cx)+(x-w/2)*s}px`;el.style.top=`${(local?0:cy)+(z-d/2)*s}px`;
   el.style.width=`${w*s}px`;el.style.height=`${d*s}px`;
  }
 }
 place('.market-counter',-.062,0,1.36,.2);
 place('.market-sub--supply',.270, .1,.37,.184,true);
 // Sub containers are local to the market counter.
 place('.market-sub--fixed',.885,.1,.85,.184,true);
 place('.sub-head',-.037,.092,.065,.065,true);
 place('.mid-aside',.7,0,.13,.13);
 for(const [id,sign] of [['me',1],['opp',-1]] as const){
  place(`#${id}Row .zone-row:has(.zone-mon)`,0,sign*.195,.85,.171875);
  place(`#${id}Row .zone-row:has(.zone-st)`,0,sign*.326,.83,.048);
  place(`#pile-${id==='me'?'my':'opp'}Deck`,.54,sign*.245,.136,.198);
  place(`#pile-${id==='me'?'my':'opp'}Disc`,-.54,sign*.245,.166,.232);
  place(`#rift-${id}`,RIFT_MOUNT.x,sign*RIFT_MOUNT.z,.125,.268);
  const p=id==='me'?'Me':'Opp';
  const portraitTop=sign>0?Math.min(innerHeight-portraitSize-38,cy+s*.326):Math.max(8,cy-s*.326-portraitSize);
  const ring=root.querySelector<HTMLElement>(`#portrait${p} .pt-ring`),hp=root.querySelector<HTMLElement>(`#portrait${p} .pt-vitals`);
  if(ring){ring.style.left=`${cx-portraitSize/2}px`;ring.style.top=`${portraitTop}px`;ring.style.width=ring.style.height=`${portraitSize}px`;}
  if(hp){hp.style.left=`${cx-portraitSize*.46}px`;hp.style.top=`${portraitTop+portraitSize*.65}px`;hp.style.width=`${portraitSize*.30}px`;hp.style.height=`${portraitSize*.36}px`;}

  place(`#portrait${p} .pt-mana`,-.345,sign*.397,.350,.077);
  place(`#portrait${p}>.pt-name,#portrait${p} .pt-name--vitals`,-.345,sign*.455,.34,.017);
  const resources=root.querySelector<HTMLElement>(`#portrait${p} .pt-resources`);
  if(resources){resources.style.left=`${cx-portraitSize*.48}px`;resources.style.top=`${Math.min(innerHeight-28,portraitTop+portraitSize*.97)}px`;resources.style.width=`${portraitSize*.96}px`;}
  place(`#portrait${p} .pt-brand`,-.09,sign*.335,.08,.028);
 }
 // Hand cards float over the board, outside the play lanes. They are not sockets.
 const hand=root.querySelector<HTMLElement>('#hand'),opp=root.querySelector<HTMLElement>('#oppHand');
 if(hand&&!root.querySelector('.game.hand-open')){hand.style.left=`${Math.max(cx+.16*s,cx+portraitSize*.5+8)}px`;const css=getComputedStyle(hand),height=parseFloat(css.getPropertyValue('--card-h-hand'))*.42||0,edge=parseFloat(css.getPropertyValue('--fan-overhang'))||0;hand.style.top=`${Math.min(cy+.365*s,innerHeight-height-edge-10)}px`;hand.style.bottom='auto';}
 if(opp){opp.style.left=`${Math.max(cx+.16*s,cx+portraitSize*.5+8)}px`;opp.style.top=`${cy-.452*s}px`;}
}

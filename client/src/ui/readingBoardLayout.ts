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
 // Opponent/default size. The player frame fits the space below the field
 // independently so it cannot be pushed upward over monster stat seals.
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
  // Keep the near frame behind the monster lane. Fit the frame plus the lowest
  // hanging badge (shield: .65 + .135 + .36) instead of lifting it over cards.
  const portraitTop=sign>0?cy+s*.31:Math.max(8,cy-s*.326-portraitSize);
  const size=sign>0?Math.min(portraitSize,(innerHeight-8-portraitTop)/1.145):portraitSize;
  root.querySelector<HTMLElement>(`#portrait${p}`)?.style.setProperty('--portrait-size',`${size}px`);
  const ring=root.querySelector<HTMLElement>(`#portrait${p} .pt-ring`),hp=root.querySelector<HTMLElement>(`#portrait${p} .pt-vitals`);
  if(ring){ring.style.left=`${cx-size/2}px`;ring.style.top=`${portraitTop}px`;ring.style.width=ring.style.height=`${size}px`;}
  if(hp){hp.style.left=`${cx-size*.46}px`;hp.style.top=`${portraitTop+size*.65}px`;hp.style.width=`${size*.30}px`;hp.style.height=`${size*.36}px`;}

  place(`#portrait${p} .pt-mana`,-.345,sign*.397,.350,.077);
  place(`#portrait${p}>.pt-name,#portrait${p} .pt-name--vitals`,-.345,sign*.455,.34,.017);
  const resources=root.querySelector<HTMLElement>(`#portrait${p} .pt-resources`);
  if(resources){resources.style.left=`${cx-size*.15}px`;resources.style.top=`${portraitTop+size*.65}px`;resources.style.width=`${size*.61}px`;resources.style.height=`${size*.36}px`;}
  place(`#portrait${p} .pt-brand`,-.09,sign*.335,.08,.028);
 }
 // Hand cards float over the board, outside the play lanes. They are not sockets.
 const hand=root.querySelector<HTMLElement>('#hand'),opp=root.querySelector<HTMLElement>('#oppHand');
 if(hand&&!root.querySelector('.game.hand-open')){hand.style.left=`${Math.max(cx+.16*s,cx+portraitSize*.5+8)}px`;const css=getComputedStyle(hand),height=parseFloat(css.getPropertyValue('--card-h-hand'))*.42||0,edge=parseFloat(css.getPropertyValue('--fan-overhang'))||0;hand.style.top=`${Math.min(cy+.365*s,innerHeight-height-edge-10)}px`;hand.style.bottom='auto';}
 if(opp){opp.style.left=`${Math.max(cx+.16*s,cx+portraitSize*.5+8)}px`;opp.style.top=`${cy-.452*s}px`;}
}

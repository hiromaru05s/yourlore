import {CARD_THICKNESS_SCALE,STOCK_THICKNESS} from './cardThickness';
export {STOCK_THICKNESS} from './cardThickness';
/** Meter-authored 01–06 mounts. Every DOM hit area uses the same model-space units. */
export const READING_ASSETS='/models/reading-board/v2-shared/';
export const CARD_METERS=.110;
// ANCHOR_rift_player/opponent from board.glb, shared by visuals and hit targets.
export const RIFT_MOUNT={x:.725,z:.245,height:.012};
export const marketHeight=(supply=false)=>(supply?.0218:.0158)/CARD_METERS;
export const pileCenter=(count:number,shelf:boolean)=>((shelf?.009:.0088)+(.5+Math.max(0,Math.min(count,40)-1))*.0008*CARD_THICKNESS_SCALE)/CARD_METERS;
export const pileFace=(count:number,shelf:boolean)=>pileCenter(count,shelf)+STOCK_THICKNESS/2;
/** Fill the viewport with the table; portraits overlap its outer rim rather
 * than reserving two extra rows outside it. Keep the near rim on screen. */
export function readingScale(width=innerWidth,height=innerHeight){return Math.min(width/1.72,height/.94);}
/** Containers are display:contents, so placements have the viewport as offset parent. */
export function placeReadingBoard(root:HTMLElement):void {
 const s=readingScale(),cx=innerWidth/2,cy=innerHeight/2;
 // Both portraits keep the same size, including their attached resource badges.
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
  // Keep all seven persistent cards between the portrait and the deck column.
  const buffIcons=root.dataset.buffIcons==='true';
  const spellsLeft=Math.max(buffIcons?.105:.13,portraitSize/(2*s)+.015);
  const spellsRight=buffIcons?.444:Math.min(.46,spellsLeft+7*.0384+6*.002);
  const spellDepth=buffIcons?(spellsRight-spellsLeft-6*.002)/7:.048;
  place(`#${id}Row .zone-row:has(.zone-st)`,(spellsLeft+spellsRight)/2,sign*.34-(buffIcons?.006:0),spellsRight-spellsLeft,spellDepth);
  place(`#pile-${id==='me'?'my':'opp'}Deck`,.54,sign*.205,.136,.198);
  place(`#pile-${id==='me'?'my':'opp'}Disc`,-.54,sign*.245,.166,.232);
  place(`#rift-${id}`,RIFT_MOUNT.x,sign*RIFT_MOUNT.z,.125,.268);
  const p=id==='me'?'Me':'Opp';
  // Match the far/near edge clearance. Counters stay within the frame height,
  // so the player no longer needs extra space beneath the portrait.
  const size=portraitSize;
  const farTop=Math.max(2,cy-s*.326-size);
  const portraitTop=sign>0?innerHeight-farTop-size:farTop;
  root.querySelector<HTMLElement>(`#portrait${p}`)?.style.setProperty('--portrait-size',`${size}px`);
  const ring=root.querySelector<HTMLElement>(`#portrait${p} .pt-ring`),hp=root.querySelector<HTMLElement>(`#portrait${p} .pt-vitals`);
  if(ring){ring.style.left=`${cx-size/2}px`;ring.style.top=`${portraitTop}px`;ring.style.width=ring.style.height=`${size}px`;}
  if(hp){hp.style.left=`${cx-size*.58}px`;hp.style.top=`${portraitTop+size*.06}px`;hp.style.width=`${size*.30}px`;hp.style.height=`${size*.36}px`;}

  place(`#portrait${p} .pt-mana`,-.345,sign*.397,.350,.077);
  const resources=root.querySelector<HTMLElement>(`#portrait${p} .pt-resources`);
  if(resources){resources.style.left=`${cx-size*.5}px`;resources.style.top=`${portraitTop}px`;resources.style.width=resources.style.height=`${size}px`;}
 }
 // Hand cards float over the board, outside the play lanes. They are not sockets.
 placeReadingHand(root);
 const opp=root.querySelector<HTMLElement>('#oppHand');
 if(opp){opp.style.left=`${Math.max(cx+.16*s,cx+portraitSize*.5+8)}px`;opp.style.top=`${Math.max(2,cy-.57*s)}px`;}
}

/** Recompute after closing/resizing the expanded hand; its anchor is viewport based. */
export function placeReadingHand(root:HTMLElement):void {
 const hand=root.querySelector<HTMLElement>('#hand');
 if(!hand||root.querySelector('.game.hand-open'))return;
 const s=readingScale(),cx=innerWidth/2,cy=innerHeight/2;
 const portraitSize=Math.min(210,Math.max(104,s*.30),innerHeight*.195);
 const css=getComputedStyle(hand),cardHeight=parseFloat(css.getPropertyValue('--card-h-hand'))||270;
 const overhang=(parseFloat(css.getPropertyValue('--fan-overhang'))||0)/.42;
 const lane=root.querySelector<HTMLElement>('#meRow .zone-row:has(.zone-st)');
 const laneBottom=lane?.dataset.boardPlane?lane.getBoundingClientRect().bottom:0;
 const top=Math.max(cy+.365*s,laneBottom+6);
 const compactScale=Math.min(.42,Math.max(0,innerHeight-top-8)/(cardHeight+overhang));
 hand.style.setProperty('--compact-hand-scale',String(compactScale));
 const width=(parseFloat(css.getPropertyValue('--fan-width'))||0)*compactScale;
 hand.style.left=`${Math.min(innerWidth-width-12,Math.max(cx+.16*s,cx+portraitSize*.5+8))}px`;
 hand.style.top=`${top}px`;hand.style.bottom='auto';
}

/** Fit the closed opponent hand above its persistent row on short windows. */
export function placeReadingOpponentHand(root:HTMLElement):void {
 const hand=root.querySelector<HTMLElement>('#oppHand'),lane=root.querySelector<HTMLElement>('#oppRow .zone-row:has(.zone-st)');
 if(!hand||!lane)return;
 hand.style.transform='none';hand.style.transformOrigin='0 0';
 const top=hand.getBoundingClientRect().top;
 const bottom=Math.max(top+hand.offsetHeight,...[...hand.querySelectorAll('.card')].map(c=>c.getBoundingClientRect().bottom));
 const scale=Math.min(1,Math.max(0,lane.getBoundingClientRect().top-top-6)/Math.max(1,bottom-top));
 hand.style.transform=`scale(${scale})`;
}

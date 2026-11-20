import {placeReadingBoard,placeReadingHand,placeReadingOpponentHand,marketHeight,pileFace,RIFT_MOUNT} from './readingBoardLayout';
import {identityNameplatePose,IDENTITY_RANK_SCALE} from './identityFurnitureLayout';
import {identityRailLayout,RAIL} from './identityRailLayout';
/** One perspective and one physical card unit for the DOM and WebGL board.
 * CSS x/y maps to world X/Z; world Y is height above the table. */
export {BOARD_TILT,CARD_RATIO,boardLens,boardMatrix,boardPoint,screenToBoard} from './boardLens';
import {boardMatrix,boardPoint} from './boardLens';
/** Layout coordinates before any ancestor's projective transform. */
export function layoutRect(element:HTMLElement):DOMRect {
  let x=0,y=0,node:HTMLElement|null=element;
  while(node){x+=node.offsetLeft;y+=node.offsetTop;const parent=node.offsetParent as HTMLElement|null;if(parent){x+=parent.clientLeft;y+=parent.clientTop;}node=parent;}
  const style=getComputedStyle(element);
  return new DOMRect(x,y,parseFloat(style.width)||element.offsetWidth,parseFloat(style.height)||element.offsetHeight);
}
export function cardUnit(root:HTMLElement):number {return parseFloat(getComputedStyle(root).getPropertyValue('--card-w'))||60;}
export function projectBoardDOM(root:HTMLElement):void {
  if(typeof DOMMatrix==='undefined')return;
  placeReadingBoard(root);
  const unit=cardUnit(root);
  const planes=[...root.querySelectorAll<HTMLElement>('.zone-row,.market-counter,.mid-aside,.pile,.rift-button,.pt-mana')].map(element=>({element,rect:layoutRect(element),elevation:(element.classList.contains('rift-button')?unit*RIFT_MOUNT.height/.110:element.classList.contains('market-counter')?unit*marketHeight():element.classList.contains('mid-aside')?unit*.028/.110:element.classList.contains('pt-ring')?unit*.009/.110:element.classList.contains('pt-mana')?unit*.0165/.110:0)+(Number(element.dataset.introHeight)||0)}));
  for(const {element,rect,elevation} of planes){
    element.dataset.boardPlane=String(elevation);element.style.transformOrigin='0 0';
    element.style.transform=new DOMMatrix().translate(-rect.left,-rect.top).multiply(boardMatrix(rect.left,rect.top,elevation)).toString();
  }
  root.querySelectorAll<HTMLElement>('.pt-ring,.pt-vitals,.pt-resources').forEach(el=>{delete el.dataset.boardPlane;el.style.transform='none';});
  // This child sits on a second physical plinth above the market. Preserve the
  // parent's 3D transform so its height is projected exactly once by our lens.
  root.querySelectorAll<HTMLElement>('.market-sub--supply').forEach(element=>{
    element.dataset.boardPlane=String(unit*marketHeight(true));element.style.transformOrigin='0 0';
    element.style.transform=`translateZ(${unit*(marketHeight(true)-marketHeight())}px)`;
  });
  root.querySelectorAll<HTMLElement>('.pile--shelf').forEach(el=>{const n=Number(el.dataset.count)||0;el.style.setProperty('--shelf-elevation',`${unit*pileFace(n,true)}px`);});
  // Align the visible silver nameplate to the crystal tray itself, excluding
  // the separate numeric counter. Bounds come from mana-tray.glb: ±.1325,
  // ±.0385, top .011, with the widget's .0415 X / .012 Y mounting offsets.
  // Both names stay attached above the tray; no viewport-driven side swap.
  const scale=unit/.110;
  const rail=root.dataset.alignedRail==='true'?identityRailLayout(scale):undefined;
  for(const [side,sign] of [['Me',1],['Opp',-1]] as const){
    const label=root.querySelector<HTMLElement>(`#portrait${side}>.pt-name`);
    if(!label)continue;
    if(root.dataset.identityFurniture==='true'){
      const seat=(el:HTMLElement,x:number,z:number,w:number,h:number,elevation:number,pitch=0)=>{
        const left=innerWidth/2+(x-w/2)*scale,top=innerHeight/2+(z-h/2)*scale;
        el.style.left=`${left}px`;el.style.top=`${top}px`;el.style.width=`${w*scale}px`;el.style.height=`${h*scale}px`;
        el.style.transformOrigin='0 0';el.dataset.boardPlane=String(elevation*scale);
        el.style.transform=new DOMMatrix().translate(-left,-top).multiply(boardMatrix(left,top,elevation*scale))
          .translate(w*scale/2,h*scale/2).rotateAxisAngle(1,0,0,-pitch).translate(-w*scale/2,-h*scale/2).toString();
      };
      const pose=rail?.[side].name??identityNameplatePose(side);
      const manaZ=rail?.[side].manaZ??sign*.397;
      seat(label,(rail?RAIL.manaX:-.345)+.0415,manaZ+pose.faceZ,.237,rail?rail.nameDepth-.020:.0205,.012+pose.faceY,pose.pitch);
      const rank=root.querySelector<HTMLElement>(`.identity-rank-sample[data-side="${side}"]`);
      if(rank){
        if(rail)seat(rank,RAIL.manaX+RAIL.badgeX,manaZ+pose.faceZ,.059,Math.min(.043,rail.nameDepth-.014),.012+pose.faceY,pose.pitch);
        else seat(rank,-.135,sign*.397-.016,.031*IDENTITY_RANK_SCALE,.024*IDENTITY_RANK_SCALE,.0175);
      }
      continue;
    }
    const topZ=sign*.397-.0385;
    const left=boardPoint(innerWidth/2+(-.345+.0415-.1325)*scale,innerHeight/2+topZ*scale,.023*scale);
    const right=boardPoint(innerWidth/2+(-.345+.0415+.1325)*scale,innerHeight/2+topZ*scale,.023*scale);
    const width=right.x-left.x,height=width*35/239;
    label.style.left=`${left.x}px`;label.style.top=`${left.y-height+1}px`;
    label.style.width=`${width}px`;label.style.height=`${height}px`;
    label.style.transform='none';delete label.dataset.boardPlane;
  }
  placeReadingHand(root);placeReadingOpponentHand(root);
  root.classList.add('board-projected');
  root.dispatchEvent(new Event('lore:board-projected',{bubbles:true}));
}
export function clearBoardProjection(root:HTMLElement):void {
  root.querySelectorAll<HTMLElement>('[data-board-plane]').forEach(el=>{delete el.dataset.boardPlane;el.style.removeProperty('transform');el.style.removeProperty('transform-origin');});
  root.classList.remove('board-projected');
}
/** Used by cast flights to land on the very same projected card face. */
export function projectedPlacement(target:HTMLElement,width:number,height:number):DOMMatrix {
  const plane=target.closest<HTMLElement>('[data-board-plane]');
  if(!plane){const r=target.getBoundingClientRect();return new DOMMatrix().translate(r.left,r.top).scale(r.width/width,r.height/height);}
  const r=layoutRect(target);
  // Field centering uses a CSS translate animation, outside offsetLeft/offsetTop.
  const translate=getComputedStyle(target).translate?.split(' ')??[];
  const dx=parseFloat(translate[0])||0,dy=parseFloat(translate[1])||0;
  return boardMatrix(r.left+dx,r.top+dy,Number(plane.dataset.boardPlane)||0).scale(r.width/width,r.height/height);
}

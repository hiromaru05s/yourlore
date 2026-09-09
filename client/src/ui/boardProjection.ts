/** One perspective and one physical card unit for the DOM and WebGL board.
 * CSS x/y maps to world X/Z; world Y is height above the table. */
export const BOARD_TILT = 32;
export const CARD_RATIO = .64;
export function boardLens(width=innerWidth,height=innerHeight) {
  return {width,height,cx:width/2,cy:height/2,focal:height*2.2,angle:BOARD_TILT*Math.PI/180};
}
/** Layout coordinates before any ancestor's projective transform. */
export function layoutRect(element:HTMLElement):DOMRect {
  let x=0,y=0,node:HTMLElement|null=element;
  while(node){x+=node.offsetLeft;y+=node.offsetTop;const parent=node.offsetParent as HTMLElement|null;if(parent){x+=parent.clientLeft;y+=parent.clientTop;}node=parent;}
  const style=getComputedStyle(element);
  return new DOMRect(x,y,parseFloat(style.width)||element.offsetWidth,parseFloat(style.height)||element.offsetHeight);
}
export function boardMatrix(x:number,y:number,elevation=0,width=innerWidth,height=innerHeight):DOMMatrix {
  const {cx,cy,focal}=boardLens(width,height),perspective=new DOMMatrix();perspective.m34=-1/focal;
  return new DOMMatrix().translate(cx,cy).multiply(perspective).rotateAxisAngle(1,0,0,BOARD_TILT).translate(x-cx,y-cy,elevation);
}
export function boardPoint(x:number,y:number,elevation=0) {
  const p=boardMatrix(x,y,elevation).transformPoint(new DOMPoint());return {x:p.x/p.w,y:p.y/p.w};
}
export function screenToBoard(x:number,y:number,elevation=0) {
  const {cx,cy,focal,angle}=boardLens(),s=Math.sin(angle),c=Math.cos(angle),v=y-cy;
  const z=(v*focal-v*c*elevation+focal*s*elevation)/(focal*c+v*s);
  return {x:cx+(x-cx)*(focal-s*z-c*elevation)/focal,y:cy+z};
}
export function cardUnit(root:HTMLElement):number {return parseFloat(getComputedStyle(root).getPropertyValue('--card-w'))||60;}
export function projectBoardDOM(root:HTMLElement):void {
  if(typeof DOMMatrix==='undefined')return;
  const unit=cardUnit(root);
  const planes=[...root.querySelectorAll<HTMLElement>('.zone-row,.market-counter,.mid-aside,.pile,.rift-button')].map(element=>({element,rect:layoutRect(element),elevation:(element.classList.contains('market-counter')?unit*.22:0)+(Number(element.dataset.introHeight)||0)}));
  for(const {element,rect,elevation} of planes){
    element.dataset.boardPlane=String(elevation);element.style.transformOrigin='0 0';
    element.style.transform=new DOMMatrix().translate(-rect.left,-rect.top).multiply(boardMatrix(rect.left,rect.top,elevation)).toString();
  }
  // This child sits on a second physical plinth above the market. Preserve the
  // parent's 3D transform so its height is projected exactly once by our lens.
  root.querySelectorAll<HTMLElement>('.market-sub--supply').forEach(element=>{
    element.dataset.boardPlane=String(unit*.30);element.style.transformOrigin='0 0';
    element.style.transform=`translateZ(${unit*.08}px)`;
  });
  root.querySelectorAll<HTMLElement>('.pile--shelf').forEach(el=>{const n=Number(el.dataset.count)||0;el.style.setProperty('--shelf-elevation',`${unit*(.126+(n>1?Math.min(n,40)*.004:0))+.0075*unit}px`);});
  root.classList.add('board-projected');
}
export function clearBoardProjection(root:HTMLElement):void {
  root.querySelectorAll<HTMLElement>('[data-board-plane]').forEach(el=>{delete el.dataset.boardPlane;el.style.removeProperty('transform');el.style.removeProperty('transform-origin');});
  root.classList.remove('board-projected');
}
/** Used by cast flights to land on the very same projected card face. */
export function projectedPlacement(target:HTMLElement,width:number,height:number):DOMMatrix {
  const plane=target.closest<HTMLElement>('[data-board-plane]');
  if(!plane){const r=target.getBoundingClientRect();return new DOMMatrix().translate(r.left,r.top).scale(r.width/width,r.height/height);}
  const r=layoutRect(target);return boardMatrix(r.left,r.top,Number(plane.dataset.boardPlane)||0).scale(r.width/width,r.height/height);
}

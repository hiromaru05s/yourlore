/** Shared projection math for the physical renderer and aligned DOM furniture. */
export const BOARD_TILT = 18;
export const CARD_RATIO = .64;
export function boardLens(width=innerWidth,height=innerHeight) {
  return {width,height,cx:width/2,cy:height/2,focal:height*2.2,angle:BOARD_TILT*Math.PI/180};
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

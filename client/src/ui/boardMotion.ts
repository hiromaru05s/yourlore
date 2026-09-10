/** Commands contain presentation data only; hidden card identities never enter a motion. */
export type BoardMotion =
  | {kind:'arrival'; target:HTMLElement; card:HTMLElement; signal:AbortSignal; onFrame?:(rect:DOMRect)=>void}
  | {kind:'purchase'; target:HTMLElement; source:HTMLElement; card:HTMLElement; signal:AbortSignal}
  | {kind:'shuffle'; source:HTMLElement; target:HTMLElement; count:number; signal:AbortSignal}
  | {kind:'opening'; signal:AbortSignal};
let run:((request:BoardMotion)=>Promise<boolean>)|undefined;
export function bindBoardMotion(handler:NonNullable<typeof run>):()=>void {run=handler;return()=>{if(run===handler)run=undefined;};}
export function moveOnBoard(request:BoardMotion):Promise<boolean> {return run?.(request)??Promise.resolve(false);}

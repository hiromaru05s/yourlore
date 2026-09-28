import type * as T from 'three';
export type TurnLightState = {now:number;active:boolean;enemy:boolean;remaining:number;hover:boolean;pressed:boolean;reduced:boolean};
export type TurnLightHandle = {update(state:TurnLightState):boolean;renderDisplay?(renderer:T.WebGLRenderer,camera:T.Camera):void;dispose():void};
export type TurnLightFactory = (turn:T.Group,segments:T.Mesh[],scene:T.Scene)=>TurnLightHandle;
let factory:TurnLightFactory|undefined;
/** Development comparison override; normal games use the approved porcelain renderer. */
export function setTurnLightPreview(value?:TurnLightFactory){factory=value;}
export function getTurnLightPreview(){return factory;}

export type {Id} from './selection';
export const DURATION=2600,CONTACT=1800;
// 280px card body; keep the 3.5px root tube inside the outer frame edge.
export const DENTAL_ROOT_EDGE=280/2-3.5;
export const ease=(a:number,b:number,t:number)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
export function physics(ms:number,reduced=false){const u=Math.max(0,Math.min(1,(ms-1350)/(CONTACT-1350)));const height=reduced||ms>=CONTACT?0:34*ease(0,420,ms)*(1-u*u);return {height,contact:CONTACT,underside:height};}
export const BITE={hit:1080,hold:1210,release:1590,snap:100};
export function pose(ms:number){const b=BITE,grow=ease(0,650,ms),u=Math.max(0,Math.min(1,(ms-b.hit+b.snap)/b.snap)),close=u*u*u;const retract=ease(b.hold,b.release,ms),pressure=ease(b.hit,b.hit+22,ms)*(1-ease(b.hold+30,b.release,ms));return {grow,close,open:0,pressure,wound:ease(b.hit,b.hit+40,ms)*(1-ease(1750,2110,ms)),retract,gap:52*(1-close),yaw:0,slide:0,hit:b.hit};}
export type Pose=ReturnType<typeof pose>;

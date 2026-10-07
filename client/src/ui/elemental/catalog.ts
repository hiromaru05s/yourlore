export type Kind = 'cannon' | 'lightning' | 'berserk' | 'arrow' | 'meteor' | 'ball' | 'zone';
export interface Entry {kind:Kind; card:string; name:string; en:string; concept:string; duration:number; hits:number; damage:number; accent:string;}
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const ease=(x:number)=>{const u=clamp(x);return u*u*(3-2*u)};
export const pulse=(t:number,a:number,b:number,c:number)=>ease((t-a)/(b-a))*(1-ease((t-b)/(c-b)));
export const hash=(x:number)=>{const f=Math.sin(x*127.1+311.7)*43758.5453;return f-Math.floor(f)};
export type Point={x:number;y:number};
export type Anchor=Point&{w:number;h:number;el:HTMLElement};
export interface Hit {target:number;at:number;amount:number;}
export const rate=(kind:Kind)=>kind==='berserk'?2:1;
export type VisualEntry=Pick<Entry,'kind'|'duration'|'accent'>;
export const visualEntries:Record<string,VisualEntry>={
 GUNNER:{kind:'cannon',duration:3300,accent:'#dcb78a'},
 HEAVY_GUNNER:{kind:'cannon',duration:3300,accent:'#dcb78a'},
 NGA4:{kind:'berserk',duration:3000,accent:'#e18e95'},
 FIRE_ARROW:{kind:'arrow',duration:3600,accent:'#f8be79'},
 FIRE_METEOR:{kind:'meteor',duration:5100,accent:'#ffa06c'},
 FIRE_BALL:{kind:'ball',duration:3400,accent:'#ffbd73'},
 FIRE_ZONE:{kind:'zone',duration:4100,accent:'#ed9b69'},
};
export const impactTime=(kind:Kind,index:number)=>kind==='zone'?1850:kind==='meteor'?1450+index*285:kind==='arrow'?1350+index*430:1550;

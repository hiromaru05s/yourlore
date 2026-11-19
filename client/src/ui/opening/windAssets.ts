const ROOT='/art/duel-portraits/wind-v5';
const NPC_ROOT='/art/duel-portraits/wind-npcs-v1';
export const duelWindRoot=(key:string)=>['noel','vera'].includes(key)?NPC_ROOT:ROOT;
export const duelWindKey=(avatar:string|null|undefined)=>avatar==='NPC_NOEL'?'noel':avatar==='NPC_VERA'?'vera':avatar==='NPC_LUMI'?'lumi':!avatar||['SEEKER_BLUE','SEEKER_RED','SEEKER_HOODED'].includes(avatar)?'seeker':null;
export const duelWindPoster=(key:string)=>`${duelWindRoot(key)}/${key}-right.png`;
export const DUEL_WIND_BACKGROUND=`${ROOT}/lumi-background.png`;
export function duelWindAssets(avatars:readonly (string|null|undefined)[]){
 const keys=[...new Set(avatars.map(duelWindKey).filter((key):key is NonNullable<ReturnType<typeof duelWindKey>>=>key!==null))];
 return [...keys.flatMap(key=>[duelWindPoster(key),...(key==='seeker'?[]:[`${duelWindRoot(key)}/${key}-forehead.png`,...(key==='noel'||key==='vera'?[`${duelWindRoot(key)}/${key}-fringe.png`]:[])])]),...(keys.some(key=>key!=='seeker')?[DUEL_WIND_BACKGROUND]:[])];
}

import type {Env} from './env';
import type {DuelProfile} from '../../client/src/shared/duelProfile';
import {seekerLevel} from '../../client/src/shared/progression';
import {getRating,rankPosition,tierWithGm} from './rank';
/** Only the level and, for ranked rooms, the public match rating leave the server. */
export async function duelProfile(env:Env,id:string,ranked:boolean):Promise<DuelProfile>{
 const row=await env.DB.prepare('SELECT COALESCE(e.exp,0) AS exp FROM users u LEFT JOIN player_experience e ON e.user_id=u.id WHERE u.id=?').bind(id).first<{exp:number}>();
 if(!row)return {level:null};
 const profile:DuelProfile={level:seekerLevel(row.exp).level};
 if(ranked){const rating=await getRating(env,id),rank=await rankPosition(env,id,rating.season);profile.rating={mmr:rating.mmr,tier:tierWithGm(rating.mmr,rank)};}
 return profile;
}

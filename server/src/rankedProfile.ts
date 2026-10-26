import type {Env} from './env';
import type {PurchaseStats,RankedProfile} from '../../client/src/shared/rankedProfile';
import {DB,STARTERS} from '../../client/src/shared/cards';

/** Batch the leaderboard's telemetry; never issue one query per row. Callers enforce privacy. */
export async function rankedPurchases(env:Env,userIds:string[]):Promise<Map<string,PurchaseStats>> {
  const output=new Map(userIds.map(id=>[id,{sampleGames:0,cards:[]} as PurchaseStats]));
  if(!userIds.length)return output;
  const rows=await env.DB.prepare(`WITH participants AS (
    SELECT player_a AS user_id,buys_a AS buys FROM matches
      WHERE player_a IN (SELECT value FROM json_each(?1)) AND mode='ranked' AND ended_at IS NOT NULL
    UNION ALL
    SELECT player_b AS user_id,buys_b AS buys FROM matches
      WHERE player_b IN (SELECT value FROM json_each(?1)) AND mode='ranked' AND ended_at IS NOT NULL
  ), valid AS (
    SELECT user_id,buys FROM participants WHERE CASE WHEN json_valid(buys) THEN json_type(buys)='object' ELSE 0 END
  ), samples AS (SELECT user_id,COUNT(*) AS samples FROM valid GROUP BY user_id),
  counts AS (
    SELECT v.user_id,j.key AS card_id,COUNT(*) AS games,SUM(j.value) AS buys
    FROM valid v,json_each(v.buys) j WHERE j.type IN ('integer','real') AND j.value>0
      AND j.key IN (SELECT value FROM json_each(?2)) GROUP BY v.user_id,j.key
  ), ordered AS (
    SELECT *,ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY games DESC,buys DESC,card_id ASC) AS position FROM counts
  ) SELECT s.user_id,s.samples,o.card_id,o.games FROM samples s
    LEFT JOIN ordered o ON o.user_id=s.user_id AND o.position<=5 ORDER BY s.user_id,o.position`)
    .bind(JSON.stringify(userIds),JSON.stringify([...Object.keys(DB),...Object.keys(STARTERS)]))
    .all<{user_id:string;samples:number;card_id:string|null;games:number|null}>();
  for(const row of rows.results??[]){
    const stats=output.get(row.user_id)!;stats.sampleGames=row.samples;
    if(row.card_id&&row.games)stats.cards.push({id:row.card_id,games:row.games,rate:row.games/row.samples});
  }
  return output;
}

export async function rankedProfile(env:Env,userId:string):Promise<RankedProfile> {
  const totals=await env.DB.prepare(`SELECT COUNT(*) AS games,
    COALESCE(SUM(winner=?1),0) AS wins,
    COALESCE(SUM(winner IS NOT NULL AND winner!=?1),0) AS losses,
    COALESCE(SUM(winner IS NULL),0) AS draws FROM matches
    WHERE (player_a=?1 OR player_b=?1) AND mode='ranked' AND ended_at IS NOT NULL`)
    .bind(userId).first<{games:number;wins:number;losses:number;draws:number}>();
  const recent=await env.DB.prepare(`SELECT m.id,m.ended_at,d.cards FROM matches m
    LEFT JOIN ranked_match_decks d ON d.match_id=m.id AND d.user_id=?1
    WHERE (m.player_a=?1 OR m.player_b=?1) AND m.mode='ranked' AND m.ended_at IS NOT NULL
    ORDER BY m.ended_at DESC,m.id DESC LIMIT 3`)
    .bind(userId).all<{id:string;ended_at:number;cards:string|null}>();
  const counts=totals??{games:0,wins:0,losses:0,draws:0};
  return {...counts,winRate:counts.games?counts.wins/counts.games:null,
    recentDecks:(recent.results??[]).map(row=>{
      let cards:string[]|null=null;
      try{const parsed:unknown=JSON.parse(row.cards??'null');if(Array.isArray(parsed)&&parsed.length===8&&parsed.every(id=>typeof id==='string'&&!!(DB[id]??STARTERS[id])))cards=['STARTER_MANA',...parsed];}catch{/* unknown historical deck stays empty */}
      return {matchId:row.id,at:row.ended_at,cards};
    }),purchases:(await rankedPurchases(env,[userId])).get(userId)!};
}

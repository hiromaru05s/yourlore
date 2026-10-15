import type {Env} from './env';
import {MEDALS,MEDAL_BY_ID,MEDAL_SERIES,type MedalState} from '../../client/src/shared/medals';
import {effMaxMana} from '../../client/src/shared/engine';
import {duelMedalMetrics} from '../../client/src/shared/medalTracking';
import type {GameState,Side} from '../../client/src/shared/types';
import {rewardDay} from '../../client/src/shared/progression';
import {seasonKey} from './rank';

/** Only public, historically recorded card plays. No client-supplied counters. */
const SERIES_MAP=JSON.stringify(MEDAL_SERIES.flatMap(s=>s.cards.map(card=>({series:s.id,card}))));
export async function medalState(env:Env,userId:string,now=Date.now(),markDay=false):Promise<MedalState>{
 const db=env.DB;
 if(markDay)await db.prepare('INSERT OR IGNORE INTO user_days(user_id,day) VALUES (?,?)').bind(userId,rewardDay(now)).run();
 const [user,base,series,saved,earned]=await Promise.all([
  db.prepare('SELECT badge FROM users WHERE id=?').bind(userId).first<{badge:string|null}>(),
  db.prepare(`SELECT
   (SELECT COUNT(*) FROM user_days WHERE user_id=?1) AS days,
   (SELECT COUNT(*) FROM matches WHERE winner=?1 AND ended_at IS NOT NULL AND mode IN ('online','ranked')) AS wins,
   (SELECT COALESCE(MAX(peak_mmr),0) FROM ratings WHERE user_id=?1) AS peak,
   CASE WHEN EXISTS(SELECT 1 FROM ratings WHERE user_id=?1 AND final_tier='gm')
    OR EXISTS(SELECT 1 FROM ranked_results WHERE applied=1 AND
     ((a_id=?1 AND ((a_after>=1550 AND a_rank_after BETWEEN 1 AND 25) OR (a_before>=1550 AND a_rank_before BETWEEN 1 AND 25)))
      OR (b_id=?1 AND ((b_after>=1550 AND b_rank_after BETWEEN 1 AND 25) OR (b_before>=1550 AND b_rank_before BETWEEN 1 AND 25)))))
    OR EXISTS(SELECT 1 FROM (SELECT user_id,mmr,ROW_NUMBER() OVER(ORDER BY mmr DESC,updated_at ASC,user_id ASC) AS pos FROM ratings WHERE season=?2) WHERE user_id=?1 AND mmr>=1550 AND pos<=25)
    THEN 1 ELSE 0 END AS gm`).bind(userId,seasonKey(new Date(now))).first<Record<string,number>>(),
  db.prepare(`WITH mine AS (
   SELECT id,winner,CASE WHEN player_a=?1 THEN cards_a ELSE cards_b END AS cards FROM matches
   WHERE (player_a=?1 OR player_b=?1) AND ended_at IS NOT NULL AND mode IN ('online','ranked')
  ), per_game AS (
   SELECT m.id,json_extract(s.value,'$.series') AS series,MAX(m.winner=?1) AS won,
    SUM(CASE WHEN c.value>0 THEN CAST(c.value AS INTEGER) ELSE 0 END) AS uses,
    COUNT(DISTINCT CASE WHEN c.value>0 THEN c.key END) AS kinds
   FROM mine m,json_each(CASE WHEN json_valid(m.cards) THEN m.cards ELSE '{}' END) c,json_each(?2) s
   WHERE c.key=json_extract(s.value,'$.card') GROUP BY m.id,series
  ) SELECT series,SUM(uses) AS uses,SUM(CASE WHEN won=1 AND kinds>=2 THEN 1 ELSE 0 END) AS wins FROM per_game GROUP BY series`).bind(userId,SERIES_MAP).all<{series:string;uses:number;wins:number}>(),
  db.prepare('SELECT metric,value FROM medal_progress WHERE user_id=?').bind(userId).all<{metric:string;value:number}>(),
  db.prepare('SELECT medal_id,earned_at FROM earned_medals WHERE user_id=?').bind(userId).all<{medal_id:string;earned_at:number}>(),
 ]);
 const values:Record<string,number>={...base};
 for(const r of saved.results??[])values[r.metric]=Math.max(values[r.metric]??0,r.value);
 for(const r of series.results??[]){values[`series:${r.series}:use`]=r.uses;values[`series:${r.series}:win`]=r.wins;}
 values.allSeries=MEDAL_SERIES.filter(s=>(values[`series:${s.id}:win`]??0)>0).length;
 const owned=new Map((earned.results??[]).map(r=>[r.medal_id,r.earned_at]));
 const newly=MEDALS.filter(m=>!owned.has(m.id)&&(values[m.metric]??0)>=m.target);
 if(newly.length){
  // D1 limits bound parameters per statement; restore large histories in small inserts.
  const inserts:D1PreparedStatement[]=[];
  for(let i=0;i<newly.length;i+=30){const chunk=newly.slice(i,i+30);inserts.push(db.prepare('INSERT OR IGNORE INTO earned_medals(user_id,medal_id,earned_at) VALUES '+chunk.map(()=>'(?,?,?)').join(',')).bind(...chunk.flatMap(m=>[userId,m.id,now])));}
  await db.batch(inserts);
  for(const m of newly)owned.set(m.id,now);
 }
 return {equipped:user?.badge&&MEDAL_BY_ID.has(user.badge)&&owned.has(user.badge)?user.badge:null,
  entries:MEDALS.map(m=>({id:m.id,value:Math.min(m.target,owned.has(m.id)?Math.max(m.target,values[m.metric]??0):values[m.metric]??0),target:m.target,earnedAt:owned.get(m.id)??null}))};
}

/** One transaction for counters and the receipt; retries and DO rehydration cannot duplicate progress. */
export async function settleMedals(env:Env,matchId:string,g:GameState,side:Side,now:number):Promise<void>{
 const id=g.players[side].id;
 if(!g.medalDuel||!g.over)return;
 const db=env.DB,statements:D1PreparedStatement[]=[];
 for(const [metric,value] of Object.entries(duelMedalMetrics(g,side,effMaxMana(g.players[side])))){
  if(value<=0)continue;
  statements.push(db.prepare(`INSERT INTO medal_progress(user_id,metric,value)
   SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM medal_duel_receipts WHERE user_id=? AND match_id=?)
   ON CONFLICT(user_id,metric) DO UPDATE SET value=value+excluded.value`).bind(id,metric,value,id,matchId));
 }
 statements.push(db.prepare('INSERT OR IGNORE INTO medal_duel_receipts(user_id,match_id,created_at) VALUES (?,?,?)').bind(id,matchId,now));
 await db.batch(statements);
}

export async function equippedMedal(env:Env,userId:string):Promise<string|null>{
 const row=await env.DB.prepare('SELECT badge FROM users WHERE id=?').bind(userId).first<{badge:string|null}>();
 return row?.badge&&MEDAL_BY_ID.has(row.badge)?row.badge:null;
}

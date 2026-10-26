/** Ranked-only, lifetime telemetry. Rates are fractions; missing data is null/empty. */
export interface PurchaseCard { id:string; games:number; rate:number }
export interface PurchaseStats { sampleGames:number; cards:PurchaseCard[] }
export interface RankedProfile {
  games:number; wins:number; losses:number; draws:number; winRate:number|null;
  recentDecks:{matchId:string;at:number;cards:string[]|null}[];
  purchases:PurchaseStats;
}

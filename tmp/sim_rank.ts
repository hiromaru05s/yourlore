import { DB, STARTERS } from "../client/src/shared/cards";
import * as fs from "fs";
const acc = JSON.parse(fs.readFileSync("/tmp/sim/stats2.json", "utf8"));
const nm = (id: string) => DB[id]?.name ?? STARTERS[id]?.name ?? id;
const wilson = (w: number, n: number) => { if (!n) return 0; const p = w / n, z = 1.96; return (p + z*z/(2*n) - z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)) / (1+z*z/n); };
console.log("== 전체카드(스타팅 제외) top15 — 사용 게임 40판 이상 ==");
const cards = Object.entries(acc.card as Record<string,{n:number,w:number}>)
  .filter(([,s]) => s.n >= 60)
  .map(([id,s]) => ({ id, n: s.n, wr: s.w/s.n, lb: wilson(s.w, s.n) }))
  .sort((a,b) => b.lb - a.lb);
cards.slice(0,18).forEach((c,i) => console.log(`${i+1}. ${nm(c.id)} [${c.id}] ${(c.wr*100).toFixed(1)}% (n=${c.n}) cost${DB[c.id].cost}`));
console.log("\n== 하위 10 (참고) ==");
cards.slice(-12).forEach((c) => console.log(`${nm(c.id)} [${c.id}] ${(c.wr*100).toFixed(1)}% (n=${c.n})`));
console.log("\n== 스타팅카드 랭킹 (덱 포함 게임 승률) ==");
const st = Object.entries(acc.starter as Record<string,{n:number,w:number}>)
  .map(([id,s]) => ({ id, n: s.n, wr: s.w/s.n, lb: wilson(s.w, s.n) }))
  .sort((a,b) => b.lb - a.lb);
st.forEach((c,i) => console.log(`${i+1}. ${nm(c.id)} [${c.id}] ${(c.wr*100).toFixed(1)}% (n=${c.n})`));
console.log("\ntotal graded cards:", cards.length);

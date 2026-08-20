// ============================================================
// LORE — 카드 도감(발견) 추적. 게임에서 구매/플레이/소환으로 실제로
// 접한 카드를 localStorage에 기록한다. 아카이브가 "발견 N/전체"
// 진행도와 미발견 카드의 NEW 배지를 그리는 데 쓴다.
// (연출용 로컬 기록 — 서버 검증이 필요한 데이터가 아니다)
// ============================================================

const KEY = "lore_seen";
let cache: Set<string> | null = null;

function load(): Set<string> {
  if (cache) return cache;
  try { cache = new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]); }
  catch { cache = new Set(); }
  return cache;
}

export function isSeen(id: string): boolean { return load().has(id); }
export function seenCount(): number { return load().size; }

let saveTimer = 0;
export function markSeen(id: string | undefined | null): void {
  if (!id || id === "HIDDEN") return;
  const s = load();
  if (s.has(id)) return;
  s.add(id);
  // 이벤트 배치 중 여러 장이 연달아 들어온다 — 저장은 모아서 한 번
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* private mode */ }
  }, 300);
}

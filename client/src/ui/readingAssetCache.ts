import { createAssetQueue, type AssetPriority } from './assetQueue';
import { READING_ASSETS } from './readingBoardLayout';

const queue = createAssetQueue(6, 2);
const pending = new Map<string, ReturnType<typeof queue.add<ArrayBuffer>>>();
const cache = new Map<string, ArrayBuffer>();
const CACHE_BYTES = 32 * 1024 * 1024;
let bytes = 0;
export const readingBoardUrl = (low: boolean) => `${READING_ASSETS}board${low ? '-low' : ''}.glb?revision=recessed-rim-v3-20260929`;
export function readingAssetUrls(low: boolean): string[] {
  return [readingBoardUrl(low), ...[
    `market${low ? '-low' : ''}.glb`, `supply${low ? '-low' : ''}.glb`,
    `deck-place${low ? '-lod1' : ''}.glb`, `shelf${low ? '-lod1' : ''}.glb`,
    'mana-tray.glb', 'mana-counter.glb', 'mana-crystal-ready.glb', 'mana-crystal-spent.glb',
    'crystal-optics.json', 'turn-button.glb', 'timer-inserts.glb', 'reroll-button.glb',
  ].map(name => READING_ASSETS + name)];
}
/** Reuse bytes, never live scene graphs: each scene retains independent disposal. */
export function readingAssetBytes(url: string, priority: AssetPriority = 'high'): Promise<ArrayBuffer> {
  url = new URL(url, location.href).href;
  const hit = cache.get(url);
  if (hit) { cache.delete(url); cache.set(url, hit); return Promise.resolve(hit); }
  let task = pending.get(url);
  if (task) { if (priority === 'high') task.promote(); return task.promise; }
  task = queue.add(async () => {
    const abort = new AbortController(), timeout = setTimeout(() => abort.abort(), 60000);
    try {
      const response = await fetch(url, { signal: abort.signal });
      if (!response.ok) throw new Error(`Board asset unavailable: ${response.status}`);
      const data = await response.arrayBuffer();
      if (data.byteLength <= CACHE_BYTES) {
        cache.set(url, data); bytes += data.byteLength;
        while (bytes > CACHE_BYTES) {
          const [key, value] = cache.entries().next().value!;
          bytes -= value.byteLength; cache.delete(key);
        }
      }
      return data;
    } finally { clearTimeout(timeout); pending.delete(url); }
  }, priority);
  pending.set(url, task);
  return task.promise;
}
export async function warmReadingAssets(): Promise<void> {
  await Promise.allSettled(readingAssetUrls(matchMedia('(max-width:700px)').matches).map(url => readingAssetBytes(url, 'low')));
}

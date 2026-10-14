import { withDeadline } from '../net/deadline';
import { createAssetQueue, type AssetPriority } from './assetQueue';

const queue = createAssetQueue();
const tasks = new Map<string, { promise: Promise<void>; promote: () => void }>();
const loaded = new Set<string>();
// Keep recently decoded images alive, but never retain the whole card catalogue.
const retained = new Map<string, { image: HTMLImageElement; bytes: number }>();
const RETAIN_BYTES = 32 * 1024 * 1024;
let retainedBytes = 0;
const canonical = (url: string) => new URL(url, location.href).href;

export function decodeAsset(url: string, priority: AssetPriority = 'high'): Promise<void> {
  url = canonical(url);
  const cached = retained.get(url);
  if (cached) { retained.delete(url); retained.set(url, cached); }
  let task = tasks.get(url);
  if (!task) {
    let image: HTMLImageElement | undefined;
    const queued = queue.add(async () => {
      image = new Image(); image.loading = 'eager'; image.fetchPriority = priority;
      image.src = url;
      // A caller's shorter deadline must not restart a slow shared download.
      await withDeadline(image.decode(), 60000);
      loaded.add(url);
      const bytes = image.naturalWidth * image.naturalHeight * 4;
      if (bytes <= RETAIN_BYTES) {
        retained.set(url, { image, bytes }); retainedBytes += bytes;
        while (retainedBytes > RETAIN_BYTES) {
          const [key, entry] = retained.entries().next().value!;
          retainedBytes -= entry.bytes; retained.delete(key);
          // Retain the tiny completion record. Evicting decoded pixels must not
          // re-download/revalidate the same URL when another screen requests it.
        }
      }
      image = undefined; // Completed queue/promote closures must not pin pixels.
    }, priority);
    const promise = queued.promise.catch(error => {
      if (image) image.src = '';
      tasks.delete(url); throw error;
    });
    task = { promise, promote() { priority = 'high'; if (image) image.fetchPriority = 'high'; queued.promote(); } };
    tasks.set(url, task);
  } else if (priority === 'high') task.promote();
  return task.promise;
}

export const hasUnloadedAssets = (urls: string[]) => urls.some(url => !loaded.has(canonical(url)));
export async function warmImages(urls: readonly string[]): Promise<void> {
  if (typeof Image === 'undefined' || typeof Image.prototype.decode !== 'function') return;
  await Promise.allSettled([...new Set(urls)].map(url => decodeAsset(url, 'low')));
}

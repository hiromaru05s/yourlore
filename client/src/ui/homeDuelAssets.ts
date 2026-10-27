import {startupAssetUrl} from './startupAssets';
import {loadAssetImage} from './imageAssets';

export type Mode = 'single' | 'normal' | 'ranked';
export const homeDuelArt = '/art/ui/home-duel-frame-01/';
export const homeDuelImage = (mode: Mode) => startupAssetUrl(`${homeDuelArt}${mode}-lossless.webp`);
export const homeDuelFrame = startupAssetUrl(`${homeDuelArt}frame-pair-lossless.webp`);
const images = new Map<Mode, Promise<HTMLImageElement>>();

/** Only three approved pigments, shared by mode switches and HOME revisits. */
export function loadHomeDuelImage(mode: Mode): Promise<HTMLImageElement> {
  let task = images.get(mode);
  if (!task) {
    task = loadAssetImage(homeDuelImage(mode), 'low')
      .catch(error => { images.delete(mode); throw error; });
    images.set(mode, task);
  }
  return task;
}

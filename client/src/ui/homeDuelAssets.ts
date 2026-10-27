import {decodeAsset} from './imageAssets';

export type Mode = 'single' | 'normal' | 'ranked';
export const homeDuelArt = '/art/ui/home-duel-frame-01/';
export const homeDuelImage = (mode: Mode) => `${homeDuelArt}${mode}-lossless.webp`;
export const homeDuelFrame = `${homeDuelArt}frame-pair-lossless.webp`;
const images = new Map<Mode, Promise<HTMLImageElement>>();

/** Only three approved pigments, shared by mode switches and HOME revisits. */
export function loadHomeDuelImage(mode: Mode): Promise<HTMLImageElement> {
  let task = images.get(mode);
  if (!task) {
    task = (async () => {
      await decodeAsset(homeDuelImage(mode), 'low');
      const image = new Image();
      image.decoding = 'async'; image.src = homeDuelImage(mode);
      await image.decode();
      return image;
    })().catch(error => { images.delete(mode); throw error; });
    images.set(mode, task);
  }
  return task;
}

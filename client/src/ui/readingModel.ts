import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { readingAssetBytes } from './readingAssetCache';

export async function loadReadingModel(url: string) {
  const data = await readingAssetBytes(url);
  return new GLTFLoader().parseAsync(data, new URL('.', new URL(url, location.href)).href);
}

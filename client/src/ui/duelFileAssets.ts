import {SFX_NAMES,soundUrls} from './soundAssets';
import {WEB_FONT_FILES} from './fontAssets';
import {readingAssetUrls} from './readingAssetCache';
/** Public binary resources, separate from images so storage-less fallback never
 * tries to decode a font/model/audio file as an image. */
export function duelFileAssets(){
 const low=new Set(readingAssetUrls(true)),full=new Set(readingAssetUrls(false));
 return [
  ...SFX_NAMES.flatMap(soundUrls).map(url=>({url,media:undefined})),
  ...WEB_FONT_FILES.map(url=>({url,media:undefined})),
  ...[...new Set([...low,...full])].map(url=>({url,media:low.has(url)&&full.has(url)?undefined:low.has(url)?'narrow':'wide'})),
  ...['/models/reading-board/v1/fonts/DejaVuSerif.ttf','/fonts/rift-records/CormorantGaramond-Medium-numerals.ttf','/music/yohaku-to-zankyo.mp3','/music/clash-of-blades.mp3','/music/poised-opening.mp3'].map(url=>({url,media:undefined})),
 ];
}

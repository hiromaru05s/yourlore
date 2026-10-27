import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

/** These unchanged pixels are reused by CSS, DOM and GPU during cold startup.
 * Content-addressed copies avoid revalidating a fixed URL between those owners. */
export async function startupAssets(root) {
 const paths=[
  '/art/brand/lore-logo-transparent.webp',
  '/art/ui/loading/azure-card-v1.webp',
  '/art/lounge/toon-balanced-20261026/library-wide.webp',
  '/art/lounge/toon-balanced-20261026/ivy.webp',
  '/art/lounge/toon-soft-20261026/clouds.webp',
  '/art/ui/lore-panel-azure-cut-lossless.webp',
  '/art/seekers/faceless-v2/portrait.webp',
  ...['single','normal','ranked','frame-pair'].map(name=>`/art/ui/home-duel-frame-01/${name}-lossless.webp`),
 ];
 const urls={},assets=[];
 for(const url of paths){
  const source=await readFile(path.join(root,'public',url));
  const hash=createHash('sha256').update(source).digest('hex').slice(0,20);
  const fileName=`assets/startup-${path.basename(url,'.webp')}-${hash}.webp`;
  urls[url]='/'+fileName;assets.push({fileName,source});
 }
 const rewrite=text=>Object.entries(urls).reduce((out,[from,to])=>out.replaceAll(from,to),text);
 return {urls,assets,rewrite};
}

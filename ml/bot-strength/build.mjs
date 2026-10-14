import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
const out=path.resolve(process.argv[2] || '.bot-strength');
await mkdir(path.join(out,'results'),{recursive:true});
await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/bot';export * from './client/src/shared/botSearch';export * from './client/src/shared/botActions';export * from './client/src/shared/botObservation';export * from './client/src/shared/botValue';export * from './client/src/shared/botValueWeights';export * from './client/src/shared/botNpcs';export * from './client/src/shared/botEconomy';export {withoutMonsterPresentation} from './client/src/shared/monsterEffects';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(out,'candidate.cjs')});
await writeFile(path.join(out,'baseline.cjs'),gunzipSync(await readFile('docs/bot-strength/2026-10-13/baseline.cjs.gz')));
console.log(out);

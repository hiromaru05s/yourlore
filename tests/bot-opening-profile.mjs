import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = await mkdtemp(path.join(tmpdir(), 'lore-bot-opening-'));
const dom = new JSDOM('<main><div class="game"></div></main>', {url:'http://localhost'});
for (const key of ['window','document','HTMLElement','Element','Node','localStorage','navigator','CustomEvent','Event','Image']) {
  Object.defineProperty(globalThis, key, {value:dom.window[key], configurable:true});
}
globalThis.matchMedia = () => ({matches:false, addEventListener(){}, removeEventListener(){}});
globalThis.botOpeningQA = {};
try {
  await build({
    stdin:{contents:"export {BaseController,setCoinProfiles} from './client/src/game/controller'; export {BOT_NPCS} from './client/src/shared/botNpcs';", resolveDir:process.cwd()},
    bundle:true, format:'esm', platform:'node', loader:{'.css':'empty'}, outfile:path.join(dir,'controller.mjs'),
    plugins:[{name:'capture-opening-boundary', setup(b) {
      b.onResolve({filter:/duelOpeningDirector$/}, () => ({path:'opening', namespace:'fixture'}));
      b.onLoad({filter:/.*/, namespace:'fixture'}, () => ({contents:`
        export async function warmOpening() {}
        export async function playDuelOpening(options) {
          globalThis.botOpeningQA.options = options;
          globalThis.botOpeningQA.controller.dead = true;
        }
      `}));
    }}],
  });
  const {BaseController,setCoinProfiles,BOT_NPCS} = await import(path.join(dir,'controller.mjs'));
  const run = async (avatar, difficulty, you = 0) => {
    const npc = BOT_NPCS.find(n => n.difficulty === difficulty);
    setCoinProfiles({avatar:'SEEKER_BLUE',name:'YOU'}, {avatar,name:'?'});
    const players = [{name:'YOU'},{name:npc?.name.ja ?? 'Opponent'}];
    if (you === 1) players.reverse();
    const controller = Object.assign(Object.create(BaseController.prototype), {
      state:{players, botDifficulty:difficulty, turn:1, cur:you, over:false}, you,
      openingRoot:document.querySelector('main'), openingAbort:new AbortController(),
      prepareOpeningAssets:async()=>{}, exits:{}, dead:false,
    });
    globalThis.botOpeningQA.controller = controller;
    await controller.showCoinToss(you);
    const options = globalThis.botOpeningQA.options;
    assert.equal(options.me.avatar, 'SEEKER_BLUE');
    assert.equal(options.opp.name, npc?.name.ja ?? 'Opponent');
    assert.equal(options.firstIsMe, true);
    assert.equal(document.querySelector('.game').inert, false);
    return options.opp.avatar;
  };
  // Authenticated BOT launch used to coerce NPCs to a seeker; resume mounts with
  // no profile at all. In both cases the authoritative room identifies the NPC.
  for (const npc of BOT_NPCS) for (const mountedAvatar of [null,'SEEKER_RED','NPC_LUMI']) {
    for (const you of [0,1]) assert.equal(await run(mountedAvatar,npc.difficulty,you),npc.avatar);
  }
  // Local guest BOTs and ordinary online duels preserve the supplied profile.
  for (const avatar of [...BOT_NPCS.map(n=>n.avatar),'SEEKER_RED','SEEKER_BLUE',null]) {
    assert.equal(await run(avatar,undefined),avatar);
  }
  console.log('PASS: all four authoritative BOT opening profiles, missing/stale resume profiles, both seats, local NPC and human profile preservation');
} finally {
  delete globalThis.botOpeningQA; dom.window.close(); await rm(dir,{recursive:true,force:true});
}

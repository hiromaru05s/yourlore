import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';

const dir = await mkdtemp(path.join(tmpdir(), 'lore-single-pages-'));
try {
  await build({
    stdin: {
      contents: `export {createSingleIdleMotion} from './client/src/ui/singleIdleMotion';
        export {SINGLE_DIFFICULTIES} from './client/src/shared/botNpcs';
        export {handleRewards} from './server/src/rewards';`,
      resolveDir: process.cwd(),
    },
    bundle: true, platform: 'node', format: 'esm', outfile: path.join(dir, 'single.mjs'),
  });
  const {createSingleIdleMotion, SINGLE_DIFFICULTIES, handleRewards} = await import(path.join(dir, 'single.mjs'));
  assert.deepEqual(SINGLE_DIFFICULTIES, ['easy', 'normal', 'hard']);

  const motion = createSingleIdleMotion(() => 0);
  let state = motion.advance(0), previous = state, sawBlink = false, sawGesture = false, returnedToIdle = false;
  for (let frame = 0; frame < 60 * 28; frame++) {
    state = motion.advance(1 / 60);
    assert(state.blink >= 0 && state.blink <= 1);
    assert(state.gesture >= 0 && state.gesture <= 1);
    assert(Math.abs(state.gesture - previous.gesture) < 0.021, 'gesture blends in and out without a jump');
    if (state.blink > 0.99) sawBlink = true;
    if (state.gesture > 0.99) sawGesture = true;
    if (sawGesture && state.gesture === 0) returnedToIdle = true;
    previous = state;
  }
  assert(sawBlink && sawGesture && returnedToIdle);
  assert.deepEqual(motion.advance(0), state, 'paused screen does not advance motion');
  assert.deepEqual(motion.advance(-1), state);
  const quiet = createSingleIdleMotion(() => 0.9);
  for (let frame = 0; frame < 60 * 90; frame++) {
    assert.equal(quiet.advance(1 / 60).gesture, 0, 'gesture can be skipped by the probability check');
  }

  const env = rewardTestEnv();
  env.GAME_ROOM = {idFromName: name => name, get: () => ({fetch: async () => Response.json({index: 0})})};
  await env.DB.prepare('INSERT INTO sessions VALUES (?,?,?,?)').bind('single-test', 'a', Date.now(), Date.now() + 86400000).run();
  const request = (route, body = {}) => handleRewards(env, new Request('https://local.test' + route, {
    method: 'POST', headers: {Cookie: 'lore_session=single-test'}, body: JSON.stringify(body),
  }), route);
  for (const [index, difficulty] of SINGLE_DIFFICULTIES.entries()) {
    assert.equal((await request('/rewards/story/start')).status, 403);
    assert.equal((await request('/rewards/bot/start', {difficulty})).status, 200);
    if (index < 2) {
      assert.equal((await request('/rewards/bot/start', {difficulty: SINGLE_DIFFICULTIES[index + 1]})).status, 403);
    }
    await env.DB.prepare('INSERT INTO rewards VALUES(?,?,?,?)').bind('a', 'bot:first:' + difficulty, 1, Date.now()).run();
  }
  assert.equal((await request('/rewards/story/start')).status, 200, 'three existing first-win receipts unlock story');
  assert.equal((await request('/rewards/bot/start', {difficulty: 'hell'})).status, 400);
  console.log('PASS single idle continuity, random gesture, pause, sequential opponents and three-win story unlock');
} finally {
  await rm(dir, {recursive: true, force: true});
}

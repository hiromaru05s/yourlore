/** Real staging D1 transaction smoke with explicitly provisioned disposable users/coupon. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin = 'https://test.yourlore.xyz';
const users = JSON.parse(await fs.readFile(process.env.LORE_QA_AUTH_FILE, 'utf8'));
const code = process.env.LORE_QA_COUPON;
assert.equal(users.length, 2);
assert(users.every(u => u.id.startsWith('qa-release-audit-')));
assert(code?.startsWith('QA-AUDIT-'));
const checks = [];
async function request(i, path, body) {
  const r = await fetch(origin + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {'content-type':'application/json', cookie:'lore_session=' + users[i].token},
    body: body === undefined ? undefined : JSON.stringify(body), signal:AbortSignal.timeout(30000),
  });
  return {status:r.status, body:await r.json()};
}
const before = await Promise.all(users.map((_, i) => request(i, '/api/auth/me')));
assert(before.every(r => r.status === 200));
const claims = await Promise.all([0, 1].map(() => request(0, '/api/rewards/claim', {key:'tuto:1'})));
assert(claims.every(r => r.status === 200));
assert.equal(claims.filter(r => r.body.granted).length, 1);
assert.equal(claims.reduce((sum, r) => sum + r.body.amount, 0), 50);
checks.push('concurrent repeated reward claim pays exactly once on real D1');
const coupons = await Promise.all(users.map((_, i) => request(i, '/api/rewards/coupon', {code})));
assert.deepEqual(coupons.map(r => r.status).sort(), [200,410]);
assert.equal(coupons.filter(r => r.body.granted).length, 1);
checks.push('concurrent single-use coupon pays exactly one of two users on real D1');
const after = await Promise.all(users.map((_, i) => request(i, '/api/auth/me')));
const deltas = after.map((r, i) => r.body.user.credits - before[i].body.user.credits);
assert.equal(deltas.reduce((a,b) => a+b, 0), 57);
assert.equal(deltas[0], 50 + (coupons[0].status === 200 ? 7 : 0));
assert.equal(deltas[1], coupons[1].status === 200 ? 7 : 0);
checks.push('real persisted balances match exactly the two authorized fixture payouts');
const badReward = await request(0, '/api/rewards/claim', {key:'__proto__'});
assert.equal(badReward.status, 400);
const setup = await fetch(origin + '/ws/room/qa-audit/setup', {method:'POST',body:'{}'});
assert.equal(setup.status, 400);
const anonymous = await fetch(origin + '/ws/queue');
assert.equal(anonymous.status, 401);
checks.push('invalid reward key rejected; public nested setup blocked; anonymous queue denied');
const report = {origin, checkedAt:new Date().toISOString(),checks,claims:claims.map(r=>({status:r.status,granted:r.body.granted,amount:r.body.amount})),couponStatuses:coupons.map(r=>r.status),creditDeltas:deltas};
await fs.writeFile(process.env.LORE_TEST_OUTPUT + '/staging-security.json', JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));

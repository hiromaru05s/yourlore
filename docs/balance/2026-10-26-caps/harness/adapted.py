"""Independent post-change roster validation; run after both adapted shards finish."""
import collections, gzip, json, pathlib, random, sys

root, dest = map(pathlib.Path, sys.argv[1:3])
plan = json.loads((root / 'adapted-plan.json').read_text())
rows = [json.loads(line) for i in range(2)
        for line in (root / f'adapted-{i}.jsonl').read_text().splitlines() if line]
assert len(rows) == len(plan) == 1920
assert len({r['job'] for r in rows}) == 1920
assert {r['job'] for r in rows} == {r['job'] for r in plan}
assert all(r['invalid'] is None and r['result'] is not None for r in rows)
rows.sort(key=lambda r: r['job'])
for p, r in zip(plan, rows):
    assert all(p[k] == r[k] for k in p)
for name, data in [('adapted-plan.json.gz', plan)]:
    with gzip.open(dest / name, 'wt') as f:
        json.dump(data, f, separators=(',', ':'))
with gzip.open(dest / 'adapted-raw.jsonl.gz', 'wt') as f:
    for r in rows:
        f.write(json.dumps(r, separators=(',', ':')) + '\n')

rng = random.Random(641027)
def summarize(rs):
    return {'n': len(rs), 'wins': sum(r['result'] == 1 for r in rs),
            'draws': sum(r['result'] == .5 for r in rs),
            'winEquivalent': sum(r['result'] for r in rs),
            'rate': sum(r['result'] for r in rs) / len(rs)}

names = list(dict.fromkeys(r['name'] for r in rows))
opponents = list(dict.fromkeys(r['opponent'] for r in rows))
result = {'completed': 1920, 'invalid': 0, 'unfinished': 0,
          'method': '10 candidate decks x 6 fixed opponents x 16 seeds x 2 seats. Four market types, half with starter-spell coverage policy. Paired-seat cluster bootstrap 95%, exploratory, no multiplicity correction. All players use v64. Thin opponent uses defender policy. BOT results are not human optimal-play win rates.',
          'decks': {n: next(r['deck'] for r in rows if r['name'] == n) for n in names},
          'overall': {}, 'matrix': {}}
for name in names:
    rs = [r for r in rows if r['name'] == name]
    groups = collections.defaultdict(list)
    for r in rs:
        groups[(r['seed'], r['opponent'])].append(r['result'])
    groups = list(groups.values())
    bootstrap = []
    for _ in range(2000):
        sample = [rng.choice(groups) for _ in groups]
        bootstrap.append(sum(map(sum, sample)) / sum(map(len, sample)))
    bootstrap.sort()
    result['overall'][name] = {**summarize(rs), 'pairedSeatBootstrap95': [bootstrap[50], bootstrap[1950]]}
    result['matrix'][name] = {opp: summarize([r for r in rs if r['opponent'] == opp]) for opp in opponents}
(dest / 'adapted-results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
labels = {'goblin8': 'ゴブリン8', 'goblin7raider1': 'ゴブリン7＋特攻1',
          'goblin6raiderCounter': 'ゴブリン6＋特攻1＋逆算1',
          'goblin5support': 'ゴブリン5＋特攻1＋逆算1＋血鬼術1',
          'pureRally': 'ゴブリン4＋特攻4', 'rustGob': 'マッシュルーム4＋ゴブリン4',
          'control': '弱化2＋ギャンブラー2＋混成4', 'thin': '弱化2＋カル6',
          'mixed': '旧混成構築', 'ghost': '幽霊4＋ファイアー2＋血鬼術1＋逆算1'}
pct = lambda x: f'{100*x:.1f}%'
lines = ['# v64 調整後の採用枚数・対策構築の追加比較', '',
         '10構築 × 各192試合、計1,920試合。各構築を同じ6相手に32試合ずつ当てた。4種の市場、先後交代、16乱数。半数は見落としやすいスターター魔法を使う補助方針。弱化2＋カル6の相手は壁・回復を優先購入する。実際の購入回数は各BOTの判断による。', '',
         'これは固定した対戦相手群に対するBOT評価であり、人間の最適構築や対人勝率ではない。95%区間は先後をまとめた探索的ブートストラップ、多重比較補正なし。主比較とは対戦相手が違うため、勝率を直接比較しない。', '',
         '| 構築 | 勝相当／192 | 勝率 | 95%区間 |', '|---|---:|---:|---|']
for name, v in sorted(result['overall'].items(), key=lambda x: -x[1]['rate']):
    lines.append(f"| {labels[name]} | {v['winEquivalent']:g}/192 | {pct(v['rate'])} | {' ～ '.join(map(pct, v['pairedSeatBootstrap95']))} |")
lines += ['', '## 相性表', '', '各セル32試合の勝相当。行が評価対象、列が対戦相手。', '',
          '| 構築 | ' + ' | '.join(labels[o] for o in opponents) + ' |',
          '|---|' + '---:|' * len(opponents)]
for name in names:
    lines.append('| ' + labels[name] + ' | ' + ' | '.join(f"{result['matrix'][name][o]['winEquivalent']:g}/32" for o in opponents) + ' |')
lines += ['', '## 構築の正確な内容', '', 'カードIDを含めた再現用定義。', '']
for name, deck in result['decks'].items():
    lines.append('- ' + labels[name] + '：' + '、'.join(f'{k}×{n}' for k, n in collections.Counter(deck).items()))
(dest / 'adapted-ranking.md').write_text('\n'.join(lines) + '\n')
print(json.dumps(result['overall'], ensure_ascii=False, indent=2))

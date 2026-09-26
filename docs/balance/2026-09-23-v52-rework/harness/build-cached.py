from pathlib import Path
p=Path('harness');s=(p/'core.bundle.mjs').read_text()
old='    const after = reduce(g, a).state;\n    if (!after.players[side2].hand.some((h) => h.uid === card.uid)) return a;'
new='    const evaluated = reduce(g, a);\n    const after = evaluated.state;\n    if (!after.players[side2].hand.some((h) => h.uid === card.uid)) { greedyMemo = { g, a, evaluated }; return a; }'
assert s.count(old)==1
s=s.replace(old,new)
s+='\nlet greedyMemo = null;\nexport function takeGreedyResult(g,a){const m=greedyMemo;greedyMemo=null;return m&&m.g===g&&JSON.stringify(m.a)===JSON.stringify(a)?m.evaluated:null;}\n'
(p/'core-cached.bundle.mjs').write_text(s)
s=(p/'run.mjs').read_text().replace("import {createGame,reduce,", "import {takeGreedyResult,createGame,reduce,").replace("'./core.bundle.mjs'", "'./core-cached.bundle.mjs'").replace('const prev=g, result=reduce(g,a);','const prev=g, result=takeGreedyResult(g,a)??reduce(g,a);')
(p/'run-cached.mjs').write_text(s)

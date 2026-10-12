const fs = require('node:fs');
const [input = '.bot-strength/results/value-training.json', output = 'client/src/shared/botValueWeights.ts'] = process.argv.slice(2);
const { weights, scale } = JSON.parse(fs.readFileSync(input, 'utf8'));
if (weights.length !== 27 || scale.length !== 27 || !weights.every(Number.isFinite) || !scale.every(x => Number.isFinite(x) && x > 0)) throw new Error('Invalid value model');
fs.writeFileSync(output, '// Trained on 4,000 current-rule games; validation is split by whole game.\n// Regenerate with ml/bot-strength/train-value.cjs and export-value.cjs.\nexport const VALUE_WEIGHTS = ' + JSON.stringify({weights,scale}) + ';\n');

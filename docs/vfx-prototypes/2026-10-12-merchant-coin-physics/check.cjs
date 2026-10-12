const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), ts = require('typescript');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'merchant-physics-'));
try {
  for (const name of ['catalog', 'physics']) {
    const source = fs.readFileSync('client/src/ui/merchant/' + name + '.ts', 'utf8');
    let js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    js = js.replace('require("three")', 'require(' + JSON.stringify(require.resolve('three')) + ')');
    fs.writeFileSync(path.join(tmp, name + '.js'), js);
  }
  const { coinPoses, coinContacts } = require(path.join(tmp, 'physics.js'));
  const { Quaternion, Vector3 } = require('three');
  const rows = [];
  for (const black of [false, true]) for (let v = 0; v < 4; v++) for (const n of black ? [[18,24,12,26][v]] : [2,6]) {
    let last, maxStep = 0, maxVisible = 0;
    const end = black ? 6600 : 3100;
    for (let ms = 0; ms <= end; ms += 5) {
      const poses = coinPoses(v, n, ms, black);
      maxVisible = Math.max(maxVisible, poses.filter(p => p.visible).length);
      for (const [i, p] of poses.entries()) {
        if (!Number.isFinite(p.x + p.y + p.z + p.dissolve)) throw Error('Non-finite state');
        const q = new Quaternion(...p.quaternion);
        if (Math.abs(q.length() - 1) > 1e-5) throw Error('Rotation drift');
        if (!black) {
          const z = Math.abs(new Vector3(0,0,1).applyQuaternion(q).z);
          const extent = p.r * Math.sqrt(Math.max(0,1-z*z)) + p.r*.07*z;
          // Interpolated positions/orientations have sub-step contact tolerance.
          if (p.z < extent - .003) throw Error(`Floor penetration ${v}/${n}/${i}/${ms}: ${p.z-extent}`);
        }
        if (p.visible && last?.[i].visible) maxStep = Math.max(maxStep, Math.hypot(p.x-last[i].x,p.y-last[i].y,p.z-last[i].z));
      }
      last = poses;
    }
    if (maxStep > .055) throw Error(`Trajectory jump ${black}/${v}/${n}: ${maxStep}`);
    if (!black && maxVisible !== n) throw Error('Wrong coin count');
    if (last.some(p => p.visible)) throw Error('Survives effect end');
    const contacts = coinContacts(v,n,black);
    const first = Array.from({length:n},(_,i)=>contacts.find(e=>e.i===i));
    if (first.some(e=>!e)) throw Error('Missing contact');
    if (new Set(first.map(e=>Math.round(e.ms/10))).size < n*.65) throw Error('Synchronized landings');
    const a = JSON.stringify(coinPoses(v,n,1487,black));
    coinPoses(v,n,0,black); coinPoses(v,n,end,black);
    if (a !== JSON.stringify(coinPoses(v,n,1487,black))) throw Error('Seeking changed simulation');
    rows.push({black,variant:v,count:n,maxVisible,maxStep,contacts:contacts.length,firstContacts:first.map(e=>Math.round(e.ms))});
  }
  fs.writeFileSync(path.join(__dirname,'checks.json'),JSON.stringify({passed:rows.length,cases:rows},null,2));
  console.log(JSON.stringify({passed:rows.length,maxStep:Math.max(...rows.map(r=>r.maxStep))}));
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }

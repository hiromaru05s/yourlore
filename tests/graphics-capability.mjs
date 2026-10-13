import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source = await fs.readFile(new URL('../client/src/ui/graphicsCapability.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}}).outputText;
const cases = [
  ['hardware', 'available', {renderer: 'ANGLE (NVIDIA GeForce GTX 1650)'}],
  ['unavailable', 'unavailable', {unavailable: true}],
  ['major performance caveat', 'limited', {strictFails: true, renderer: 'masked'}],
  ['SwiftShader', 'limited', {renderer: 'ANGLE (Google, Vulkan SwiftShader Device)'}],
  ['Windows software renderer', 'limited', {renderer: 'ANGLE (Microsoft Basic Render Driver Direct3D11)'}],
  ['WARP', 'limited', {renderer: 'ANGLE D3D11 WARP'}],
  ['privacy-masked', 'available', {private: true}],
  ['extension denied', 'available', {extensionThrows: true}],
  ['context lost', 'unknown', {lost: true}],
  ['context exception', 'unknown', {throws: true}],
];
for (const [name, expected, config] of cases) {
  let contexts = 0, released = 0;
  const canvases = [];
  const document = {createElement() {
    const canvas = {width: 0, height: 0, getContext(kind, attributes) {
      assert.equal(kind, 'webgl2');
      if (config.throws) throw Error('Context denied');
      if (config.unavailable || config.strictFails && attributes.failIfMajorPerformanceCaveat) return null;
      contexts++;
      return {isContextLost: () => !!config.lost, getParameter: () => config.renderer,
        getExtension(name) {
          if (name === 'WEBGL_lose_context') return {loseContext: () => released++};
          if (config.extensionThrows) throw Error('Privacy restriction');
          return config.private ? null : {UNMASKED_RENDERER_WEBGL: 1};
        }};
    }};
    canvases.push(canvas); return canvas;
  }};
  const exports = {};
  new Function('exports', 'document', js)(exports, document);
  assert.equal(exports.checkGraphicsCapability(), expected, name);
  assert.equal(released, contexts, `${name}: release every probe context`);
  assert(canvases.every(c => c.width === 0 && c.height === 0));
}
console.log(`PASS: ${cases.length} graphics capability cases and resource cleanup`);

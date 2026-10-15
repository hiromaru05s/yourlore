export type GraphicsCapability = 'available' | 'unavailable' | 'limited' | 'unknown';

/** A capability check, never a claim about the browser's private settings.
 * Three's board needs WebGL 2. No renderer identifier is stored or sent. */
export function checkGraphicsCapability(): GraphicsCapability {
  function probe(strict: boolean): GraphicsCapability {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    let gl: WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: strict, antialias: false });
      if (!gl) return 'unavailable';
      if (gl.isContextLost()) return 'unknown';
      // Some browsers accept software rendering even with the strict hint.
      try {
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
        if (/swiftshader|llvmpipe|softpipe|software rasterizer|microsoft basic render|\bwarp\b/i.test(renderer)) return 'limited';
      } catch { /* Privacy restrictions do not imply disabled acceleration. */ }
      return 'available';
    } catch {
      return 'unknown';
    } finally {
      try { gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* best effort */ }
      canvas.width = canvas.height = 0;
    }
  }
  const strict = probe(true);
  if (strict !== 'unavailable') return strict;
  const fallback = probe(false);
  return fallback === 'available' ? 'limited' : fallback;
}

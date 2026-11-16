import {Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, SRGBColorSpace, Texture} from 'three';
import {createWebGLRenderer} from './webglRenderer';
import {seekerName} from './seekerLabels';
import {SEEKER_ROOT} from './seekerMotion';
import {homeIsCovered} from './screenCovered';

// Weights are in the cropped painting's UV space, with the hood at the top.
// The book and belt anchor the lower torso. The shoulders lead, then the hood
// and loose outer folds follow the same breath at slightly different phases.
const vertexShader = `
  uniform float time;
  varying vec2 texCoord;
  void main() {
    texCoord = uv;
    vec2 p = position.xy;
    float y = 1.0 - uv.y;
    float breath = sin(time * 1.42);
    float upper = 1.0 - smoothstep(0.33, 0.80, y);
    float shoulderDistance = (y - 0.41) / 0.19;
    float chest = exp(-shoulderDistance * shoulderDistance);
    float edge = smoothstep(0.18, 0.47, abs(uv.x - 0.5));
    float fold = edge * smoothstep(0.35, 0.82, y);
    p.y += upper * 0.009 * sin(time * 1.42 - 0.18 * upper);
    p.x += upper * 0.012 * sin(time * 0.81);
    p.x += p.x * chest * 0.016 * breath;
    p.x += fold * 0.013 * sin(time * 1.23 - 3.0 * y);
    gl_Position = vec4(p, 0.0, 1.0);
  }`;

function createSeekerPainting(host: HTMLElement, image: HTMLImageElement) {
  const renderer = createWebGLRenderer({alpha:true, antialias:false, powerPreference:'low-power'});
  const texture = new Texture(image);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  const geometry = new PlaneGeometry(2, 2, 24, 40);
  const material = new ShaderMaterial({
    uniforms:{painting:{value:texture}, time:{value:0}},
    vertexShader,
    fragmentShader:`uniform sampler2D painting;
      varying vec2 texCoord;
      void main() {
        gl_FragColor = texture2D(painting, texCoord);
        #include <colorspace_fragment>
        #include <premultiplied_alpha_fragment>
      }`,
    transparent:true, premultipliedAlpha:true, depthTest:false, depthWrite:false,
  });
  const scene = new Scene();
  scene.add(new Mesh(geometry, material));
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden','true');
  function draw(time: number) {
    material.uniforms.time.value = time;
    renderer.render(scene, camera);
  }
  const resize = () => {
    const density = Math.min(devicePixelRatio, 2, image.naturalWidth / Math.max(1,host.clientWidth));
    renderer.setSize(Math.max(1, Math.round(host.clientWidth*density)), Math.max(1, Math.round(host.clientHeight*density)), false);
    draw(material.uniforms.time.value);
  };
  const observer = new ResizeObserver(resize);
  host.append(canvas); resize(); observer.observe(host);
  return {canvas, draw, destroy() {
    observer.disconnect(); canvas.remove();
    texture.dispose(); material.dispose(); geometry.dispose();
    renderer.dispose(); renderer.forceContextLoss();
  }};
}

export function mountHomeSeeker(host: HTMLElement, avatar?: string | null) {
  const image = new Image();
  image.alt = '';
  image.src = SEEKER_ROOT + '/home-closeup.webp';
  host.setAttribute('role', 'img');
  host.setAttribute('aria-label', seekerName(avatar ?? undefined));
  host.append(image);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let painting: ReturnType<typeof createSeekerPainting> | undefined;
  let visible = false, decoded = false, disposed = false, fallback = false;
  let frame = 0, previous = 0, elapsed = 0;
  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    if (!homeIsCovered()) {
      elapsed += previous ? Math.min(now - previous, 64) / 1000 : 0;
      painting?.draw(elapsed);
    }
    previous = now;
  }
  function sync() {
    cancelAnimationFrame(frame); previous = 0;
    const active = visible && decoded && !disposed && !document.hidden && !reduced.matches;
    if (active && !painting && !fallback) {
      try {
        painting = createSeekerPainting(host, image);
        painting.canvas.addEventListener('webglcontextlost', () => {
          fallback = true; painting?.destroy(); painting = undefined; sync();
        }, {once:true});
      } catch { fallback = true; }
    }
    host.classList.toggle('is-moving', active && !!painting);
    host.classList.toggle('seeker-fallback-motion', active && fallback);
    if (active && painting) frame = requestAnimationFrame(tick);
  }
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  observer.observe(host);
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  void image.decode().then(() => { if (!disposed) { decoded = true; sync(); } }).catch(() => {});
  return () => {
    disposed = true; cancelAnimationFrame(frame); observer.disconnect();
    reduced.removeEventListener('change', sync);
    document.removeEventListener('visibilitychange', sync);
    painting?.destroy(); painting = undefined;
  };
}

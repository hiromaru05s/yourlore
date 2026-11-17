import {Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, SRGBColorSpace, Texture, Vector4} from 'three';
import {createWebGLRenderer} from './webglRenderer';
import {characterAppearance, playableCharacters} from './characterAppearance';
import {homeDaylight, onHomeDaylightReady} from './homeDaylight';
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
    uniforms:{painting:{value:texture}, time:{value:0}, daylight:{value:new Vector4()}},
    vertexShader,
    fragmentShader:`uniform sampler2D painting;
      uniform vec4 daylight;
      varying vec2 texCoord;
      void main() {
        vec4 paint = texture2D(painting, texCoord);
        vec2 uv = vec2(texCoord.x, 1.0-texCoord.y);
        // The hood, shoulder and book intercept the diagonal light at different
        // depths. Sample along their painted forms in the breathing mesh.
        float hood = 1.0-smoothstep(.22,.44,uv.y);
        float sleeve = smoothstep(.52,.78,uv.x)*smoothstep(.32,.55,uv.y);
        float across = uv.x-.30*uv.y + .14*hood - .10*sleeve;
        float aperture = mix(daylight.z,daylight.w,smoothstep(.05,.74,across));
        float edge = .17 + .19*daylight.y + .28*clamp(aperture,0.,1.35);
        float sunlit = 1.0-smoothstep(edge-.095,edge+.095,across);
        float direct = sunlit*clamp(.14+.82*aperture,0.,1.);
        // Already-dark ink receives mainly sky fill. Bright cloth and gilt
        // lose their warm direct light as the window falls into shadow.
        float pigment = dot(paint.rgb,vec3(.2126,.7152,.0722));
        float receiver = smoothstep(.009,.13,pigment);
        vec3 skylight = mix(vec3(.73,.79,.92),vec3(.44,.56,.79),receiver);
        skylight *= .88+.12*daylight.x;
        vec3 illumination = mix(skylight,vec3(1.07,1.035,.99),direct);
        gl_FragColor = vec4(paint.rgb*illumination,paint.a);
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
    material.uniforms.daylight.value.set(homeDaylight.sun, homeDaylight.sweep, homeDaylight.leftWindow, homeDaylight.rightWindow);
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

// Keep only the last detached portrait. Returning HOME can paint its already
// decoded pixels on the first frame while the new lighting renderer starts.
let previousImage: HTMLImageElement | undefined;

export function mountHomeSeeker(host: HTMLElement, avatar?: string | null, afterEntrance?: Promise<void>) {
  const character = characterAppearance(avatar);
  const image = previousImage?.getAttribute('src') === character.home ? previousImage : new Image();
  previousImage = undefined;
  image.alt = '';
  if (image.getAttribute('src') !== character.home) image.src = character.home;
  const detachImage = () => {
    image.remove();
    if (image.complete && image.naturalWidth) previousImage = image;
  };
  host.dataset.character = character.id;
  host.setAttribute('role', 'img');
  host.setAttribute('aria-label', character.name());
  host.style.setProperty('--seeker-silhouette',`url("${image.src}")`);
  host.append(image);
  // Older profiles can hold a square NPC or card portrait instead of a standing painting.
  if (!playableCharacters.some(entry => entry.id === character.id)) {
    image.style.objectFit = 'contain';
    image.onerror = () => { image.onerror = null; image.src = characterAppearance().home; };
    return () => { image.onerror = null; detachImage(); };
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let painting: ReturnType<typeof createSeekerPainting> | undefined;
  let canPaint = !afterEntrance;
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
    const active = canPaint && visible && decoded && !disposed && !document.hidden;
    if (active && !painting && !fallback) {
      try {
        painting = createSeekerPainting(host, image);
        painting.canvas.addEventListener('webglcontextlost', () => {
          fallback = true; painting?.destroy(); painting = undefined; sync();
        }, {once:true});
      } catch { fallback = true; }
    }
    host.classList.toggle('is-painted', active && !!painting);
    host.classList.toggle('seeker-fallback-motion', active && fallback && !reduced.matches);
    if (active && painting) {
      if (reduced.matches) painting.draw(0);
      else frame = requestAnimationFrame(tick);
    }
  }
  void afterEntrance?.then(() => { if (!disposed) { canPaint = true; sync(); } });
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  observer.observe(host);
  const offDaylight = onHomeDaylightReady(() => {
    if (visible && !document.hidden && reduced.matches) painting?.draw(0);
  });
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  void image.decode().then(() => { if (!disposed) { decoded = true; sync(); } }).catch(() => {});
  return () => {
    host.classList.remove('is-painted','seeker-fallback-motion'); detachImage();
    offDaylight(); disposed = true; cancelAnimationFrame(frame); observer.disconnect();
    reduced.removeEventListener('change', sync);
    document.removeEventListener('visibilitychange', sync);
    painting?.destroy(); painting = undefined;
  };
}

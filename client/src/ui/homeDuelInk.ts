// Approved living pigment surface; frame art is composed separately by homeDuelButton.
export type Mode = 'single' | 'normal' | 'ranked';
const toonGeometry = { "ranked": { "size": [1254, 1254], "bounds": [60, 57, 1194, 1163], "center": [0.5, 0.5135566188197767], "radii": [0.45215311004784686, 0.4409888357256778] }, "normal": { "size": [1254, 1254], "bounds": [74, 80, 1179, 1169], "center": [0.4996012759170654, 0.5019936204146731], "radii": [0.4405901116427432, 0.4342105263157895] }, "single": { "size": [1254, 1254], "bounds": [56, 62, 1195, 1191], "center": [0.4988038277511962, 0.5003987240829346], "radii": [0.4541467304625199, 0.45015948963317387] } };
const vertex = `#version 300 es
in vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0,1);}`;
const shared = `#version 300 es
precision highp float;
in vec2 uv;out vec4 result;
uniform sampler2D field,velocity,pressure,original,flowmap;
uniform vec2 texel,origin,sourceCenter,sourceRadii;
uniform float dt,time,radius,impulse,seed;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return .57*noise(p)+.28*noise(p*2.03+4.1)+.15*noise(p*4.13+17.);}
vec4 base(vec2 p){return texture(original,sourceCenter+(p-.5)/.44*sourceRadii);}
float inside(vec2 p){return 1.-smoothstep(radius-.012,radius,length(p-.5));}
vec2 vel(vec2 p){return texture(velocity,clamp(p,texel,1.-texel)).xy*inside(p);}
`;
const fragments = {
    init: shared + `void main(){result=base(uv);}`,
    mapInit: shared + `void main(){result=vec4(uv,0,1);}`,
    map: shared + `void main(){vec2 q=texture(field,uv-vel(uv)*dt).xy;float relax=dt*smoothstep(2.2,6.,time)*.65;result=vec4(mix(uv,mix(q,uv,relax),inside(uv)),0,1);}`,
    force: shared + `void main(){vec2 v=vel(uv);v=vel(uv-v*dt)*exp(-dt*1.0);vec2 d=uv-origin;float r=length(d);float angle=atan(d.y,d.x);float lobes=1.+.22*sin(angle*5.+seed)+.16*sin(angle*9.-seed);float cloud=exp(-dot(d,d)/.014);vec2 tangent=vec2(-d.y,d.x);v+=(d*9.*lobes+tangent*5.*sin(angle*3.+seed))*cloud*impulse*dt;
 for(int i=0;i<3;i++){float a=float(i)*2.094+seed;vec2 offset=vec2(cos(a),sin(a))*.085;vec2 q=d-offset;v+=vec2(-q.y,q.x)*exp(-dot(q,q)/.007)*sin(float(i)*2.+seed)*7.*impulse*dt;}
 v*=inside(uv);float len=length(v);v*=min(1.,1.1/max(.001,len));result=vec4(v,0,1);}`,
    divergence: shared + `void main(){float d=(vel(uv+vec2(texel.x,0)).x-vel(uv-vec2(texel.x,0)).x+vel(uv+vec2(0,texel.y)).y-vel(uv-vec2(0,texel.y)).y)*.5;result=vec4(d,0,0,1);}`,
    pressure: shared + `void main(){float l=texture(pressure,uv-vec2(texel.x,0)).r,r=texture(pressure,uv+vec2(texel.x,0)).r,b=texture(pressure,uv-vec2(0,texel.y)).r,t=texture(pressure,uv+vec2(0,texel.y)).r;result=vec4((l+r+b+t-texture(field,uv).r)*.25,0,0,1);}`,
    project: shared + `void main(){float l=texture(pressure,uv-vec2(texel.x,0)).r,r=texture(pressure,uv+vec2(texel.x,0)).r,b=texture(pressure,uv-vec2(0,texel.y)).r,t=texture(pressure,uv+vec2(0,texel.y)).r;result=vec4((vel(uv)-.5*vec2(r-l,t-b))*inside(uv),0,1);}`,
    pigment: shared + `void main(){vec2 v=vel(uv);vec2 coord=uv-v*dt;vec4 color=texture(field,clamp(coord,texel,1.-texel));float age=time;float settle=smoothstep(2.2,6.,age);color=mix(color,base(uv),dt*settle*.65);
 vec2 q=uv-origin;float n=fbm(q*58.+seed);float r=length(q+vec2(fbm(q*31.+seed),fbm(q*34.-seed))*.016-.008);float ink=(1.-smoothstep(.015,.047+n*.015,r))*impulse*dt*5.;
 float a=seed*.71;vec2 palette1=.5+vec2(cos(a),sin(a))*(radius-.005);vec2 palette2=.5+vec2(cos(a+1.8),sin(a+1.8))*(radius-.025);
 vec3 pigment=mix(base(palette1).rgb,base(palette2).rgb,smoothstep(.25,.75,n));
 color.rgb=mix(color.rgb,pigment,clamp(ink,0.,.85));result=mix(base(uv),vec4(color.rgb,1),inside(uv));}`,
    render: shared + `void main(){vec4 fixedColor=base(uv);vec4 dye=texture(field,uv);vec2 q=texture(flowmap,uv).xy;vec3 detailed=base(q).rgb;dye.rgb=mix(dye.rgb,detailed,.5);float mask=1.-smoothstep(radius-.018,radius,length(uv-.5));result=vec4(mix(fixedColor.rgb,dye.rgb,mask),fixedColor.a);}`
};
type Target = {
    texture: WebGLTexture;
    fbo: WebGLFramebuffer;
};
export class HomeDuelInk {
    host: HTMLButtonElement;
    canvas: HTMLCanvasElement;
    mode: Mode;
    ready: Promise<void>;
    gl: WebGL2RenderingContext | null = null;
    running = false;
    paused = false;
    speed = 1;
    last = 0;
    age = 100;
    count = 0;
    seed = 1;
    raf = 0;
    pointer: [
        number,
        number
    ] = [.5, .62];
    private programs: Record<string, WebGLProgram> = {};
    private targets: Target[] = [];
    private buffers: WebGLBuffer[] = [];
    private textures: WebGLTexture[] = [];
    private original?: WebGLTexture;
    private v!: Target[];
    private dye!: Target[];
    private p!: Target[];
    private map!: Target[];
    private div!: Target;
    private observer: ResizeObserver;
    private abort = new AbortController();
    private disposed = false;
    private reduced = matchMedia('(prefers-reduced-motion: reduce)');
    private lastTime = 0;
    constructor(host: HTMLButtonElement, mode: Mode) {
        this.host = host;
        this.mode = mode;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'home-duel-ink';
        this.canvas.setAttribute('aria-hidden', 'true');
        host.prepend(this.canvas);
        this.observer = new ResizeObserver(() => this.resize());
        this.observer.observe(host);
        const signal = this.abort.signal;
        host.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse')
            this.drop(e.clientX, e.clientY); }, { signal });
        host.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse')
            this.drop(e.clientX, e.clientY); }, { signal });
        host.addEventListener('focus', () => { if (host.matches(':focus-visible'))
            this.drop(); }, { signal });
        document.addEventListener('visibilitychange', () => { if (document.hidden) {
            cancelAnimationFrame(this.raf);
            this.raf = 0;
            this.lastTime = 0;
        }
        else if (this.running && !this.paused)
            this.loop(); }, { signal });
        this.reduced.addEventListener('change', () => { if (this.host.dataset.motion === 'static')
            return; if (this.reduced.matches) {
            this.reset();
            this.host.dataset.motion = 'reduced';
        }
        else
            this.host.dataset.motion = 'fluid'; }, { signal });
        this.canvas.addEventListener('webglcontextlost', () => { if (this.disposed)
            return; cancelAnimationFrame(this.raf); this.running = false; this.host.dataset.motion = 'static'; delete this.host.dataset.ready; }, { signal });
        this.ready = this.init().catch(() => { if (this.disposed)
            return; this.host.dataset.motion = 'static'; delete this.host.dataset.ready; this.canvas.remove(); this.releaseGPU(); });
    }
    private compile(fragment: string) { const gl = this.gl!; const shader = (type: number, source: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, source); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(s) || 'Shader error'); return s; }; const v = shader(gl.VERTEX_SHADER, vertex), f = shader(gl.FRAGMENT_SHADER, fragment), p = gl.createProgram()!; gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p); gl.deleteShader(v); gl.deleteShader(f); if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(p) || 'Link error'); return p; }
    private target(float = false): Target { const gl = this.gl!, texture = gl.createTexture()!; this.textures.push(texture); gl.bindTexture(gl.TEXTURE_2D, texture); gl.texImage2D(gl.TEXTURE_2D, 0, float ? gl.RGBA16F : gl.RGBA8, 256, 256, 0, gl.RGBA, float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); const fbo = gl.createFramebuffer()!; gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0); if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
        throw new Error('Framebuffer unavailable'); const t = { texture, fbo }; this.targets.push(t); return t; }
    private async init() {
        const gl = this.canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
        if (!gl || !gl.getExtension('EXT_color_buffer_float'))
            throw new Error('Fluid WebGL unavailable');
        this.gl = gl;
        gl.getExtension('OES_texture_float_linear');
        for (const [key, fragment] of Object.entries(fragments))
            this.programs[key] = this.compile(fragment);
        const buffer = gl.createBuffer()!;
        this.buffers.push(buffer);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const img = new Image();
        img.decoding = 'async';
        img.src = '/art/ui/home-duel-frame-01/' + this.mode + '.png';
        await img.decode();
        if (this.disposed)
            return;
        const tex = gl.createTexture()!;
        this.original = tex;
        this.textures.push(tex);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.v = [this.target(true), this.target(true)];
        this.dye = [this.target(), this.target()];
        this.p = [this.target(true), this.target(true)];
        this.map = [this.target(true), this.target(true)];
        this.div = this.target(true);
        this.reset();
        this.resize();
        this.host.dataset.motion = this.reduced.matches ? 'reduced' : 'fluid';
        this.host.dataset.ready = 'true';
        this.host.dataset.diameter = '0.88';
    }
    private pass(name: string, target: Target | null, fields: Record<string, WebGLTexture> = {}, dt = 0, force = 0) { const gl = this.gl!, program = this.programs[name]; gl.useProgram(program); gl.bindFramebuffer(gl.FRAMEBUFFER, target?.fbo ?? null); gl.viewport(0, 0, target ? 256 : this.canvas.width, target ? 256 : this.canvas.height); const loc = (n: string) => gl.getUniformLocation(program, n); gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[0]); const attr = gl.getAttribLocation(program, 'p'); gl.enableVertexAttribArray(attr); gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0); gl.uniform2f(loc('texel'), 1 / 256, 1 / 256); gl.uniform2f(loc('origin'), ...this.pointer); const geo = toonGeometry[this.mode]; gl.uniform2f(loc('sourceCenter'), ...geo.center as [
        number,
        number
    ]); gl.uniform2f(loc('sourceRadii'), ...geo.radii as [
        number,
        number
    ]); gl.uniform1f(loc('radius'), this.mode === 'ranked' ? .338 : .399); gl.uniform1f(loc('dt'), dt); gl.uniform1f(loc('time'), this.age); gl.uniform1f(loc('impulse'), force); gl.uniform1f(loc('seed'), this.seed); let unit = 0; for (const [key, tex] of Object.entries({ original: this.original!, ...fields })) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(loc(key), unit++);
    } gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
    private resize() { const d = Math.max(128, Math.min(640, Math.ceil(this.host.clientWidth * Math.min(devicePixelRatio, 2)))); this.canvas.width = d; this.canvas.height = d; if (this.original && this.dye)
        this.draw(); }
    private draw() { if (this.gl && !this.gl.isContextLost() && this.original && this.dye)
        this.pass('render', null, { field: this.dye[0].texture, flowmap: this.map[0].texture }); }
    reset() { if (!this.gl || !this.dye)
        return; cancelAnimationFrame(this.raf); this.raf = 0; this.running = false; this.age = 100; const gl = this.gl; for (const t of [...this.v, ...this.p, this.div]) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    } for (const t of this.dye)
        this.pass('init', t); for (const t of this.map)
        this.pass('mapInit', t); this.draw(); this.host.dataset.phase = 'idle'; }
    drop(x?: number, y?: number) { void this.ready.then(() => { if (this.disposed || !this.dye || this.reduced.matches || this.host.dataset.motion === 'static' || this.host.disabled)
        return; this.count++; this.seed = this.count * 2.39996 + 1.3; const b = this.host.getBoundingClientRect(); let px = x === undefined ? .13 * Math.cos(this.seed) : (x - b.x) / b.width - .5, py = y === undefined ? .13 * Math.sin(this.seed) : .5 - (y - b.y) / b.height; const l = Math.hypot(px, py); if (l > .21) {
        px *= .21 / l;
        py *= .21 / l;
    } this.pointer = [.5 + px, .5 + py]; this.age = 0; this.running = true; this.host.dataset.drops = String(this.count); this.host.dataset.phase = 'flowing'; if (!this.paused && !this.raf)
        this.loop(); }); }
    private step(dt: number) {
        this.age += dt;
        const force = this.age < .28 ? 18 * Math.pow(1 - this.age / .28, .6) : 0;
        this.pass('force', this.v[1], { velocity: this.v[0].texture }, dt, force);
        this.v.reverse();
        this.pass('divergence', this.div, { velocity: this.v[0].texture });
        for (let i = 0; i < 12; i++) {
            this.pass('pressure', this.p[1], { pressure: this.p[0].texture, field: this.div.texture });
            this.p.reverse();
        }
        this.pass('project', this.v[1], { velocity: this.v[0].texture, pressure: this.p[0].texture });
        this.v.reverse();
        this.pass('pigment', this.dye[1], { velocity: this.v[0].texture, field: this.dye[0].texture }, dt, force);
        this.dye.reverse();
        this.pass('map', this.map[1], { velocity: this.v[0].texture, field: this.map[0].texture }, dt);
        this.map.reverse();
        this.draw();
    }
    private loop = () => { if (this.disposed || this.paused || document.hidden || this.host.dataset.motion === 'static') {
        this.raf = 0;
        this.lastTime = 0;
        return;
    } this.raf = requestAnimationFrame(now => { const dt = Math.min(.025, this.lastTime ? (now - this.lastTime) / 1000 : 1 / 60) * this.speed; this.lastTime = now; this.step(dt); if (this.age < 9) {
        this.loop();
    }
    else {
        this.running = false;
        this.raf = 0;
        this.lastTime = 0;
        this.host.dataset.phase = 'settled';
    } }); };
    pause(value: boolean) { this.paused = value; cancelAnimationFrame(this.raf); this.raf = 0; this.lastTime = 0; if (!value && this.running)
        this.loop(); }
    private releaseGPU() { const gl = this.gl; if (!gl)
        return; for (const t of this.targets)
        gl.deleteFramebuffer(t.fbo); for (const t of this.textures)
        gl.deleteTexture(t); for (const b of this.buffers)
        gl.deleteBuffer(b); for (const p of Object.values(this.programs))
        gl.deleteProgram(p); this.targets = []; this.textures = []; this.buffers = []; this.programs = {}; gl.getExtension('WEBGL_lose_context')?.loseContext(); this.gl = null; }
    destroy() { this.disposed = true; cancelAnimationFrame(this.raf); this.observer.disconnect(); this.abort.abort(); this.releaseGPU(); this.canvas.remove(); }
}

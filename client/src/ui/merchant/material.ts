const vert = `attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const frag = `precision highp float;varying vec2 uv;uniform sampler2D art;uniform float time,kind;uniform vec2 resolution;
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5),b=fract(sin(dot(i+vec2(1.,0.),vec2(127.1,311.7)))*43758.5),c=fract(sin(dot(i+vec2(0.,1.),vec2(127.1,311.7)))*43758.5),d=fract(sin(dot(i+1.,vec2(127.1,311.7)))*43758.5);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}float fb(vec2 p){return n(p)*.62+n(p*2.1)*.26+n(p*5.1)*.12;}
void main(){float t=time,enter=smoothstep(.6,2.05,t),leave=smoothstep(4.85,6.35,t);vec2 p=(uv-.5)*resolution;float span=min(resolution.x/960.,resolution.y/650.)*890.;vec2 q=p/vec2(span,span/1.5);q.y=-q.y;vec2 v=q+.5;
if(kind<.5){float side=sign(v.x-.5);v.x-=side*.15*(1.-enter);v.y+=.14*(1.-enter);v.x+=sin(v.y*14.+t*1.6)*.004*enter*(1.-leave)*step(.25,v.x)*step(v.x,.75);}
else if(kind<1.5){float open=smoothstep(.95,2.3,t);if(v.y<.65)v.y=.65+(v.y-.65)/max(.07,open);v.y-=.10*(1.-enter);v.x+=sin(t*12.)*exp(-max(0.,t-2.3)*7.)*.004*step(2.3,t);}
else if(kind<2.5){float sway=sin((t-1.3)*4.)*exp(-max(0.,t-1.4)*.6)*.07*enter;float x=v.x-.5;v.y+=x*sway*step(v.y,.8);v.x+=sin(v.y*10.+t*3.)*.0015;v.y+=.12*(1.-enter);}
else{float canopy=1.-smoothstep(.34,.70,v.y);v.y-=canopy*(1.-smoothstep(.7,2.2,t))*.46;v.x+=sin(v.y*15.+t*1.6)*.007*canopy*enter;v.y+=.07*(1.-enter)*(1.-canopy);}
if(v.x<0.||v.y<0.||v.x>1.||v.y>1.)discard;vec4 col=texture2D(art,v);float noise=fb(v*vec2(22.,30.));float field=noise*.45+(1.-v.y)*.38+abs(v.x-.5)*.15;float amount=enter*1.2-leave*1.4;float mask=smoothstep(field-.045,field+.045,amount);float edge=(1.-smoothstep(.0,.026,abs(field-amount)))*step(.02,enter);float sheen=exp(-pow(v.x+v.y*.24-(t-2.05)*.7,2.)/.0007)*smoothstep(2.15,2.4,t)*(1.-smoothstep(3.6,4.0,t));col.rgb+=vec3(.46,.37,.23)*edge*.38+vec3(.56,.50,.66)*sheen*.18;col.a*=mask*(1.-smoothstep(6.2,6.55,t));if(col.a<.004)discard;gl_FragColor=col;}`;
export class Material {
    readonly canvas = document.createElement('canvas');
    private gl: WebGLRenderingContext;
    private p: WebGLProgram;
    private b: WebGLBuffer;
    private textures: WebGLTexture[] = [];
    private locations: Record<string, WebGLUniformLocation | null> = {};
    constructor(images: HTMLImageElement[]) { const gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true })!; if (!gl)
        throw Error('WebGL unavailable'); this.gl = gl; const compile = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(s) || 'Shader'); return s; }; const vs = compile(gl.VERTEX_SHADER, vert), fs = compile(gl.FRAGMENT_SHADER, frag), p = gl.createProgram()!; gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p); gl.deleteShader(vs); gl.deleteShader(fs); if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw Error(gl.getProgramInfoLog(p) || 'Link'); this.p = p; gl.useProgram(p); this.b = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, this.b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW); const a = gl.getAttribLocation(p, 'position'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0); for (const key of ['art', 'time', 'kind', 'resolution'])
        this.locations[key] = gl.getUniformLocation(p, key); for (const im of images) {
        const tx = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tx);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.textures.push(tx);
    } }
    draw(w: number, h: number, v: number, t: number) { const gl = this.gl; w = Math.round(w); h = Math.round(h); if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
    } gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(this.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.textures[v] ?? this.textures[0]); gl.uniform1i(this.locations.art, 0); gl.uniform1f(this.locations.kind, v); gl.uniform1f(this.locations.time, t); gl.uniform2f(this.locations.resolution, w, h); gl.drawArrays(gl.TRIANGLES, 0, 6); return this.canvas; }
    dispose() { this.textures.forEach(t => this.gl.deleteTexture(t)); this.gl.deleteBuffer(this.b); this.gl.deleteProgram(this.p); this.gl.getExtension('WEBGL_lose_context')?.loseContext(); }
}

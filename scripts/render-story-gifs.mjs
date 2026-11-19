/** Render six-second periodic cinemagraphs from authored LORE chapter paintings.
 * Camera and architecture are fixed. Motion is restricted to painted cloth,
 * foliage, water, crystal and their local illumination. No overlay particles.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {spawnSync} from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const asset=path.resolve('client/public/art/single-story/chapters-v2'),frames=process.env.STORY_GIF_FRAMES||'/tmp/lore-story-gif-frames';
await fs.mkdir(frames,{recursive:true});
const server=createServer(async(req,res)=>{try{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Content-Type','image/webp');res.end(await fs.readFile(path.join(asset,path.basename(req.url))));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();
const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position.x,-position.y,0.,1.);}`;
const fragment=`precision highp float;uniform sampler2D painting;uniform float phase;uniform int chapter;varying vec2 uv;
float spot(vec2 p,vec2 c,vec2 r){return exp(-dot((p-c)/r,(p-c)/r)*2.);}
float box(vec2 p,vec4 b){vec2 s=smoothstep(b.xy,b.xy+vec2(.012),p)*(1.-smoothstep(b.zw-vec2(.012),b.zw,p));return s.x*s.y;}
float cloth(vec2 p,vec4 b,float delay){float root=clamp((p.y-b.y)/(b.w-b.y),0.,1.);return box(p,b)*root*root*sin(phase-root*3.+delay);}
void main(){vec2 p=uv;vec3 base=texture2D(painting,p).rgb;float light=0.;float reflect=0.;
 if(chapter==1){
  float crystal=1.-smoothstep(.84,1.,length((p-vec2(.50,.397))/vec2(.064,.087)));
  p.y-=.0048*sin(phase)*crystal;
  p.x+=.0048*cloth(p,vec4(.037,.075,.142,.357),.0);
  float leaf=spot(p,vec2(.368,.299),vec2(.045,.145))+spot(p,vec2(.89,.284),vec2(.05,.16));
  p.x+=leaf*.003*sin(phase-p.y*12.);
  light=spot(uv,vec2(.50,.397),vec2(.08,.1))*(.07*sin(phase)+.035*sin(phase*2.-uv.y*16.));
  reflect=spot(uv,vec2(.5,.61),vec2(.17,.07))*.035*sin(phase-.4);
 }
 if(chapter==2){
  p.x+=.004*cloth(p,vec4(.506,.098,.612,.367),.3)+.005*cloth(p,vec4(.835,.584,.985,.746),-.8);
  float leaf=spot(p,vec2(.074,.2),vec2(.055,.18));p.x+=.003*leaf*sin(phase-p.y*14.);
  float page=box(p,vec4(.13,.476,.555,.537));p.y+=.0013*page*sin(phase+p.x*8.);
  light=spot(uv,vec2(.74,.42),vec2(.065,.09))*.09*sin(phase)+spot(uv,vec2(.665,.263),vec2(.055,.06))*.045*sin(phase*2.+.7)+spot(uv,vec2(.069,.464),vec2(.08,.09))*.035*sin(phase*3.);
  reflect=spot(uv,vec2(.62,.555),vec2(.12,.06))*.025*sin(phase-.5);
 }
 if(chapter==3){
  float green=smoothstep(.03,.12,base.g-base.b)*smoothstep(0.,.13,base.g-base.r);
  p.x+=green*box(p,vec4(0.,0.,.79,.435))*.0045*sin(phase-p.y*12.+p.x*4.);
  p.y+=green*box(p,vec4(0.,0.,.79,.435))*.0017*sin(phase*2.-p.x*7.);
  p.x+=.0048*cloth(p,vec4(.843,.055,.96,.323),-.7);
  float water=box(p,vec4(.325,.474,.642,.581))*smoothstep(.035,.12,base.b-base.r);
  p.x+=.002*water*sin(phase*4.-p.y*100.);p.y+=.0012*water*sin(phase*3.+p.x*90.);
  light=water*.045*sin(phase*4.-uv.y*170.);
  reflect=box(uv,vec4(.2,.59,.8,.66))*.022*sin(phase*2.-uv.x*30.);
 }
 if(chapter==4){
  p.x+=.005*cloth(p,vec4(.06,.04,.192,.307),.3);
  light=spot(uv,vec2(.507,.466),vec2(.063,.055))*.14*sin(phase)+spot(uv,vec2(.212,.335),vec2(.055,.065))*.07*sin(phase*2.-.4)+spot(uv,vec2(.813,.335),vec2(.055,.065))*.06*sin(phase*2.+.4);
  reflect=spot(uv,vec2(.51,.68),vec2(.22,.08))*.035*sin(phase-.6);
 }
 if(chapter==5){
  p.x+=.004*cloth(p,vec4(.035,.111,.105,.334),0.)+.004*cloth(p,vec4(.906,.11,.969,.334),-.6);
  float leaf=spot(p,vec2(.22,.25),vec2(.03,.12))+spot(p,vec2(.774,.253),vec2(.034,.12));p.x+=.0024*leaf*sin(phase-p.y*12.);
  float seam=spot(uv,vec2(.501,.48),vec2(.013,.13));
  light=seam*.15*sin(phase)+spot(uv,vec2(.501,.48),vec2(.075,.07))*.04*sin(phase);
  reflect=spot(uv,vec2(.501,.613),vec2(.034,.065))*.07*sin(phase-.2);
 }
 vec3 color=texture2D(painting,p).rgb;
 // Modulate existing painted light and its surface reflection, never white-out.
 color+=vec3(.38,.75,1.)*light+vec3(.4,.65,1.)*reflect;
 gl_FragColor=vec4(clamp(color,0.,1.),1.);
}`;
try{
 await page.setContent('<canvas width="480" height="720"></canvas>');
 for(let chapter=1;chapter<=5;chapter++){
  const dir=path.join(frames,String(chapter));await fs.mkdir(dir,{recursive:true});
  await page.evaluate(async({vertex,fragment,url,chapter})=>{
   const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl',{preserveDrawingBuffer:true});
   const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
   const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);gl.useProgram(program);
   const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const location=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
   const img=new Image();img.crossOrigin='anonymous';img.src=url;await img.decode();
   const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
   gl.uniform1i(gl.getUniformLocation(program,'chapter'),chapter);const phase=gl.getUniformLocation(program,'phase');
   window.renderFrame=t=>{gl.uniform1f(phase,t*Math.PI*2);gl.drawArrays(gl.TRIANGLES,0,6);return canvas.toDataURL('image/png').split(',')[1];};
  },{vertex,fragment,url:`http://127.0.0.1:${server.address().port}/chapter-${chapter}.webp`,chapter});
  for(let n=0;n<96;n++){const png=await page.evaluate(n=>window.renderFrame(n/96),n);await fs.writeFile(path.join(dir,`${String(n).padStart(3,'0')}.png`),Buffer.from(png,'base64'));}
  const png=await page.evaluate(()=>window.renderFrame(1));await fs.writeFile(path.join(dir,'loop-end.png'),Buffer.from(png,'base64'));
  const r=spawnSync('ffmpeg',['-v','error','-y','-framerate','16','-i',dir+'/%03d.png','-filter_complex','[0:v]split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle','-loop','0',path.join(asset,`chapter-${chapter}.gif`)],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);console.log('Rendered chapter',chapter);
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}

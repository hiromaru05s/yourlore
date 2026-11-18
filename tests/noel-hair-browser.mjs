import fs from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:4198';
const out=process.env.LORE_TEST_OUT||'/tmp/lore-noel-hair-qa';
// Measure actual opaque hair landmarks, excluding rigid head/body motion.
// A changing uniform alone does not prove that visible hair moves.
(async()=>{
 const browser=await chromium.launch({channel:'chrome',args:['--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto(origin+'/single-preview.html?clears=3');
 await page.waitForFunction(()=>!document.querySelector('#app').inert);
 await page.locator('[data-next]').click();await page.waitForSelector('.sp-standing.is-painted canvas');
 const results=await page.evaluate(async()=>{
  const {standingVertex}=await import('/src/ui/singleIdle.ts');
  const after=[standingVertex('normal')];
  const gl=document.createElement('canvas').getContext('webgl2');
  const points=[[465,48],[495,50],[540,55],[575,65],[450,170],[550,170]];
  const portrait=document.querySelector('.sp-standing img');await portrait.decode();
  const pixels=document.createElement('canvas');pixels.width=portrait.naturalWidth;pixels.height=portrait.naturalHeight;
  const ctx=pixels.getContext('2d');ctx.drawImage(portrait,0,0);
  const opacity=points.slice(0,4).map(([x,y])=>ctx.getImageData(x*2,y*2,1,1).data[3]/255);
  const screenScale=portrait.getBoundingClientRect().width/1024;
  function measure(vertex){
   const shader=(kind,code)=>{const s=gl.createShader(kind);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
   const vs=shader(gl.VERTEX_SHADER,'#version 300 es\nprecision highp float;in vec2 uv;\n'+vertex.replace('varying vec2','out vec2'));
   const fs=shader(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;out vec4 c;void main(){c=vec4(1.);}');
   const p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.transformFeedbackVaryings(p,['gl_Position'],gl.INTERLEAVED_ATTRIBS);gl.linkProgram(p);
   if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
   gl.useProgram(p);
   const input=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,input);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points.flatMap(([x,y])=>[x/1024,1-y/1536])),gl.STATIC_DRAW);
   const attr=gl.getAttribLocation(p,'uv');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
   const buffer=gl.createBuffer();gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,buffer);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,points.length*16,gl.STREAM_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
   const data=new Float32Array(points.length*4);const samples=points.slice(0,4).map(()=>[]);
   gl.enable(gl.RASTERIZER_DISCARD);
   for(let t=0;t<=12;t+=.1)for(const gesture of [0]){
    gl.uniform1f(gl.getUniformLocation(p,'time'),t);gl.uniform1f(gl.getUniformLocation(p,'gesture'),gesture);
    gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,points.length);gl.endTransformFeedback();gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,data);
    const rotated=points.map((_,i)=>[(data[i*4]+1)*512,(1-data[i*4+1])*768]);
    const A=rotated[4],B=rotated[5],angle=Math.atan2(B[1]-A[1],B[0]-A[0]);
    for(let i=0;i<4;i++){
      const dx=rotated[i][0]-A[0],dy=rotated[i][1]-A[1];
      samples[i].push(dx*Math.cos(angle)+dy*Math.sin(angle));
    }
   }
   gl.disable(gl.RASTERIZER_DISCARD);gl.deleteProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);gl.deleteBuffer(input);gl.deleteBuffer(buffer);
   return {opacity,screenScale,hairTravelCssPixels:samples.map(values=>(Math.max(...values)-Math.min(...values))*screenScale)};
  }
  return measure(after[0]);
 });
 results.opacity.forEach(alpha=>assert(alpha>.95,'sample is on visible hair'));
 assert(results.hairTravelCssPixels.filter(distance=>distance>=8).length>=3,'at least three visible locks travel 8 CSS pixels independently of the head');
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/hair-motion.json',JSON.stringify({scope:'Actual WebGL output and opaque portrait samples at 1440x900; head rotation and translation removed',results},null,2));console.log(results);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

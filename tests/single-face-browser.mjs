import fs from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:4198';
const out=process.env.LORE_TEST_OUT||'/tmp/lore-single-face-qa';
// Check actual GPU shader output: cheeks, eyes, nose and jaw must share one
// rigid transform at every sampled phase. This catches hair/cloth field leakage.
(async()=>{
 const browser=await chromium.launch({channel:'chrome',args:['--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage();await page.goto(origin+'/single-preview.html?clears=3');
 const results=await page.evaluate(async()=>{
  const {standingVertex}=await import('/src/ui/singleIdle.ts');
  const after=['easy','normal','hard'].map(standingVertex);
  const gl=document.createElement('canvas').getContext('webgl2');
  const points=[[435,120],[500,115],[565,120],[440,170],[500,170],[560,170],[450,205],[550,205],[500,230]];
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
   const data=new Float32Array(points.length*4);let maxDistanceError=0,maxAngleError=0;
   gl.enable(gl.RASTERIZER_DISCARD);
   for(let t=0;t<=24;t+=.25)for(const gesture of [0,.5,1]){
    gl.uniform1f(gl.getUniformLocation(p,'time'),t);gl.uniform1f(gl.getUniformLocation(p,'gesture'),gesture);
    gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,points.length);gl.endTransformFeedback();gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,data);
    const rotated=points.map((_,i)=>[(data[i*4]+1)*512,(1-data[i*4+1])*768]);
    let referenceAngle;
    for(let a=0;a<points.length;a++)for(let b=a+1;b<points.length;b++){
      const d=(v)=>[v[b][0]-v[a][0],v[b][1]-v[a][1]],u=d(points),v=d(rotated);
      maxDistanceError=Math.max(maxDistanceError,Math.abs(Math.hypot(...u)-Math.hypot(...v)));
      const angle=Math.atan2(v[1],v[0])-Math.atan2(u[1],u[0]);if(referenceAngle===undefined)referenceAngle=angle;
      maxAngleError=Math.max(maxAngleError,Math.abs(angle-referenceAngle));
    }
   }
   gl.disable(gl.RASTERIZER_DISCARD);gl.deleteProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);gl.deleteBuffer(input);gl.deleteBuffer(buffer);
   return {maxDistanceError,maxAngleError};
  }
  return ['lumi','noel','vera'].map((id,i)=>({id,after:measure(after[i])}));
 });
 results.forEach(r=>{assert(r.after.maxDistanceError<.001,'face distances preserved');assert(r.after.maxAngleError<.00001,'face angles preserved')});
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/rigidity.json',JSON.stringify({scope:'Actual WebGL vertex shader, 9 face landmarks, 291 time/gesture states per NPC; distances in half-resolution art pixels',results},null,2));console.log(results);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

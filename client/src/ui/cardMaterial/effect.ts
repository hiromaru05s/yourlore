import {fragmentShader} from './shader';

const vertexSource=`
attribute vec2 position;
varying vec2 uv;
void main(){
  uv=vec2(position.x,-position.y)*.5+.5;
  gl_Position=vec4(position,0.,1.);
}`;
function createPass(){
  const canvas=document.createElement('canvas');

  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:true});
  if(!gl)return null;
  const program=gl.createProgram()!;
  for(const [type,source] of [[gl.VERTEX_SHADER,vertexSource],[gl.FRAGMENT_SHADER,fragmentShader]] as const){
    const shader=gl.createShader(type)!;
    gl.shaderSource(shader,source);gl.compileShader(shader);gl.attachShader(program,shader);gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
    const reason=gl.getProgramInfoLog(program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    console.warn('Card material unavailable',reason);
    return null;
  }
  gl.useProgram(program);
  const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  gl.uniform1i(gl.getUniformLocation(program,'inscriptions'),1);
  const loc=(name:string)=>gl.getUniformLocation(program,name);
  return {canvas,gl,time:loc('time'),activation:loc('activation'),still:loc('still'),aspect:loc('aspect'),artBox:loc('artBox'),direction:loc('direction'),seals:loc('seals')};
}
type Pass=NonNullable<ReturnType<typeof createPass>>;
let shared:Pass|null|undefined;
export type StatChange={key:'atk'|'def';from:number;to:number};
async function printImage(card:HTMLElement){
  const holder=card.querySelector<HTMLElement>('.card-art');
  const image=holder?.querySelector('img');
  if(image?.complete&&image.naturalWidth)return {image,holder};
  const url=holder&&getComputedStyle(holder).backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
  if(!holder||!url)return null;
  const picture=new Image();picture.src=url;
  try{await picture.decode();return {image:picture,holder};}catch{return null;}
}
function texture(gl:WebGLRenderingContext,image?:TexImageSource){
  const result=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,result);
  for(const edge of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,edge,gl.CLAMP_TO_EDGE);
  for(const filter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,filter,gl.LINEAR);
  if(image)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([126,117,104,255]));
  return result;
}
const amountText=(change:StatChange)=>String(Math.abs(change.to-change.from));
function cardSurface(pass:Pass,card:HTMLElement,print:Awaited<ReturnType<typeof printImage>>,changes:StatChange[],quiet:boolean){
  const r=card.getBoundingClientRect(),ratio=r.height/r.width;
  const canvas=document.createElement('canvas');
  canvas.className='card-material-light';canvas.ariaHidden='true';
  canvas.dataset.materialEffect=changes.length?'stats':'activation';
  canvas.width=Math.max(152,Math.min(384,Math.ceil(r.width*1.24*Math.max(2,devicePixelRatio))));
  canvas.height=Math.ceil(canvas.width*ratio);
  const ctx=canvas.getContext('2d')!;
  let artBox=[0,0,1,1];
  if(print?.holder){
    const rect=print.holder.getBoundingClientRect();
    const scale=Math.max(rect.width/print.image.naturalWidth,rect.height/print.image.naturalHeight);
    const w=scale*print.image.naturalWidth,h=scale*print.image.naturalHeight;
    artBox=[(rect.left-r.left+(rect.width-w)/2)/r.width,(rect.top-r.top+(rect.height-h)/2)/r.height,w/r.width,h/r.height];
  }
  const lettering=document.createElement('canvas');
  lettering.width=lettering.height=192;
  const ink=lettering.getContext('2d')!;
  ink.font='bold 94px Arial, sans-serif';ink.fillStyle='white';ink.textAlign='center';
  const anchors:number[]=[],directions:number[]=[];
  for(const key of ['atk','def'] as const){
    const badge=card.querySelector('.ad-'+key)?.getBoundingClientRect();
    anchors.push(badge?(badge.left+badge.width/2-r.left)/r.width:(key==='atk' ? .1 : .9),badge?(badge.top+badge.height/2-r.top)/r.height:.91);
    const change=changes.find(c=>c.key===key);
    directions.push(change?Math.sign(change.to-change.from):0);
    if(change){
      const text=amountText(change),metrics=ink.measureText(text),row=key==='atk'?0:96;
      ink.fillText(text,96,row+48+(metrics.actualBoundingBoxAscent-metrics.actualBoundingBoxDescent)/2,172);
    }
  }
  const {gl}=pass;
  const art=texture(gl,print?.image),numbers=texture(gl,lettering);
  card.append(canvas);
  return {
    paint(t:number){
      // One WebGL context serves both armies, including full-field simultaneous buffs.
      if(pass.canvas.width!==canvas.width)pass.canvas.width=canvas.width;
      if(pass.canvas.height!==canvas.height)pass.canvas.height=canvas.height;
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,art);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,numbers);
      gl.uniform4fv(pass.artBox,artBox);gl.uniform4fv(pass.seals,anchors);gl.uniform2fv(pass.direction,directions);
      gl.uniform1f(pass.activation,changes.length?0:1);gl.uniform1f(pass.still,Number(quiet));gl.uniform1f(pass.aspect,ratio);
      gl.uniform1f(pass.time,t);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      ctx.globalCompositeOperation='copy';ctx.drawImage(pass.canvas,0,0);
    },
    remove(){canvas.remove();gl.deleteTexture(art);gl.deleteTexture(numbers);}
  };
}

const active=new Map<HTMLElement,()=>void>();
export function cancelMaterial(source:HTMLElement){active.get(source)?.();}
export function cancelMaterials(root?:HTMLElement){
  for(const [source,cancel] of active)if(!root||root.contains(source)||!source.isConnected)cancel();
}

export function playMaterial(source:HTMLElement,faces:HTMLElement[],changes:StatChange[],signal?:AbortSignal):Promise<boolean>{
  cancelMaterial(source);
  const card=faces.at(-1)??source;
  const rect=card.getBoundingClientRect();
  if(!source.isConnected||document.hidden||signal?.aborted||!rect.width||!rect.height)return Promise.resolve(false);
  const quiet=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const beats=changes.map(c=>c.to>c.from ? .27 : .66);
  const ms=changes.length?(quiet?780:1560):(quiet?360:1250);
  const labels=changes.map(c=>faces.flatMap(n=>Array.from(n.querySelectorAll('.ad-'+c.key+' .seal-value'))));
  const set=(i:number,value:number)=>{for(const label of labels[i])label.textContent=String(value);};
  return new Promise(resolve=>{
    let frame=0,settled=false;
    let surface:ReturnType<typeof cardSurface>|undefined;
    const animations:Animation[]=[],fallback:HTMLElement[]=[];
    const applied=new Set<number>();
    const cancel=()=>finish(false);
    function finish(done:boolean){
      if(settled)return;settled=true;active.delete(source);
      cancelAnimationFrame(frame);clearTimeout(deadline);
      signal?.removeEventListener('abort',cancel);
      document.removeEventListener('visibilitychange',cancel);window.removeEventListener('resize',cancel);
      surface?.remove();animations.forEach(a=>a.cancel());fallback.forEach(n=>n.remove());
      changes.forEach((c,i)=>{if(!applied.has(i))set(i,c.to);});resolve(done);
    }
    const deadline=setTimeout(cancel,ms+1800);
    active.set(source,cancel);signal?.addEventListener('abort',cancel,{once:true});
    document.addEventListener('visibilitychange',cancel);window.addEventListener('resize',cancel);
    changes.forEach((c,i)=>set(i,c.from));
    async function begin(){
      const print=await printImage(card);
      if(settled)return;
      if(!source.isConnected||!card.isConnected){cancel();return;}
      if(shared===undefined||shared?.gl.isContextLost())shared=createPass();
      if(shared)surface=cardSurface(shared,card,print,changes,quiet);
      else for(const c of changes){
        const badge=card.querySelector('.ad-'+c.key);if(!badge)continue;
        const sign=document.createElement('span');sign.className='card-material-amount';
        sign.dataset.direction=c.to>c.from?'up':'down';sign.textContent=amountText(c);sign.ariaHidden='true';
        badge.append(sign);fallback.push(sign);
      }
      const parts=changes.length?changes.map(c=>card.querySelector<HTMLElement>('.ad-'+c.key)):[card.querySelector<HTMLElement>('.card-frame,.buff-frame'),card.querySelector<HTMLElement>('.card-art')];
      for(const [i,part] of parts.entries()){
        if(!part)continue;
        const beat=beats[i]??.48,falling=changes[i]&&changes[i].to<changes[i].from;
        animations.push(part.animate([{filter:'brightness(1)'},{filter:'brightness(.90) contrast(1.03)',offset:beat*.5},{filter:falling?'brightness(.78) contrast(1.18)':'brightness(1.28) contrast(1.06)',offset:beat},{filter:'brightness(1.05)',offset:.80},{filter:'brightness(1)'}],{duration:ms,composite:'add'}));
        if(changes.length&&!quiet)animations.push(part.animate([{scale:'1'},{scale:falling?'1.07 .85':'1.23',offset:beat},{scale:'1'}],{duration:ms,composite:'add'}));
      }
      const start=performance.now();
      function tick(now:number){
        if(!source.isConnected||!card.isConnected){cancel();return;}
        const t=Math.min(1,Math.max(0,(now-start)/ms));surface?.paint(t);
        changes.forEach((c,i)=>{if(t>=beats[i]&&!applied.has(i)){set(i,c.to);applied.add(i);}});
        if(t===1)finish(true);else frame=requestAnimationFrame(tick);
      }
      tick(start);
    }
    void begin().catch(error=>{console.warn('Card effect skipped',error);cancel();});
  });
}

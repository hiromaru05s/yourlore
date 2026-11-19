// Visual regression: independently marked anatomy must remain pixel-identical in every GIF frame.
const sharp=require('sharp');
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
const qa='docs/vfx-prototypes/2026-11-19-opening-release';
// Hand-marked on the source illustrations; these do not import the animation's deformation masks.
const regions={
 noel:{
  face:[[.63,.33],[.75,.33],[.77,.38],[.73,.41],[.63,.38]],
  ear:[[.562,.284],[.588,.28],[.599,.314],[.578,.328]],
  // Outer iris/lens stay visible; the new forelock physically passes over the inner lens.
  leftEye:[[.686,.248],[.700,.248],[.700,.265],[.686,.265]],
  glasses:[[.665,.276],[.700,.283],[.700,.288],[.665,.281]],
  torso:[[.53,.42],[.75,.42],[.81,.65],[.79,.94],[.52,.94]],
  arms:[[.35,.66],[.47,.68],[.59,.70],[.64,.77],[.53,.85],[.43,.95],[.24,.94],[.26,.85]],
 },
 vera:{
  face:[[.76,.35],[.79,.35],[.775,.39],[.75,.39]],
  ear:[[.616,.31],[.635,.31],[.634,.346],[.617,.335]],
  leftEye:[[.713,.295],[.734,.295],[.734,.315],[.713,.315]],
  rightEye:[[.805,.298],[.823,.298],[.823,.315],[.805,.315]],
  torso:[[.60,.45],[.80,.45],[.91,.65],[.80,.80],[.46,.85],[.44,.68]],
  arms:[[.48,.77],[.70,.77],[.96,.87],[.94,.97],[.61,.97],[.39,.97],[.27,.94],[.27,.88]],
 },
 seeker:{
  face:[[.76,.10],[.87,.12],[.83,.39],[.63,.44],[.56,.34],[.65,.24]],
  body:[[.50,.44],[.99,.44],[.99,1],[.28,1],[.28,.82],[.35,.72],[.46,.64]],
  arms:[[.41,.65],[.68,.67],[.79,.61],[.98,.70],[.97,.94],[.58,.95],[.29,.90],[.30,.80],[.36,.71]],
 },
 lumi:{
  face:[[.66,.335],[.83,.335],[.84,.39],[.77,.44],[.67,.40]],
  leftEyeLandmarks:[[.65,.272],[.713,.272],[.713,.315],[.65,.315]],
  rightEyeLandmarks:[[.796,.294],[.82,.294],[.82,.325],[.796,.325]],
  scalp:[[.62,.04],[.80,.04],[.80,.085],[.62,.085]],
  ear:[[.57,.27],[.64,.27],[.65,.34],[.57,.35]],
  body:[[.51,.44],[.99,.44],[.99,1],[.32,1],[.24,.87],[.30,.79],[.41,.70],[.45,.60]],
  arms:[[.40,.73],[.65,.70],[.78,.72],[.93,.67],[.98,.88],[.87,.97],[.52,.92],[.35,.98],[.24,.87],[.30,.79]],
 },
};
function inside(x,y,poly){let result=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)result=!result;}return result;}
(async()=>{
 await fs.mkdir(qa,{recursive:true});const report=[];
 for(const key of ['seeker','lumi','noel','vera'])for(const direction of ['right','left']){
  const file=`client/public/art/duel-portraits/${['noel','vera'].includes(key)?'wind-npcs-v1':'wind-v5'}/${key}-${direction}.gif`;
  const metadata=await sharp(file,{animated:true}).metadata();
  const {data,info}=await sharp(file,{animated:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const width=info.width,height=metadata.pageHeight,frameSize=width*height*4;
  assert.equal(metadata.pages,48);assert.equal(width,768);assert.equal(height,768);
  assert.ok(metadata.delay.every(ms=>ms===50));
  const checks=Object.fromEntries(Object.keys(regions[key]).map(name=>[name,{pixels:0,changedPixels:0,maxChannelDelta:0}]));
  const marks=Object.fromEntries(Object.keys(regions[key]).map(name=>[name,[]]));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=(y*width+x)*4;if(!data[i+3])continue;
   const px=(((direction==='left'?width-1-x:x)+.5)/width-.5)/.88+.5,py=((y+.5)/height-.5)/.88+.5;
   for(const [name,poly]of Object.entries(regions[key]))if(inside(px,py,poly))marks[name].push(i);
  }
  for(const [name,indices]of Object.entries(marks)){
   checks[name].pixels=indices.length;
   for(let f=1;f<metadata.pages;f++)for(const i of indices){let delta=0;for(let c=0;c<4;c++)delta=Math.max(delta,Math.abs(data[i+c]-data[f*frameSize+i+c]));if(delta)checks[name].changedPixels++;checks[name].maxChannelDelta=Math.max(checks[name].maxChannelDelta,delta);}
  }
  const overlay=Buffer.alloc(frameSize);let movingPixels=0,headFabricMovingPixels=0,frontHairMovingPixels=0;
  for(let i=0;i<frameSize;i+=4){let delta=0;for(let f=1;f<metadata.pages;f++)for(let c=0;c<4;c++)delta=Math.max(delta,Math.abs(data[i+c]-data[f*frameSize+i+c]));if(delta){movingPixels++;const x=(i/4)%width,y=Math.floor(i/4/width);const px=(((direction==='left'?width-1-x:x)+.5)/width-.5)/.88+.5,py=((y+.5)/height-.5)/.88+.5;if(key!=='seeker'&&px>.70&&px<.82&&py>.20&&py<.34)frontHairMovingPixels++;if((Math.floor(i/4/width)+.5)/height<.41)headFabricMovingPixels++;overlay[i]=255;overlay[i+1]=68;overlay[i+2]=45;overlay[i+3]=150;}}
  if(direction==='right')await sharp(data.subarray(0,frameSize),{raw:{width,height,channels:4}}).flatten({background:'#172331'}).composite([{input:overlay,raw:{width,height,channels:4}}]).png().toFile(`${qa}/${key}-motion-map.png`);
  report.push({key,direction,frames:metadata.pages,frameMs:metadata.delay[0],checks,movingPixels,headFabricMovingPixels,frontHairMovingPixels});
 }
 await fs.writeFile(`${qa}/anatomy.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 for(const entry of report){assert.ok(entry.movingPixels>1000,'cloth must still move');assert.ok(entry.headFabricMovingPixels>1000,'hair / hood must move');if(entry.key!=='seeker')assert.ok(entry.frontHairMovingPixels>1000,'front fringe must move');for(const [name,check]of Object.entries(entry.checks))assert.equal(check.changedPixels,0,`${entry.key} ${entry.direction} ${name} moved`);}
})().catch(e=>{console.error(e);process.exit(1)});

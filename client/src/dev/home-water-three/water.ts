import * as THREE from 'three';
export const waterClock={time:{value:0},variant:{value:0},amount:{value:1}};
/** Uses the adopted plate itself: water colour + geographic bounds exclude pillars,
 * balusters, shore and furniture. Distorted samples are independently masked. */
export function waterMaterial(map:THREE.Texture){
return new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{map:{value:map},...waterClock},
vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
fragmentShader:`
uniform sampler2D map;uniform float time,variant,amount;varying vec2 vUv;
// Suppress the painted ruler-straight shoreline highlight, not the lake motion.
// A local vertical brightness peak and blue water underneath distinguish it
// from the broad pale stone pillars and the distant castle/shore shapes.
vec4 plateSample(vec2 uv){
 vec4 c=texture2D(map,uv);
 vec2 p=vec2(uv.x*1672.,(1.-uv.y)*941.);
 float band=smoothstep(623.,626.,p.y)*(1.-smoothstep(634.,637.,p.y));
 band*=smoothstep(230.,235.,p.x)*(1.-smoothstep(1050.,1055.,p.x));
 if(band>0.){
  vec3 above=texture2D(map,uv+vec2(0.,5./941.)).rgb;
  vec3 below=texture2D(map,uv-vec2(0.,7./941.)).rgb;
  vec3 luma=vec3(.2126,.7152,.0722);
  float ridge=smoothstep(.015,.10,dot(c.rgb,luma)-max(dot(above,luma),dot(below,luma)));
  float lake=smoothstep(.08,.20,below.b-below.r)*smoothstep(.025,.09,below.b-below.g);
  vec3 shore=mix(above,below,.76);
  c.rgb=mix(c.rgb,shore,band*ridge*lake);
 }
 return c;
}
float water(vec2 uv,vec3 c){
 vec2 p=vec2(uv.x*1672.,(1.-uv.y)*941.);
 float region=smoothstep(629.,633.,p.y)*(1.-smoothstep(732.,738.,p.y))*(1.-smoothstep(1180.,1200.,p.x));
 float blue=smoothstep(.045,.13,c.b-c.r)*smoothstep(.015,.065,c.g-c.r);
 return region*blue;
}
void main(){
 vec4 original=plateSample(vUv);float mask=water(vUv,original.rgb);
 // Erode the water mask near all stone edges so no silhouette can wobble.
 vec2 ex=vec2(8./1672.,0.),ey=vec2(0.,4./941.);
 mask*=water(vUv+ex,plateSample(vUv+ex).rgb)*water(vUv-ex,plateSample(vUv-ex).rgb);
 mask*=water(vUv+ey,plateSample(vUv+ey).rgb)*water(vUv-ey,plateSample(vUv-ey).rgb);
 vec2 p=vec2(vUv.x*1672.,(1.-vUv.y)*941.);float depth=clamp((p.y-627.)/105.,0.,1.);
 float t=time;vec2 d;float crest;float light;
 if(variant<.5){
  // Fine short wavelets; reflections break into changing horizontal strokes.
  float a=p.y*.80+sin(p.x*.032+t*.65)*1.6-t*2.0;
  float b=p.y*.43-p.x*.012+t*1.3;
  d=vec2(sin(a)*2.0+sin(b)*1.0,cos(a)*.65+sin(b)*.5);
  crest=pow(max(0.,sin(a)),14.)*smoothstep(-.15,.7,sin(p.x*.095+t*.6));
  light=crest*.13-smoothstep(.65,1.,sin(b))*.035;
 }else if(variant<1.5){
  // Wind pushes long broken crests diagonally across the lake.
  float a=p.y*.36-p.x*.026-t*3.5+sin(p.x*.009-t*.5)*1.6;
  float b=p.y*.69+p.x*.014-t*2.;
  d=vec2(sin(a)*4.+sin(b)*1.7,cos(a)*1.35+sin(b)*.7);
  crest=pow(max(0.,sin(a)),9.)*(.4+.6*smoothstep(-.5,.8,sin(p.x*.043-t*1.2)));
  light=crest*.21-pow(max(0.,cos(a)),4.)*.06;
 }else{
  // Broad low-frequency swells bend the reflected colour bands as a surface.
  float a=p.y*.18+sin(p.x*.011+t*.3)*1.2-t*1.7;
  float b=p.y*.32-p.x*.008+t*.9;
  d=vec2(sin(a)*6.+sin(b)*2.,cos(a)*2.1+sin(b)*1.);
  crest=pow(max(0.,sin(a+.8)),10.)*(.55+.45*sin(p.x*.019-t*.4));
  light=crest*.17+sin(a)*.045;
 }
 float edge=mask*amount*(.5+.5*depth);
 vec2 displaced=vUv+vec2(d.x/1672.,-d.y/941.)*edge;
 vec4 sampleWater=plateSample(displaced);
 float safe=water(displaced,sampleWater.rgb);
 vec3 c=mix(original.rgb,sampleWater.rgb,edge*safe);
 c+=vec3(.43,.73,.85)*light*mask*amount;
 gl_FragColor=vec4(c,original.a);
 #include <colorspace_fragment>
}`});}

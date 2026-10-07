export const vertex=`
uniform float morph,sourceRatio;varying vec2 vUv;
void main(){vUv=uv;vec3 p=position;p.y*=mix(sourceRatio/1.5,.6666667,morph);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
export const fragment=`
uniform sampler2D face,tile;uniform float time,morph,contact;varying vec2 vUv;
float ease(float a,float b,float t){float f=clamp((t-a)/(b-a),0.,1.);return f*f*(3.-2.*f);}
void main(){vec2 uv=vUv;vec4 base=mix(texture2D(face,uv),texture2D(tile,uv),morph);if(base.a<.025)discard;
vec3 col=base.rgb;float lum=dot(col,vec3(.2126,.7152,.0722));float engrave=min(.65,length(vec2(dFdx(lum),dFdy(lum)))*45.);
float sweep=exp(-pow((uv.x*.36+uv.y-(1.35-time*1.7))/.045,2.));float ignition=ease(.06,.20,time)*(1.-ease(.40,.65,time));
col+=vec3(.4,.80,1.)*(sweep*.24+engrave*ignition*.11+engrave*contact*.32);gl_FragColor=vec4(col,base.a);
#include <colorspace_fragment>
}`;

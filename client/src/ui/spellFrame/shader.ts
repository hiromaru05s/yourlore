/** Approved study 03 / 四隅の共鳴, source 443e00d9. */
export const FRAME_DURATION=3200;
export const frameVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const frameFragment=`
uniform sampler2D frameMask;
uniform float time;
uniform float reduced;
varying vec2 vUv;
float ease(float a,float b,float t){float x=clamp((t-a)/(b-a),0.,1.);return x*x*(3.-2.*x);}
float pulse(float x,float w){return exp(-x*x/(w*w));}
float cyclic(float a,float b){return abs(fract(a-b+.5)-.5);}
void main(){
 // Plane includes a small gutter, while the mask remains registered to the card.
 vec2 uv=(vUv-.5)*1.10+.5;
 vec3 mask=texture2D(frameMask,uv).rgb;
 float bounds=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
 mask*=bounds;
 vec2 q=uv-.5;
 float t=time;
 float life=ease(.08,.26,t)*(1.-ease(2.65,3.15,t));
 float light=0.,head=0.,flow=0.;

  // Four corner nodes blossom in sequence; each fills the adjacent frame.
  float a=abs(q.x)/.5,b=abs(q.y)/.5;
  float quadrant=step(0.,q.x)+2.*step(0.,q.y);
  float delay=quadrant*.11;
  float d=abs(a-b),p=ease(.20+delay,1.30+delay,t)*1.1;
  light=(1.-smoothstep(p-.08,p+.08,d))*.50;
  head=pulse(d-p,.075)*(1.-ease(1.25+delay,1.50+delay,t))*1.15;
  head+=pulse(d,.10)*pulse(t-(.36+delay),.16)*.9;
  light*=1.-ease(2.05,2.95,t-delay);
 if(reduced>.5){light=.40*ease(.12,.48,t)*(1.-ease(2.25,2.95,t));head=0.;flow=0.;}
 float energy=max(0.,light+head+flow)*life;
 // Fine bevels stay sharp. Soft blue is subordinate to the actual frame engraving.
 float grain=.94+.06*sin(uv.y*380.+sin(uv.x*270.)*2.-t*2.);
 float body=mask.r*.16,core=mask.g*(1.6+head*.40),halo=mask.b*.23;
 float alpha=clamp((body+core+halo)*energy,0.,.96);
 vec3 blue=vec3(.025,.43,1.55),ice=vec3(.36,.83,1.50);
 vec3 col=mix(blue,ice,clamp(mask.g*2.2+head*.20,0.,.85))*grain;
 col+=vec3(.10,.29,.42)*head*mask.g;
 gl_FragColor=vec4(col,alpha);
}`;

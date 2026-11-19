import {createSeekerPainting} from './homeSeeker';
import {homeIsCovered} from './screenCovered';
import {createSingleIdleMotion} from './singleIdleMotion';
import type {SingleDifficulty} from '../shared/botNpcs';

// Landmarks use half-resolution coordinates of the 2048 × 3072 portraits.
// Both the static poster and the animated mesh sample the same detailed painting.
const poses = {
  easy: {
    id:'lumi', neck:[510,248], waist:[515,558], hand:[483,456],
    hairLeft:[365,206], hairRight:[640,205], hairRadius:[52,68],
    hemLeft:[265,950], hemRight:[765,985], tilt:-.024,
    face:[500,167,98,113], headEnd:280, hairSway:18,
    crown:[485,33], crownSway:4,
    eyeA:[466,165,18.5,10.5], eyeB:[535,151,18.5,7.5],
    eyeSlopeA:-.09, eyeSlopeB:-.30, eyeLowerA:10, eyeLowerB:12,
  },
  normal: {
    id:'noel', neck:[513,233], waist:[510,575], hand:[465,470],
    hairLeft:[395,120], hairRight:[620,100], hairRadius:[45,58],
    hemLeft:[280,1050], hemRight:[751,1005], tilt:.022,
    face:[505,148,93,102], headEnd:250, hairSway:11,
    crown:[495,24], crownSway:0,
    eyeA:[473,148.4,19,6.7], eyeB:[535.5,140,17,6],
    eyeSlopeA:-.03, eyeSlopeB:-.20, eyeLowerA:4.5, eyeLowerB:5.5,
  },
  hard: {
    id:'vera', neck:[511,251], waist:[495,584], hand:[408,492],
    hairLeft:[370,240], hairRight:[655,206], hairRadius:[48,100],
    hemLeft:[280,1050], hemRight:[716,1010], tilt:-.025,
    face:[500,175,100,110], headEnd:285, hairSway:20,
    crown:[520,35], crownSway:5,
    eyeA:[464.4,180,16.5,7.7], eyeB:[526.5,164,17,7],
    eyeSlopeA:.07, eyeSlopeB:-.28, eyeLowerA:7, eyeLowerB:9,
  },
} as const;

export function standingVertex(key:SingleDifficulty) {
  const pose=poses[key];
  return `
    uniform float time;
    uniform float gesture;
    varying vec2 texCoord;
    float brush(vec2 point,vec2 center,vec2 radius) {
      vec2 distance=(point-center)/radius;
      return exp(-dot(distance,distance));
    }
    vec2 turn(vec2 point,vec2 pivot,float angle) {
      float c=cos(angle),s=sin(angle);
      return pivot+mat2(c,s,-s,c)*(point-pivot);
    }
    void main() {
      texCoord=uv;
      vec2 art=vec2(uv.x,1.-uv.y)*vec2(1024.,1536.);
      vec2 point=art;
      float hairLeft=brush(art,vec2(${pose.hairLeft}),vec2(${pose.hairRadius}));
      float hairRight=brush(art,vec2(${pose.hairRight}),vec2(${pose.hairRadius}));
      // Loose locks and coat tails lag behind the same slow draught.
      float breeze=1.+.16*sin(time*.37);
      point.x+=breeze*${pose.hairSway.toFixed(3)}*hairLeft*sin(time*1.05-art.y*.009);
      point.x+=breeze*${pose.hairSway.toFixed(3)}*hairRight*sin(time*1.05-art.y*.008-.65);
      point.y+=3.*hairRight*sin(time*1.05-.8);
      float crown=brush(art,vec2(${pose.crown}),vec2(70.,35.));
      point.x+=${pose.crownSway.toFixed(3)}*crown*sin(time*1.05-.25);
      float hemLeft=brush(art,vec2(${pose.hemLeft}),vec2(95.,300.));
      float hemRight=brush(art,vec2(${pose.hemRight}),vec2(105.,300.));
      point.x+=breeze*34.*hemLeft*sin(time*1.05-art.y*.004);
      point.x+=breeze*30.*hemRight*sin(time*1.05-art.y*.004-.7);
      point.y+=7.*(hemLeft+hemRight)*sin(time*1.05-1.2);
      // Card and fingers move together, supported by the forearm.
      float hand=brush(art,vec2(${pose.hand}),vec2(100.,130.));
      point+=vec2(4.,-16.)*hand*gesture;
      // Protect the whole face, jaw and glasses, including a mesh-cell margin.
      // Gaussian hair/hand/cloth fields must contribute exactly zero here.
      vec4 face=vec4(${pose.face});
      vec2 outside=abs(art-face.xy)-face.zw;
      float loose=smoothstep(0.,56.,max(outside.x,outside.y));
      point=art+(point-art)*loose;
      ${key==='normal' ? `
      // Keep the entire scalp and face rigid. Only isolated silhouette locks
      // bend about their roots; no translation field crosses the crown.
      point=mix(art,point,smoothstep(285.,345.,art.y));
      float wind=time*.98;
      float curl=(1.-smoothstep(26.,46.,art.y));
      curl*=1.-smoothstep(.5,1.2,length((art-vec2(475.,22.))/vec2(43.,28.)));
      point+=curl*(turn(art,vec2(465.,50.),.11*sin(wind))-art);
      float upperLock=smoothstep(570.,595.,art.x);
      upperLock*=1.-smoothstep(.5,1.2,length((art-vec2(592.,65.))/vec2(36.,20.)));
      point+=upperLock*(turn(art,vec2(558.,76.),.10*sin(wind-.35))-art);
      float lowerLock=smoothstep(570.,595.,art.x);
      lowerLock*=1.-smoothstep(.5,1.2,length((art-vec2(598.,123.))/vec2(29.,28.)));
      point+=lowerLock*(turn(art,vec2(568.,108.),.09*sin(wind-.65))-art);
      float leftLock=1.-smoothstep(403.,430.,art.x);
      leftLock*=1.-smoothstep(.5,1.2,length((art-vec2(407.,137.))/vec2(30.,30.)));
      point+=leftLock*(turn(art,vec2(432.,118.),.10*sin(wind-.9))-art);
      ` : ''}
      // The skull is one rigid piece. Blend only below the jaw, through the neck.
      float head=1.-smoothstep(${pose.headEnd}.,${pose.headEnd+90}.,art.y);
      float headAngle=.004*sin(time*.62-.6)+${pose.tilt}*gesture;
      point=mix(point,turn(point,vec2(${pose.neck}),headAngle),head);
      // A small weight transfer rotates the upper body around the waist.
      // There is no chest scaling or cyclical vertical breathing displacement.
      float upper=1.-smoothstep(650.,1330.,art.y);
      float bodyAngle=.005*sin(time*.62)+.006*gesture;
      point=mix(point,turn(point,vec2(${pose.waist}),bodyAngle),upper);
      point.x+=upper*(5.*sin(time*.54-.4)-5.*gesture);
      gl_Position=vec4(point/vec2(512.,-768.)+vec2(-1.,1.),0.,1.);
    }`;
}

function blinkFragment(key:SingleDifficulty) {
  const pose=poses[key];
  return `
    uniform sampler2D painting;
    uniform float blink;
    varying vec2 texCoord;
    vec4 portrait(vec2 pixel) {
      return texture2D(painting,pixel/vec2(1024.,-1536.)+vec2(0.,1.));
    }
    vec4 eyelid(vec4 color,vec2 pixel,vec4 eye,vec2 shape) {
      float x=(pixel.x-eye.x)/eye.z;
      if(abs(x)>=1. || blink<=0.) return color;
      float arch=sqrt(max(0.,1.-x*x));
      float axis=eye.y+(pixel.x-eye.x)*shape.x;
      float upper=axis-eye.w*arch;
      float lower=axis+shape.y*arch;
      float edge=mix(upper,lower-.8*arch,blink);
      if(pixel.y<upper-5. || pixel.y>lower+3.) return color;
      // Reconstruct the lid from nearby skin, so lashes never stretch into
      // vertical streaks. The cover follows the moving edge across the iris.
      vec3 leftSkin=portrait(vec2(eye.x-eye.z*.28,eye.y+shape.y+6.)).rgb;
      vec3 rightSkin=portrait(vec2(eye.x+eye.z*.28,eye.y+shape.y+6.)).rgb;
      vec3 skin=mix(leftSkin,rightSkin,smoothstep(-1.,1.,x));
      float crease=1.-smoothstep(0.,5.,edge-pixel.y);
      skin*=1.-.07*crease;
      float opening=smoothstep(0.,.16,blink);
      float corner=1.-smoothstep(.92,1.,abs(x));
      float cover=smoothstep(upper-4.,upper-1.8,pixel.y);
      cover*=1.-smoothstep(edge-.7,edge+.7,pixel.y);
      color.rgb=mix(color.rgb,skin,cover*corner*opening);
      // Keep the lash thickness constant throughout closure and reopening.
      vec3 lash=vec3(.024,.014,.013);
      float stroke=1.-smoothstep(.65,1.45,abs(pixel.y-edge));
      color.rgb=mix(color.rgb,lash,stroke*corner*opening);
      return color;
    }
    void main() {
      vec2 pixel=vec2(texCoord.x,1.-texCoord.y)*vec2(1024.,1536.);
      vec4 color=portrait(pixel);
      color=eyelid(color,pixel,vec4(${pose.eyeA}),vec2(${pose.eyeSlopeA},${pose.eyeLowerA}));
      color=eyelid(color,pixel,vec4(${pose.eyeB}),vec2(${pose.eyeSlopeB},${pose.eyeLowerB}));
      gl_FragColor=color;
      #include <colorspace_fragment>
      #include <premultiplied_alpha_fragment>
    }`;
}

export function mountSingleIdle(host:HTMLElement,key:SingleDifficulty):()=>void {
  const image=host.querySelector('img')!;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const motion=createSingleIdleMotion();
  const uniforms={blink:{value:0},gesture:{value:0}};
  let painting:ReturnType<typeof createSeekerPainting>|undefined;
  let disposed=false,visible=false,decoded=false,failed=false;
  let frame=0,last=0;
  function tick(now:number) {
    frame=requestAnimationFrame(tick);
    if(!homeIsCovered() && !document.querySelector('.sp-deck-sheet[open], .single-vn[open], .ss-master-sheet[open]')) {
      const state=motion.advance(last?Math.min(now-last,64)/1000:0);
      uniforms.blink.value=state.blink;
      uniforms.gesture.value=state.gesture;
      painting?.draw(state.time);
    }
    last=now;
  }
  function sync() {
    cancelAnimationFrame(frame);
    last=0;
    const active=visible && !disposed && !document.hidden && decoded && !reduced.matches;
    if(active && !painting && !failed) {
      try {
        painting=createSeekerPainting(host,image,{
          vertexShader:standingVertex(key),fragmentShader:blinkFragment(key),uniforms,pixelRatio:2,
        });
        painting.canvas.addEventListener('webglcontextlost',()=>{
          if(disposed)return;
          failed=true;
          painting?.destroy();
          painting=undefined;
          sync();
        },{once:true});
      } catch {failed=true;}
    }
    host.classList.toggle('is-painted',active && !!painting);
    if(active && painting)frame=requestAnimationFrame(tick);
  }
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});
  observer.observe(host);
  reduced.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  void image.decode().then(()=>{
    if(disposed)return;
    decoded=true;
    sync();
  }).catch(()=>{});
  return ()=>{
    disposed=true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    reduced.removeEventListener('change',sync);
    document.removeEventListener('visibilitychange',sync);
    painting?.destroy();
  };
}

import * as T from 'three';
export class Weapon{
 mesh:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>;echo:T.Mesh;stamp:T.Mesh;texture:T.Texture;
 constructor(texture:T.Texture){this.texture=texture;const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{map:{value:texture},time:{value:0},build:{value:0},gone:{value:0},variant:{value:0},role:{value:0},stamp:{value:0}},vertexShader:`
 varying vec2 uv0;uniform float time;uniform float build;uniform float gone;uniform float variant;uniform float role;
 void main(){uv0=uv;vec3 p=position;float a=1.-build;
 if(variant<.5){float band=floor(uv.y*9.);p.x+=sin(band*3.1)*a*.26;p.y+=a*.3;p.z+=a*cos(band)*.12;}
 else if(variant<1.5){p.x+=sign(p.x)*a*.35;p.z+=sin(uv.y*12.)*a*.24;}
 else if(variant<2.5){p.x+=sin(uv.y*7.+time*2.)*a*.20;p.z+=sin(uv.y*8.)*.06*sin(build*3.14159);}
 else if(variant<3.5){float stripe=floor(uv.y*7.);p.y+=a*sin(stripe)*.20;p.z+=abs(sin(stripe))*a*.5;p.x*=1.-a*.35;}
 else if(variant<4.5){p.x+=sin(uv.y*13.-time*3.)*(a*.24+gone*.12);p.z+=sin(uv.x*16.+uv.y*7.-time*3.)*.04;}
 else{p.x+=sign(uv.x-.5)*a*.50;p.y+=sign(uv.x-.5)*a*.26;}
 // Bow string tension and opposing rogue blade rotation come from the role, not a color swap.
 if(role>1.5&&role<2.5)p.x-=sin(clamp((time-1.)/.9,0.,1.)*3.14159)*.08*(1.-uv.x);
 if(role>2.5)p.x+=sign(uv.x-.5)*sin(clamp((time-.8)/1.2,0.,1.)*3.14159)*.055;
 p.xy*=1.-gone*.30;p.z-=gone*.2;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`
 precision highp float;varying vec2 uv0;uniform sampler2D map;uniform float time;uniform float build;uniform float gone;uniform float variant;uniform float stamp;
 float noise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){vec4 col=texture2D(map,uv0);if(col.a<.04)discard;float n=noise(floor(uv0*180.));float y=uv0.y;
 float gate=y;if(variant>2.5&&variant<3.5)gate=fract(y*7.)*.18+y*.82;
 if(variant>4.5)gate=abs(uv0.x-.5)*.6+y*.4;
 float reveal=build*1.13-.04;if(gate>reveal+(n-.5)*.025)discard;
 if(y<gone*1.2+(n-.5)*.028)discard;
 float rim=1.-smoothstep(0.,.023,abs(gate-reveal));float returnRim=1.-smoothstep(0.,.02,abs(y-gone*1.2));
 float lum=dot(col.rgb,vec3(.2126,.7152,.0722));
 if(variant>2.5&&variant<3.5)col.rgb=mix(col.rgb,vec3(.93,.86,.71)*(.32+lum*.8),.58);
 if(variant>3.5&&variant<4.5)col.rgb=mix(col.rgb,vec3(.80,.79,.88)*(.30+lum*.8),.64);
 if(variant>4.5)col.rgb*=vec3(.82,.78,.96);
 float scan=exp(-pow((y-fract(time*.48))*42.,2.));
 col.rgb+=vec3(.56,.37,.80)*(rim+returnRim*.7)+vec3(.30,.23,.14)*scan;
 if(stamp>.5){col.rgb=mix(vec3(.29,.20,.42),col.rgb,.45);col.a*=.38*(1.-gone);}
 gl_FragColor=col;
 #include <tonemapping_fragment>\n#include <colorspace_fragment>
 }`});
 this.mesh=new T.Mesh(new T.PlaneGeometry(2.8,2.8,48,48),material);this.mesh.position.z=.38;this.mesh.renderOrder=5;const em=material.clone();em.uniforms.stamp.value=1;this.echo=new T.Mesh(this.mesh.geometry,em);this.echo.renderOrder=3;this.stamp=new T.Mesh(this.mesh.geometry,em.clone());this.stamp.position.z=.02;this.stamp.renderOrder=2;
 }
 dispose(){this.texture.dispose();this.mesh.geometry.dispose();for(const o of [this.mesh,this.echo,this.stamp])(o.material as T.ShaderMaterial).dispose();}
 set(time:number,v:number,role:number,build:number,gone:number){for(const obj of [this.mesh,this.echo,this.stamp]){const u=(obj.material as T.ShaderMaterial).uniforms;u.time.value=time;u.variant.value=v;u.role.value=role;u.build.value=build;u.gone.value=gone;obj.visible=time>.08&&time<3.05;}
 this.mesh.scale.setScalar(role===3?.70:1);this.echo.scale.setScalar(role===3?.70:1);this.mesh.rotation.z=role===0?-.13*Math.sin(Math.max(0,Math.min(1,(time-1.1)/.9))*Math.PI):role===1?.05*Math.sin(time*2):0;
 this.echo.visible&&=v===5;const apart=Math.sin(Math.max(0,Math.min(1,(time-.2)/2.0))*Math.PI);this.echo.position.set(-apart*.33,-.06,.07);this.echo.rotation.z=-apart*.32;if(v===5){this.mesh.position.x=apart*.24;this.mesh.rotation.z=apart*.20;}else this.mesh.position.x=0;this.stamp.scale.setScalar(role===3?.6:.84);this.stamp.visible&&=time<2.8;
 }
}
export async function loadWeapons(){const loaded:Weapon[]=[];let failed=false;try{return await Promise.all(['knight','mage','archer','rogue'].map(async name=>{const tex=await new T.TextureLoader().loadAsync('/vfx/chosen-heroes/'+name+'.png');tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;const weapon=new Weapon(tex);if(failed)weapon.dispose();else loaded.push(weapon);return weapon}));}catch(error){failed=true;loaded.forEach(w=>w.dispose());throw error;}}

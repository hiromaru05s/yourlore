// Approved 02: copy the original hole seeds, time curve, UVs and surface shading verbatim.
// No downstream variant may change these functions. Table residue is a separate underlay.
export const fixedFaceGLSL = `
float fixedHoles(vec2 p,float e){
 float n=fbm(p*9.);float holes=2.;
 for(int i=0;i<13;i++){float fi=float(i);vec2 cen=vec2(hash(vec2(fi,2.))-.5,(hash(vec2(fi,9.))-.5)*1.5);float r=sm(.03+hash(vec2(fi,4.))*.23,.94,e)*(.34+hash(vec2(fi,5.))*.15);holes=min(holes,length((p-cen)*vec2(1.,.86))-r+(n-.5)*.047);}
 return holes;
}
vec4 fixedFace(vec2 p,float time){
 float e=sm(.32,2.08,time),n=fbm(p*9.),active=sm(.07,.38,time);vec2 q=p;
 float holes=fixedHoles(p,e);
 float dist=max(box(p,vec2(.5,.75)),-holes);float ink=1.-sm(.015,.17,holes);
 float cardMask=1.-sm(-.005,.006,dist);cardMask*=1.-sm(.93,1.,e);
 vec2 texuv=vec2(q.x+.5,.5-q.y/1.5);vec4 art=texture2D(face,clamp(texuv,.001,.999));
 float edge=1.-sm(.002,.038,abs(dist));float vein=pow(1.-abs(sin(q.y*20.+fbm(q*16.)*12.)),12.);
 vec3 dark=vec3(.035,.09,.042),mid=vec3(.24,.42,.055),light=vec3(.73,.87,.24);
 float stain=sat(ink*.76+active*.12+e*.18);vec3 col=mix(art.rgb,dark,stain*.8);col=mix(col,mid,sat(ink*.57));
 col+=light*vein*stain*.13;col=mix(col,dark,edge*.54);col+=light*pow(edge,3.)*.66*(.55+.45*n);
 if(time<.01){col=art.rgb;cardMask=1.-sm(-.005,.006,box(p,vec2(.5,.75)));}
 return vec4(col,cardMask*art.a);
}
`;

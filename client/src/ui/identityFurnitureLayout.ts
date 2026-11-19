/** Match each plate to its viewing angle while keeping its near edge on the mana rail. */
export function identityNameplatePose(side:'Me'|'Opp',depth=.035){
 const pitch=side==='Me'?8:28;
 const radians=pitch*Math.PI/180,sin=Math.sin(radians),cos=Math.cos(radians);
 const centerY=depth/2*sin,centerZ=-.0375-depth/2*cos;
 // The text lies on the recessed enamel face, 4.3 mm above the model origin.
 return {pitch,radians,centerY,centerZ,faceY:centerY+.0043*cos,faceZ:centerZ+.0043*sin};
}
export const IDENTITY_RANK_SCALE=1.15;

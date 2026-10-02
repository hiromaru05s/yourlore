/** Vector-cut metal, textile and enamel pieces for the local HOME studies. */
export function navMaterial(variant:string,index:number):string {
 const id=`nav-${variant}-${index}`;
 const metal=`url(#${id}-metal)`, enamel=`url(#${id}-enamel)`, light=`url(#${id}-light)`;
 const defs=`<defs>
 <linearGradient id="${id}-metal" x2=".18" y2="1"><stop stop-color="#e6e5d3"/><stop offset=".2" stop-color="#7d8c9a"/><stop offset=".42" stop-color="#cbd5d8"/><stop offset=".5" stop-color="#4b5968"/><stop offset=".76" stop-color="#a7a591"/><stop offset="1" stop-color="#465365"/></linearGradient>
 <linearGradient id="${id}-enamel" x2=".4" y2="1"><stop stop-color="var(--enamel-top)"/><stop offset=".5" stop-color="var(--enamel-mid)"/><stop offset="1" stop-color="#050c18"/></linearGradient>
 <radialGradient id="${id}-light"><stop stop-color="var(--gem)" stop-opacity=".55"/><stop offset="1" stop-color="var(--gem)" stop-opacity="0"/></radialGradient>
 <pattern id="${id}-weave" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 0L5 5M-1 4L1 6" stroke="#fff" stroke-opacity=".035" stroke-width=".6"/></pattern>
 </defs>`;
 const jewel=(x:number,y:number,s=4)=>`<path d="M${x} ${y-s}l${s} ${s}-${s} ${s}-${s}-${s}Z" fill="var(--gem)" stroke="#d9e8ed" stroke-width=".6"/>`;
 const crest=`<path d="M69 8h18l13-6 13 6h18l-11 5h-12l-8 6-8-6H80Z" fill="${metal}"/>${jewel(100,10,4)}`;
 let art='',view='0 0 200 132';
 if(variant==='1') art=`
 <path d="M14 22h61L100 7l25 15h61l10 10v83l-10 10H14L4 115V32Z" fill="${metal}"/>
 <path d="M15 25h63l22-13 22 13h63l8 9v79l-9 9H16l-9-9V34Z" fill="${enamel}" stroke="#050b13" stroke-width="2"/>
 <path d="M20 31h56l24-14 24 14h56l7 8v67l-7 9H20l-7-9V39Z" fill="url(#${id}-weave)" stroke="#aebdce" stroke-opacity=".3"/>
 <ellipse cx="100" cy="46" rx="65" ry="54" fill="${light}"/>
 <path d="M7 44l9-13h18M193 44l-9-13h-18M7 99l9 16h18M193 99l-9 16h-18" fill="none" stroke="${metal}" stroke-width="3"/>
 <path d="M30 116h49l21 8 21-8h49" fill="none" stroke="#c4c7b3" stroke-width="1"/>
 ${jewel(100,20,4)}${jewel(100,120,3)}`;
 if(variant==='2') art=`
 <path d="M19 12h162v102l-81 16-81-16Z" fill="#000" opacity=".5"/>
 <path d="M22 5h156v101l-78 20-78-20Z" fill="${enamel}" stroke="${metal}" stroke-width="2"/>
 <path d="M28 9h144v92l-72 19-72-19Z" fill="url(#${id}-weave)" stroke="#c5af74" stroke-opacity=".55"/>
 <path d="M33 10v86l67 18 67-18V10" fill="none" stroke="#d5c69d" stroke-opacity=".2" stroke-dasharray="2 3"/>
 <path d="M25 7l13 7v80l-13 7M175 7l-13 7v80l13 7" fill="#b4a17e" opacity=".12"/>
 <ellipse cx="100" cy="45" rx="58" ry="64" fill="${light}"/>
 <path d="M14 3h172v9H14Z" fill="${metal}" stroke="#18212c"/>
 <path d="M10 1l7 6-7 7-7-7ZM190 1l7 6-7 7-7-7Z" fill="${metal}"/>
 <path d="M57 105l43 10 43-10M88 114l12 8 12-8" fill="none" stroke="#c9b37a"/>
 ${jewel(100,115,3)}`;
 if(variant==='3') art=`
 <path d="M59 36l10-13 11 3 20-16 20 16 11-3 10 13-8 10 8 11-10 14-13-1-18 15-18-15-13 1-10-14 8-11Z" fill="${metal}" stroke="#050d19" stroke-width="2"/>
 <circle cx="100" cy="46" r="35" fill="${enamel}" stroke="#b9c4c9" stroke-width="1.5"/>
 <circle cx="100" cy="46" r="29" fill="${light}" stroke="#b8a879" stroke-opacity=".45"/>
 <path d="M60 24l-15 7 9 9-13 6 13 6-9 9 15 7M140 24l15 7-9 9 13 6-13 6 9 9-15 7" fill="none" stroke="${metal}" stroke-width="2"/>
 <path d="M31 91h138l14 12-14 17H31l-14-17Z" fill="${metal}"/>
 <path d="M33 94h134l11 9-11 14H33l-11-14Z" fill="${enamel}"/>
 <path d="M41 119h42l17 9 17-9h42" fill="none" stroke="${metal}"/>
 ${jewel(100,9,4)}${jewel(100,82,3)}`;
 if(variant==='4') art=`
 <path d="M30 2h140l9 9v110l-9 9H30l-9-9V11Z" fill="${metal}"/>
 <path d="M31 6h138l6 7v106l-7 7H32l-7-7V13Z" fill="${enamel}" stroke="#070e1a" stroke-width="2"/>
 <path d="M36 12h128v108H36Z" fill="url(#${id}-weave)" stroke="#b7a26c" stroke-opacity=".5"/>
 <path d="M36 32V12h20M164 32V12h-20M36 100v20h20M164 100v20h-20" fill="none" stroke="#d6caab" stroke-width="2"/>
 <path d="M100 20l42 35-42 33-42-33Z" fill="${light}" stroke="#9aafc8" stroke-opacity=".25"/>
 <path d="M49 87h102v27H49Z" fill="#06111edb"/>
 ${crest}${jewel(100,122,3)}`;
 if(variant==='5') art=`
 <path d="M27 14h51l22-12 22 12h51l25 30-13 69-29 17H44l-29-17L2 44Z" fill="${metal}"/>
 <path d="M29 18h51l20-11 20 11h51l22 27-12 65-26 15H45l-26-15L7 45Z" fill="${enamel}" stroke="#061020" stroke-width="2"/>
 <path d="M32 22h43l25-13 25 13h43l19 24-10 57M23 103L13 46l19-24" fill="none" stroke="var(--gem)" stroke-opacity=".55"/>
 <ellipse cx="100" cy="50" rx="74" ry="56" fill="${light}"/>
 <path d="M12 53l14 15-4 25-6 8ZM188 53l-14 15 4 25 6 8Z" fill="var(--gem)" opacity=".55"/>
 <path d="M28 106l23 15h35l14 8 14-8h35l23-15" fill="none" stroke="#bccbd2"/>
 <path d="M36 119l-19-9 5-12 10 10M164 119l19-9-5-12-10 10" fill="#8fa6b8"/>
 ${jewel(100,12,5)}${jewel(100,122,3)}`;
 let compact='';
 if(variant==='1') compact=`<path d="M3 15h15L30 3l12 12h15v82H3Z" fill="${metal}"/><path d="M5 18h14L30 7l11 11h14v76H5Z" fill="${enamel}"/><path d="M8 22v36M52 22v36M10 90h40" stroke="#c0c5b5" stroke-opacity=".5"/>${jewel(30,13,3)}`;
 if(variant==='2') compact=`<path d="M3 6h54v83l-27 13L3 89Z" fill="${enamel}" stroke="${metal}" stroke-width="2"/><path d="M7 9h46v77l-23 11L7 86Z" fill="url(#${id}-weave)" stroke="#c6b381" stroke-opacity=".4"/><path d="M0 3h60v7H0Z" fill="${metal}"/>${jewel(30,94,3)}`;
 if(variant==='3') compact=`<path d="M30 2l7 8 12 4-2 8 9 9-9 9 2 8-12 4-7 8-7-8-12-4 2-8-9-9 9-9-2-8 12-4Z" fill="${metal}"/><circle cx="30" cy="31" r="23" fill="${enamel}" stroke="#d3d7d1"/><circle cx="30" cy="31" r="19" fill="${light}" stroke="#9e956b" stroke-opacity=".6"/><path d="M5 73h50l5 9-5 17H5L0 82Z" fill="${metal}"/><path d="M6 76h48l3 7-4 13H7L3 83Z" fill="${enamel}"/>${jewel(30,4,3)}`;
 if(variant==='4') compact=`<path d="M7 1h46l6 6v91l-6 5H7l-6-5V7Z" fill="${metal}"/><path d="M8 5h44l3 4v87l-4 3H9l-4-3V9Z" fill="${enamel}"/><path d="M10 21V10h8M50 21V10h-8M10 84v10h8M50 84v10h-8" stroke="#ceba82" fill="none"/>${jewel(30,10,3)}`;
 if(variant==='5') compact=`<path d="M14 10h8L30 1l8 9h8l13 20-6 63-11 10H18L7 93 1 30Z" fill="${metal}"/><path d="M15 13h9l6-7 6 7h9l10 19-5 58-10 10H20L10 90 5 32Z" fill="${enamel}"/><path d="M5 32l6 11-2 20-5-5ZM55 32l-6 11 2 20 5-5Z" fill="var(--gem)"/><path d="M15 92l8 6h14l8-6" fill="none" stroke="var(--gem)"/>${jewel(30,13,3)}`;
 return `<svg class="nav-material" viewBox="${view}" preserveAspectRatio="none" aria-hidden="true">${defs}${art}</svg><svg class="nav-material-compact" viewBox="0 0 60 104" preserveAspectRatio="none" aria-hidden="true">${defs.replaceAll(id,id+'-compact')}${compact.replaceAll(id,id+'-compact')}</svg>`;
}

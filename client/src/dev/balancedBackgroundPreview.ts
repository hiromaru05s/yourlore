import {DefaultLoadingManager} from 'three';
// Local preview only. Reuse current HOME and substitute only the two edited art plates.
if(!import.meta.env.DEV || !['localhost','127.0.0.1'].includes(location.hostname))throw Error('Local preview only');
const look=new URLSearchParams(location.search).get('look')??'balanced';
const folder=look==='original'?'toon-outline-20261026':look==='soft'?'toon-soft-20261026':'toon-balanced-20261026';
const base='/art/lounge/'+folder+'/';
DefaultLoadingManager.setURLModifier(url=>url.replace(/\/art\/lounge\/(?:toon-soft|toon-balanced)-20261026\/(library-wide|ivy)\.webp/,`${base}$1.webp`));
document.documentElement.style.setProperty('--menu-library-image',`url('${base}library-wide.webp')`,'important');
document.documentElement.dataset.previewArt=folder;
await import('./defaultUIFixture');

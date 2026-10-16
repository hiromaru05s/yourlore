import {createCofferCosmetics} from './coffer/runtime';
import {renderQuality} from '../renderDensity';
import {isElfweaveFurniture,isElfweaveSleeve} from '../../shared/elfweaveCosmetics';
import {createElfweaveCosmetics} from './elfweave/runtime';
import {createQuietLuxuryCosmetics} from './quietLuxury/runtime';
import {createAmethystCosmetics} from './amethyst/runtime';
import {createGoldfaultCosmetics} from './goldfault/runtime';
import {createGachaCosmetics} from './gachaTrio/runtime';
import {createLivingCosmetics} from './living/runtime';
import {createAtelierMaterials} from './materials';
import {themeFromUrl} from './sleeve';
import type {CosmeticPreviewAdapter} from '../cosmeticPreviewBridge';
/** Resolve each player's independently equipped sleeve and furniture. Pending
 * maps invalidate a single cached board frame; no account state is mutated. */
export function createEquippedCosmetics(root:HTMLElement):CosmeticPreviewAdapter{
 let dead=false;const quiet=createQuietLuxuryCosmetics(root),living=createLivingCosmetics(root),gacha=createGachaCosmetics(root),goldfault=createGoldfaultCosmetics(root),amethyst=createAmethystCosmetics(root),elfweave=createElfweaveCosmetics(root),coffer=createCofferCosmetics(root);
 const slots=(['self','opponent']as const).flatMap(side=>(['furniture','sleeve']as const).map(role=>({side,role,adapter:createAtelierMaterials(role),key:''})));
 return{
  get pixelRatio(){return coffer.pixelRatio??(renderQuality()!=='economy'&&[...root.querySelectorAll<HTMLElement>('#pile-myDeck,#pile-oppDeck')].some(el=>isElfweaveFurniture(el.dataset.material)||isElfweaveSleeve(el.dataset.sleeve))?Math.min(2,Math.sqrt(6000000/(innerWidth*innerHeight))):amethyst.pixelRatio);},
  get revision(){return coffer.revision+elfweave.revision+quiet.revision+amethyst.revision+goldfault.revision+gacha.revision+living.revision+slots.reduce((n,s)=>n+s.adapter.revision,0);},
  applyFurniture(model,el){coffer.applyFurniture(model,el);quiet.applyFurniture(model,el);living.applyFurniture(model,el);gacha.applyFurniture(model,el);goldfault.applyFurniture(model,el);elfweave.applyFurniture(model,el);amethyst.applyFurniture(model,el);for(const s of slots)if(s.role==='furniture'&&el.id.startsWith(s.side==='self'?'pile-my':'pile-opp'))s.adapter.applyFurniture(model,el);},
  decoratePile(pile,el){const cleanups=slots.filter(s=>el.id.startsWith(s.side==='self'?'pile-my':'pile-opp')).map(s=>s.adapter.decoratePile(pile,el));cleanups.push(coffer.decoratePile(pile,el),quiet.decoratePile(pile,el),living.decoratePile(pile,el),gacha.decoratePile(pile,el),goldfault.decoratePile(pile,el),amethyst.decoratePile(pile,el),elfweave.decoratePile(pile,el));return()=>cleanups.forEach(f=>f());},
  tick(now){let changed=coffer.tick(now);changed=quiet.tick(now)||changed;changed=living.tick(now)||changed;changed=gacha.tick(now)||changed;changed=goldfault.tick(now)||changed;changed=elfweave.tick(now)||changed;changed=amethyst.tick(now)||changed;for(const s of slots){const el=root.querySelector<HTMLElement>(s.side==='self'?'#pile-myDeck':'#pile-oppDeck'),theme=themeFromUrl(s.role==='sleeve'?el?.dataset.sleeve:el?.dataset.material),key=theme?.id??'default';if(key!==s.key){s.key=key;void s.adapter.select(theme??null,s.side).catch(()=>{if(!dead)console.warn('Cosmetic material unavailable:',key);});}changed=s.adapter.tick(now)||changed;}return changed;},
  render(renderer,camera,depth){coffer.render(renderer,camera,depth);for(const s of slots)s.adapter.render(renderer,camera,depth);quiet.render(renderer,camera,depth);living.render(renderer,camera,depth);gacha.render(renderer,camera,depth);goldfault.render(renderer,camera,depth);elfweave.render(renderer,camera,depth);amethyst.render(renderer,camera,depth);},
  dispose(){dead=true;coffer.dispose();quiet.dispose();living.dispose();gacha.dispose();goldfault.dispose();elfweave.dispose();amethyst.dispose();for(const s of slots)s.adapter.dispose();}
 };
}

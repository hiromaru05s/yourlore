import type {CeremonyKind} from './ceremonyScene';
/** Keep the ceremony/GPU module off the initial lounge path. Duel readiness warms it. */
export function mountCeremony(host:HTMLElement,kind:CeremonyKind){
 let stopped=false,disposeScene:(()=>void)|undefined;
 void import('./ceremonyScene').then(module=>{if(!stopped&&host.isConnected)disposeScene=module.mountCeremony(host,kind);}).catch(()=>{/* Engraved crest/portraits remain available without WebGL. */});
 return ()=>{if(stopped)return;stopped=true;disposeScene?.();};
}

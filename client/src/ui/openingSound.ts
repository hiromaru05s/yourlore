import {getSfxBus} from './sound';
type Cue='rise'|'toss'|'land'|'reveal'|'deal';
const files:Record<Cue,string[]>={rise:['duel-start'],toss:['coin'],land:['impact-1'],reveal:['turn'],deal:['draw-1','draw-2','draw-3']};
const buffers=new Map<string,Promise<AudioBuffer|null>>();
function load(file:string):Promise<AudioBuffer|null>{
  const bus=getSfxBus();if(!bus)return Promise.resolve(null);
  let p=buffers.get(file);if(!p){p=fetch(`/sfx/opening-v1/${file}.mp3`).then(r=>{if(!r.ok)throw new Error('audio');return r.arrayBuffer();}).then(b=>bus.context.decodeAudioData(b)).catch(()=>{buffers.delete(file);return null;});buffers.set(file,p);}return p;
}
export function warmOpeningSound():Promise<unknown>{return Promise.all(Object.values(files).flat().map(load));}
export function openingAudio(){
  const sources=new Set<AudioBufferSourceNode>();let stopped=false,index=0;
  void warmOpeningSound();
  return {
    play(cue:Cue){
      if(stopped)return;const bus=getSfxBus();if(!bus||bus.context.state!=='running')return;
      const list=files[cue],file=list[cue==='deal'?index++%list.length:0],requested=performance.now();
      void load(file).then(buffer=>{
        if(!buffer||stopped||performance.now()-requested>100)return;
        const source=bus.context.createBufferSource(),gain=bus.context.createGain();source.buffer=buffer;gain.gain.value=cue==='rise'?.55:cue==='land'?.7:.75;
        source.connect(gain).connect(bus.master);sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();gain.disconnect();};source.start();
      });
    },
    stop(){stopped=true;for(const source of sources){try{source.stop();}catch{/* already ended */}}sources.clear();},
  };
}

import type {GameEvent} from '../../client/src/shared/types';

/** Replace legacy names only in text, preserving the battle log's markup. */
export function publicNameEvents<T extends GameEvent>(events:T[], replacements:Map<string,string>):T[] {
  if(!replacements.size)return events;
  const pattern=new RegExp('(?<![A-Za-z0-9_])(?:'+[...replacements.keys()].sort((a,b)=>b.length-a.length).map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?![A-Za-z0-9_])','g');
  const text=(value:string)=>value.replace(pattern,name=>replacements.get(name)!);
  const html=(value:string)=>value.split(/(<[^>]*>)/g).map((part,index)=>index%2?part:text(part)).join('');
  return events.map(event=>{
    if(event.type==='log')return {...event,html:html(event.html),htmlJa:html(event.htmlJa)};
    if(event.type==='turnHeader')return {...event,name:replacements.get(event.name)??event.name};
    return event;
  });
}

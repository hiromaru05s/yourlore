import type {LessonRun} from './tutorialLesson';
import type {GameEvent} from './types';

export interface TutorialPresentation {
 handOpen:boolean;
 logOpen:boolean;
 inspection?:{uid:string;scroll:number};
}
export interface TutorialCheckpoint {
 run:Omit<LessonRun,'scenes'>;
 history:GameEvent[];
 presentation:TutorialPresentation;
}

/** Immutable entry states; rewinding discards the abandoned future branch. */
export class TutorialCheckpoints {
 private entries=new Map<number,TutorialCheckpoint>();
 save(index:number,run:LessonRun,history:GameEvent[],presentation:TutorialPresentation):void {
  if(this.entries.has(index))return;
  const {scenes:_,...data}=run;
  this.entries.set(index,structuredClone({run:data,history,presentation}));
 }
 previous(index:number):number {return Math.max(-1,...[...this.entries.keys()].filter(i=>i<index));}
 rewind(index:number):TutorialCheckpoint {
  const checkpoint=this.entries.get(index);if(!checkpoint)throw Error('Missing tutorial checkpoint');
  for(const key of this.entries.keys())if(key>index)this.entries.delete(key);
  return structuredClone(checkpoint);
 }
}

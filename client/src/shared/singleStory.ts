import { SINGLE_DIFFICULTIES } from './botNpcs';
export const NORMAL_EXAM_MATCHES = 2;
export const SINGLE_READ_PREFIX = 'story:single:v1:';
export const STORY_SCENES = ['1:before','1:after','2:before','2:after','3:before','3:after','4:before','4:after','5:before','5:after','aries:before','aries:after'] as const;
export type StoryScene = typeof STORY_SCENES[number];
export interface SingleProgress {
  tutorial: boolean;
  normalMatches: number;
  botClears: string[];
  ariesCleared: boolean;
  read: StoryScene[];
}
export const emptySingleProgress = ():SingleProgress => ({tutorial:false,normalMatches:0,botClears:[],ariesCleared:false,read:[]});
export const masterQualified = (s:SingleProgress):boolean => s.tutorial && s.normalMatches >= NORMAL_EXAM_MATCHES && SINGLE_DIFFICULTIES.every(d=>s.botClears.includes(d));
export function chapterObjective(s:SingleProgress, chapter:number):boolean {
  switch(chapter){
    case 1:return s.tutorial;
    case 2:return s.botClears.includes('easy');
    case 3:return s.normalMatches >= NORMAL_EXAM_MATCHES;
    case 4:case 5:return masterQualified(s);
    default:return false;
  }
}
export function chapterOpen(s:SingleProgress, chapter:number):boolean {
  if(!Number.isInteger(chapter)||chapter<1||chapter>5)return false;
  for(let i=1;i<chapter;i++)if(!chapterObjective(s,i)||!s.read.includes(`${i}:after` as StoryScene))return false;
  return true;
}
export function canReadScene(s:SingleProgress, scene:StoryScene):boolean {
  if(scene==='aries:before')return masterQualified(s)&&s.read.includes('5:before');
  if(scene==='aries:after')return s.ariesCleared;
  const [chapter,phase]=scene.split(':');
  return chapterOpen(s,Number(chapter))&&(phase==='before'||s.read.includes(`${chapter}:before` as StoryScene)&&chapterObjective(s,Number(chapter)));
}

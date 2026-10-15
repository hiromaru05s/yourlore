import type {LessonId} from '../tutorialSteps';
import type {PracticeScene} from './model';
import {basicScenes} from './basics';
import {resourceScenes} from './resources';
import {effectScenes} from './effects';
import {passiveScenes} from './passives';
import {victoryScenes} from './victory';
export function tutorialScenes(id:LessonId):PracticeScene[]{
 const scenes=basicScenes(id)??resourceScenes(id)??effectScenes(id)??passiveScenes(id)??victoryScenes(id);
 if(!scenes?.length)throw Error('Missing tutorial scenes: '+id);return scenes;
}

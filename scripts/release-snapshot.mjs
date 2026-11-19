import {execFileSync} from 'node:child_process';

/** Historical screenshots/videos are not build inputs. Keep all application
 * assets, source, tests and documentation text in the committed snapshot. */
export function checkoutReleaseSnapshot(snapshot,sha,cwd=process.cwd()){
 execFileSync('git',['worktree','add','--detach','--no-checkout',snapshot,sha],{cwd,stdio:'inherit'});
 const patterns=['/*',...['png','webp','gif','mp4','webm','jpg','jpeg','avif'].map(ext=>`!/docs/**/*.${ext}`)].join('\n')+'\n';
 execFileSync('git',['-C',snapshot,'sparse-checkout','set','--no-cone','--stdin'],{cwd,input:patterns,stdio:['pipe','inherit','inherit']});
 execFileSync('git',['-C',snapshot,'read-tree','-mu','HEAD'],{cwd,stdio:'inherit'});
}

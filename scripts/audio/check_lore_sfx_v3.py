from pathlib import Path
import json,subprocess,numpy as np
from scipy.io import wavfile
root=Path('client/public/sfx/lore-v3');manifest=json.loads((root/'manifest.json').read_text());report=[]
for name,clips in manifest['sounds'].items():
 for clip in clips:
  x=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(root/clip['file']),'-f','f32le','-ac','2','-ar','44100','-']),dtype='<f4').reshape(-1,2)
  peak=float(np.max(np.abs(x)));env=np.max(np.abs(x),axis=1);on=np.flatnonzero(env>peak*.06);active=x[env>peak*.01]
  record={'file':clip['file'],'duration':round(len(x)/44100,3),'peakDb':round(float(20*np.log10(peak)),2),'activeRmsDb':round(float(20*np.log10(np.sqrt(np.mean(active**2)))),2),'onsetMs':round(float(on[0]/44.1),1),'tailPeak':float(np.max(np.abs(x[-100:]))) }
  assert record['peakDb']<-3,(clip,record)
  assert record['onsetMs']<90,(clip,record)
  assert record['tailPeak']<.002,(clip,record)
  report.append(record)
Path('docs/ui-rework/2026-09-27-audio/checks/decoded-audio.json').write_text(json.dumps(report,indent=2)+'\n')
# A compact sequential review reel, at the game's default master level (0.7 squared).
sequence=['click-1','draw-1','shuffle','summon','attack-1','impact-1','facehit','mana','heal','trap','discard','diceRoll','duel-start','win','lose'];pieces=[];timeline=[];pos=0
for file in sequence:
 x=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(root/(file+'.mp3')),'-f','f32le','-ac','2','-ar','44100','-']),dtype='<f4').reshape(-1,2)
 timeline.append({'at':round(pos/44100,2),'cue':file});pieces.extend([x*.49,np.zeros((int(.55*44100),2))]);pos+=len(x)+int(.55*44100)
a=np.concatenate(pieces);wavfile.write('/tmp/lore-audio-reel.wav',44100,(a*32767).astype(np.int16))
subprocess.run(['ffmpeg','-v','error','-y','-i','/tmp/lore-audio-reel.wav','-codec:a','libmp3lame','-q:a','3','docs/ui-rework/2026-09-27-audio/review-sequence.mp3'],check=True)
Path('docs/ui-rework/2026-09-27-audio/review-sequence.json').write_text(json.dumps(timeline,indent=2)+'\n')
print('PASS',len(report),'MP3 decodes: peak below -3 dBFS, onset below 90 ms, clean tail; review reel',round(pos/44100,2),'s')

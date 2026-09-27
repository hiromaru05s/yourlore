"""Audit encoded, runtime-selected assets and render comparable BGM-context reels.
This measures signal integrity, not subjective listening quality.
"""
from pathlib import Path
import json,hashlib,subprocess,tempfile
import numpy as np
from scipy.io import wavfile
ROOT=Path(__file__).resolve().parents[2];PUBLIC=ROOT/'client/public';DOC=ROOT/'docs/ui-rework/2026-09-27-audio-v4';SR=44100
manifest=json.loads((PUBLIC/'sfx/lore-v4/manifest.json').read_text());old=json.loads((PUBLIC/'sfx/lore-v3/manifest.json').read_text());cache={};report=[]
def read(url):
 if url not in cache:
  cache[url]=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(PUBLIC/url.lstrip('/')),'-f','f32le','-ac','2','-ar',str(SR),'-']),dtype='<f4').reshape(-1,2)
 return cache[url]
for name,clips in manifest['sounds'].items():
 for i,clip in enumerate(clips):
  path=PUBLIC/clip['url'].lstrip('/');assert hashlib.sha256(path.read_bytes()).hexdigest()==clip['sha256']
  if name in ['click','pop','error']:
   assert clip['sha256']==old['sounds'][name][i]['sha256'];assert '/lore-v3/' in clip['url']
  else:assert clip['sha256']!=old['sounds'][name][i]['sha256'];assert '/lore-v4/' in clip['url']
  x=read(clip['url']);peak=float(np.max(np.abs(x)));env=np.max(np.abs(x),axis=1);on=np.flatnonzero(env>peak*.06);active=x[env>peak*.01]
  row={'file':clip['url'],'duration':round(len(x)/SR,3),'peakDb':round(float(20*np.log10(peak)),2),'activeRmsDb':round(float(20*np.log10(np.sqrt(np.mean(active**2)))),2),'onsetMs':round(float(on[0]/44.1),1),'tailPeak':float(np.max(np.abs(x[-100:]))),'dc':float(np.max(np.abs(x.mean(axis=0))))}
  assert row['peakDb']<-3,row;assert row['onsetMs']<90,row;assert row['tailPeak']<.002,row;assert row['dc']<.001,row
  # Mono fold-down must not lose the core (stereo widening must stay phone-friendly).
  mono=np.sqrt(np.mean(np.mean(x,axis=1)**2));stereo=np.sqrt(np.mean(x*x));assert mono/stereo>.55,(row,mono/stereo)
  report.append(row)
(DOC/'checks').mkdir(exist_ok=True)
(DOC/'checks/decoded-audio.json').write_text(json.dumps(report,indent=2)+'\n')
# Same user-provided battle BGM, exact runtime gain .3*.7^2; SFX .7^2.
# Includes attack launch -> contact, resource resolution, a spell, discard and outcome.
events=[(.5,'click'),(1.5,'draw'),(1.8,'draw'),(2.1,'draw'),(3.3,'summon'),(5.4,'attack'),(5.64,'impact'),(7.2,'attack'),(7.44,'facehit'),(9.0,'mana'),(11.7,'heal'),(14.4,'play'),(15.4,'damage'),(17.0,'trapSet'),(18.3,'trap'),(20.0,'death'),(21.5,'void'),(23.2,'discard'),(24.8,'diceRoll'),(25.75,'diceLand'),(27.0,'win')]
seconds=31;music=read('/music/poised-opening.mp3')[12*SR:(12+seconds)*SR]*.147
assert len(music)==seconds*SR
for version in [3,4]:
 x=music.copy();counter={}
 for at,name in events:
  rows=(manifest if version==4 else old)['sounds'][name];i=counter.get(name,0);counter[name]=i+1;clip=rows[i%len(rows)];url=clip.get('url','/sfx/lore-v3/'+clip['file']);a=read(url).copy()*.49
  if name=='attack':
   # Shared mixer starts its 35ms fade at contact, 240ms after launch.
   start=round(.24*SR);end=min(len(a),start+round(.035*SR));a[start:end]*=np.exp(-np.arange(end-start)/(.008*SR))[:,None];a[end:]=0
  start=round(at*SR);n=min(len(a),len(x)-start);x[start:start+n]+=a[:n]
 x[:SR]*=np.linspace(0,1,SR)[:,None];x[-SR:]*=np.linspace(1,0,SR)[:,None];assert np.max(np.abs(x))<.85
 with tempfile.TemporaryDirectory() as tmp:
  f=Path(tmp)/'mix.wav';wavfile.write(f,SR,(x*32767).astype(np.int16));subprocess.run(['ffmpeg','-v','error','-y','-i',str(f),'-codec:a','libmp3lame','-q:a','3','-map_metadata','-1',str(DOC/f'review-v{version}-with-bgm.mp3')],check=True)
(DOC/'review-timeline.json').write_text(json.dumps({'duration':seconds,'bgm':'poised-opening.mp3 at 12 seconds; gain .147','sfxGain':.49,'events':[{'at':at,'cue':name} for at,name in events]},indent=2)+'\n')
print('PASS: 40 decodes, 35 replaced duel clips, 5 identical UI clips; onset <90ms, peak <-3dBFS, clean tails/DC/mono; 31-second v3/v4 BGM-context comparisons')

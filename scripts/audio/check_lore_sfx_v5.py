from pathlib import Path
import hashlib,json,subprocess
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
data=json.loads((ROOT/'client/public/sfx/lore-v5/manifest.json').read_text())
report=[]
for name,clips in data['sounds'].items():
 for clip in clips:
  p=ROOT/'client/public'/clip['url'].lstrip('/')
  assert hashlib.sha256(p.read_bytes()).hexdigest()==clip['sha256']
  raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ac','2','-ar','44100','-'])
  x=np.frombuffer(raw,dtype='<f4').reshape(-1,2)
  peak=float(np.max(abs(x)));rms=float(np.sqrt(np.mean(x*x)))
  assert 0<rms and peak<.71,(name,peak,rms)
  onset=np.flatnonzero(np.max(abs(x),axis=1)>peak*.03)[0]/44100
  assert onset<.09,(name,onset)
  mono=x.mean(axis=1);assert np.sqrt(np.mean(mono*mono))>rms*.7
  assert np.max(abs(x[-220:]))<.01,(name,'tail')
  report.append(dict(name=name,file=clip['file'],seconds=len(x)/44100,peakDb=round(20*np.log10(peak),2),rmsDb=round(20*np.log10(rms),2),onsetMs=round(onset*1000,2),sha256=clip['sha256']))
assert len(data['sounds'])==35 and len(report)==41
out=ROOT/'docs/sound-redesign/2026-09-30/checks';out.mkdir(exist_ok=True)
(out/'signal.json').write_text(json.dumps(dict(scope='Signal validation; not subjective listening approval',clips=report),indent=2)+'\n')
print('PASS: 35 cues / 41 hashes, non-silent, no clipping, onset under 90ms, mono-compatible, quiet tails')

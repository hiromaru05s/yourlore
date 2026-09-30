"""Deterministic spell onset: breath-like lift, midrange bloom, soft resolving tail.
No paper flip, impact or high notification bell. numpy/scipy + ffmpeg required.
"""
from pathlib import Path
import hashlib,json,subprocess,tempfile
import numpy as np
from scipy import signal
from scipy.io import wavfile
ROOT=Path(__file__).resolve().parents[2]
SR=44100
out=ROOT/'client/public/sfx/lore-v6';out.mkdir(exist_ok=True)
rng=np.random.default_rng(610)
t=np.arange(round(.64*SR))/SR
x=np.zeros(len(t))
# A rounded rising tonal body: 70 ms of gathering, a clear bloom, then release.
for f,amp in [(220,.29),(330,.17),(440,.09),(660,.045)]:
 phase=2*np.pi*f*(t-.018*(1-np.exp(-t/.042)))
 env=(1-np.exp(-t/.027))*np.exp(-t/.105)
 x+=amp*env*np.sin(phase)
# Filtered air moves around the tonal body instead of a papery transient.
noise=signal.sosfilt(signal.butter(2,[450,5600],btype='bandpass',fs=SR,output='sos'),rng.normal(0,1,len(t)))
x+=noise*(1-np.exp(-t/.009))*np.exp(-t/.085)*.12
# A diffuse, soft harmonic tail, no struck resonator or metallic ding.
for f in [440,554.37,659.25]:
 env=(1-np.exp(-np.maximum(0,t-.045)/.035))*np.exp(-np.maximum(0,t-.045)/.16)
 x+=.038*env*np.sin(2*np.pi*f*t+0.22*np.sin(2*np.pi*3*t))
x=signal.sosfilt(signal.butter(2,90,btype='highpass',fs=SR,output='sos'),x)
stereo=np.column_stack((x,x));delay=round(.023*SR)
stereo[delay:,0]+=x[:-delay]*.085;stereo[delay:,1]+=x[:-delay]*.065
stereo*=10**(-11/20)/abs(stereo).max()
stereo[-round(.10*SR):]*=np.linspace(1,0,round(.10*SR))[:,None]**2
stereo[-220:]=0
with tempfile.TemporaryDirectory() as tmp:
 wav=Path(tmp)/'play.wav';wavfile.write(wav,SR,(stereo*32767).astype(np.int16))
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-codec:a','libmp3lame','-q:a','2','-map_metadata','-1',str(out/'play.mp3')],check=True)
row=dict(file='play.mp3',url='/sfx/lore-v6/play.mp3',seconds=.64,peakDb=-11,rmsDb=round(float(20*np.log10(np.sqrt(np.mean(stereo**2)))),2),sha256=hashlib.sha256((out/'play.mp3').read_bytes()).hexdigest(),sources=['original: rising harmonic bloom and filtered air'],decision='rebuilt spell onset revision 2',description='短い吸気から柔らかく広がる魔力の発動。紙音・高い通知音・打撃なし。')
(out/'manifest.json').write_text(json.dumps(dict(version=6,sounds={'play':[row]}),ensure_ascii=False,indent=2)+'\n')
for path in [ROOT/'client/public/sfx/lore-v5/manifest.json',ROOT/'docs/sound-redesign/2026-09-30/inventory.json']:
 manifest=json.loads(path.read_text());manifest['sounds']['play']=[row];manifest['status']='staging bank with spell revision 2';path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(row)

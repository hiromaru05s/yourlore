#!/usr/bin/env python3
"""Original metallic shakiin: bright scrape, struck partials and stereo reflections."""
import math, random, wave, struct, tempfile, subprocess
from pathlib import Path
sr=48000;duration=1.65;rng=random.Random(71);data=[];last=0
for i in range(round(sr*duration)):
 t=i/sr;n=rng.uniform(-1,1);hp=n-last;last=n
 attack=(1-math.exp(-t/.002));scrape=hp*.11*attack*math.exp(-t/.055)
 sweep=.13*math.sin(2*math.pi*(900*t+9000*t*t))*attack*math.exp(-t/.055)
 tone=0
 for f,a,tail in [(1850,.19,.40),(2931,.09,.28),(4217,.05,.19),(5630,.021,.13),(1100,.07,.18)]:
  tone+=a*math.sin(2*math.pi*f*t)*attack*math.exp(-t/tail)
 # Delayed reflected metal, no detached trailing chime.
 channels=[]
 for delay in [.031,.047]:
  x=t-delay;echo=.028*math.sin(2*math.pi*1850*x)*math.exp(-max(x,0)/.38)*min(1,max(0,x)/.003) if x>0 else 0
  channels.append((scrape+sweep+tone+echo)*min(1,(duration-t)/.08))
 data.append(channels)
peak=max(abs(v) for pair in data for v in pair);gain=.72/peak
out=Path(__file__).resolve().parents[2]/'client/public/sfx/chosen-v1/shakiin.mp3';out.parent.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
 p=Path(tmp)/'sound.wav'
 with wave.open(str(p),'wb') as w:
  w.setparams((2,2,sr,0,'NONE','not compressed'));w.writeframes(b''.join(struct.pack('<hh',*(round(v*gain*32767) for v in pair)) for pair in data))
 subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(p),'-c:a','libmp3lame','-b:a','192k',str(out)],check=True)
print('shakiin: 1.65s stereo, source peak -2.85 dBFS, onset at 0ms; original synthesis')

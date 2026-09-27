"""LORE v3: recorded paper/wood/cloth first, restrained glass for magic only.
Rebuild: python build_lore_sfx_v3.py (numpy, scipy, ffmpeg required).
Only the selected CC0 Kenney originals in docs are needed; no network access.
"""
from pathlib import Path
import hashlib, json, subprocess, tempfile
import numpy as np
from scipy import signal
from scipy.io import wavfile
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'docs/ui-rework/2026-09-27-audio/sources'
OUT=ROOT/'client/public/sfx/lore-v3'
OUT.mkdir(parents=True,exist_ok=True)
SR=44100
cache={}
used=set()

def sample(name,rate=1,low=70,high=7000,reverse=False):
 used.add(name)
 if name not in cache:
  raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(SRC/name),'-f','f32le','-ac','1','-ar',str(SR),'-'])
  x=np.frombuffer(raw,dtype='<f4').astype(float)
  # Remove source padding, retaining 2 ms ahead of the tactile transient.
  active=np.flatnonzero(np.abs(x)>max(.0005,np.max(np.abs(x))*.06))
  if len(active):x=x[max(0,active[0]-88):min(len(x),active[-1]+220)]
  cache[name]=x
 x=cache[name].copy()
 if reverse:x=x[::-1].copy()
 if rate!=1:x=signal.resample_poly(x,1000,int(rate*1000))
 x=signal.sosfilt(signal.butter(2,[low,high],btype='bandpass',fs=SR,output='sos'),x)
 peak=max(.001,np.max(np.abs(x)));x/=peak
 fade=min(len(x)//2,220);x[:fade]*=np.linspace(0,1,fade);x[-fade:]*=np.linspace(1,0,fade)
 return x

class Mix:
 def __init__(self,seconds):self.x=np.zeros((round(seconds*SR),2));self.sources=set()
 def add(self,name,at=0,gain=1,rate=1,pan=0,low=70,high=7000,reverse=False,stretch=1):
  self.sources.add(name)
  x=sample(name,rate,low,high,reverse)
  if stretch!=1:x=signal.resample(x,round(len(x)*stretch))
  i=round(at*SR);n=min(len(x),len(self.x)-i)
  if n>0:self.x[i:i+n]+=x[:n,None]*gain*np.array([np.cos((pan+1)*np.pi/4),np.sin((pan+1)*np.pi/4)])
 def glass(self,at=0,gain=.1,rate=1,pan=0):
  self.add('interface-sounds/glass_001.ogg',at,gain,rate,pan,high=4200)
 def finish(self,rms=-25,peak=-7,room=0):
  # Short early reflections, no long synthetic/noise reverb on repeated actions.
  dry=self.x.copy()
  for sec,g in [(.027,.23),(.053,.12),(.091,.055)]:
   d=round(sec*SR);self.x[d:]+=dry[:-d,::-1]*g*room
  self.x=signal.sosfilt(signal.butter(2,55,btype='highpass',fs=SR,output='sos'),self.x,axis=0)
  envelope=np.max(np.abs(self.x),axis=1);active=envelope>max(.00001,envelope.max()*.01)
  level=np.sqrt(np.mean(self.x[active]**2)) if active.any() else 1
  self.x*=min(10**(rms/20)/max(level,.0001),10**(peak/20)/max(np.max(np.abs(self.x)),.0001))
  n=min(len(self.x)//2,round(.035*SR));silence=round(.006*SR)
  self.x[-n:-silence]*=np.linspace(1,0,n-silence)[:,None]
  self.x[-silence:]=0
  return self.x

# Targets are intentionally different: frequently repeated UI/card cues stay dry and quiet.
DUR={'click':.13,'pop':.22,'error':.22,'draw':.30,'discard':.34,'play':.46,'summon':.65,'attack':.33,'impact':.37,'facehit':.49,'damage':.40,'death':.60,'trapSet':.36,'trap':.66,'mimic':.66,'buy':.49,'coin':.45,'mana-pay':.37,'mana':.91,'heal':1.05,'turn':.52,'match':.79,'void':.88,'shuffle':.94,'duel-start':1.32,'win':2.30,'lose':1.75,'drawGame':1.50,'coinToss':.28,'coinLand':.33,'diceRoll':1.08,'diceLand':.20}
manifest={}
for name,seconds in DUR.items():
 variants=3 if name in ['click','draw','attack','impact'] else 1
 for v in range(variants):
  m=Mix(seconds);rms=-24;peak=-7;room=0
  if name=='click':m.add(f'casino-audio/card-place-{v+1}.ogg',gain=.8,rate=1.15,high=4300);rms=-32;peak=-16
  elif name=='pop':m.add('casino-audio/card-slide-1.ogg',rate=1.35,high=4500);rms=-29;peak=-13
  elif name=='error':m.add('rpg-audio/bookClose.ogg',rate=1.4,high=1600);rms=-28;peak=-12
  elif name=='draw':m.add(f'casino-audio/card-slide-{v+2}.ogg',rate=1.12,high=6000);rms=-28;peak=-12
  elif name=='discard':
   m.add('casino-audio/card-slide-5.ogg',gain=.6,high=5200);m.add('casino-audio/card-place-2.ogg',.17,.4,high=4000);rms=-27;peak=-12
  elif name=='play':m.add('rpg-audio/bookFlip2.ogg',rate=1.15,high=5000);rms=-25;peak=-10
  elif name=='summon':
   m.add('rpg-audio/bookPlace2.ogg',gain=.8,rate=.85,high=4600);m.add('impact-sounds/impactSoft_heavy_000.ogg',gain=.35,rate=.85,high=1100);room=.24;rms=-23
  elif name=='attack':
   m.add(['rpg-audio/cloth1.ogg','rpg-audio/cloth3.ogg','rpg-audio/knifeSlice.ogg'][v],rate=1.15,high=4800);rms=-25;peak=-10
  elif name in ['impact','facehit','damage']:
   m.add(f'impact-sounds/impactPunch_medium_00{v}.ogg',gain=.65,rate=.88 if name=='facehit' else 1,high=4300)
   m.add('impact-sounds/impactWood_light_000.ogg',gain=.25,rate=.85,high=2400)
   if name=='facehit':m.add('impact-sounds/impactSoft_heavy_000.ogg',gain=.45,rate=.75,high=1300)
   rms=-23 if name!='damage' else -25;peak=-6 if name=='facehit' else -8;room=.15
  elif name=='death':
   m.add('rpg-audio/cloth4.ogg',gain=.7,rate=.8,high=4300);m.add('casino-audio/card-shove-2.ogg',.10,.3,rate=.9);rms=-27;peak=-11
  elif name=='trapSet':
   m.add('casino-audio/card-place-4.ogg',gain=.8,high=3200);m.add('rpg-audio/metalLatch.ogg',.06,.15,rate=.8,high=3200);rms=-27;peak=-12
  elif name in ['trap','mimic']:
   m.add('rpg-audio/metalLatch.ogg',gain=.55,rate=.85,high=3600);m.add('rpg-audio/bookOpen.ogg',.03,.55,rate=1.1,high=4200)
   m.glass(.04,.11,.64);rms=-24;peak=-8;room=.2
  elif name in ['buy','coin']:
   m.add('casino-audio/chips-collide-1.ogg',gain=.5,rate=.85,high=4000);m.add('casino-audio/card-place-1.ogg',.09,.4);rms=-26;peak=-10
  elif name=='mana-pay':
   m.add('interface-sounds/glass_001.ogg',gain=.18,rate=1.05,high=3500);m.add('casino-audio/card-slide-2.ogg',gain=.8,rate=1.25,high=4300);rms=-28;peak=-12
  elif name=='mana':
   # One clear onset at the crystal's arrival; an ascending fifth/octave releases behind it.
   m.glass(0,.55,.85,-.10);m.glass(.085,.24,1.275,.12);m.glass(.16,.12,1.70,0)
   m.add('rpg-audio/cloth2.ogg',gain=.08,rate=.75,high=1800);rms=-24;peak=-8;room=.5
  elif name=='heal':
   # Warmer and slower than mana; no repetitive four-note arpeggio.
   m.add('rpg-audio/cloth2.ogg',gain=.1,rate=.6,high=2000)
   m.glass(.01,.4,.55,-.10);m.glass(.13,.15,.825,.1);rms=-26;peak=-10;room=.65
  elif name in ['turn','match']:
   m.add('rpg-audio/bookFlip1.ogg',gain=.65,rate=1.3,high=4000);m.glass(.015,.12,.85 if name=='turn' else 1.05);rms=-26 if name=='turn' else -24;peak=-10;room=.2
  elif name=='void':
   m.add('rpg-audio/bookFlip3.ogg',gain=.75,rate=.7,high=4200,reverse=True);m.add('rpg-audio/cloth4.ogg',.09,.3,rate=.65,high=2300);rms=-27;peak=-11;room=.25
  elif name=='shuffle':m.add('casino-audio/card-shuffle.ogg',high=5200,rate=1.12);rms=-28;peak=-12
  elif name=='duel-start':
   m.add('rpg-audio/bookOpen.ogg',gain=.8,rate=.70,high=4800);m.glass(.07,.16,.64,-.12);m.glass(.24,.08,.96,.12);rms=-25;peak=-9;room=.55
  elif name in ['win','lose','drawGame']:
   m.add('rpg-audio/bookClose.ogg',gain=.28,rate=.65,high=2100)
   pitches=[.64,.80,.96,1.28] if name=='win' else [.64,.48] if name=='lose' else [.64,.96,.64]
   for j,pitch in enumerate(pitches):m.glass(.08+j*.18,.30/(1+j*.25),pitch,(-.12 if j%2==0 else .12))
   rms=-24 if name=='win' else -27;peak=-9;room=.8
  elif name=='coinToss':m.add('casino-audio/chips-collide-2.ogg',rate=1.25,high=4800);rms=-27;peak=-12
  elif name=='coinLand':m.add('casino-audio/chip-lay-1.ogg',rate=.9,high=3800);rms=-24;peak=-9
  elif name=='diceRoll':m.add('casino-audio/dice-throw-2.ogg',high=5300);rms=-27;peak=-11
  elif name=='diceLand':m.add('casino-audio/chip-lay-2.ogg',rate=1.1,high=4200);rms=-29;peak=-13
  a=m.finish(rms,peak,room);file=f'{name}{"-"+str(v+1) if variants>1 else ""}.mp3'
  with tempfile.TemporaryDirectory() as d:
   wav=Path(d)/'render.wav';wavfile.write(wav,SR,(np.clip(a,-1,1)*32767).astype(np.int16))
   subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-codec:a','libmp3lame','-q:a','3','-map_metadata','-1',str(OUT/file)],check=True)
  manifest.setdefault(name,[]).append({'file':file,'seconds':seconds,'peakDb':round(20*np.log10(np.max(np.abs(a))),2),'rmsDb':round(20*np.log10(np.sqrt(np.mean(a*a))),2),'sources':sorted(m.sources),'sha256':hashlib.sha256((OUT/file).read_bytes()).hexdigest()})
(OUT/'manifest.json').write_text(json.dumps({'version':3,'author':'LORE edits of selected Kenney CC0 recordings','sampleRate':SR,'channels':2,'sounds':manifest},indent=2)+'\n')
print(f'Rendered {sum(map(len,manifest.values()))} cues, {sum(p.stat().st_size for p in OUT.glob("*.mp3"))//1024} KiB, {len(used)} source recordings')

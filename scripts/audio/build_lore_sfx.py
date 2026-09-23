"""Original LORE sample bank. No third-party/game audio. Requires numpy/scipy/ffmpeg.
Layers: paper/air friction, inharmonic struck glass, restrained low resonance,
diffuse stereo room. Render offline to avoid audio-graph work during animation.
"""
from pathlib import Path
import hashlib,json,subprocess,tempfile
import numpy as np
from scipy import signal
from scipy.io import wavfile
SR=44100
OUT=Path(__file__).resolve().parents[2]/'client/public/sfx/lore-v2'
OUT.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(9232026)

def air(sec,low=180,high=4300,rise=.15,decay=2):
 t=np.arange(int(sec*SR))/SR;x=rng.normal(0,1,len(t));x=signal.sosfilt(signal.butter(3,[low,high],btype='bandpass',fs=SR,output='sos'),x)
 env=(1-np.exp(-t/max(.002,rise)))*np.exp(-t*decay/sec)*np.sin(np.pi*t/sec)**.7
 return x*env

def glass(f,sec=.7,soft=False):
 t=np.arange(int(sec*SR))/SR;x=np.zeros_like(t)
 # Bowl/harp modes, with independent damping instead of a pure electronic beep.
 for k,ratio in enumerate([1,2.006,2.71,4.09,5.43,6.77]):
  decay=sec/(1+k*.54);attack=.022 if soft else .0015
  x+=np.sin(2*np.pi*f*ratio*t+.003*np.sin(t*18))*(1-np.exp(-t/attack))*np.exp(-t*4.8/decay)/(1+k)**1.8
 return x*np.minimum(1,(sec-t)/.035)

def body(f,sec=.5):
 t=np.arange(int(sec*SR))/SR;phase=2*np.pi*(f*t+f*.22*.04*(1-np.exp(-t/.04)))
 return (np.sin(phase)+.19*np.sin(phase*2.01))*np.minimum(1,t/.005)*np.exp(-t*7/sec)

def pad(f,sec):
 t=np.arange(int(sec*SR))/SR;env=np.sin(np.pi*t/sec)**1.8
 return sum(np.sin(2*np.pi*f*(1+d)*t+k)*.16/(k+1) for k,d in enumerate([-.002,0,.0023]))*env

class Mix:
 def __init__(self,sec):self.a=np.zeros((int(sec*SR),2))
 def add(self,x,at=0,vol=1,pan=0):
  i=int(at*SR);n=min(len(x),len(self.a)-i)
  if n>0:self.a[i:i+n]+=x[:n,None]*vol*np.array([np.cos((pan+1)*np.pi/4),np.sin((pan+1)*np.pi/4)])
 def chord(self,notes,at=0,step=.065,vol=.13,sec=.9):
  for i,f in enumerate(notes):self.add(glass(f,sec),at+i*step,vol,(-.4+i/max(1,len(notes)-1)*.8))
 def finish(self,room=.18):
  # Early reflections retain tactile attack; decorrelated dense tail stays quiet.
  dry=self.a.copy();n=int(SR*.65)
  for ch in range(2):
   ir=rng.normal(0,1,n)*np.exp(-np.arange(n)/SR*9);ir=signal.sosfilt(signal.butter(2,3600,fs=SR,output='sos'),ir);ir/=np.sqrt(np.sum(ir**2))*5
   wet=signal.fftconvolve(dry[:,ch],ir)[:len(dry)];self.a[:,ch]+=wet*room
   for delay,gain in [( .029+ch*.005,.15),(.071-ch*.007,.08),(.119+ch*.013,.035)]:
    d=int(delay*SR);self.a[d:,ch]+=dry[:-d,1-ch]*gain*room
  self.a=signal.sosfilt(signal.butter(2,45,btype='highpass',fs=SR,output='sos'),self.a,axis=0)
  peak=np.max(np.abs(self.a));self.a*=min(2,.65/max(peak,.001));self.a=np.tanh(self.a*1.12)/1.12
  fade=min(len(self.a),int(.08*SR));self.a[-fade:]*=np.linspace(1,0,fade)[:,None]
  return self.a

DUR={'click':.28,'pop':.43,'play':.8,'draw':.46,'summon':1.15,'attack':.52,'impact':.68,'damage':.55,'heal':1.25,'death':1.15,'trapSet':.65,'trap':.95,'buy':.85,'mana-pay':.85,'coin':2.2,'mana':1.4,'maxhp':1.3,'turn':1.1,'match':1.2,'win':3.6,'lose':3.4,'drawGame':2.3,'error':.45,'facehit':.8,'mimic':.9,'void':1.85,'shuffle':1.5,'duel-start':3.4}
manifest={}
for name,dur in DUR.items():
 variants=3 if name in ['click','draw','attack','impact'] else 1
 for variant in range(variants):
  m=Mix(dur);pitch=1+(.009*(variant-1) if variants>1 else 0)
  if name in ['click','pop','error']:
   m.add(air(.09,800,3800,rise=.002),vol=.12);m.add(body(310 if name!='error' else 155,.14),vol=.13)
   m.add(glass((1174 if name=='pop' else 880 if name=='click' else 293)*pitch,.23,True),.015,.10)
  elif name=='draw':
   m.add(air(.22,700,6000,.015),vol=.18);m.add(air(.10,1700,7600,.002),.08,.11);m.add(glass(1046*pitch,.30,True),.04,.028)
  elif name in ['play','attack']:
   m.add(air(.40,130,4800,.14),vol=.5);m.add(air(.15,900,7000,.009),.18,.20)
   m.add(body(178*pitch,.23),.20,.09);m.add(glass(784*pitch,.42,True),.15,.055)
  elif name in ['summon','impact','damage','facehit']:
   strong=name in ['summon','facehit'];m.add(body((66 if strong else 98)*pitch,.52),.018,.68)
   m.add(air(.24,100,2600,.002),vol=.42);m.add(air(.09,1000,6500,.002),.01,.20)
   m.add(glass(236*pitch,.55),.024,.085);m.add(glass(594*pitch,.38),.042,.048)
   if strong:m.add(air(.65,150,2400,.09),.13,.25)
  elif name in ['death','void']:
   m.add(air(.8,90,2800,.08),vol=.34);m.add(glass(293,.8)[::-1],0,.16);m.add(body(73,.7),.56,.32)
   for j in range(6):m.add(glass(392*(1+j*.31),.32),.55+j*.06,.045,(-1)**j*.5)
   if name=='void':m.add(air(.43,500,5000,.16),1.25,.30);m.add(glass(587,.35),1.52,.08)
  elif name in ['trapSet','trap','mimic']:
   m.add(air(.22,500,5400,.025),vol=.23);m.add(glass(293,.55),.1,.12);m.add(glass(830,.5),.145,.08)
   if name!='trapSet':m.add(body(110,.5),.1,.36);m.add(air(.30,1200,6600,.07),.17,.28)
  elif name in ['buy','mana-pay']:
   m.add(air(.35,550,5500,.06),vol=.14);m.chord([1174,880,587],.03,.075,.12,.55);m.add(body(196,.30),.23,.10)
  elif name in ['mana','heal','maxhp']:
   m.add(air(.7,380,5100,.25),vol=.14)
   notes=[587,880,1174,1760] if name=='mana' else [440,660,880,1108]
   m.chord(notes,.12,.065,.10,.90)
   for f in notes[:2]:m.add(pad(f/2,1.05),.06,.25)
  elif name in ['turn','match']:
   m.add(air(.44,450,5200,.08),vol=.17);m.chord([440,660,880] if name=='turn' else [587,880,1174],.035,.07,.13,.8)
  elif name=='coin':
   for j,at in enumerate([.06,.24,.47,.77,1.10,1.37,1.62]):
    m.add(glass(1260+j*79,.4),at,.075/(1+j*.12),np.sin(j)*.4);m.add(body(510,.065),at,.10)
   m.chord([587,880,1174],1.65,.035,.10,.5)
  elif name=='shuffle':
   m.add(air(.6,280,4600,.23),0,.36);m.add(glass(587,.48)[::-1],.0,.11)
   m.chord([1174,1568,1760],.73,.045,.12,.64);m.add(body(147,.3),.76,.21);m.add(air(.26,900,6800,.005),.78,.17)
  elif name in ['win','lose','drawGame','duel-start']:
   notes=[293.66,369.99,440,587.33] if name=='win' else [146.83,174.61,220,293.66] if name=='lose' else [293.66,440,587.33]
   m.add(air(1.1,120,4400,.36),0,.38);m.add(body(73,1.0),.55,.40)
   for j,f in enumerate(notes):m.add(pad(f,dur-.4),.12,.75,-.45+j*.22)
   m.chord([f*2 for f in notes],.60,.085,.19,1.7)
   if name in ['win','duel-start']:m.chord([880,1174,1760],1.25,.13,.08,1.6)
   else:m.add(air(1.6,90,1800,.12),.65,.21)
  a=m.finish(.3 if dur>1 else .18);filename=f'{name}{"-"+str(variant+1) if variants>1 else ""}.mp3'
  with tempfile.TemporaryDirectory() as d:
   wav=Path(d)/'render.wav';wavfile.write(wav,SR,(a*32767).astype(np.int16))
   subprocess.run(['ffmpeg','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-q:a','3',str(OUT/filename)],check=True)
  manifest.setdefault(name,[]).append({'file':filename,'seconds':dur,'peakDb':round(20*np.log10(np.max(np.abs(a))),2),'rmsDb':round(20*np.log10(np.sqrt(np.mean(a*a))),2),'sha256':hashlib.sha256((OUT/filename).read_bytes()).hexdigest()})
(OUT/'manifest.json').write_text(json.dumps({'author':'LORE original procedural sound design','sampleRate':SR,'channels':2,'seed':9232026,'sounds':manifest},indent=2)+'\n')
print(f'Rendered {sum(map(len,manifest.values()))} original stereo cues ({sum(p.stat().st_size for p in OUT.glob("*.mp3"))//1024} KiB)')

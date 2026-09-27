"""Designed fantasy duel bank. UI recordings are preserved byte-for-byte in v3.
Offline reproducible build: numpy, scipy, ffmpeg. No runtime DSP/download service.
"""
from pathlib import Path
import hashlib,json,subprocess,tempfile
import numpy as np
from scipy import signal
from scipy.io import wavfile
ROOT=Path(__file__).resolve().parents[2]
DOC=ROOT/'docs/ui-rework/2026-09-27-audio-v4'
OUT=ROOT/'client/public/sfx/lore-v4';OUT.mkdir(parents=True,exist_ok=True)
SR=44100;CACHE={};USED=set()

def read(name):
 if name not in CACHE:
  path=(ROOT/'docs/ui-rework/2026-09-27-audio/sources'/name[7:]) if name.startswith('kenney/') else DOC/'sources'/name
  raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ac','2','-ar',str(SR),'-'])
  x=np.frombuffer(raw,dtype='<f4').reshape(-1,2).astype(float)
  env=np.max(np.abs(x),axis=1);on=np.flatnonzero(env>max(.0001,env.max()*.025))
  if len(on):x=x[max(0,on[0]-88):min(len(x),on[-1]+441)]
  CACHE[name]=x
 USED.add(name);return CACHE[name].copy()

class Mix:
 def __init__(self,duration):self.x=np.zeros((round(duration*SR),2));self.sources=set()
 def add(self,name,at=0,gain=1,rate=1,low=90,high=8000,length=None,offset=0,reverse=False,pan=0):
  self.sources.add(name);x=read(name)
  if reverse:x=x[::-1]
  if offset:x=x[round(offset*SR):]
  if rate!=1:x=signal.resample_poly(x,1000,round(rate*1000))
  x=signal.sosfilt(signal.butter(2,[low,high],btype='bandpass',fs=SR,output='sos'),x,axis=0)
  if length:x=x[:round(length*SR)]
  if not len(x):return
  # Equal active RMS, then deliberate relative layer levels: no peak-normalized hiss.
  env=np.max(np.abs(x),axis=1);active=x[env>env.max()*.05]
  level=max(.0001,np.sqrt(np.mean(active**2)));x*=min(.18/level,.85/max(.001,env.max()))
  fade=min(len(x)//3,round(.055*SR));attack=min(132,len(x)//3)
  x[:attack]*=np.linspace(0,1,attack)[:,None];x[-fade:]*=np.linspace(1,0,fade)[:,None]**1.5
  x*=np.array([min(1,1-pan),min(1,1+pan)])
  i=round(at*SR);n=min(len(x),len(self.x)-i)
  if n>0:self.x[i:i+n]+=x[:n]*gain
 def spell(self,i,**kw):self.add('jaggedstone/'+['magical_1_0','magical_2','magical_3','magical_4','magical_5','magical_6_0','magical_7_0'][i-1]+'.ogg',**kw)
 def rpg(self,name,**kw):self.add('rubberduck/'+name+'.ogg',**kw)
 def card(self,name,**kw):self.add('kenney/casino-audio/'+name+'.ogg',**kw)
 def finish(self,rms,peak,wet=0,decay=.55):
  dry=self.x.copy()
  if wet:
   # Dense, dark stereo room: diffuse tails instead of distinct slapback repeats.
   rng=np.random.default_rng(27419);n=round(decay*SR);t=np.arange(n)/SR
   ir=rng.normal(0,1,(n,2))*np.exp(-7*t/decay)[:,None]
   ir=signal.sosfilt(signal.butter(2,[220,4200],btype='bandpass',fs=SR,output='sos'),ir,axis=0)
   ir[:round(.009*SR)]=0;ir/=np.sqrt(np.sum(ir**2,axis=0))
   for ch in range(2):self.x[:,ch]+=signal.fftconvolve(dry[:,ch]*.8+dry[:,1-ch]*.2,ir[:,ch])[:len(dry)]*wet
  self.x=signal.sosfilt(signal.butter(2,65,btype='highpass',fs=SR,output='sos'),self.x,axis=0)
  env=np.max(np.abs(self.x),axis=1);active=self.x[env>env.max()*.025]
  self.x*=min(10**(rms/20)/max(.0001,np.sqrt(np.mean(active**2))),10**(peak/20)/max(.0001,env.max()))
  n=round(.095*SR);self.x[-n:]*=np.linspace(1,0,n)[:,None]**2;self.x[-441:]=0
  return self.x

DUR={'play':1.12,'summon':1.26,'attack':.36,'impact':.64,'damage':.66,'heal':1.85,'death':1.10,'trapSet':.55,'trap':1.18,'draw':.25,'buy':.72,'mana':1.48,'turn':.85,'win':2.75,'lose':2.25,'drawGame':2.00,'match':1.30,'coin':.48,'facehit':.85,'mimic':1.30,'mana-pay':.55,'void':1.22,'shuffle':.80,'duel-start':1.65,'discard':.49,'coinToss':.32,'coinLand':.42,'diceRoll':1.08,'diceLand':.28}
old=json.loads((ROOT/'client/public/sfx/lore-v3/manifest.json').read_text())
sounds={name:[dict(row,url='/sfx/lore-v3/'+row['file']) for row in old['sounds'][name]] for name in ['click','pop','error']}
for name,seconds in DUR.items():
 variants=3 if name in ['draw','attack','impact'] else 1
 for v in range(variants):
  m=Mix(seconds);rms=-24;peak=-7;wet=.18;decay=.5
  if name=='draw':
   m.card(f'card-slide-{v+2}',rate=1.3,gain=.65,high=5600,length=.20);rms=-31;peak=-15;wet=0
  elif name=='shuffle':
   m.card('card-shuffle',rate=1.3,gain=.7,high=5200,length=.72);rms=-30;peak=-14;wet=0
  elif name=='discard':
   m.card('card-slide-5',rate=.95,gain=.6,length=.25,high=4400);m.rpg('book_01',at=.13,gain=.22,rate=1.35,length=.22,high=2800);rms=-29;peak=-13;wet=.05
  elif name=='play':
   m.spell(1,rate=1.22,gain=.85,length=.82,high=5800);m.rpg('book_02',gain=.12,rate=1.5,length=.17,high=3200);rms=-25;peak=-9;wet=.20
  elif name=='summon':
   m.rpg('spell_fire_06',gain=.65,rate=.68,length=.55,high=3300);m.spell(2,gain=.55,rate=.88,length=.85,high=5200);m.spell(5,at=.04,gain=.15,high=5800,length=.48);rms=-23;peak=-6;wet=.24;decay=.65
  elif name=='attack':
   m.rpg(f'blade_0{v+1}',rate=[1.10,1.02,.96][v],gain=.85,length=.29,high=6000);m.spell(7,gain=.14,offset=.22,rate=1.6,length=.23,high=4600);rms=-25;peak=-10;wet=.03
  elif name in ['impact','damage','facehit']:
   m.rpg(['spell_fire_06','spell_fire_04','spell_02'][v],gain=.65,rate=.83 if name!='facehit' else .67,length=.27,high=3900)
   m.spell(5,gain=.40,offset=.18,rate=1.1+v*.04,length=.28,high=6400)
   m.rpg('metal_01',gain=.07,rate=.75,length=.17,high=3500)
   if name=='facehit':m.spell(4,gain=.36,offset=.25,rate=.72,length=.53,high=2100,low=65)
   rms=-23 if name!='damage' else -25;peak=-6 if name=='facehit' else -8;wet=.15
  elif name=='mana':
   # Bright open-fifth spell resonance, immediate arrival followed by expanding release.
   m.rpg('item_gem_01',gain=.20,high=6500,length=.12)
   m.spell(3,gain=.74,rate=1.0,length=1.15,high=6600)
   m.spell(6,at=.09,gain=.24,rate=1.5,length=.77,high=7000,pan=.14)
   rms=-23;peak=-7;wet=.28;decay=.7
  elif name=='heal':
   m.spell(6,gain=.75,rate=.75,length=1.38,high=4100)
   m.spell(3,at=.02,gain=.23,rate=.75,length=1.4,high=3300,pan=-.10)
   rms=-26;peak=-10;wet=.40;decay=.8
  elif name=='mana-pay':
   m.spell(3,gain=.5,rate=1.7,length=.31,reverse=True,high=5000);m.rpg('item_gem_01',at=.03,gain=.15,length=.1,high=4500);rms=-29;peak=-12;wet=.08
  elif name=='trapSet':
   m.rpg('chain_02',gain=.4,rate=.85,length=.25,high=2600);m.spell(4,gain=.22,rate=1.5,length=.35,high=2100);rms=-28;peak=-11;wet=.08
  elif name in ['trap','mimic']:
   m.spell(4,gain=.65,offset=.2,rate=1.0 if name=='trap' else .82,length=.8,high=5200)
   m.rpg('chain_02',gain=.24,rate=1.3,length=.21,high=5800)
   m.spell(7,at=.035,gain=.18,rate=1.5,length=.55,reverse=True,high=4900);rms=-24;peak=-7;wet=.23
  elif name in ['death','void']:
   m.spell(7,gain=.44,rate=.72,length=.72,reverse=True,high=4000)
   m.spell(4,gain=.5,rate=.65,offset=.15,length=.72,high=2200)
   if name=='void':m.rpg('book_03',gain=.14,reverse=True,rate=1.3,length=.32,high=3400)
   rms=-27;peak=-10;wet=.30;decay=.65
  elif name in ['buy','coin']:
   m.rpg('item_coins_02' if name=='buy' else 'item_coins_01',gain=.7,rate=1.05,length=.43,high=5900)
   if name=='buy':m.spell(3,at=.03,gain=.16,rate=1.5,length=.42,high=4900)
   rms=-28;peak=-12;wet=.07
  elif name in ['turn','match','duel-start']:
   m.spell(1,gain=.55,rate=1.3 if name=='turn' else .95,length=.65 if name=='turn' else 1.12,high=4900)
   m.spell(3,gain=.3,rate=.75 if name=='turn' else 1,length=.6 if name=='turn' else 1.1,high=5100)
   if name=='duel-start':m.rpg('spell_fire_06',gain=.24,rate=.65,length=.44,high=1300)
   rms=-27 if name=='turn' else -25;peak=-10 if name=='turn' else -8;wet=.28;decay=.7
  elif name in ['win','lose','drawGame']:
   if name=='win':
    m.spell(3,gain=.65,rate=.75,length=1.85,high=6600)
    m.spell(6,at=.18,gain=.3,rate=1.125,length=1.25,high=6000,pan=.1)
    m.spell(3,at=.50,gain=.20,rate=1.5,length=1.2,high=6000,pan=-.1)
   elif name=='lose':
    m.spell(4,gain=.48,rate=.65,length=1.7,high=2300)
    m.spell(7,gain=.22,rate=.60,length=1.45,reverse=True,high=2600)
   else:
    m.spell(1,gain=.45,rate=.72,length=1.5,high=3500);m.spell(6,gain=.18,rate=.75,length=1.4,high=3200)
   rms=-24 if name=='win' else -27;peak=-8 if name=='win' else -11;wet=.38;decay=.85
  elif name=='coinToss':m.rpg('item_coins_03',gain=.55,rate=1.6,length=.24,high=6000);rms=-29;peak=-13;wet=.04
  elif name=='coinLand':m.rpg('item_coins_01',gain=.65,rate=.9,length=.30,high=4900);rms=-26;peak=-10;wet=.10
  elif name=='diceRoll':m.card('dice-throw-2',gain=.7,high=4300,length=.97);rms=-29;peak=-12;wet=.04
  elif name=='diceLand':m.card('chip-lay-2',gain=.7,rate=.82,length=.20,high=3300);rms=-27;peak=-11;wet=.06
  a=m.finish(rms,peak,wet,decay);file=f'{name}{"-"+str(v+1) if variants>1 else ""}.mp3'
  with tempfile.TemporaryDirectory() as d:
   wav=Path(d)/'render.wav';wavfile.write(wav,SR,(np.clip(a,-1,1)*32767).astype(np.int16))
   subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-codec:a','libmp3lame','-q:a','3','-map_metadata','-1',str(OUT/file)],check=True)
  sounds.setdefault(name,[]).append({'file':file,'url':'/sfx/lore-v4/'+file,'seconds':seconds,'peakDb':round(float(20*np.log10(np.max(np.abs(a)))),2),'rmsDb':round(float(20*np.log10(np.sqrt(np.mean(a*a)))),2),'sources':sorted(m.sources),'sha256':hashlib.sha256((OUT/file).read_bytes()).hexdigest()})
(OUT/'manifest.json').write_text(json.dumps({'version':4,'sampleRate':SR,'channels':2,'preservedUiVersion':3,'sounds':sounds},indent=2)+'\n')
print('Rendered',sum(len(v) for k,v in sounds.items() if k not in ['click','pop','error']),'new clips;',sum(p.stat().st_size for p in OUT.glob('*.mp3'))//1024,'KiB;',len(USED),'source recordings; approved UI unchanged')

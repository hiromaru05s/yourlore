"""TCG revision: distinct action/contact/body; no v4 magical-library layers.
Run with Python + numpy/scipy and ffmpeg. All output is deterministic.
"""
from pathlib import Path
import hashlib,json,subprocess,tempfile
import numpy as np
from scipy import signal
from scipy.io import wavfile

ROOT=Path(__file__).resolve().parents[2]
DOC=ROOT/'docs/sound-redesign/2026-09-30'
OUT=ROOT/'client/public/sfx/lore-v5'
OUT.mkdir(parents=True,exist_ok=True)
SR=44100
K=ROOT/'docs/ui-rework/2026-09-27-audio/sources'
NEW=DOC/'sources'
CACHE={}
def read(name):
 if name not in CACHE:
  p=(NEW/name[4:]) if name.startswith('new/') else K/name
  raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ac','1','-ar',str(SR),'-'])
  x=np.frombuffer(raw,dtype='<f4').astype(float)
  active=np.flatnonzero(abs(x)>max(.0001,abs(x).max()*.025))
  if len(active):x=x[max(0,active[0]-88):min(len(x),active[-1]+441)]
  CACHE[name]=x
 return CACHE[name].copy()

class Mix:
 def __init__(self,duration,seed=1):self.x=np.zeros(round(duration*SR));self.sources=set();self.rng=np.random.default_rng(seed)
 def put(self,x,at=0,gain=1):
  i=round(at*SR);n=min(len(x),len(self.x)-i)
  if n>0:self.x[i:i+n]+=x[:n]*gain
 def sample(self,name,at=0,gain=1,rate=1,low=90,high=11000,length=None,reverse=False):
  self.sources.add(name);x=read(name)
  if reverse:x=x[::-1]
  if rate!=1:x=signal.resample_poly(x,1000,round(rate*1000))
  x=signal.sosfilt(signal.butter(2,[low,high],btype='bandpass',fs=SR,output='sos'),x)
  if length:x=x[:round(length*SR)]
  if not len(x):return
  x/=max(.001,abs(x).max())
  a=min(44,len(x)//4);z=min(round(.018*SR),len(x)//3)
  x[:a]*=np.linspace(0,1,a);x[-z:]*=np.linspace(1,0,z)**2
  self.put(x,at,gain)
 def body(self,f=100,d=.18,gain=.2,at=0):
  self.sources.add('original: damped impact body')
  t=np.arange(round(d*SR))/SR
  # A short falling pressure pulse; harmonics retain body on phone speakers.
  phase=2*np.pi*(f*t+f*.85*.023*(1-np.exp(-t/.023)))
  x=(np.sin(phase)+.32*np.sin(phase*2)+.12*np.sin(phase*3))*(1-np.exp(-t/.0015))*np.exp(-t/(d/5))
  x[-min(220,len(x)):]*=np.linspace(1,0,min(220,len(x)))
  self.put(x,at,gain)
 def air(self,d=.16,gain=.15,at=0,low=350,high=6500,rise=False):
  self.sources.add('original: shaped air texture')
  n=round(d*SR);t=np.arange(n)/SR;x=self.rng.normal(0,1,n)
  x=signal.sosfilt(signal.butter(2,[low,high],btype='bandpass',fs=SR,output='sos'),x)
  env=(np.sin(np.pi*t/d)**1.8 if rise else (1-np.exp(-t/.003))*np.exp(-t/(d/5)))
  x*=env;x/=max(.001,abs(x).max());x[-220:]*=np.linspace(1,0,220)
  self.put(x,at,gain)
 def bell(self,f=780,d=.25,gain=.1,at=0,wood=False):
  self.sources.add('original: damped resonator')
  t=np.arange(round(d*SR))/SR;x=np.zeros(len(t))
  for ratio,amp,decay in ([(1,1,1),(2.76,.19,.55),(5.4,.035,.25)] if wood else [(1,1,1),(2.01,.23,.55),(3.93,.07,.28)]):
   x+=amp*np.sin(2*np.pi*f*ratio*t)*np.exp(-t/(d*.23*decay))
  x*=1-np.exp(-t/.003);x[-220:]*=np.linspace(1,0,220)
  self.put(x,at,gain)
 def finish(self,peak=-7,rms=-23,room=0):
  x=signal.sosfilt(signal.butter(2,42,btype='highpass',fs=SR,output='sos'),self.x)
  # Only two quiet early reflections; no diffuse convolution wash.
  stereo=np.column_stack([x,x])
  for seconds,gain in [(.026,.14),(.043,.08)]:
   shift=round(seconds*SR);stereo[shift:,0]+=x[:-shift]*gain*room;stereo[shift:,1]+=x[:-shift]*gain*room*.78
  active=np.max(abs(stereo),axis=1)>abs(stereo).max()*.035
  rms_now=np.sqrt(np.mean(stereo[active]**2))
  stereo*=min(10**(peak/20)/max(.0001,abs(stereo).max()),10**(rms/20)/max(.0001,rms_now))
  n=min(round(.032*SR),len(x)//4);stereo[-n:]*=np.linspace(1,0,n)[:,None]**2;stereo[-220:]=0
  return stereo

dur={'attack':.25,'impact':.29,'facehit':.40,'damage':.30,'summon':.58,'mimic':.46,'play':.42,'heal':.78,'death':.42,'trapSet':.25,'trap':.40,'mana-pay':.25,'mana':.65,'turn':.43,'win':1.65,'lose':1.30,'drawGame':1.1,'void':.54,'shuffle':.70,'duel-start':.85,'discard':.30,'coinToss':.23,'coinLand':.27,'diceRoll':.78,'diceLand':.20,'rankUp':.40,'rankDown':.42,'rankPromote':.88}
descriptions={
'attack':'短い風切り。接触前の動きだけを伝える。', 'impact':'鋭い打撃の芯と小さな低域。カード同士の接触。',
'facehit':'命中より太い低中域の打撃。シーカーへ通った攻撃。','damage':'短く詰まった鈍い打撃。効果による精神力ダメージ。',
'summon':'低い着地の芯に、短い空気の広がり。場へ実体が来る重さ。','mimic':'木の箱・留め具が跳ね、重く着地する。',
'play':'カードのフリップと短い発動の抜け。長い魔法音は使わない。','heal':'柔らかい上昇の余韻。硬い打撃成分を入れない。',
'death':'砕ける短い打撃から紙の消失へ落とす。','trapSet':'カードを伏せ、留め具が小さく締まる。','trap':'鋭い解除のスナップと短い振り抜き。',
'mana-pay':'小さな結晶の接触と短い抜け。逆再生の長い唸りを除いた。','mana':'結晶の到達から上へ開く短い共鳴。',
'turn':'控えめな木質2音で自分の番を知らせる。','win':'明るく開く短い決着のフレーズ。','lose':'低い着地から音程が沈む短い決着。','drawGame':'上昇も下降もしない落ち着いた区切り。',
'void':'短い吸引が細くなって閉じる。','shuffle':'カード束を混ぜる紙音。長い余韻なし。','duel-start':'低い区切りと短い上昇。通常開始BGMとは別の予備SE。',
'discard':'一枚を滑らせて置く軽い紙音。','coinToss':'硬貨を弾く短い金属のきらめき。','coinLand':'卓上へ硬貨が触れる小さな打点。',
'diceRoll':'ダイスが短く転がる物理音。','diceLand':'ダイスが止まる硬い一打。','rankUp':'短く上がる木質の2音。','rankDown':'短く下がる木質の2音。','rankPromote':'4段階で上がる短い昇格音。',
}
old=json.loads((ROOT/'client/public/sfx/lore-v4/manifest.json').read_text())['sounds']
manifest={}
# User-approved recordings: byte-identical URLs, not processed copies.
for name in ['click','pop','error','coin','match','draw','buy']:
 rows=old[name]
 if name=='draw':rows=[x for x in rows if x['file']=='draw-3.mp3']
 manifest[name]=[dict(x,decision='keep approved draw 3 only' if name=='draw' else 'keep home/approved recording') for x in rows]
for name,seconds in dur.items():
 for v in range(3 if name in ['attack','impact'] else 1):
  m=Mix(seconds,200+v);peak=-8;rms=-24;room=0
  if name=='attack':
   m.sample(f'new/swishes/swish-{[5,7,9][v]}.wav',gain=.75,rate=[.8,.86,.9][v],high=9500)
   m.air(.19,.16,low=450,high=6500,rise=True);peak=-11;rms=-26
  elif name in ['impact','facehit','damage']:
   m.sample(f'new/thwack/thwack-{["03","02","06"][v]}.wav',gain=.76,rate=.92 if name=='impact' else .75,high=8500,length=.20)
   m.sample('impact-sounds/impactPunch_medium_001.ogg',gain=.26,rate=.8,low=90,high=2700,length=.19)
   m.body(108 if name=='impact' else 78,.18 if name=='impact' else .28,.30 if name=='facehit' else .19)
   if name=='facehit':m.sample('impact-sounds/impactSoft_heavy_000.ogg',gain=.30,rate=.8,low=60,high=1200,length=.24)
   peak=-6 if name=='facehit' else -8;rms=-21 if name!='damage' else -24;room=.12
  elif name=='summon':
   m.sample('new/thwack/thwack-10.wav',gain=.49,rate=.64,low=65,high=2400,length=.35)
   m.sample('rpg-audio/bookPlace2.ogg',gain=.27,rate=.84,high=5000,length=.2)
   m.body(72,.34,.47);m.air(.34,.19,at=.008,low=160,high=4200)
   m.bell(392,.40,.07,at=.035,wood=True);peak=-6;rms=-22;room=.25
  elif name=='mimic':
   m.sample('rpg-audio/bookOpen.ogg',gain=.5,rate=1.25,length=.15)
   m.sample('rpg-audio/metalLatch.ogg',gain=.25,at=.04,length=.12)
   m.sample('new/thwack/thwack-05.wav',gain=.42,at=.04,rate=.8,high=5000,length=.27);m.body(120,.2,.17,at=.04)
  elif name=='play':
   m.sample('rpg-audio/bookFlip2.ogg',gain=.45,rate=1.22,high=6000,length=.19)
   m.air(.23,.22,at=.025,low=750,high=7500);m.bell(1046,.28,.065,at=.03);peak=-10;rms=-27
  elif name=='heal':
   m.air(.48,.08,low=800,high=4300,rise=True)
   for i,f in enumerate([523.25,659.25,783.99]):m.bell(f,.47,.12-i*.014,at=i*.09)
   peak=-12;rms=-28;room=.15
  elif name=='death':
   m.sample('new/thwack/thwack-04.wav',gain=.42,rate=1.3,high=6700,length=.18)
   m.sample('casino-audio/card-shove-2.ogg',gain=.36,at=.06,rate=.85,length=.28)
   m.air(.25,.14,at=.05,low=450,high=6500);peak=-10;rms=-27
  elif name=='trapSet':
   m.sample('casino-audio/card-place-4.ogg',gain=.5,high=4500,length=.17)
   m.sample('rpg-audio/metalLatch.ogg',gain=.21,at=.015,rate=1.3,length=.16);peak=-12;rms=-29
  elif name=='trap':
   m.sample('rpg-audio/metalLatch.ogg',gain=.45,rate=1.12,length=.17)
   m.sample('new/swishes/swish-4.wav',gain=.37,at=.045,rate=.72)
   m.sample('new/thwack/thwack-03.wav',gain=.28,at=.07,high=6600,length=.13);peak=-8;rms=-24
  elif name=='mana-pay':
   m.sample('interface-sounds/glass_001.ogg',gain=.28,rate=1.22,low=700,high=6200,length=.11)
   m.sample('casino-audio/chip-lay-2.ogg',gain=.22,high=4500,length=.09)
   m.air(.12,.08,at=.045,low=1800,high=7200);peak=-15;rms=-31
  elif name=='mana':
   m.sample('interface-sounds/glass_001.ogg',gain=.18,high=6200,length=.15)
   for i,f in enumerate([660,990,1320]):m.bell(f,.35,.14-i*.035,at=i*.065)
   m.air(.2,.07,at=.06,rise=True);peak=-10;rms=-25
  elif name in ['turn','rankUp','rankDown','rankPromote','win','lose','drawGame','duel-start']:
   notes={'turn':[440,659.25],'rankUp':[523.25,659.25],'rankDown':[440,349.23],'rankPromote':[523.25,659.25,783.99,1046.5],'win':[261.63,392,523.25,659.25,783.99],'lose':[261.63,207.65,130.81],'drawGame':[293.66,440,293.66],'duel-start':[196,293.66,392]}[name]
   gap=.085 if name in ['turn','rankUp','rankDown'] else .12
   d=.28 if seconds<.5 else .55 if seconds<1 else .85
   for i,f in enumerate(notes):m.bell(f,d,.23 if name=='win' else .18,at=i*gap,wood=True)
   if name in ['win','lose','duel-start']:m.body(92,.25,.09)
   peak=-10 if name in ['win','duel-start'] else -13;rms=-26 if name=='win' else -29;room=.18
  elif name=='void':
   m.sample('new/swishes/swish-9.wav',gain=.35,rate=.52,reverse=True,low=260,high=4900)
   m.air(.34,.22,low=260,high=4800,rise=True);m.sample('casino-audio/card-shove-2.ogg',gain=.18,at=.20,rate=1.4,length=.16)
   peak=-12;rms=-28
  elif name=='shuffle':
   m.sample('casino-audio/card-shuffle.ogg',gain=.55,rate=1.25,high=7200,length=.63);peak=-14;rms=-29
  elif name=='discard':
   m.sample('casino-audio/card-slide-5.ogg',gain=.4,rate=1.25,length=.15)
   m.sample('casino-audio/card-place-2.ogg',gain=.30,at=.115,rate=1.15,length=.14);peak=-14;rms=-30
  elif name in ['coinToss','coinLand']:
   m.sample('casino-audio/chips-collide-1.ogg',gain=.43,rate=1.4 if name=='coinToss' else .9,length=.16,low=400,high=9000)
   if name=='coinLand':m.sample('casino-audio/chip-lay-1.ogg',gain=.25,rate=1.1,high=4800,length=.14)
   peak=-13;rms=-29
  elif name=='diceRoll':
   m.sample('casino-audio/dice-throw-2.ogg',gain=.7,rate=1.1,high=8000,length=.7);peak=-14;rms=-29
  elif name=='diceLand':
   m.sample('casino-audio/chip-lay-2.ogg',gain=.58,rate=1.08,high=6700,length=.15);peak=-12;rms=-28
  a=m.finish(peak,rms,room);filename=name+(f'-{v+1}' if name in ['attack','impact'] else '')+'.mp3'
  with tempfile.TemporaryDirectory() as tmp:
   wav=Path(tmp)/'clip.wav';wavfile.write(wav,SR,(a*32767).astype(np.int16))
   subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-codec:a','libmp3lame','-q:a','2','-map_metadata','-1',str(OUT/filename)],check=True)
  manifest.setdefault(name,[]).append(dict(file=filename,url='/sfx/lore-v5/'+filename,seconds=seconds,peakDb=round(float(20*np.log10(abs(a).max())),2),rmsDb=round(float(20*np.log10(np.sqrt(np.mean(a*a)))),2),sha256=hashlib.sha256((OUT/filename).read_bytes()).hexdigest(),sources=sorted(m.sources),decision='rebuilt',description=descriptions[name]))
payload=dict(version=5,status='staging adoption authorized 2026-09-30',sampleRate=SR,sounds=manifest)
(OUT/'manifest.json').write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n')
(DOC/'inventory.json').write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n')
used={s for clips in manifest.values() for c in clips for s in c.get('sources',[]) if s.startswith('new/')}
source_files=[]
for name in sorted(used):
 p=NEW/name[4:];source_files.append(dict(path=name[4:],sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
(NEW/'manifest.json').write_text(json.dumps(dict(license='CC0-1.0',packs=[dict(author='artisticdude',url='https://opengameart.org/content/swishes-sound-pack'),dict(author='Jordan Irwin (AntumDeluge)',url='https://opengameart.org/content/thwack-sounds')],usedFiles=source_files),indent=2)+'\n')
print(f'{len(manifest)} cues / {sum(map(len,manifest.values()))} selected clips / {len(dur)} rebuilt cues')

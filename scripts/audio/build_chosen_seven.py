"""Seven sample-led metallic completions. CC0 recordings; no oscillator tones."""
from pathlib import Path
import numpy as np, subprocess, json, hashlib, tempfile, wave
R=Path(__file__).resolve().parents[2];O=R/'client/src/dev/chosen-sound-seven/assets';D=R/'docs/sound-study/2026-10-08-chosen-seven';SR=48000
B=R/'docs/ui-rework/2026-09-27-audio-v4/sources/rubberduck';K=R/'docs/ui-rework/2026-09-27-audio/sources';S=R/'docs/sound-redesign/2026-09-30/sources/swishes';M=D/'sources';used={}
def filt(x,lo,hi):
 n=1<<int(np.ceil(np.log2(len(x)*2)));f=np.fft.rfftfreq(n,1/SR);hp=(f/np.maximum(lo,1))**4;lp=(f/hi)**6;gain=hp/(1+hp)/(1+lp);return np.fft.irfft(np.fft.rfft(x,n)*gain,n)[:len(x)]
def load(p,rate=1,lo=100,hi=9500,d=.6,reverse=False):
 used[str(p.relative_to(R))]=hashlib.sha256(p.read_bytes()).hexdigest()
 x=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ac','1','-ar',str(SR),'-']),dtype='<f4').astype(float)
 active=np.flatnonzero(abs(x)>max(abs(x).max()*.015,.0001));x=x[max(0,active[0]-40):active[-1]+1]
 if reverse:x=x[::-1]
 x=np.interp(np.arange(0,len(x),rate),np.arange(len(x)),x);x=filt(x,lo,hi)[:round(d*SR)]
 x/=max(.0001,abs(x).max());a=min(100,len(x)//10);end=min(round(.045*SR),len(x)//4);x[:a]*=np.linspace(0,1,a);x[-end:]*=np.linspace(1,0,end)**2;return x
class Clip:
 def __init__(self,d):self.x=np.zeros(round(d*SR));self.layers=[]
 def add(self,p,at=0,gain=1,**kw):
  x=load(p,**kw);i=round(at*SR);n=min(len(x),len(self.x)-i);self.x[i:i+n]+=x[:n]*gain;self.layers.append(dict(source=str(p.relative_to(R)),at=at,gain=gain,**kw));return self
 def finish(self,room,decay,seed):
  x=filt(self.x,100,11000);y=np.column_stack((x,x));rng=np.random.default_rng(seed)
  # Diffuse room built from the recordings, with a 17 ms pre-delay to preserve attack.
  for ch in range(2):
   n=round(decay*SR);ir=rng.normal(size=n)*np.exp(-np.arange(n)/(SR*decay/6));ir[:816]=0;ir=filt(ir,400,6500);ir/=max(.001,np.sqrt(np.sum(ir*ir)));size=1<<int(np.ceil(np.log2(len(x)+n)));wet=np.fft.irfft(np.fft.rfft(x,size)*np.fft.rfft(ir,size),size)[:len(x)];y[:,ch]+=room*wet
  y[-round(.12*SR):]*=np.linspace(1,0,round(.12*SR))[:,None]**2;y[-300:]=0
  e=np.mean(y*y,axis=1);cs=np.r_[0,np.cumsum(e)];win=round(.2*SR);level=np.sqrt(np.max((cs[win:]-cs[:-win])/win));gain=min(10**(-21.5/20)/level,10**(-5/20)/abs(y).max());return y*gain
clips=[]
x=Clip(1.35).add(B/'blade_01.ogg',gain=.95,lo=550,hi=9800).add(S/'swish-4.wav',gain=.20,rate=1.25,lo=1500,hi=9000,d=.2).add(M/'impactMetal_light_002.ogg',at=.018,gain=.42,rate=1.1,lo=900,hi=7800,d=.65)
clips.append(('01','白銀の抜刀','シャッ、キィン。輪郭の鋭い金属音と短い余韻。','鋭い / 短い',x,.14,.7))
x=Clip(1.8).add(B/'blade_03.ogg',gain=.8,rate=.66,lo=230,hi=6600,d=.65).add(M/'impactMetal_heavy_002.ogg',at=.016,gain=.32,rate=.8,lo=100,hi=2100,d=.5).add(M/'impactMetal_medium_004.ogg',at=.025,gain=.32,rate=.7,lo=750,hi=6200,d=.8).add(S/'swish-7.wav',gain=.2,rate=.72,lo=180,hi=4100,d=.32)
clips.append(('02','重刃の確定','ザシュン、ギィン。低い芯と厚い金属の響き。','重い / 低め',x,.24,1.15))
x=Clip(1.55).add(B/'blade_02.ogg',gain=.68,rate=1.12,lo=950,hi=8200,d=.35).add(K/'interface-sounds/glass_001.ogg',at=.009,gain=.36,rate=.76,lo=1000,hi=7100,d=.48).add(M/'impactMetal_light_004.ogg',at=.019,gain=.28,rate=1.26,lo=1300,hi=9400,d=.5).add(S/'swish-11.wav',gain=.23,rate=1.2,lo=800,hi=7800,d=.23)
clips.append(('03','銀晶の閃光','シャリン。金属と結晶が重なる透明な響き。','透明 / 明るい',x,.3,1.0))
x=Clip(1.45).add(B/'blade_01.ogg',gain=.70,rate=.9,lo=450,hi=8700,d=.36).add(B/'blade_02.ogg',at=.072,gain=.45,rate=1.12,lo=1000,hi=7500,d=.32).add(M/'impactMetal_medium_000.ogg',at=.016,gain=.30,rate=.9,lo=400,hi=7000,d=.55).add(S/'swish-3.wav',gain=.21,rate=1.35,lo=1200,hi=7000,d=.18)
clips.append(('04','双刃の噛合','シャキッ、キン。二つの刃が短い間隔で噛み合う。','二段 / 歯切れ',x,.12,.6))
x=Clip(1.6).add(B/'blade_03.ogg',gain=.74,rate=.52,lo=200,hi=4300,d=.72).add(M/'impactMetal_heavy_004.ogg',at=.012,gain=.38,rate=.68,lo=150,hi=3600,d=.6).add(B/'chain_02.ogg',at=.03,gain=.12,rate=.68,lo=1200,hi=4800,d=.38).add(S/'swish-13.wav',gain=.26,rate=.7,lo=200,hi=4200,d=.32)
clips.append(('05','黒冠の裁定','ズシャッ、ギン。高音を抑えた暗い金属の決着。','暗い / 密度',x,.12,.8))
x=Clip(2.05).add(B/'blade_01.ogg',gain=.62,rate=.85,lo=650,hi=8400,d=.42).add(M/'impactMetal_medium_003.ogg',at=.015,gain=.44,rate=.78,lo=350,hi=6600,d=.66).add(M/'impactMetal_light_001.ogg',at=.021,gain=.23,rate=1.05,lo=1500,hi=8000,d=.58).add(S/'swish-8.wav',gain=.26,rate=.66,lo=350,hi=6500,d=.5)
clips.append(('06','天光の戴冠','シャアーン。金属の一撃が広い空間に響く。','広い / 長い余韻',x,.52,1.65))
x=Clip(.95).add(B/'blade_02.ogg',gain=.9,rate=1.28,lo=600,hi=9400,d=.23).add(M/'impactMetal_light_000.ogg',at=.010,gain=.37,rate=1.28,lo=1600,hi=8700,d=.22).add(S/'swish-5.wav',gain=.26,rate=1.55,lo=1100,hi=7500,d=.16)
clips.append(('07','一閃の封印','シャキン。鋭く締まってすぐ抜ける最短案。','最短 / 乾いた',x,.06,.42))
rows=[]
for number,title,description,character,x,room,decay in clips:
 y=x.finish(room,decay,int(number));p=O/(number+'.mp3')
 with tempfile.TemporaryDirectory() as tmp:
  w=Path(tmp)/'sound.wav'
  with wave.open(str(w),'wb') as f:f.setparams((2,2,SR,0,'NONE','not compressed'));f.writeframes((np.clip(y,-1,1)*32767).astype('<i2').tobytes())
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(w),'-c:a','libmp3lame','-b:a','192k','-map_metadata','-1',str(p)],check=True)
 a=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ac','2','-ar',str(SR),'-']),dtype='<f4').reshape(-1,2);peak=float(abs(a).max());e=np.mean(a*a,axis=1);cs=np.r_[0,np.cumsum(e,dtype=float)];win=9600;energy=float(10*np.log10(np.max((cs[win:]-cs[:-win])/win)));onset=np.flatnonzero(abs(a).max(axis=1)>peak*.03)[0]/SR*1000
 assert peak<.65;assert abs(a[-200:]).max()<.005
 mono=a.mean(axis=1);spec=abs(np.fft.rfft(mono))**2;freq=np.fft.rfftfreq(len(mono),1/SR)
 rows.append(dict(number=number,title=title,description=description,character=character,file=p.name,seconds=round(len(a)/SR,3),peakDb=round(20*np.log10(peak),2),energy200Db=round(energy,2),onsetMs=round(onset,2),centroidHz=round(float(sum(freq*spec)/sum(spec))),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),layers=x.layers,room=room,decay=decay))
(O/'manifest.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');(D/'sources.json').write_text(json.dumps(dict(license='CC0-1.0; original layering and processing',sources=used,referenceURLs=['https://opengameart.org/node/86018','https://kenney.nl/assets/impact-sounds','https://opengameart.org/content/swishes-sound-pack']),indent=2)+'\n');print(json.dumps([{k:r[k] for k in ['number','seconds','peakDb','energy200Db','onsetMs','centroidHz']} for r in rows],indent=2))

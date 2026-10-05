"""Nine material-led landing cues, edited from existing CC0 assets. No oscillator bed."""
from pathlib import Path
import numpy as np
from scipy import signal
from scipy.io import wavfile
import subprocess,json,hashlib,tempfile
R=Path(__file__).resolve().parents[2];O=R/'client/src/dev/summon-sound-nine/assets';D=R/'docs/sound-study/2026-10-05-summon';SR=44100
K=R/'docs/ui-rework/2026-09-27-audio/sources';S=R/'docs/sound-redesign/2026-09-30/sources/swishes';B=R/'docs/ui-rework/2026-09-27-audio-v4/sources/rubberduck'
O.mkdir(parents=True,exist_ok=True);D.mkdir(parents=True,exist_ok=True)
used={}
def read(p,rate=1,lo=100,hi=6500,d=.30,reverse=False,attack=.002):
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ac','1','-ar',str(SR),'-']);x=np.frombuffer(raw,dtype='<f4').astype(float)
 used[str(p.relative_to(R))]=hashlib.sha256(p.read_bytes()).hexdigest()
 active=np.flatnonzero(abs(x)>max(abs(x).max()*.025,.0001));x=x[max(0,active[0]-60):active[-1]+1]
 if reverse:x=x[::-1]
 if rate!=1:x=signal.resample_poly(x,1000,round(rate*1000))
 x=signal.sosfilt(signal.butter(2,[lo,hi],btype='bandpass',fs=SR,output='sos'),x)[:round(d*SR)]
 x/=max(.001,abs(x).max());a=min(round(attack*SR),len(x)//3);f=min(round(.05*SR),len(x)//3)
 x[:a]*=np.linspace(0,1,a);x[-f:]*=np.linspace(1,0,f)**2
 return x
class Clip:
 def __init__(self,seconds):self.x=np.zeros(round(seconds*SR));self.layers=[]
 def layer(self,p,at=0,gain=1,**kw):
  x=read(p,**kw);i=round(at*SR);n=min(len(x),len(self.x)-i);self.x[i:i+n]+=gain*x[:n];self.layers.append(dict(file=str(p.relative_to(R)),at=at,gain=gain,**kw))
 def finish(self,room=.04):
  x=signal.sosfilt(signal.butter(2,90,btype='highpass',fs=SR,output='sos'),self.x)
  y=np.column_stack((x,x))
  for d,g in [(.019,room),(.037,room*.51),(.061,room*.23)]:
   n=round(d*SR);y[n:,0]+=x[:-n]*g;y[n:,1]+=x[:-n]*g*.8
  f=round(.045*SR);y[-f:]*=np.linspace(1,0,f)[:,None]**2;y[-220:]=0
  z=signal.sosfilt(signal.butter(2,100,btype='highpass',fs=SR,output='sos'),y,axis=0)
  e=np.mean(z*z,axis=1);cs=np.r_[0,np.cumsum(e)];n=8820;level=np.sqrt(np.max((cs[n:]-cs[:-n])/n))
  y*=min(10**(-27.5/20)/level,10**(-7/20)/abs(y).max())
  return y
clips=[]
def add(key,title,description,character,fit,m,room=.04):clips.append((key,title,description,character,fit,m,room))
m=Clip(.36);m.layer(K/'rpg-audio/bookClose.ogg',gain=.70,rate=.8,lo=120,hi=2400,d=.20);m.layer(K/'rpg-audio/cloth1.ogg',at=.015,gain=.50,rate=.88,lo=400,hi=3800,d=.22);m.layer(K/'casino-audio/card-place-3.ogg',gain=.14,lo=600,hi=3200,d=.13)
add('01-felt','フェルトの着地','柔らかい「トフッ」。接地を短く伝え、すぐ引く。','柔らかい・最短','共通音候補',m,.015)
m=Clip(.44);m.layer(K/'impact-sounds/impactWood_light_000.ogg',gain=.65,rate=.83,lo=150,hi=4300,d=.22);m.layer(K/'rpg-audio/bookPlace2.ogg',at=.024,gain=.32,rate=.9,lo=140,hi=2400,d=.26);m.layer(K/'rpg-audio/cloth3.ogg',at=.05,gain=.22,lo=500,hi=4300,d=.23)
add('02-wood','木の封印','木に触れる明確な「コトッ」と、ごく短い擦れ。','乾いた・輪郭が明確','共通音候補',m,.025)
m=Clip(.54);m.layer(K/'impact-sounds/impactSoft_heavy_000.ogg',gain=.7,rate=.75,lo=100,hi=1800,d=.32);m.layer(B/'book_03.ogg',at=.012,gain=.45,rate=.72,lo=400,hi=3700,d=.34);m.layer(K/'casino-audio/chips-collide-2.ogg',at=.052,gain=.13,rate=.66,lo=700,hi=4200,d=.22)
add('03-slate','石板の据え付け','低い接地と細かな擦れ。重さが盤面に落ち着く。','重い・粗い表面','石板演出に合わせた候補',m,.05)
m=Clip(.50);m.layer(K/'rpg-audio/bookClose.ogg',gain=.3,rate=.68,lo=110,hi=1600,d=.19);m.layer(S/'swish-7.wav',gain=.68,rate=1.12,lo=220,hi=5500,d=.34);m.layer(K/'rpg-audio/cloth2.ogg',at=.055,gain=.28,rate=.78,lo=300,hi=2500,d=.29)
add('04-air','空気のクッション','「ボフッ」と空気が押し出され、軽く抜ける。','丸い・空気の広がり','共通音候補',m,.06)
m=Clip(.47);m.layer(K/'casino-audio/card-shove-2.ogg',gain=.6,rate=.80,lo=350,hi=6000,d=.20);m.layer(K/'rpg-audio/bookFlip2.ogg',at=.045,gain=.45,rate=.9,lo=750,hi=5200,d=.27);m.layer(K/'rpg-audio/bookPlace2.ogg',gain=.22,rate=.72,lo=110,hi=1300,d=.18)
add('05-paper','紙束の展開','紙が重なって着地し、端が短くほどける。','紙の面・軽い二段','共通音候補',m,.02)
m=Clip(.61);m.layer(K/'rpg-audio/bookClose.ogg',gain=.45,rate=.9,lo=150,hi=2200,d=.19);m.layer(K/'interface-sounds/glass_001.ogg',at=.005,gain=.31,rate=.65,lo=850,hi=4900,d=.29);m.layer(B/'item_gem_01.ogg',at=.055,gain=.20,rate=.83,lo=700,hi=4200,d=.38);m.layer(K/'rpg-audio/cloth1.ogg',at=.02,gain=.27,lo=400,hi=3000,d=.24)
add('06-crystal','水晶の芯','柔らかい接地の中に、細い透明感を残す。','小さな共鳴・澄んだ質感','明るい召喚寄り',m,.075)
m=Clip(.43);m.layer(K/'rpg-audio/metalLatch.ogg',gain=.35,rate=.72,lo=350,hi=4000,d=.20);m.layer(B/'metal_01.ogg',at=.01,gain=.20,rate=.68,lo=280,hi=2400,d=.26);m.layer(K/'rpg-audio/cloth2.ogg',gain=.55,rate=.82,lo=150,hi=2700,d=.24)
add('07-bronze','青銅の留め具','短い「カチャッ」を布の重さで包む。','金属の締まり・短い余韻','装甲・機構寄り',m,.02)
m=Clip(.52);m.layer(B/'book_02.ogg',gain=.5,rate=.79,lo=180,hi=3500,d=.25);m.layer(K/'rpg-audio/cloth4.ogg',at=.015,gain=.68,rate=1.13,lo=900,hi=5800,d=.32);m.layer(K/'casino-audio/card-slide-5.ogg',at=.075,gain=.25,rate=.67,lo=1400,hi=4800,d=.25)
add('08-dust','砂塵の着地','低い接地から、細かな「サッ」が周囲へ逃げる。','細かな摩擦・乾いた散り','土・砂塵寄り',m,.025)
m=Clip(.70);m.layer(K/'rpg-audio/bookPlace2.ogg',gain=.5,rate=.69,lo=110,hi=1800,d=.24);m.layer(B/'item_gem_01.ogg',at=.035,gain=.26,rate=.55,lo=300,hi=2600,d=.44,reverse=True,attack=.06);m.layer(S/'swish-13.wav',at=.025,gain=.35,rate=.80,lo=320,hi=4100,d=.42);m.layer(K/'rpg-audio/cloth3.ogg',at=.10,gain=.22,rate=.6,lo=180,hi=2400,d=.4)
add('09-arcane','魔力の定着','接地の後に低い質感がふくらみ、静かに収まる。','接地から広がる・長め','魔力感を強める候補',m,.12)
manifest=[]
for key,title,description,character,fit,m,room in clips:
 y=m.finish(room);path=O/(key+'.mp3')
 with tempfile.TemporaryDirectory() as tmp:
  p=Path(tmp)/'clip.wav';wavfile.write(p,SR,(y*32767).astype(np.int16));subprocess.run(['ffmpeg','-v','error','-y','-i',str(p),'-codec:a','libmp3lame','-q:a','2','-map_metadata','-1',str(path)],check=True)
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ac','2','-ar',str(SR),'-']);a=np.frombuffer(raw,dtype='<f4').reshape(-1,2)
 peak=float(abs(a).max());assert peak<.52;assert np.max(abs(a[-220:]))<.01
 onset=float(np.flatnonzero(np.max(abs(a),axis=1)>peak*.03)[0]/SR)
 z=signal.sosfilt(signal.butter(2,100,btype='highpass',fs=SR,output='sos'),a,axis=0);e=np.mean(z*z,axis=1);cs=np.r_[0,np.cumsum(e)];energy=float(10*np.log10(np.max((cs[8820:]-cs[:-8820])/8820)))
 spectrum=np.abs(np.fft.rfft(a.mean(axis=1)))**2;freq=np.fft.rfftfreq(len(a),1/SR)
 row=dict(id=key,number=key[:2],title=title,description=description,character=character,fit=fit,file=key+'.mp3',seconds=round(len(a)/SR,3),peakDb=round(20*np.log10(peak),2),energy200Db=round(energy,2),onsetMs=round(onset*1000,2),centroidHz=round(float(sum(freq*spectrum)/sum(spectrum))),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),layers=m.layers)
 manifest.append(row)
assert max(r['energy200Db'] for r in manifest)-min(r['energy200Db'] for r in manifest)<.2
(O/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(D/'sources.json').write_text(json.dumps(dict(license='CC0-1.0 source assets; original editing',sources=used,references=['https://kenney.nl/assets/rpg-audio','https://kenney.nl/assets/casino-audio','https://kenney.nl/assets/impact-sounds','https://kenney.nl/assets/interface-sounds','https://opengameart.org/content/swishes-sound-pack','https://opengameart.org/node/86018']),indent=2)+'\n')
print(json.dumps([{k:r[k] for k in ['id','seconds','peakDb','energy200Db','onsetMs','centroidHz']} for r in manifest],indent=2))

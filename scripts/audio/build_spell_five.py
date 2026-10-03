"""Five material-led spell onset candidates. CC0 source textures; no added oscillator/chord bed."""
from pathlib import Path
import numpy as np
from scipy import signal
from scipy.io import wavfile
import subprocess,json,hashlib,tempfile
R=Path(__file__).resolve().parents[2];O=R/'client/src/dev/spell-sound-five/assets';D=R/'docs/sound-study/2026-10-03';SR=44100
K=R/'docs/ui-rework/2026-09-27-audio/sources';S=R/'docs/sound-redesign/2026-09-30/sources/swishes';B=R/'docs/ui-rework/2026-09-27-audio-v4/sources/rubberduck'
O.mkdir(parents=True,exist_ok=True);D.mkdir(parents=True,exist_ok=True)
used={}
def read(p,rate=1,lo=100,hi=8500,d=.35,reverse=False):
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ac','1','-ar',str(SR),'-']);x=np.frombuffer(raw,dtype='<f4').astype(float)
 used[str(p.relative_to(R))]=hashlib.sha256(p.read_bytes()).hexdigest()
 active=np.flatnonzero(abs(x)>max(abs(x).max()*.025,.0001));x=x[max(0,active[0]-80):active[-1]+1]
 if reverse:x=x[::-1]
 if rate!=1:x=signal.resample_poly(x,1000,round(rate*1000))
 x=signal.sosfilt(signal.butter(2,[lo,hi],btype='bandpass',fs=SR,output='sos'),x)[:round(d*SR)]
 x/=max(.001,abs(x).max());a=min(150,len(x)//8);f=min(round(.06*SR),len(x)//3);x[:a]*=np.linspace(0,1,a);x[-f:]*=np.linspace(1,0,f)**2
 return x
class Clip:
 def __init__(self,seconds):self.x=np.zeros(round(seconds*SR));self.layers=[]
 def layer(self,p,at=0,gain=1,**kw):
  x=read(p,**kw);i=round(at*SR);n=min(len(x),len(self.x)-i);self.x[i:i+n]+=gain*x[:n];self.layers.append(dict(file=str(p.relative_to(R)),at=at,gain=gain,**kw))
 def finish(self,room=.06):
  x=signal.sosfilt(signal.butter(2,95,btype='highpass',fs=SR,output='sos'),self.x)
  y=np.column_stack((x,x))
  for d,g in [(.023,room),(.039,room*.53),(.067,room*.28)]:
   n=round(d*SR);y[n:,0]+=x[:-n]*g;y[n:,1]+=x[:-n]*g*.75
  f=round(.04*SR);y[-f:]*=np.linspace(1,0,f)[:,None]**2;y[-220:]=0
  # Match energy of strongest 200 ms above 100 Hz; peak ceiling guards short clicks.
  z=signal.sosfilt(signal.butter(2,100,btype='highpass',fs=SR,output='sos'),y,axis=0)
  e=np.mean(z*z,axis=1);cs=np.r_[0,np.cumsum(e)];n=8820;level=np.sqrt(np.max((cs[n:]-cs[:-n])/n))
  gain=min(10**(-28.5/20)/level,10**(-8/20)/abs(y).max());y*=gain
  return y
clips=[]
m=Clip(.48);m.layer(K/'rpg-audio/cloth1.ogg',gain=.85,rate=1.2,lo=200,hi=5800,d=.24);m.layer(K/'casino-audio/card-place-3.ogg',at=.045,gain=.13,rate=.82,lo=180,hi=3400,d=.15);m.layer(S/'swish-11.wav',at=.04,gain=.30,rate=.95,lo=750,hi=5700,d=.30)
clips.append(('01-silk','01','シルクの封印','布の短い擦過 → 小さな締まり。乾いた、控えめな発動。','最短・乾いた質感',m,.025))
m=Clip(.57);m.layer(S/'swish-7.wav',gain=.80,rate=.82,lo=240,hi=7400,d=.35);m.layer(K/'rpg-audio/cloth2.ogg',at=.018,gain=.35,rate=.69,lo=280,hi=2700,d=.35);m.layer(S/'swish-3.wav',at=.13,gain=.16,rate=1.6,lo=1200,hi=6800,d=.20)
clips.append(('02-air','02','エア・リリース','空気をひと押しして抜ける。音程を主張しない発動。','滑らかな一動作',m,.08))
m=Clip(.64);m.layer(S/'swish-10.wav',gain=.38,rate=1.1,lo=650,hi=5300,d=.26)
for rate,at,gain in [(1.18,.014,.33),(.87,.028,.28),(1.43,.043,.17),(.69,.067,.14)]:m.layer(K/'interface-sounds/glass_001.ogg',at=at,gain=gain,rate=rate,lo=1300,hi=7600,d=.31)
m.layer(K/'rpg-audio/cloth1.ogg',at=.055,gain=.22,rate=.8,lo=400,hi=2500,d=.3)
clips.append(('03-crystal','03','クリスタルの展開','微細なガラスの重なり → 短いきらめき。旋律にはしない。','明るい粒状の質感',m,.12))
m=Clip(.55);m.layer(B/'spell_fire_06.ogg',gain=.7,rate=1.3,lo=300,hi=7200,d=.36);m.layer(S/'swish-4.wav',at=.025,gain=.29,rate=1.35,lo=600,hi=5400,d=.25);m.layer(B/'spell_fire_04.ogg',at=.115,gain=.20,rate=1.55,lo=1700,hi=6500,d=.17)
clips.append(('04-spark','04','スパークの解放','細かい火花 → 小さな放出。輪郭のある発動。','密度のある短い破裂',m,.045))
m=Clip(.72);m.layer(K/'rpg-audio/cloth2.ogg',gain=.75,rate=.48,lo=140,hi=3400,d=.47);m.layer(B/'item_gem_01.ogg',at=.018,gain=.32,rate=.48,lo=210,hi=2300,d=.43);m.layer(S/'swish-13.wav',at=.07,gain=.33,rate=.6,lo=250,hi=3600,d=.43);m.layer(K/'rpg-audio/bookPlace2.ogg',at=.015,gain=.07,rate=.65,lo=120,hi=950,d=.18)
clips.append(('05-sigil','05','深いシジル','低く擦れる質感 → 奥行きのある短い余韻。','低め・落ち着いた重さ',m,.18))
manifest=[]
for key,num,title,description,character,m,room in clips:
 y=m.finish(room);path=O/(key+'.mp3')
 with tempfile.TemporaryDirectory() as tmp:
  p=Path(tmp)/'clip.wav';wavfile.write(p,SR,(y*32767).astype(np.int16));subprocess.run(['ffmpeg','-v','error','-y','-i',str(p),'-codec:a','libmp3lame','-q:a','2','-map_metadata','-1',str(path)],check=True)
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ac','2','-ar',str(SR),'-']);a=np.frombuffer(raw,dtype='<f4').reshape(-1,2)
 peak=float(abs(a).max());assert peak<.5;assert np.max(abs(a[-220:]))<.01
 onset=float(np.flatnonzero(np.max(abs(a),axis=1)>peak*.03)[0]/SR)
 z=signal.sosfilt(signal.butter(2,100,btype='highpass',fs=SR,output='sos'),a,axis=0);e=np.mean(z*z,axis=1);cs=np.r_[0,np.cumsum(e)];energy=float(10*np.log10(np.max((cs[8820:]-cs[:-8820])/8820)))
 spectrum=np.abs(np.fft.rfft(a.mean(axis=1)))**2;freq=np.fft.rfftfreq(len(a),1/SR)
 row=dict(id=key,number=num,title=title,description=description,character=character,file=key+'.mp3',seconds=round(len(a)/SR,3),peakDb=round(20*np.log10(peak),2),energy200Db=round(energy,2),onsetMs=round(onset*1000,2),centroidHz=round(float(sum(freq*spectrum)/sum(spectrum))),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),layers=m.layers)
 manifest.append(row)
(O/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');(D/'sources.json').write_text(json.dumps(dict(license='CC0-1.0 source assets; original editing',sources=used,references=['https://kenney.nl/assets','https://opengameart.org/content/swishes-sound-pack','https://opengameart.org/node/86018']),indent=2)+'\n')
print(json.dumps([{k:r[k] for k in ['id','seconds','peakDb','energy200Db','onsetMs','centroidHz']} for r in manifest],indent=2))

"""Deterministic stereo candidates: CC0 metal recordings + original pressure / arc synthesis.
Requires numpy and ffmpeg. Run from the repository root. No external downloads.
"""
from pathlib import Path
import hashlib, json, subprocess, wave
import numpy as np
SR=48000
OUT=Path('client/public/sfx/opening-mana-v1'); OUT.mkdir(parents=True,exist_ok=True)
DOC=Path('docs/sound-study/2026-11-19-opening-mana'); DOC.mkdir(parents=True,exist_ok=True)
SOURCES=Path('docs/sound-study/2026-10-08-chosen-seven/sources')
rng=np.random.default_rng(1119)
def clock(d): return np.arange(round(d*SR))/SR
def band(x,lo,hi):
    f=np.fft.rfftfreq(len(x),1/SR)
    window=(1-np.exp(-(f/max(1,lo))**4))*np.exp(-(f/hi)**6)
    return np.fft.irfft(np.fft.rfft(x)*window,n=len(x))
def noise(d,lo=150,hi=8000):
    x=band(rng.normal(0,1,round(d*SR)),lo,hi)
    return x/max(.001,np.std(x))
def fade(x,attack=.003,release=.04):
    x=x.copy(); n=min(len(x)//2,round(attack*SR)); m=min(len(x)//2,round(release*SR))
    if n:x[:n]*=np.linspace(0,1,n)
    if m:x[-m:]*=np.linspace(1,0,m)
    return x
samples={}
def metal(kind,rate=1,d=.6):
    key=f'impactMetal_{kind}.ogg'
    if key not in samples:
        raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(SOURCES/key),'-f','f32le','-ac','1','-ar',str(SR),'-'])
        x=np.frombuffer(raw,dtype='<f4').astype(float); indices=np.flatnonzero(abs(x)>.015*max(abs(x)))
        x=x[max(0,indices[0]-48):] if len(indices) else x
        samples[key]=x/max(.001,max(abs(x)))
    x=samples[key]; pos=np.arange(round(d*SR))*rate
    return fade(np.interp(pos,np.arange(len(x)),x,left=0,right=0),.001,.08)
def stereo(d):return np.zeros((round(d*SR),2))
def add(dst,x,at=0,gain=1,pan=0):
    start=round(at*SR); n=min(len(x),len(dst)-start)
    if n<=0:return
    if x.ndim==1:x=x[:,None]*np.array([np.sqrt((1-pan)/2),np.sqrt((1+pan)/2)])[None,:]
    dst[start:start+n]+=x[:n]*gain

def thump(d,heavy):
    t=clock(d); freq=(135 if heavy else 240)*np.exp(-t*22)+(43 if heavy else 72)
    return fade(np.sin(np.cumsum(freq)*2*np.pi/SR)*np.exp(-t*(7 if heavy else 11)),.002,.06)
def crack(d=.12):
    t=clock(d); return fade(noise(d,850,10500)*np.exp(-t*65),.0008,.015)
def shimmer(d,base):
    t=clock(d); x=np.zeros(len(t))
    for i,r in enumerate([1,1.49,2.07,2.73,3.94]):
        x+=np.sin(t*base*r*2*np.pi+np.sin(t*(8+i)*2*np.pi)*.18)*np.exp(-t*(2.4+i*.7))/(i+1)
    return fade(x,.003,.1)
def room(x,amount):
    dry=x.copy()
    for i,delay in enumerate([.029,.047,.071,.109,.163,.229]):
        shift=round(delay*SR); x[shift:]+=dry[:-shift,::(-1 if i%2 else 1)]*amount*np.exp(-i*.45)
    return x

def make(variant,cue):
    heavy=variant=='a'; durations={'rise':1.12,'impact':.55,'toss':1.76,'rejoin':.76,'friction':3.80,'land':1.65,'exit':.46}
    x=stereo(durations[cue]); d=len(x)/SR
    if cue=='rise':
        t=clock(d); env=np.sin(np.pi*np.minimum(1,t/d))**1.4
        air=noise(d,100 if heavy else 700,4300 if heavy else 9000)
        add(x,air*env*.35,pan=-.2)
        add(x,shimmer(d,170 if heavy else 480)*np.linspace(0,.45,len(t)),pan=.25)
        add(x,thump(.6,heavy),.12,.13)
    elif cue in ['impact','rejoin','land']:
        add(x,thump(d,heavy),gain=1.2 if cue=='impact' else .8)
        add(x,metal('heavy_002' if heavy else 'medium_003',.68 if heavy else 1.12,d),gain=.9)
        add(x,crack(),gain=.42 if heavy else .23)
        if cue=='rejoin':
            add(x,metal('medium_004',.8 if heavy else 1.45,.42),.055,.35,pan=-.3)
            for i in range(9):add(x,crack(.08),.025+i*.025,.1,pan=(-1)**i*.6)
        if cue=='land':
            add(x,shimmer(d,340 if heavy else 740),gain=.38 if heavy else .8)
            add(x,metal('light_002',.9 if heavy else 1.28,.9),.025,.35,pan=.24)
            # One decisive landing, followed by decaying light; no second announcement.
            t=clock(.55);add(x,noise(.55,400,6500)*np.exp(-t*8),gain=.16)
    elif cue=='toss':
        add(x,metal('light_004',1.15 if heavy else 1.5,.45),gain=.8)
        t=clock(d); spin=(.5+.5*np.cos(2*np.pi*(11*t-2.4*t*t)))**4
        env=np.sin(np.pi*np.clip(t/d,0,1))**.7
        add(x,noise(d,800 if heavy else 1500,7200)*spin*env,gain=.15,pan=-.2)
        add(x,shimmer(d,690 if heavy else 1170)*(.18+.82*spin),gain=.24,pan=.2)
        for i,at in enumerate([.07,.19,.34,.52,.74,1,1.30,1.57]):
            add(x,metal('light_001',1.4-i*.045+(0 if heavy else .35),.14),at,.2*(1-i/10),(-1)**i*.45)
    elif cue=='friction':
        t=clock(d); env=np.minimum(1,t/.045)*np.minimum(1,(d-t)/.33)
        # The brighter wave at 3.22s is 1.51s after the rejoin.
        pressure=.55+.2*np.sin(t*13)**2+.25/(1+np.exp(-(t-1.51)*35))
        bed=noise(d,450 if heavy else 1400,6500 if heavy else 10000)
        add(x,bed*env*pressure,gain=.12 if heavy else .08)
        add(x,noise(d,55,480)*env,gain=.16 if heavy else .045)
        # Burst births mirror friction.ts emitters, so visual jets and audible spits share timing.
        def hashv(n):return (np.sin(n*127.1+311.7)*43758.5453)%1
        for emitter in range(10):
            cycle=.24+hashv(emitter+8)*.12; at=emitter*.027
            while at<3.33:
                add(x,crack(.075),at,.075+hashv(emitter+at)*.08,pan=np.sin(emitter*2.3)*.65)
                if not heavy:add(x,shimmer(.12,1600+hashv(at+emitter)*1900),at,.025,pan=np.sin(at*5)*.5)
                at+=cycle
        if not heavy:add(x,shimmer(d,510)*env,gain=.10)
        x*=env[:,None]
    elif cue=='exit':
        t=clock(d); env=np.sin(np.pi*t/d)**1.5
        add(x,noise(d,150 if heavy else 900,5800 if heavy else 9000)*env,gain=.4)
        add(x,thump(d,heavy),gain=.18)
    x=room(x,.11 if heavy else .24)
    x=fade(x.T[0],.002,.035)[:,None]*np.array([[1,0]])+fade(x.T[1],.002,.035)[:,None]*np.array([[0,1]])
    # Leave headroom for simultaneous collision/toss/rejoin/friction voices.
    db={'rise':-13,'impact':-7.5,'toss':-12,'rejoin':-9,'friction':-17,'land':-7.5,'exit':-13}[cue]
    x*=10**(db/20)/max(.001,np.max(abs(x)))
    return x

def write(path,x):
    pcm=np.rint(np.clip(x,-1,1)*32767).astype('<i2')
    with wave.open(str(path),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())

if __name__=='__main__':
    manifest=[];mixes={};times={'rise':.18,'impact':1.46,'toss':1.46,'rejoin':1.71,'friction':1.71,'land':3.22,'exit':5.12}
    for v in ['a','b']:
        mix=stereo(6.1)
        for cue in times:
            x=make(v,cue); path=OUT/f'{v}-{cue}.wav';write(path,x);add(mix,x,times[cue])
            manifest.append({'variant':v,'cue':cue,'file':str(path),'seconds':len(x)/SR,'peakDb':round(20*np.log10(np.max(abs(x))),2),'rmsDb':round(20*np.log10(np.sqrt(np.mean(x*x))),2),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
        write(DOC/f'{v}-full.wav',mix)
        mixes[v]={'peakDb':round(20*np.log10(np.max(abs(mix))),2),'clippedSamples':int(np.count_nonzero(abs(mix)>=1))}
        assert np.max(abs(mix))<.95
    (DOC/'manifest.json').write_text(json.dumps({'sampleRate':SR,'channels':2,'timing':times,'mixes':mixes,'assets':manifest,'sources':sorted(samples),'license':'Kenney Impact Sounds CC0; original procedural air/pressure/arc layers','sourceDirectory':str(SOURCES)},indent=2)+'\n')
    print(json.dumps({'files':len(manifest),'mixes':mixes}))

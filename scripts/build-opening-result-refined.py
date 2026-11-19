"""Refine the accepted direction of result E. Keep the original and six chosen cues intact."""
import runpy,json,hashlib,wave
from pathlib import Path
import numpy as np
s=runpy.run_path('scripts/build-opening-mana-sounds.py',run_name='synth')
clock,noise,fade,add,stereo,write,band,metal=[s[k] for k in ['clock','noise','fade','add','stereo','write','band','metal']]
SR=48000;rng=np.random.default_rng(191103)
out=Path('client/public/sfx/opening-mana-v1');doc=Path('docs/sound-study/2026-11-19-opening-result-refined');doc.mkdir(parents=True,exist_ok=True)

def resonator(d,f,decay,brightness,attack=.003):
    t=clock(d);x=np.zeros(len(t))
    # Damped modes, not a sustained sine beep: overtones shed energy at different rates.
    for k,(ratio,amp) in enumerate([(1,1),(2.003,.36),(3.012,.17),(4.027,.09),(5.051,.035)]):
        for detune,gain in [(-.0007,.24),(0,.58),(.0009,.18)]:
            phase=2*np.pi*f*ratio*(1+detune)*t
            x+=gain*amp*brightness**k*np.sin(phase)*np.exp(-t*(decay+k*1.9))
    return fade(x,attack,.12)

def diffuse(x,decay,wet):
    # Decorrelated, dense damped reflection field; no repetitive discrete delay train.
    n=round(1.2*SR);t=clock(1.2);size=1<<(len(x)+n-2).bit_length()
    for ch in range(2):
        impulse=band(rng.normal(size=n),250,5200)*np.exp(-t*decay)
        impulse*=np.minimum(1,np.maximum(0,(t-.016)/.035))
        impulse[:round(.016*SR)]=0
        impulse/=max(.001,np.sqrt(np.sum(impulse**2)))
        for at,gain in [(.021,.13),(.039,.10),(.061,.065)]:impulse[round((at+ch*.003)*SR)]+=gain
        wet_signal=np.fft.irfft(np.fft.rfft(x[:,ch],size)*np.fft.rfft(impulse,size),size)[:len(x)]
        # Fixed energy-relative mix keeps room size from deciding candidate loudness.
        wet_signal*=np.sqrt(np.mean(x[:,ch]**2))/max(.00001,np.sqrt(np.mean(wet_signal**2)))
        x[:,ch]+=wet_signal*wet
    return x

items=[]
for variant,title,d,decay,bright,wet in [('f','③-A 銀晶の余韻',1.48,4.4,.78,.20),('g','③-B 聖堂の響き',1.84,3.25,.66,.43),('h','③-C 深蒼の確定',1.60,4.0,.60,.24)]:
    x=stereo(d);t=clock(d)
    # Keep E's C/G/C voicing. The shared bloom is a chord, not a three-note notification.
    for i,f in enumerate([523.25,783.99,1046.5]):
        add(x,resonator(d,f,decay+i*.42,bright),at=i*(.007 if variant!='f' else .012),gain=[.54,.29,.21][i],pan=(i-1)*.28)
    # Octave body fills the original's hollow midrange without a subwoofer dependency.
    for i,f in enumerate([261.625,392]):
        add(x,resonator(d,f,6.4 if variant=='f' else 4.9,.42,.005),gain=(.16 if variant=='f' else .26 if variant=='g' else .40)/(i+1),pan=(i-.5)*.12)
    # A softened real material attack gives the bright chord a physical leading edge.
    contact=metal('light_002',.66 if variant!='h' else .48,.18)
    contact=band(contact,250,2400)*np.exp(-clock(.18)*20)
    add(x,contact,gain=.12 if variant!='h' else .2)
    if variant=='f':
        add(x,fade(noise(.12,1800,5900)*np.exp(-clock(.12)*48),.002,.025),gain=.022)
    elif variant=='g':
        air=noise(d,1600,5900)*(1-np.exp(-t*14))*np.exp(-t*5.5)
        add(x,fade(air,.012,.15),gain=.022,pan=.35)
    else:
        body=np.sin(2*np.pi*130.8125*t)*np.exp(-t*11)
        add(x,fade(body,.004,.1),gain=.27)
        add(x,fade(noise(.22,100,1400)*np.exp(-clock(.22)*24),.002,.04),gain=.09)
    x=diffuse(x,6 if variant=='f' else 3.7 if variant=='g' else 5.3,wet)
    for ch in range(2):x[:,ch]=fade(x[:,ch],.001,.12)
    x-=np.mean(x,axis=0)
    # Same loudness target for a fair comparison; peaks remain below -6 dBFS.
    x*=10**(-23/20)/max(.00001,np.sqrt(np.mean(x*x)))
    x*=min(1,10**(-6/20)/np.max(abs(x)))
    path=out/f'{variant}-land.wav';write(path,x)
    mix=stereo(6.1)
    for cue,v,at in [('rise','b',.18),('impact','b',1.46),('toss','b',1.46),('rejoin','a',1.71),('friction','a',1.71),('exit','a',5.12)]:
        with wave.open(str(out/f'{v}-{cue}.wav')) as w:pcm=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').reshape(-1,2)/32768
        add(mix,pcm,at)
    add(mix,x,3.22);assert np.max(abs(mix))<.95
    write(doc/f'{variant}-full.wav',mix)
    items.append({'variant':variant,'title':title,'file':str(path),'seconds':d,'peakDb':round(20*np.log10(np.max(abs(x))),2),'rmsDb':round(20*np.log10(np.sqrt(np.mean(x*x))),2),'mixPeakDb':round(20*np.log10(np.max(abs(mix))),2),'clippedSamples':int(np.count_nonzero(abs(mix)>=1)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
(doc/'manifest.json').write_text(json.dumps({'basis':'e-land.wav (original third candidate)','assets':items,'source':'Kenney CC0 impactMetal_light_002.ogg + original modal synthesis / diffuse room'},ensure_ascii=False,indent=2)+'\n')
print(json.dumps(items,ensure_ascii=False))

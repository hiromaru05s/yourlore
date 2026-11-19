"""Three new result candidates. Preserve all previously approved WAVs byte-for-byte."""
import runpy, json, hashlib
from pathlib import Path
import numpy as np
s=runpy.run_path('scripts/build-opening-mana-sounds.py',run_name='synth')
clock,noise,fade,add,stereo,room,write,thump=[s[k] for k in ['clock','noise','fade','add','stereo','room','write','thump']]
out=Path('client/public/sfx/opening-mana-v1');doc=Path('docs/sound-study/2026-11-19-opening-result');doc.mkdir(parents=True,exist_ok=True)
items=[]
for variant,title,d in [('c','刻印の確定',.82),('d','蒼圧の収束',1.12),('e','星紋の調律',1.42)]:
    x=stereo(d);t=clock(d)
    if variant=='c':
        # A single dry, dense seal strike; no ringing coin or long metal tail.
        n=noise(d,320,4400);add(x,fade(n*np.exp(-t*47),.001,.04),gain=.75)
        add(x,thump(.26,False),gain=.35)
        add(x,fade(np.sin(2*np.pi*190*t)*np.exp(-t*19),.001,.04),gain=.32)
        x=room(x,.045)
    elif variant=='d':
        # Pressure collapses into a rounded bass hit and outward air, rather than a chime.
        add(x,thump(d,True),gain=.9)
        add(x,fade(noise(d,90,2700)*np.exp(-t*10),.004,.1),gain=.38)
        add(x,fade(noise(d,900,5100)*(1-np.exp(-t*28))*np.exp(-t*7),.004,.1),gain=.16,pan=-.2)
        x=room(x,.13)
    else:
        # Warm, brief three-tone resolution with a soft percussive leading edge.
        for i,f in enumerate([523.25,783.99,1046.5]):
            tone=np.sin(2*np.pi*f*t+.3*np.sin(2*np.pi*3.2*t))+.18*np.sin(2*np.pi*f*2.01*t)
            add(x,fade(tone*np.exp(-t*(4.7+i*.4)),.008,.15),at=i*.024,gain=.3,pan=(i-1)*.4)
        add(x,fade(noise(.18,1200,6000)*np.exp(-clock(.18)*38),.002,.03),gain=.14)
        x=room(x,.23)
    for ch in range(2):x[:,ch]=fade(x[:,ch],.001,.045)
    x*=10**(-9/20)/np.max(abs(x));path=out/f'{variant}-land.wav';write(path,x)
    items.append({'variant':variant,'title':title,'file':str(path),'seconds':d,'peakDb':-9,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
(doc/'manifest.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(items,ensure_ascii=False))

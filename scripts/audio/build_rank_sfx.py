#!/usr/bin/env python3
"""Quiet original rank cues; pure additive synthesis, no external samples."""
import math, struct, subprocess, tempfile, wave
from pathlib import Path
RATE = 48000
OUT = Path(__file__).resolve().parents[2] / 'client/public/sfx/lore-v4'
CUES = {
    'rankUp': (0.72, [(0, 523.25, .15, .48), (.12, 659.25, .13, .50)]),
    'rankDown': (0.68, [(0, 440, .13, .42), (.14, 349.23, .11, .45)]),
    'rankPromote': (1.22, [(0, 523.25, .12, .7), (.10, 659.25, .11, .7), (.20, 783.99, .105, .8), (.32, 1046.5, .08, .85)]),
}
OUT.mkdir(parents=True, exist_ok=True)
for name, (duration, notes) in CUES.items():
    data = []
    for i in range(round(RATE * duration)):
        t = i / RATE
        value = 0
        for start, freq, gain, tail in notes:
            x = t - start
            if 0 <= x <= tail:
                envelope = (1 - math.exp(-x / .008)) * math.exp(-x / (tail * .22)) * min(1, (tail - x) / .04)
                tone = sum(a * math.sin(2 * math.pi * freq * h * x) for h, a in [(1, 1), (2, .16), (3, .035)])
                value += gain * envelope * tone
                # One quiet reflection, attached to the note rather than a long wash.
                if x > .085:
                    value += gain * .10 * math.exp(-(x - .085) / (tail * .24)) * math.sin(2 * math.pi * freq * (x - .085)) * min(1, (x-.085)/.01) * min(1,(tail-x)/.04)
        data.append(value)
    assert max(map(abs, data)) < .30
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / 'cue.wav'
        with wave.open(str(wav), 'wb') as w:
            w.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
            w.writeframes(b''.join(struct.pack('<h', round(v * 32767)) for v in data))
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','128k',str(OUT / (name + '.mp3'))],check=True)
    rms = math.sqrt(sum(v*v for v in data)/len(data))
    print(f'{name}: {duration:.2f}s, peak {20*math.log10(max(map(abs,data))):.1f} dBFS, RMS {20*math.log10(rms):.1f} dBFS')

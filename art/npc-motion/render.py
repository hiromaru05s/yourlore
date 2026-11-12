"""Bake one-shot GIFs from the seven adopted duel portraits. Pillow, numpy, OpenCV.
Run from the repository root: python art/npc-motion/render.py [lumi ...]
All landmarks are percentages of the original, uncropped portrait."""
from pathlib import Path
from sys import argv
from PIL import Image
import subprocess
import cv2 as cv
import numpy as np

# Outer contour (crown, hair, shoulders), head pivot, fringe, shoulder/clasp,
# held object, direction of recoil, weight. The foreground seeds keep the hall rigid.
RIG = {
 'lumi': ('0,100 0,90 8,72 18,50 27,48 22,44 22,32 26,17 32,6 40,0 58,0 65,5 70,16 75,18 75,24 80,31 75,40 67,46 69,52 84,64 95,81 100,99', (49,47),(66,36),(67,64),(45,66),-1,.95),
 'noel': ('0,100 0,76 9,60 26,53 35,48 35,41 30,40 23,32 23,16 27,8 33,4 36,0 53,0 65,5 69,20 64,29 61,40 64,45 73,51 92,62 96,76 100,89 100,100', (49,47),(29,25),(62,66),(49,74),1,.84),
 'vera': ('0,100 0,79 10,66 17,50 26,48 22,44 24,35 20,32 24,18 27,6 35,0 65,0 74,6 77,20 74,29 69,37 71,49 86,55 93,64 95,77 100,88 100,100', (49,45),(68,34),(60,59),(43,76),-1,1.0),
 'sion': ('0,100 0,73 7,62 19,58 25,52 27,42 30,43 28,33 23,27 25,14 31,4 35,0 54,0 62,6 65,16 62,29 68,36 72,44 83,49 100,54 100,100', (45,44),(29,30),(65,63),(40,78),1,.78),
 'shion': ('0,100 0,77 6,61 16,53 30,49 26,44 26,42 36,42 36,37 30,33 27,28 28,17 27,9 36,5 40,0 54,0 65,7 70,17 70,24 66,35 68,40 77,38 80,45 88,49 92,48 98,49 100,57 100,100', (49,43),(32,25),(69,57),(23,71),-1,1.12),
 'rena': ('0,100 0,78 10,65 16,55 24,51 27,49 25,42 23,34 24,19 29,7 36,0 54,0 65,9 68,19 69,32 71,37 69,42 60,45 65,51 72,53 75,57 86,59 90,68 100,87 100,100', (48,45),(65,34),(61,52),(54,78),1,.92),
 'aries': ('0,100 0,68 6,60 20,52 22,45 18,42 23,37 18,34 21,25 17,19 21,8 28,4 33,0 63,0 68,5 73,3 80,6 84,13 83,20 76,24 73,26 74,39 69,40 71,45 86,52 92,60 100,60 100,100', (50,44),(26,40),(76,68),(51,49),1,.86)
}
N=256
Y,X=np.mgrid[0:N,0:N].astype('float32')
def smooth(a,b,u):
 t=np.clip((u-a)/(b-a),0,1);return t*t*(3-2*t)
def field(x,y,sx,sy): return np.exp(-.5*((X-x*N/100)/(sx*N/100))**2-.5*((Y-y*N/100)/(sy*N/100))**2)
def pulse(t,keys):
 for (a,v),(b,w) in zip(keys,keys[1:]):
  if t<=b:return v+(w-v)*smooth(a,b,t)
 return keys[-1][1]
def run(name):
 outline,pivot,tips,clasp,hand,direction,weight=RIG[name]
 src=np.asarray(Image.open(f'client/public/art/npcs/v2/{name}.webp').convert('RGB').resize((N,N),Image.Resampling.LANCZOS))
 poly=(np.array([list(map(int,p.split(','))) for p in outline.split()])*((N-1)/100)).astype('int32')
 mask=np.zeros((N,N),np.uint8);cv.fillPoly(mask,[poly],1)
 k=cv.getStructuringElement(cv.MORPH_ELLIPSE,(17,17))
 seeds=np.where(cv.dilate(mask,k),cv.GC_PR_BGD,cv.GC_BGD).astype('uint8')
 seeds[mask>0]=cv.GC_PR_FGD;seeds[cv.erode(mask,k)>0]=cv.GC_FGD
 cv.setRNGSeed(42);cv.grabCut(src,seeds,None,np.zeros((1,65)),np.zeros((1,65)),5,cv.GC_INIT_WITH_MASK)
 mask=(seeds%2).astype('uint8');alpha=cv.GaussianBlur(mask.astype('float32'),(0,0),.62)
 # A small clean plate behind the moving outline; original scene elsewhere.
 edge=mask-cv.erode(mask,cv.getStructuringElement(cv.MORPH_ELLIPSE,(29,29)))
 plate=cv.inpaint(src,edge,4,cv.INPAINT_TELEA).astype('float32')
 foreground=cv.inpaint(src,(cv.dilate(mask,k)-mask),3,cv.INPAINT_TELEA).astype('float32')
 head=1-smooth(pivot[1]*N/100-13,pivot[1]*N/100+19,Y)
 jaw=field(pivot[0],pivot[1]-15,17,19);curl=field(*tips,9,15);arm=field(*hand,12,18)
 chest=field(*clasp,23,23);base=1-smooth(.52*N,1.14*N,Y)
 lumin=cv.cvtColor(src,cv.COLOR_RGB2GRAY).astype('float32')/255
 detail=np.clip((lumin-cv.GaussianBlur(lumin,(0,0),2.2))*3+.18,.06,1)
 cx,cy=np.array(clasp)*N/100;hx,hy=np.array(hand)*N/100
 for action,frames,step in [('hurt',33,25),('mana',49,30),('heal',45,30)]:
  seq=[]
  for i in range(frames):
   t=i/(frames-1)
   if action=='hurt':
    line=[(0,0),(.12,1),(.22,.88),(.56,-.18),(.77,.055),(1,0)]
    lean=pulse(t,line)*weight;follow=pulse(t,[(0,0),(.09,.06),(.22,1),(.53,-.22),(.83,.06),(1,0)])*weight
    dx=direction*(lean*(2.4*base+2.1*head)+2.4*follow*curl-1.9*lean*arm)
    dy=lean*(1.9*head+1.5*jaw-1.8*arm)-1.1*follow*curl
    angle=direction*lean*.055; light=0
   else:
    mana=action=='mana'
    line=[(0,0),(.17,-.16),(.46,1),(.62,.92),(1,0)] if mana else [(0,0),(.24,.64),(.5,1),(.82,-.10),(1,0)]
    lean=pulse(t,line)*weight;follow=pulse(t,[(0,0),(.2,-.1),(.58,1),(.82,.32),(1,0)])
    dx=direction*lean*(.85*head+(.8 if mana else -.65)*arm)+direction*follow*.95*curl
    dy=lean*(-1.9*head-(3.8 if mana else -1.2)*arm-(.8 if mana else 1.9)*chest)+.85*follow*curl
    angle=-direction*lean*(.031 if mana else .024)
    light=smooth(.06,.27,t)*(1-smooth(.63,.97,t))
   dx=dx-angle*(Y-pivot[1]*N/100)*head
   dy=dy+angle*(X-pivot[0]*N/100)*head
   art=foreground
   if light:
    if mana:
     # The card / weapon / gloved hand kindles first; light travels into the clasp.
     u=smooth(.22,.55,t);px=hx+(cx-hx)*u;py=hy+(cy-hy)*u
     dist=np.hypot(X-px,Y-py);span=5+26*smooth(.38,.70,t)
     spec=np.exp(-dist**2/(2*span**2))*(.30+1.4*detail)
     pinpoint=np.exp(-dist**2/10)+.65*np.exp(-np.abs(X-px)/.85-np.abs(Y-py)/5)+.55*np.exp(-np.abs(Y-py)/.8-np.abs(X-px)/6)
     tint=np.array([63,157,225]);glow=(spec+pinpoint)*light
    else:
     # A breathing wave climbs the garment. Narrow lit embroidery precedes soft fill.
     front=N*(.97-.61*smooth(.06,.84,t));band=np.exp(-((Y+.13*direction*(X-cx)-front)/(N*.085))**2)
     spec=(band*(.26+1.18*detail)+.15*chest)*(.24+.76*field(pivot[0],62,31,35))
     tint=np.array([78,194,130]);glow=spec*light
    art=foreground+(1-foreground/255)*glow[...,None]*tint
   mx=(X-dx).astype('float32');my=(Y-dy).astype('float32')
   def warp(a):return cv.remap(a,mx,my,cv.INTER_LINEAR,borderMode=cv.BORDER_REPLICATE)
   opacity=warp(alpha)[...,None];rendered=warp(art.astype('float32'))*opacity+plate*(1-opacity)
   # Preserve idle artwork exactly as all offsets and light settle.
   envelope=smooth(0,.06,t)*(1-smooth(.94,1,t))
   rgb=np.clip(src+(rendered-src)*envelope,0,255).astype('uint8');seq.append(Image.fromarray(rgb))
  # A shared palette prevents color crawl in the static architecture.
  samples=Image.new('RGB',(N*3,N*2))
  for j,f in enumerate([0,frames//6,frames//3,frames//2,2*frames//3,5*frames//6]):samples.paste(seq[f],(j%3*N,j//3*N))
  pal=samples.quantize(256,method=Image.Quantize.MEDIANCUT)
  seq=[im.quantize(palette=pal,dither=Image.Dither.NONE) for im in seq]
  dest=Path('client/public/art/npcs/reactions-v1')/name;dest.mkdir(parents=True,exist_ok=True)
  # GIF time is measured in centiseconds. Split fractional delays across frames.
  seq[0].save(dest/(action+'.gif'),save_all=True,append_images=seq[1:],optimize=False,disposal=1,
              duration=[10*(round((j+1)*step/10)-round(j*step/10)) for j in range(frames)])
  subprocess.run(['gifsicle','-O3','--batch',str(dest/(action+'.gif'))],check=True)
  print(name,action,flush=True)
if __name__=='__main__':
 for key in argv[1:] or RIG:run(key)

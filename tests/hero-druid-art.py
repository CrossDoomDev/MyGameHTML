"""Validate the packed pixel druid frames, alpha, true feet alternation and right-hand staff."""
from pathlib import Path
from PIL import Image
from hashlib import sha256
import numpy as np
source=Path(__file__).resolve().parents[1]/'assets'/'hero-druid.png'
raw=source.read_bytes()
assert sha256(raw).hexdigest() == 'dd42f14801a7f80ce5b0cbc431bd1fbf394742fb17562589104013cadd244f74', 'Hero artwork corrupted in transport'
image=Image.open(source).convert('RGBA')
assert image.size==(640,320),image.size
frames=np.asarray(image)
assert frames[0,0,3]==0,'hero cells must have transparent background'
for row in range(4):
 for frame in range(8):
  cell=frames[row*80:(row+1)*80,frame*80:(frame+1)*80,:]
  assert (cell[:,:,3]>128).sum()>180,'Missing pose %s/%s'%(row,frame)
  assert cell[:,:,3].min()==0,'No transparency in pose %s/%s'%(row,frame)
# Source row 0 is the forward-facing walk; the first two contact frames
# visibly alternate the leading LEFT and RIGHT boot.
def boot_bottom(frame,x0,x1):
 cell=frames[:80,frame*80:(frame+1)*80,:]
 leg=cell[49:66,x0:x1,:]
 brown=(leg[:,:,3]>180)&(leg[:,:,0]>leg[:,:,1]*1.12)&(leg[:,:,0]>leg[:,:,2]*1.2)&(leg[:,:,0]>40)
 yy=np.where(brown)[0]
 assert yy.size, 'missing boot pixels'
 return int(yy.max()+49)
first=boot_bottom(1,30,41)-boot_bottom(1,41,53)
opposite=boot_bottom(2,30,41)-boot_bottom(2,41,53)
assert first>=2 and opposite<=-2,('Boots must alternate, not blink',first,opposite)
# Independent RIGHT and LEFT source profiles. Facing right retains the hand
# and green crystal on the right; facing left retains them on the left.
def emeralds(row,frame,xa,xb):
 p=frames[row*80:(row+1)*80,frame*80+xa:frame*80+xb,:]
 return int(((p[:,:,3]>100)&(p[:,:,1]>p[:,:,0]*1.23)&(p[:,:,1]>p[:,:,2]*1.15)&(p[:,:,1]>90)).sum())
assert emeralds(1,0,0,40)>15 and emeralds(1,0,40,80)<4, 'Left staff in wrong hand'
assert emeralds(2,0,40,80)>10 and emeralds(2,0,0,40)<4, 'Right staff in wrong hand'
# The magic arc frame has visible energy in all four directions.
for row in range(4):
 assert emeralds(row,6,0,80)>90,('Magic attack absent',row)
print('PASS: compact druid, four views, opposite boot contacts, side-specific staff and magic attacks.')

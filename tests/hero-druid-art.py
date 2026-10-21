"""Check sprite fidelity, actual boot contacts and right/left staff orientation."""
from hashlib import sha256
from pathlib import Path
from PIL import Image

source=Path(__file__).resolve().parents[1]/'assets'/'hero-druid.png'
raw=source.read_bytes()
expected='dd42f14801a7f80ce5b0cbc431bd1fbf394742fb17562589104013cadd244f74'
assert sha256(raw).hexdigest()==expected,'Source PNG was damaged in transit'
image=Image.open(source).convert('RGBA')
assert image.size==(640,320),image.size
assert image.getpixel((0,0))[3]==0,'Transparent background expected'
def frame(row,column):
 return image.crop((column*80,row*80,(column+1)*80,(row+1)*80))
for row in range(4):
 for col in range(8):
  cell=frame(row,col)
  pixels=list(cell.getdata())
  assert sum(a>128 for _,_,_,a in pixels)>180,(row,col,'missing pose')
  assert min(a for _,_,_,a in pixels)==0,(row,col,'no transparency')
def boot_bottom(column,x0,x1):
 cell=frame(0,column)
 yy=[y for y in range(49,66) for x in range(x0,x1)
     if (lambda p:p[3]>180 and p[0]>p[1]*1.12 and p[0]>p[2]*1.2 and p[0]>40)(cell.getpixel((x,y)))]
 assert yy,'boot not found'
 return max(yy)
# Walk starts with left foot forward and then right foot forward.
first=boot_bottom(1,30,41)-boot_bottom(1,41,53)
second=boot_bottom(2,30,41)-boot_bottom(2,41,53)
assert first>=2 and second<=-2,('boots must alternate',first,second)
def emeralds(row,col,x0,x1):
 cell=frame(row,col)
 return sum(1 for y in range(80) for x in range(x0,x1)
  if (lambda p:p[3]>100 and p[1]>p[0]*1.23 and p[1]>p[2]*1.15 and p[1]>90)(cell.getpixel((x,y))))
# Source order is DOWN LEFT RIGHT UP. Neither side can mirror the other.
assert emeralds(1,0,0,40)>15 and emeralds(1,0,40,80)<4,'LEFT staff must remain on the left'
assert emeralds(2,0,40,80)>10 and emeralds(2,0,0,40)<4,'RIGHT staff must remain on the right'
for row in range(4):
 assert emeralds(row,6,0,80)>90,(row,'missing green magic attack')
print('PASS: 32 real painted poses, clean alpha, alternating boots, independent left/right hand, four magical attacks.')

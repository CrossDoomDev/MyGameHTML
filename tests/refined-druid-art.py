"""Validate the latest 48px pixel mage artwork and safe attack margins."""
from hashlib import sha256
from pathlib import Path
from PIL import Image

path=Path(__file__).resolve().parents[1]/'assets'/'hero-druid-refined.png'
assert sha256(path.read_bytes()).hexdigest()=='e2f7b24695818a80628e2f8d9a053f0d69cfbede901ab1b1fa24b8ef531ea5a4', 'Uploaded sprite differs from reviewed art'
sheet=Image.open(path).convert('RGBA')
assert sheet.size==(480,192)
def cell(row,col):
 return sheet.crop((col*48,row*48,(col+1)*48,(row+1)*48))
def green_count(img,start,end):
 return sum(1 for y in range(48) for x in range(start,end)
  if (lambda p:p[3]>100 and p[1]>p[0]*1.25 and p[1]>p[2]*1.1 and p[1]>100)(img.getpixel((x,y))))
for row in range(4):
 assert cell(row,0).tobytes()==cell(row,1).tobytes(), 'Idle must be completely still'
 legs=[]
 for col in range(10):
  sprite=cell(row,col)
  bbox=sprite.getchannel('A').point(lambda a:255 if a>80 else 0).getbbox()
  assert bbox and bbox[0]>=2 and bbox[1]>=2 and bbox[2]<=46 and bbox[3]<=46, (row,col,'staff or magic clipped',bbox)
  if 2<=col<=5: legs.append(sprite.crop((10,32,42,45)).tobytes())
 assert len(set(legs))>=3, (row,'walking feet must vary')
 assert green_count(cell(row,7),0,48)>100, (row,'attack arc missing')
assert green_count(cell(1,0),0,24)>10 and green_count(cell(1,0),24,48)<4, 'LEFT staff on wrong side'
assert green_count(cell(2,0),24,48)>10 and green_count(cell(2,0),0,24)<4, 'RIGHT staff on wrong side'
print('PASS: 40 detailed 48px druid frames, still idle, changing feet, uncut attacks, accurate right hand.')

#!/usr/bin/env python3
"""Inspect generated village atlas, locate detached bits and preview small props.

Run: python3 tools/audit_environment_art.py
No source art is modified.
"""
import base64
import io
from collections import deque
from PIL import Image, ImageDraw

ATLAS = 'assets/village-source.png'
SPECS = {
 'inn': ((0,0,402,355),(192,160)),
 'cottage': ((402,0,267,355),(144,152)),
 'forge': ((669,0,337,355),(144,144)),
 'cabin': ((1006,0,248,355),(112,144)),
 'oak': ((0,355,389,352),(112,112)),
 'pine': ((389,355,281,352),(80,112)),
 'birch': ((670,355,334,352),(104,104)),
 'bush': ((1004,466,250,242),(44,40)),
 'market': ((0,708,389,294),(128,96)),
 'lamp': ((422,707,187,295),(36,76)),
 'barrel': ((710,745,197,257),(23,30)),
 'crates': ((960,729,294,273),(38,35)),
 'anvil': ((0,1004,363,250),(44,32)),
 'logs': ((364,1004,305,250),(44,36)),
 'fence': ((670,1004,285,250),(36,28)),
 'crops': ((955,1004,299,250),(48,44)),
}
src=Image.open(ATLAS).convert('RGBA')
print('ATLAS',src.size,'alpha range',src.getchannel('A').getextrema())
out={}
for name,(rect,size) in SPECS.items():
 x,y,w,h=rect
 im=src.crop((x,y,x+w,y+h)).resize(size,Image.Resampling.NEAREST)
 out[name]=im
 a=im.getchannel('A')
 mask=a.load()
 seen=set()
 components=[]
 for yy in range(im.height):
  for xx in range(im.width):
   if (xx,yy) in seen or mask[xx,yy]<64:continue
   stack=[(xx,yy)];seen.add((xx,yy));points=[]
   while stack:
    X,Y=stack.pop();points.append((X,Y))
    for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
     nx,ny=X+dx,Y+dy
     if nx<0 or ny<0 or nx>=im.width or ny>=im.height or (nx,ny) in seen or mask[nx,ny]<64:continue
     stack.append((nx,ny));seen.add((nx,ny))
   xs=[p[0] for p in points];ys=[p[1] for p in points]
   components.append({'pixels':len(points),'bbox':[min(xs),min(ys),max(xs)+1,max(ys)+1]})
 components.sort(key=lambda x:-x['pixels'])
 tiny=[x for x in components if x['pixels']<18]
 print('SPRITE',name,'size',size,'bbox',a.getbbox(),'components',len(components),'big',components[:3],'tiny',tiny[:12])
# Diagnostic contact sheet with real extracted source regions on reference backgrounds.
order=['fence','crops','lamp','barrel','crates','anvil','logs','bush']
from PIL import ImageFont
cell_w=164;cell_h=160
sheet=Image.new('RGB',(cell_w*4,cell_h*2),'#597b41')
d=ImageDraw.Draw(sheet)
for i,name in enumerate(order):
 x=(i%4)*cell_w;y=(i//4)*cell_h
 d.rectangle((x+2,y+2,x+cell_w-2,y+cell_h-2),outline='#ffffff',width=1)
 im=out[name].resize((out[name].width*3,out[name].height*3),Image.Resampling.NEAREST)
 sheet.paste(im,(x+(cell_w-im.width)//2,y+15),im)
 d.text((x+8,y+132),name,fill='#ffffff')
buf=io.BytesIO();sheet.save(buf,format='PNG',optimize=True)
print('ATLAS_PREVIEW_BEGIN')
print(base64.b64encode(buf.getvalue()).decode())
print('ATLAS_PREVIEW_END')

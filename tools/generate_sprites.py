"""Original integer-grid character art. No external packages besides Pillow.

48x48 cells; rows down/left/right/up; columns idle(2), walk(4), attack(4).
Legacy creature/icon art only. SpriteCook NPCs are built by prepare_npcs.py.
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / 'assets'
OUT.mkdir(exist_ok=True)
P = {'outline':'#25271d','dark':'#334028','shade':'#53632b','cloth':'#748538',
     'light':'#a1ab50','skin':'#d9a775','skinlight':'#f2c897','hair':'#513627',
     'leather':'#694831','leatherlight':'#98704a','metal':'#b1b9a4','gem':'#78d379'}

def character(direction, frame, palette=None, role='hero'):
    p = {**P, **(palette or {})}
    im = Image.new('RGBA', (48,48)); d = ImageDraw.Draw(im)
    moving = 2 <= frame < 6; attacking = frame >= 6
    step = [0,0,-1,0,1,0,0,0,0,0][frame]
    bob = -1 if frame in (1,3,5,7) else 0
    # Draw a 24x32 character inside a 48px cell: anchor (24,42).
    def box(x,y,w,h,col): d.rectangle((x,y+bob,x+w-1,y+bob+h-1),fill=p.get(col,col))
    def poly(points,col): d.polygon([(x,y+bob) for x,y in points],fill=p.get(col,col))
    box(16,36+step,7,5,'outline'); box(25,36-step,7,5,'outline')
    box(17,36+step,5,3,'leather'); box(26,36-step,5,3,'leather')
    box(18,30,12,8,'dark'); box(20,32,3,5,'cloth'); box(26,32,3,5,'shade')
    poly([(17,22),(29,22),(32,32),(28,35),(16,33)],'outline')
    poly([(18,23),(28,23),(30,31),(27,33),(17,31)],'cloth')
    box(20,23,3,7,'light'); box(26,24,3,8,'shade')
    box(17,30,14,3,'leather'); box(23,30,3,2,'metal')
    if direction == 'up':
        poly([(13,17),(16,9),(23,5),(29,9),(33,17),(31,26),(17,26)],'outline')
        poly([(15,17),(18,10),(23,7),(27,10),(31,17),(29,24),(18,24)],'cloth')
        box(18,12,4,10,'light'); box(27,15,3,8,'shade')
        poly([(19,22),(24,27),(27,23)],'dark')
        box(16,25,4,8,'leather'); box(17,25,2,5,'leatherlight')
    else:
        poly([(13,18),(16,10),(23,5),(30,10),(34,19),(31,25),(16,25)],'outline')
        poly([(15,18),(18,11),(23,7),(28,11),(32,19),(30,23),(17,23)],'cloth')
        box(18,11,3,6,'light'); box(29,16,2,6,'shade')
        if direction == 'down':
            box(19,14,11,9,'hair'); box(20,15,9,8,'skin')
            box(21,15,6,2,'skinlight'); box(20,18,2,2,'outline'); box(27,18,2,2,'outline')
            box(23,22,4,1,'leather'); box(24,19,2,2,'skinlight')
        else:
            left=direction=='left'; x=15 if left else 25
            box(x,15,8,8,'hair'); box(x if left else x+1,16,7,6,'skin')
            box(x,16,6,2,'skinlight'); box(x+1 if left else x+5,18,2,2,'outline')
            box(x-1 if left else x+7,19,2,2,'skin')
            box(21 if left else 18,13,6,9,'shade')
    # Gloves and shoulder armor; the hand follows the staff during an attack.
    box(13,24+step,5,8,'outline'); box(14,25+step,3,5,'leatherlight')
    box(29,24-step,5,8,'outline'); box(30,25-step,3,5,'leatherlight')
    if role == 'hero':
        if attacking:
            phase=frame-6
            vectors={'down':[(12,25,31,36),(15,25,35,33),(19,25,38,27),(28,24,33,13)],
                     'up':[(30,27,32,12),(28,25,20,5),(25,25,13,10),(28,25,32,13)],
                     'left':[(18,27,28,13),(18,25,10,10),(18,25,5,24),(18,25,12,35)],
                     'right':[(30,27,23,13),(30,25,36,10),(30,25,43,24),(30,25,36,35)]}
            x1,y1,x2,y2=vectors[direction][phase]
        else:
            x1,y1,x2,y2 = (33,37,37,15) if direction!='left' else (12,37,9,15)
        d.line((x1,y1+bob,x2,y2+bob), fill=p['outline'],width=4)
        d.line((x1,y1+bob,x2,y2+bob), fill=p['leatherlight'],width=2)
        d.rectangle((x2-3,y2-4+bob,x2+3,y2+2+bob),fill=p['outline'])
        d.rectangle((x2-2,y2-3+bob,x2+2,y2+1+bob),fill=p['gem'])
        d.point((x2-1,y2-2+bob),fill='#d8ffd0')
    elif role == 'smith':
        box(18,25,10,8,'leather'); box(19,26,2,5,'leatherlight')
        box(33,22,2,13,'leather'); box(30,20,8,5,'metal')
    elif role == 'merchant':
        box(12,12,25,3,'outline'); box(15,10,19,3,'leatherlight'); box(18,7,13,4,'leatherlight')
    elif role == 'woman':
        poly([(18,25),(29,25),(33,36),(15,36)],'outline')
        poly([(19,26),(28,26),(31,34),(17,34)],'cloth'); box(21,27,6,7,'skinlight')
    return im

def sheet(name, palette=None, role='hero'):
    image = Image.new('RGBA',(480,192))
    for row,direction in enumerate(['down','left','right','up']):
        for col in range(10): image.paste(character(direction,col,palette,role),(col*48,row*48))
    image.save(OUT / f'{name}.png')

sheet('hero')
sheet('goblin',{'cloth':'#754c39','light':'#98784b','shade':'#4b3b29','skin':'#879052','skinlight':'#bbc174','gem':'#daab53'})

def creature(boss=False):
    cell = 64 if boss else 48
    image=Image.new('RGBA',(cell*8,cell))
    for f in range(8):
        im=Image.new('RGBA',(cell,cell)); d=ImageDraw.Draw(im); b=-(f%3==1)
        def r(x,y,w,h,c): d.rectangle((x,y+b,x+w-1,y+b+h-1),fill=c)
        if boss:
            # Antlered ancient forest guardian.
            for points in [[(21,18),(14,11),(13,3),(16,3),(17,10),(24,15)],[(42,18),(48,10),(48,3),(51,3),(51,12),(44,20)]]:
                d.polygon(points,fill='#534630')
            r(10,8,8,3,'#8d7948'); r(48,7,8,3,'#8d7948')
            r(17,20,31,31,'#242d26'); r(14,26,7,21,'#384b35'); r(45,26,7,21,'#384b35')
            r(21,18,23,32,'#506b3b'); r(25,20,5,22,'#718745'); r(35,26,7,19,'#344d32')
            r(23,15,19,16,'#2c392b'); r(25,16,15,13,'#6a7951')
            r(26,21,4,3,'#e8c96d'); r(35,21,4,3,'#e8c96d'); r(29,26,7,2,'#2c3024')
            r(20,47,10,9,'#352e25'); r(35,47,10,9,'#352e25'); r(23,48,4,6,'#736041')
            r(29,33,8,7,'#b69d52'); r(31,34,4,4,'#dcde97')
        else:
            # Round moss creature, four feet and fern leaves.
            d.polygon([(9,32+b),(11,22+b),(19,17+b),(30,17+b),(37,23+b),(39,33+b),(33,39+b),(15,39+b)],fill='#253b28')
            d.polygon([(12,31+b),(14,23+b),(21,20+b),(29,20+b),(34,25+b),(36,33+b),(31,36+b),(17,36+b)],fill='#6a8643')
            r(15,25,5,8,'#9cb253'); r(31,29,4,6,'#426537')
            r(18,27,3,4,'#262c1e'); r(29,27,3,4,'#262c1e'); r(19,27,1,1,'#f0e5b8'); r(30,27,1,1,'#f0e5b8')
            r(23,33,5,2,'#39492b'); r(14,37+(f%2),6,4,'#6b5637'); r(29,37-(f%2),6,4,'#6b5637')
            d.polygon([(23,20+b),(16,12+b),(22,14+b),(24,7+b),(27,14+b),(32,11+b),(29,20+b)],fill='#446a33')
            r(24,12,2,6,'#a4bc57')
        image.paste(im,(f*cell,0))
    image.save(OUT / ('guardian.png' if boss else 'mossling.png'))
creature(); creature(True)

# Inventory icons on an exact 24px grid.
icons=Image.new('RGBA',(24*8,24)); d=ImageDraw.Draw(icons)
def icon(i):
    def r(x,y,w,h,c): d.rectangle((i*24+x,y,i*24+x+w-1,y+h-1),fill=c)
    return r
r=icon(0); r(6,6,3,15,'#4d3524'); r(7,6,2,15,'#b39153'); r(5,3,9,8,'#453b28'); r(7,4,5,5,'#6fad68'); r(8,4,2,2,'#c8ec91')
r=icon(1); r(8,5,8,3,'#3f6a2c'); r(6,8,11,9,'#69913e'); r(8,7,6,7,'#a0bb55'); r(11,9,2,12,'#54752d'); r(5,15,6,4,'#799c3c')
r=icon(2); r(9,3,6,4,'#bb9972'); r(10,7,4,3,'#ced5c1'); r(7,10,10,11,'#e2cfaa'); r(8,12,8,8,'#a63d31'); r(9,13,2,5,'#f28757'); r(8,10,2,2,'#ffffd6')
r=icon(3); r(5,9,13,9,'#5c402c'); r(7,7,11,10,'#ac7d44'); r(7,9,3,6,'#deac5e'); r(16,8,3,9,'#735330')
r=icon(4); r(5,7,14,13,'#392e24'); r(6,8,12,11,'#906b41'); r(9,4,6,4,'#b58b54'); r(8,12,8,2,'#c0a073'); r(12,12,2,3,'#e4c788')
r=icon(5); r(4,5,16,15,'#e3cf9a'); r(6,6,3,13,'#b79a62'); r(15,6,3,13,'#b79a62'); r(10,9,2,4,'#759051'); r(12,14,4,2,'#729ba2')
r=icon(6); r(6,4,14,17,'#604631'); r(5,4,12,17,'#9d7850'); r(7,5,8,15,'#d5bd8a'); r(9,8,5,1,'#9d8057'); r(9,12,5,1,'#9d8057'); r(9,16,4,1,'#9d8057')
r=icon(7); r(9,3,6,18,'#afaf92'); r(3,9,18,6,'#afaf92'); r(5,5,14,14,'#afaf92'); r(7,7,10,10,'#52584c'); r(9,9,6,6,'#bac2ae')
icons.save(OUT/'icons.png')
# Keep curated hero/NPC metadata and SpriteCook artwork intact.
print('Generated legacy hero, goblin, mossling, guardian and icon atlases')

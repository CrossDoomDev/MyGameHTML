from pathlib import Path
import json, hashlib
from PIL import Image
root=Path(__file__).resolve().parents[1]
source=Image.open(root/'assets/npc-source.png').convert('RGBA')
# The SpriteCook sheet is a verified 5-column / 4-direction grid.
# Every role uses one scale across all views, not per-frame auto-fitting.
roles=['elder','smith','merchant','villager','fisher']
for col,role in enumerate(roles):
    poses=[source.crop((col*64,row*64,(col+1)*64,(row+1)*64)) for row in range(4)]
    boxes=[im.getbbox() for im in poses]
    scale=35/max(box[3]-box[1] for box in boxes)
    sheet=Image.new('RGBA',(48,192))
    for row,(im,box) in enumerate(zip(poses,boxes)):
        cut=im.crop(box)
        cut=cut.resize((round(cut.width*scale),round(cut.height*scale)),Image.Resampling.NEAREST)
        sheet.alpha_composite(cut,((48-cut.width)//2,row*48+42-cut.height))
    sheet.save(root/f'assets/{role}.png')
manifest_path=root/'assets/spritecook-assets.json'
manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
for file in ['npc-source',*roles]:
    path=root/f'assets/{file}.png'
    manifest[f'assets/{file}.png']={'asset_id':'dd3983d1-316e-4a44-8c31-ce152d3ae46c','sha12':hashlib.sha256(path.read_bytes()).hexdigest()[:12],'label':f'Tiholesye NPC {file}'}
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
meta_path=root/'assets/sprites.json';meta=json.loads(meta_path.read_text())
meta['npcs']={'source':'assets/npc-source.png','sourceGrid':[5,4],'roles':roles,'cell':[48,48],'anchor':[24,42],'directions':['down','left','right','up'],'animations':{'idle':[0]},'build':'tools/prepare_npcs.py'}
meta_path.write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
print('Prepared five NPC sprites with four directions each.')

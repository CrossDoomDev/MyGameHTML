"""Pack the reviewed SpriteCook contacts/passing poses without foot auto-cropping.

The support/raised boot heights are part of the animation. Align the body with
one anchor per direction, never move each frame to its lowest opaque pixel.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/hero-walk-source.png'
source = Image.open(SOURCE).convert('RGBA')
assert source.size == (256, 256), 'Expected the reviewed four-by-four SpriteCook sheet'
sheet = Image.new('RGBA', (320, 320))
anchors = [(32, 54), (32, 52), (33, 53), (32, 56)]
scale = 54 / 64
for row, (ax, ay) in enumerate(anchors):
    for frame in range(4):
        cell = source.crop((frame*64, row*64, (frame+1)*64, (row+1)*64))
        # In the source only column zero's torso is one pixel to the right.
        if frame == 0:
            aligned = Image.new('RGBA', (64, 64))
            aligned.alpha_composite(cell, (-1, 0))
            cell = aligned
        cell = cell.resize((54, 54), Image.Resampling.NEAREST)
        sheet.alpha_composite(cell, (frame*80+40-round(ax*scale), row*80+64-round(ay*scale)))
sheet.save(ROOT / 'assets/hero-walk.png')

manifest_path = ROOT / 'assets/spritecook-assets.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
for filename, asset_id, label in [
    ('hero-reference.png', '6b4cfd3b-d607-4e6a-a960-802dad3c1fdd', 'Canonical hero appearance'),
    ('hero-walk-guide.png', 'ef557964-676b-4d5b-9583-2079284ab612', 'Alternating contact and passing pose guide'),
    ('hero-walk-source.png', '3c207647-6ff1-4745-b661-2a0c176cb52d', 'SpriteCook redrawn four-direction walk'),
    ('hero-walk.png', '3c207647-6ff1-4745-b661-2a0c176cb52d', 'Packed four-direction walk'),
]:
    file = ROOT / 'assets' / filename
    manifest['assets/'+filename] = {'asset_id': asset_id, 'sha12': hashlib.sha256(file.read_bytes()).hexdigest()[:12], 'label': label}
manifest_path.write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
metadata_path = ROOT / 'assets/sprites.json'
metadata = json.loads(metadata_path.read_text(encoding='utf-8'))
metadata['generatedHero']['walk'] = {
    'source': 'assets/hero-walk-source.png', 'atlas': 'assets/hero-walk.png',
    'cell': [80, 80], 'anchor': [40, 64], 'sourceAnchors': anchors,
    'sourceScale': scale, 'directions': ['down', 'left', 'right', 'up'],
    'phases': ['left_contact', 'right_passing', 'right_contact', 'left_passing'],
    'destinationColumns': [2, 3, 4, 5], 'cycleMs': 420,
    'build': 'tools/prepare_hero_walk.py',
}
metadata_path.write_text(json.dumps(metadata, indent=2)+'\n', encoding='utf-8')

# Review the precise delivered pixels, including the fourth-to-first seam.
qa = ROOT / '.qa'
qa.mkdir(exist_ok=True)
contact = Image.new('RGBA', (320, 320), '#40583b')
contact.alpha_composite(sheet)
contact.resize((960, 960), Image.Resampling.NEAREST).save(qa / 'hero-walk-contact.png')
frames = []
for phase in range(4):
    preview = Image.new('RGBA', (320, 100), '#40583b')
    draw = ImageDraw.Draw(preview)
    for row, label in enumerate(['DOWN', 'LEFT', 'RIGHT', 'UP']):
        draw.text((row*80+12, 0), label, fill='#dfd8aa')
        draw.line((row*80, 80, row*80+79, 80), fill='#789a66')
        preview.alpha_composite(sheet.crop((phase*80, row*80, (phase+1)*80, (row+1)*80)), (row*80, 16))
    frames.append(preview.convert('RGB').resize((960, 300), Image.Resampling.NEAREST))
frames[0].save(qa / 'hero-walk-loop.gif', save_all=True, append_images=frames[1:], duration=105, loop=0)
print('Prepared 16 reviewed walk poses; fixed body anchors, alternating contacts/passing poses, 420ms loop.')

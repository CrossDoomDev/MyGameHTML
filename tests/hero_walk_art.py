"""Artwork checks: actual boot pixels must alternate, not just frame numbers."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
atlas = Image.open(ROOT / 'assets/hero-walk.png').convert('RGBA')
assert atlas.size == (320, 320)
for row in range(4):
    lower_bodies = []
    feet = []
    for frame in range(4):
        cell = atlas.crop((frame*80, row*80, (frame+1)*80, (row+1)*80))
        bounds = cell.getbbox()
        assert bounds and 0 < bounds[0] < bounds[2] < 80 and bounds[3] < 80
        lower_bodies.append(cell.crop((30, 54, 49, 67)).tobytes())
        # The emerald must remain in the carried staff outside the torso.
        emerald = [cell.getpixel((x, y)) for x in list(range(20, 31))+list(range(50, 60)) for y in range(25, 50)]
        assert any(a and g > 100 and g > r*1.2 and g > b*1.05 for r, g, b, a in emerald), (row, frame, 'staff vanished')
        if row in (0, 3):
            bottoms = []
            for start, end in [(33, 40), (40, 47)]:
                brown_boot = [y for x in range(start, end) for y in range(56, 67)
                              if cell.getpixel((x, y))[3] and cell.getpixel((x, y))[0] > cell.getpixel((x, y))[1]*1.13]
                assert brown_boot, (row, frame, 'boot missing')
                bottoms.append(max(brown_boot))
            feet.append(bottoms[1]-bottoms[0])
    assert len(set(lower_bodies)) == 4, (row, 'walk contains duplicate lower-body poses')
    if feet:
        assert feet[0] >= 3 and feet[2] <= -3, (row, feet, 'opposite contact boots must lead')
        assert feet[1] <= -2 and feet[3] >= 2, (row, feet, 'passing poses must lift opposite boots')

manifest = json.loads((ROOT / 'assets/spritecook-assets.json').read_text(encoding='utf-8'))
for name in ['hero-reference.png', 'hero-walk-guide.png', 'hero-walk-source.png', 'hero-walk.png']:
    key = 'assets/'+name
    assert hashlib.sha256((ROOT / key).read_bytes()).hexdigest()[:12] == manifest[key]['sha12']
print('PASS: 16 distinct walk poses, opposite boot contacts/passing heights, staff presence, frame bounds and SpriteCook hashes.')

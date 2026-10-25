"""Check the new hand-generated forest HUD assets before deploying Pages."""
from pathlib import Path
from PIL import Image
p=Path('assets')
for name, expected in [('forest-hud-frame.png',(220,77)),('forest-hud-icons.png',(256,64))]:
    file=p/name
    assert file.exists(), f'Missing actual HUD artwork: {file}'
    with Image.open(file) as im:
        im.load()  # force decode and verify PNG integrity/CRC
        assert im.size==expected, f'Wrong HUD sprite-sheet size: {name}: {im.size}'
        assert im.mode in ('P','RGBA'), f'Unexpected color mode for {name}'
        if im.mode=='P':
            assert 'transparency' in im.info, f'Transparency lost for {name}'
        else:
            assert im.getchannel('A').getextrema()[0]<255, f'No alpha channel on {name}'
        rgba=im.convert('RGBA')
        assert rgba.getpixel((0,0))[3]<10,'HUD artwork must be transparent at edges'
        print('PASS:',name,im.size,'pixel-art alpha + decoder verified')

from pathlib import Path
from PIL import Image
import struct
p=Path("assets/tavern-redrawn.webp")
data=p.read_bytes()
assert data[:4]==b"RIFF" and data[8:12]==b"WEBP", "Not WebP"
assert struct.unpack_from("<I",data,4)[0]+8==len(data), f"Invalid RIFF size: declared {struct.unpack_from('<I',data,4)[0]+8}, actual {len(data)}"
with Image.open(p) as image:
 image.load()
 assert image.size==(160,160),image.size
 assert image.mode in {"RGBA","RGB"},image.mode
 print("Tavern art valid:",image.size,len(data),"bytes")

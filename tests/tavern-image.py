from pathlib import Path
from PIL import Image
import struct
p=Path("assets/tavern-redrawn.webp")
data=p.read_bytes()
assert data[:4]==b"RIFF" and data[8:12]==b"WEBP", "Not WebP"
declared=struct.unpack_from("<I",data,4)[0]+8
if len(data)==declared+1:
 print("One extra byte detected; testing trailing-byte repair",flush=True)
 from io import BytesIO
 with Image.open(BytesIO(data[:declared])) as check:
  check.load()
  print("Trimmed frame decodes successfully:",check.size,check.mode,flush=True)
assert declared==len(data), f"Invalid RIFF size: declared {declared}, actual {len(data)}"
with Image.open(p) as image:
 image.load()
 assert image.size==(160,160),image.size
 assert image.mode in {"RGBA","RGB"},image.mode
 print("Tavern art valid:",image.size,len(data),"bytes")

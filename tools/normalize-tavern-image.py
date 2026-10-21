"""Normalize the one superfluous trailing byte introduced by a binary upload."""
from pathlib import Path
from io import BytesIO
from PIL import Image
import struct

path=Path("assets/tavern-redrawn.webp")
data=path.read_bytes()
if data[:4]!=b"RIFF" or data[8:12]!=b"WEBP":
 raise SystemExit("Tavern is not a WebP RIFF image")
declared=struct.unpack_from("<I",data,4)[0]+8
if len(data)==declared+1:
 data=data[:declared]
 with Image.open(BytesIO(data)) as im:
  im.load()
  assert im.size==(160,160)
 path.write_bytes(data)
 print("Repaired harmless trailing byte:",len(data),"bytes")
elif len(data)!=declared:
 raise SystemExit(f"Unexpected WebP damage: declared {declared}, actual {len(data)}")
else:
 print("Tavern WebP already normalized")

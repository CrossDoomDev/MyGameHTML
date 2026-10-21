from pathlib import Path
from PIL import Image
import struct
import hashlib
p=Path("assets/tavern-redrawn.webp")
data=p.read_bytes()
# Compare against the exact validated artwork source. A WebP file can remain
# syntactically decodable even when its image blocks were silently damaged
# during a Base64 upload (multicolour artifacts appeared in the lower facade).
expected_sha256='199f704f20d597a32572d12137ec8363a37b6ddb34e93a282c475f2a9b16003c'
actual_sha256=hashlib.sha256(data).hexdigest()
assert actual_sha256==expected_sha256, (
 f'Tavern artwork differs from the validated source: {actual_sha256}. '
 'Restore the correct source asset, or intentionally validate and update this checksum.'
)
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
 assert image.getchannel('A').getextrema()[0]==0,'transparent background expected'
 assert image.mode in {"RGBA","RGB"},image.mode
 print("Tavern art valid:",image.size,len(data),"bytes")

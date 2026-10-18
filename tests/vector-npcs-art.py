#!/usr/bin/env python3
"""Validate five transparent four-direction vector NPC sheets."""
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SVG = "{http://www.w3.org/2000/svg}"
names = ("elder", "smith", "merchant", "villager", "fisher")
for name in names:
    file = ROOT / "assets" / f"vector-{name}.svg"
    root = ET.parse(file).getroot()
    assert root.tag == SVG+"svg", (name, "invalid SVG")
    assert root.get("viewBox") == "0 0 48 192", (name, "wrong frame proportions")
    assert root.get("width") == "384" and root.get("height") == "1536", (name,"wrong raster size")
    groups = [node for node in root.findall("./"+SVG+"g") if node.get("id")]
    assert [node.get("id") for node in groups] == ["down","left","right","up"],name
    for g in groups:
        assert len(g.findall(".//"+SVG+"path")) >= 9, (name,g.get("id"))
    assert "translate(48 0) scale(-1 1)" in file.read_text(encoding="utf-8"), name
    assert len(root.findall(".//"+SVG+"linearGradient")) >= 4,name
    assert not root.findall("./"+SVG+"rect"),(name,"background rect found")
    print(f"[VECTOR] {name}: four poses, 384px source frames, transparent SVG")
print("[VECTOR NPC] OK")

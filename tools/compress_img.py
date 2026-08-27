from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / "img"
sizes = {
    "dash-bg.png": 1600,
    "gauge-face.png": 900,
    "lcd-panel.png": 640,
    "radio-face.png": 900,
    "weather-icons.png": 600,
    "knob.png": 256,
    "needle.png": 400,
    "favicon.png": 256,
}

for name, max_side in sizes.items():
    src = root / name
    if not src.exists():
        print("skip", name)
        continue
    im = Image.open(src)
    if im.mode in ("P", "LA"):
        im = im.convert("RGBA")
    elif im.mode == "CMYK":
        im = im.convert("RGB")
    w, h = im.size
    scale = min(1.0, max_side / max(w, h))
    if scale < 1:
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    webp = src.with_suffix(".webp")
    im.save(webp, "WEBP", quality=78, method=6)
    print(f"{name} {w}x{h} -> {im.size[0]}x{im.size[1]} {webp.stat().st_size // 1024}kb")

fav = Image.open(root / "favicon.png")
if fav.mode != "RGBA":
    fav = fav.convert("RGBA")
for side in (192, 512):
    out = fav.copy()
    out.thumbnail((side, side), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(out, ((side - out.size[0]) // 2, (side - out.size[1]) // 2))
    canvas.save(root / f"icon-{side}.png", "PNG", optimize=True)
    canvas.save(root / f"icon-{side}.webp", "WEBP", quality=82, method=6)
    print("icon", side, canvas.stat().st_size if False else (root / f"icon-{side}.png").stat().st_size // 1024, "kb png")

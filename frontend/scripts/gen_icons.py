"""Generate Android app icons for all mipmap densities."""
import os, sys
from PIL import Image, ImageDraw

sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

base_dir = os.path.join(os.path.dirname(__file__), '..', 'android', 'app', 'src', 'main', 'res')
base_dir = os.path.normpath(base_dir)

for folder, sz in sizes.items():
    out = os.path.join(base_dir, folder)
    os.makedirs(out, exist_ok=True)
    
    img = Image.new('RGBA', (sz, sz), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = sz // 2, sz // 2
    r = sz * 0.46

    # Blue circle background
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(26, 82, 118, 255))

    # Green inner shape (simplified map)
    sr = r * 0.55
    d.ellipse([cx - sr * 0.3, cy - sr * 0.3, cx + sr, cy + sr * 0.7], fill=(46, 204, 113, 200))

    # Gold ring (route)
    rr = r * 0.4
    lw = max(1, sz // 40)
    d.arc([cx - rr, cy - rr, cx + rr, cy + rr], 0, 360, fill=(241, 196, 15, 200), width=lw)

    # White runner dot
    dr = sz // 25
    rx, ry = cx + sz * 0.12, cy - sz * 0.18
    d.ellipse([rx - dr, ry - dr, rx + dr, ry + dr], fill=(255, 255, 255, 255))

    # Runner body lines
    d.line([rx, ry + dr, rx + 2, ry + dr * 3, rx + 5, ry + dr * 5], fill=(255, 255, 255, 255), width=lw)
    d.line([rx + 2, ry + dr * 3, rx - dr * 2, ry + dr * 4], fill=(255, 255, 255, 255), width=lw)
    d.line([rx + 2, ry + dr * 3, rx + dr * 3, ry + dr * 4], fill=(255, 255, 255, 255), width=lw)

    img.save(os.path.join(out, 'ic_launcher.png'))
    img.save(os.path.join(out, 'ic_launcher_round.png'))
    print(f'OK {folder} {sz}px')

print('DONE - All icons generated')

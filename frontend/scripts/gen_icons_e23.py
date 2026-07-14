"""E23跑起来 - Generate Android app icons (方案四)
Color palette (from approved design):
  - #0D2B45 dark blue (background top)
  - #1E3A5F dark blue (background mid)
  - #F28C22 orange (sunset, accents)
  - #FAD7A0 light orange (sand mid)
  - #FFF4E0 cream (sand top)
  - #FFFFFF white (E23 text, runner)
"""
import os
from PIL import Image, ImageDraw

# Color palette
DARK_BLUE = (13, 43, 69)
MID_BLUE = (30, 58, 95)
ORANGE = (242, 140, 34)
SAND_LIGHT = (250, 215, 160)
CREAM = (255, 244, 224)
WHITE = (255, 255, 255)


def draw_icon(size: int, corner_radius_ratio: float = 0.22) -> Image.Image:
    """Draw E23 app icon at the given size with rounded square background."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Rounded square background — vertical gradient from dark blue to mid blue
    for y in range(size):
        t = y / max(1, size - 1)
        r = int(DARK_BLUE[0] * (1 - t) + MID_BLUE[0] * t)
        g = int(DARK_BLUE[1] * (1 - t) + MID_BLUE[1] * t)
        b = int(DARK_BLUE[2] * (1 - t) + MID_BLUE[2] * t)
        d.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # Mask to rounded square
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    radius = int(size * corner_radius_ratio)
    md.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=radius, fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)

    d = ImageDraw.Draw(out)

    # Sand dunes (orange/cream wavy shapes at the bottom)
    dune_y = int(size * 0.62)
    # Bottom dune — orange
    d.ellipse(
        [-int(size * 0.15), dune_y, int(size * 1.15), int(size * 1.25)],
        fill=ORANGE,
    )
    # Mid dune — sand light
    d.ellipse(
        [int(size * 0.15), dune_y - int(size * 0.05), int(size * 0.95), int(size * 1.05)],
        fill=SAND_LIGHT,
    )
    # Top crest — cream
    d.ellipse(
        [int(size * 0.30), dune_y - int(size * 0.10), int(size * 0.80), int(size * 0.95)],
        fill=CREAM,
    )

    # Sun (sunset glow)
    sun_cx = int(size * 0.50)
    sun_cy = int(size * 0.55)
    sun_r = int(size * 0.10)
    d.ellipse(
        [sun_cx - sun_r, sun_cy - sun_r, sun_cx + sun_r, sun_cy + sun_r],
        fill=(255, 230, 180, 220),
    )

    # E23 text — top
    text_y = int(size * 0.10)
    # Use large white text
    try:
        from PIL import ImageFont
        font_path = "C:\\Windows\\Fonts\\Arial Black.ttf"
        if not os.path.exists(font_path):
            font_path = "C:\\Windows\\Fonts\\arialbd.ttf"
        if os.path.exists(font_path):
            font = ImageFont.truetype(font_path, int(size * 0.28))
        else:
            font = ImageFont.load_default()
    except Exception:
        font = ImageFont.load_default()

    # Draw E23
    text = "E23"
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(
        ((size - tw) / 2 - bbox[0], text_y - bbox[1]),
        text,
        font=font,
        fill=DARK_BLUE,
    )

    # 跑起来 (under E23)
    try:
        from PIL import ImageFont
        cn_font_path = "C:\\Windows\\Fonts\\msyhbd.ttc"
        if not os.path.exists(cn_font_path):
            cn_font_path = "C:\\Windows\\Fonts\\simhei.ttf"
        if not os.path.exists(cn_font_path):
            cn_font_path = "C:\\Windows\\Fonts\\simsun.ttc"
        if os.path.exists(cn_font_path):
            cn_font = ImageFont.truetype(cn_font_path, int(size * 0.08))
        else:
            cn_font = ImageFont.load_default()
    except Exception:
        cn_font = ImageFont.load_default()

    sub_text = "跑起来"
    sbbox = d.textbbox((0, 0), sub_text, font=cn_font)
    sw, sh = sbbox[2] - sbbox[0], sbbox[3] - sbbox[1]
    d.text(
        ((size - sw) / 2 - sbbox[0], int(size * 0.36) - sbbox[1]),
        sub_text,
        font=cn_font,
        fill=DARK_BLUE,
    )

    # 3 runner silhouettes (leader + 2 followers) — small dark figures on dune
    runner_y = int(size * 0.78)
    # Leader (front, larger)
    for i, (offset_x, scale) in enumerate([(0.55, 1.0), (0.40, 0.85), (0.30, 0.75)]):
        rx = int(size * offset_x)
        ry = runner_y - int(size * 0.05 * i)
        rs = int(size * 0.06 * scale)
        # head
        d.ellipse([rx - rs, ry - rs * 2, rx + rs, ry], fill=DARK_BLUE)
        # body
        d.line(
            [
                (rx, ry),
                (rx + int(rs * 0.4), ry + int(rs * 2.5)),
            ],
            fill=DARK_BLUE,
            width=max(1, int(rs * 0.5)),
        )
        # legs
        d.line(
            [
                (rx + int(rs * 0.4), ry + int(rs * 2.5)),
                (rx - int(rs * 0.3), ry + int(rs * 4)),
            ],
            fill=DARK_BLUE,
            width=max(1, int(rs * 0.4)),
        )
        d.line(
            [
                (rx + int(rs * 0.4), ry + int(rs * 2.5)),
                (rx + int(rs * 1.0), ry + int(rs * 4)),
            ],
            fill=DARK_BLUE,
            width=max(1, int(rs * 0.4)),
        )
        # arms
        d.line(
            [
                (rx + int(rs * 0.2), ry + int(rs * 0.8)),
                (rx - int(rs * 0.3), ry + int(rs * 1.5)),
            ],
            fill=DARK_BLUE,
            width=max(1, int(rs * 0.3)),
        )
        d.line(
            [
                (rx + int(rs * 0.2), ry + int(rs * 0.8)),
                (rx + int(rs * 0.8), ry + int(rs * 1.8)),
            ],
            fill=DARK_BLUE,
            width=max(1, int(rs * 0.3)),
        )

    return out


def main():
    sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    base_dir = r"D:\workbuddy制作文件\全民环游中国虚拟跑步地图_V1\frontend\android\app\src\main\res"

    for folder, sz in sizes.items():
        out_dir = os.path.join(base_dir, folder)
        os.makedirs(out_dir, exist_ok=True)
        # Square icon
        img = draw_icon(sz)
        img.save(os.path.join(out_dir, "ic_launcher.png"))
        # Round icon (same with circle mask)
        round_mask = Image.new("L", (sz, sz), 0)
        ImageDraw.Draw(round_mask).ellipse([(0, 0), (sz - 1, sz - 1)], fill=255)
        round_img = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
        round_img.paste(img, (0, 0), round_mask)
        round_img.save(os.path.join(out_dir, "ic_launcher_round.png"))
        print(f"OK {folder} {sz}x{sz}")

    # Adaptive icon — foreground (centered) and background (full blue)
    fg_size = 432
    fg = draw_icon(fg_size, corner_radius_ratio=0.0)
    fg_dir = os.path.join(base_dir, "mipmap-xxxhdpi")
    # Save foreground with center padding to suit adaptive icon
    pad = 60
    fg_padded = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
    fg_padded.paste(fg, (-pad, -pad))
    fg_padded.save(os.path.join(fg_dir, "ic_launcher_foreground.png"))
    print("OK adaptive foreground")

    bg = Image.new("RGBA", (fg_size, fg_size), DARK_BLUE + (255,))
    bg.save(os.path.join(fg_dir, "ic_launcher_background.png"))
    print("OK adaptive background")

    print("DONE — E23 跑起来 icons generated")


if __name__ == "__main__":
    main()

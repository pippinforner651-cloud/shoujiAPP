"""Generate and validate the E23 launcher and PWA icons.

Run from any directory with the bundled Python runtime. Requires Pillow.
The adaptive foreground stays inside Android's 66x66 safe zone on a 108 unit canvas.
"""

from pathlib import Path
from PIL import Image, ImageDraw

ORANGE = (242, 140, 34, 255)
WHITE = (255, 255, 255, 255)
NAVY = (24, 50, 74, 255)
ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
PUBLIC_ICONS = ROOT / "public" / "icons"

LEGACY_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
ADAPTIVE_SIZES = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}


def _draw_route_mark(draw: ImageDraw.ImageDraw, size: int, *, inset: float) -> None:
    left = size * inset
    right = size * (1 - inset)
    top = size * inset
    bottom = size * (1 - inset)
    middle = size * 0.50
    mid_right = size * 0.64
    stroke = max(3, round(size * 0.095))
    node = max(2, round(size * 0.045))
    lines = [
        (left, top, right, top),
        (left, top, left, bottom),
        (left, middle, mid_right, middle),
        (left, bottom, right, bottom),
    ]
    for line in lines:
        draw.line(line, fill=WHITE, width=stroke, joint="curve")
    for x, y in ((left, top), (mid_right, middle), (right, bottom)):
        draw.ellipse((x-node, y-node, x+node, y+node), fill=NAVY)


def regular_icon(size: int, *, round_icon: bool = False) -> Image.Image:
    scale = 4
    canvas = Image.new("RGBA", (size * scale, size * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    radius = size * scale // 2 if round_icon else round(size * scale * 0.22)
    draw.rounded_rectangle((0, 0, size * scale - 1, size * scale - 1), radius=radius, fill=ORANGE)
    _draw_route_mark(draw, size * scale, inset=0.25)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def adaptive_foreground(size: int) -> Image.Image:
    scale = 2
    canvas = Image.new("RGBA", (size * scale, size * scale), (0, 0, 0, 0))
    _draw_route_mark(ImageDraw.Draw(canvas), size * scale, inset=0.25)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def generate() -> None:
    for folder, size in LEGACY_SIZES.items():
        output = RES / folder
        output.mkdir(parents=True, exist_ok=True)
        regular_icon(size).save(output / "ic_launcher.png")
        regular_icon(size, round_icon=True).save(output / "ic_launcher_round.png")

    for folder, size in ADAPTIVE_SIZES.items():
        output = RES / folder
        output.mkdir(parents=True, exist_ok=True)
        adaptive_foreground(size).save(output / "ic_launcher_foreground.png")

    Image.new("RGBA", (432, 432), ORANGE).save(
        RES / "mipmap-xxxhdpi" / "ic_launcher_background.png"
    )

    PUBLIC_ICONS.mkdir(parents=True, exist_ok=True)
    regular_icon(192).save(PUBLIC_ICONS / "icon-192x192.png")
    regular_icon(512).save(PUBLIC_ICONS / "icon-512x512.png")


def validate() -> None:
    for folder, size in LEGACY_SIZES.items():
        for name in ("ic_launcher.png", "ic_launcher_round.png"):
            image = Image.open(RES / folder / name)
            assert image.size == (size, size), f"wrong size: {folder}/{name}"
    for folder, size in ADAPTIVE_SIZES.items():
        image = Image.open(RES / folder / "ic_launcher_foreground.png").convert("RGBA")
        assert image.size == (size, size), f"wrong foreground size: {folder}"
        assert image.getpixel((0, 0))[3] == 0, f"foreground corner must be transparent: {folder}"
    assert Image.open(RES / "mipmap-xxxhdpi" / "ic_launcher_background.png").size == (432, 432)
    for size in (192, 512):
        assert Image.open(PUBLIC_ICONS / f"icon-{size}x{size}.png").size == (size, size)


if __name__ == "__main__":
    generate()
    validate()
    print("E23 icons generated and validated")

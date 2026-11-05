# Builds every app icon from the supplied artwork. Never edit the outputs by hand.
# Usage: python scripts/build-app-icons.py   (needs Pillow)
# Input:  assets/brand/icon-source.webp  (a mockup: artwork on a rounded card with a drop shadow)
# Output: assets/images/{icon,android-icon-foreground,android-icon-monochrome,splash-icon,favicon}.png
#
# Stores apply their own corner mask and reject transparency on iOS, so the card and shadow are dropped
# and the artwork alone is placed on a full-bleed white square.
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets' / 'brand' / 'icon-source.webp'
OUT = ROOT / 'assets' / 'images'
WHITE = (255, 255, 255, 255)
# The drawing, well inside the card, so no shadow or card edge is picked up.
ART_SEARCH_BOX = (215, 225, 1040, 985)


def extract_art() -> Image.Image:
    """Crops to the drawing itself and returns it on white."""
    region = Image.open(SOURCE).convert('RGB').crop(ART_SEARCH_BOX)
    difference = ImageChops.difference(region, Image.new('RGB', region.size, (255, 255, 255))).convert('L')
    box = difference.point(lambda value: 255 if value > 24 else 0).getbbox()
    return region.crop(box).convert('RGBA')


def on_canvas(art: Image.Image, size: int, fill: float, background) -> Image.Image:
    """Centers art so its longer side covers `fill` of the canvas."""
    scale = size * fill / max(art.size)
    resized = art.resize((round(art.width * scale), round(art.height * scale)), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), background)
    canvas.paste(resized, ((size - resized.width) // 2, (size - resized.height) // 2))
    return canvas


def monochrome(art: Image.Image, size: int, fill: float) -> Image.Image:
    """Android themed icon: only the dark line work survives, as white on transparent."""
    placed = on_canvas(art, size, fill, WHITE).convert('L')
    alpha = placed.point(lambda value: 255 if value < 110 else 0)
    result = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    result.paste(Image.new('RGBA', (size, size), WHITE), (0, 0), alpha)
    return result


def rounded_card(art: Image.Image, size: int) -> Image.Image:
    card = on_canvas(art, size, 0.8, WHITE)
    mask = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=size, fill=255)
    card.putalpha(mask.resize((size, size), Image.LANCZOS))
    return card


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    art = extract_art()
    print('art size', art.size)
    on_canvas(art, 1024, 0.8, WHITE).convert('RGB').save(OUT / 'icon.png')
    # Adaptive icons are masked to as little as the central 66%: stay inside it.
    on_canvas(art, 1024, 0.6, WHITE).save(OUT / 'android-icon-foreground.png')
    monochrome(art, 1024, 0.6).save(OUT / 'android-icon-monochrome.png')
    rounded_card(art, 512).save(OUT / 'splash-icon.png')
    rounded_card(art, 48).save(OUT / 'favicon.png')
    print(f'icons written to {OUT}')


if __name__ == '__main__':
    main()

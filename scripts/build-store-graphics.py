# Builds the Google Play graphics from the app icon artwork and Pretendard (OFL, bundled).
# Usage: python scripts/build-store-graphics.py   (needs Pillow; run build-app-icons.py first)
# Output: assets/store/feature-graphic-1024x500.png, assets/store/play-icon-512.png
# The copy says only what the app does; no rankings, ratings or claims of guaranteed fairness.
import importlib.util
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'store'
FONTS = ROOT / 'assets' / 'fonts'

spec = importlib.util.spec_from_file_location('icons', ROOT / 'scripts' / 'build-app-icons.py')
icons = importlib.util.module_from_spec(spec)
spec.loader.exec_module(icons)

BACKGROUND = (251, 250, 247)
GREEN_SOFT = (223, 241, 214)
YELLOW_SOFT = (255, 241, 204)
TEXT = (43, 43, 51)
SUBTEXT = (111, 111, 122)
GREEN = (46, 125, 50)


def font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / f'Pretendard-{weight}.otf'), size)


def feature_graphic() -> Image.Image:
    scale = 2  # draw large, then shrink for smooth edges
    w, h = 1024 * scale, 500 * scale
    img = Image.new('RGB', (w, h), BACKGROUND)
    d = ImageDraw.Draw(img)
    d.ellipse([-180 * scale, 260 * scale, 420 * scale, 760 * scale], fill=GREEN_SOFT)
    d.ellipse([820 * scale, -160 * scale, 1180 * scale, 200 * scale], fill=YELLOW_SOFT)

    art = icons.extract_art()
    card = icons.rounded_card(art, 340 * scale)
    img.paste(card, (90 * scale, 80 * scale), card)

    x = 500 * scale
    d.text((x, 118 * scale), '우리몫', font=font('Bold', 84 * scale), fill=TEXT)
    d.text((x, 228 * scale), '이번 주 집안일,', font=font('SemiBold', 40 * scale), fill=TEXT)
    d.text((x, 280 * scale), '정한 비율대로 나눠요', font=font('SemiBold', 40 * scale), fill=TEXT)
    d.text((x, 352 * scale), '우리의 집안일, 우리의 몫', font=font('Medium', 26 * scale), fill=GREEN)
    return img.resize((1024, 500), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    feature_graphic().save(OUT / 'feature-graphic-1024x500.png')
    Image.open(ROOT / 'assets' / 'images' / 'icon.png').convert('RGB').resize((512, 512), Image.LANCZOS).save(OUT / 'play-icon-512.png')
    print(f'store graphics written to {OUT}')


if __name__ == '__main__':
    main()

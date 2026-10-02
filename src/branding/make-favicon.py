#!/usr/bin/env python3
"""Generate the BlueCloud RMM favicon: a black B on a blue tile.

Design constraints, all driven by the fact that a favicon is displayed at 16px:

  * BRIGHT. The first favicon was the website logo shrunk down, and that logo is white on
    transparent, so on a light tab strip it was very nearly invisible. A solid brand-cyan
    tile gives it a definite silhouette on light and dark browser themes alike.
  * A solid ROUNDED SQUARE rather than a circle: it fills more of the tile at 16px, which
    makes the icon easier to pick out in a crowded tab strip.
  * The B is SET IN A HEAVY FACE, unlike the earlier T which was drawn from rectangles. A
    T is trivial to draw and a B is not -- curves and counters from primitives look wrong
    long before they look crisp. DejaVu Sans Bold survives the downsample.
  * Sized by MEASUREMENT, not a guessed point size: the loop grows the glyph until it
    fills ~60% of the tile width, so it lands the same way regardless of font metrics.
  * Black is #1B1319, the brand's own near-black, not plain #000. On brand cyan it
    measures 8.96:1, comfortably past the 3:1 WCAG minimum for large graphics.
  * Drawn at 512px and downsampled, which antialiases far better than drawing at 16.

Re-run after changing the palette:

    python3 src/branding/make-favicon.py

Writes assets/favicon.ico (6 sizes) and assets/favicon-preview.png for eyeballing.
public/favicon.ico is a copy -- `npm run brand:sync` refreshes it. The bundler also emits
a hashed copy in dist; apply-to-dist.py replaces that too, otherwise the browser keeps
serving the old icon from the hashed path.
"""
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))

BLUE = (0, 196, 255, 255)      # #00C4FF brand cyan
BLACK = (27, 19, 25, 255)      # #1B1319 brand near-black
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SIZES = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def build(n=512, letter="B"):
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * 0.20), fill=BLUE)

    size = int(n * 0.58)
    while size < n * 1.8:
        f = ImageFont.truetype(FONT, size)
        l, t, r, b = d.textbbox((0, 0), letter, font=f)
        if (r - l) > n * 0.60 or (b - t) > n * 0.66:
            break
        size += int(n * 0.02)
    f = ImageFont.truetype(FONT, size)
    l, t, r, b = d.textbbox((0, 0), letter, font=f)
    d.text(((n - (r - l)) / 2 - l, (n - (b - t)) / 2 - t), letter, font=f, fill=BLACK)
    return img.resize((256, 256), Image.LANCZOS)


if __name__ == "__main__":
    out = build()
    ico = os.path.join(HERE, "assets", "favicon.ico")
    out.save(ico, format="ICO", sizes=SIZES)
    out.save(os.path.join(HERE, "assets", "favicon-preview.png"))
    print("wrote %s (%s)" % (ico, ", ".join("%dx%d" % s for s in SIZES)))

#!/usr/bin/env python3
"""Key the flat background out of a generated icon into clean alpha.

mcpollinations (flux) renders glossy 3D icons on a flat field that is usually
near-black but sometimes a dark colored gradient (blue-gray, etc.) or even white.
A pure luminance threshold leaves those colored fields semi-opaque (a visible
box). Instead we sample the real background color from the image border and set
alpha by each pixel's colour distance from it (a "difference key"). This keys
black, colored, and white fields alike, keeps anti-aliased edges soft, and leaves
the subject's internal facets opaque because they sit far from the bg colour.

Then autocrop to the content, pad, and center on a square so every icon ends up
the same size.

Usage:
    python key_black_bg.py IN.png OUT.png [--lo 28] [--hi 85] [--pad 0.10] [--size 512]
"""
import sys, argparse
from PIL import Image

def median_border(im, ring=0.03):
    w, h = im.size
    px = im.load()
    m = max(2, int(min(w, h) * ring))
    rs, gs, bs = [], [], []
    for y in range(h):
        for x in range(w):
            if x < m or x >= w - m or y < m or y >= h - m:
                r, g, b = px[x, y]
                rs.append(r); gs.append(g); bs.append(b)
    rs.sort(); gs.sort(); bs.sort()
    k = len(rs) // 2
    return rs[k], gs[k], bs[k]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp"); ap.add_argument("out")
    ap.add_argument("--lo", type=float, default=28.0, help="bg-distance fully transparent at/below")
    ap.add_argument("--hi", type=float, default=85.0, help="bg-distance fully opaque at/above")
    ap.add_argument("--pad", type=float, default=0.10, help="margin as fraction of content size")
    ap.add_argument("--size", type=int, default=512, help="final square canvas px")
    a = ap.parse_args()

    im = Image.open(a.inp).convert("RGB")
    px = im.load()
    w, h = im.size
    br, bg_, bb = median_border(im)

    alpha = Image.new("L", (w, h), 0)
    al = alpha.load()
    lo, hi = a.lo, a.hi
    span = max(1e-6, hi - lo)
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            dr, dg, db = r - br, g - bg_, b - bb
            d = (dr * dr + dg * dg + db * db) ** 0.5
            t = (d - lo) / span
            al[x, y] = 0 if t <= 0 else (255 if t >= 1 else int(t * 255 + 0.5))

    out = im.convert("RGBA")
    out.putalpha(alpha)

    bbox = alpha.getbbox()
    if bbox:
        out = out.crop(bbox)
    cw, ch = out.size
    side = int(max(cw, ch) * (1 + 2 * a.pad))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(out, ((side - cw) // 2, (side - ch) // 2), out)
    if a.size:
        canvas = canvas.resize((a.size, a.size), Image.LANCZOS)
    canvas.save(a.out)
    print(f"keyed {a.inp.split('/')[-1]} -> {a.out.split('/')[-1]}  bg=({br},{bg_},{bb}) content={cw}x{ch}")

if __name__ == "__main__":
    main()

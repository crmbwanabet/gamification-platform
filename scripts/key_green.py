#!/usr/bin/env python3
"""Chroma-key a green-screen background out of a generated icon.

Companion to key_black_bg.py for renders where flux produced a PALE green
field: a border-distance key washes out white/light content there (white is
close to pale green), so instead key by GREEN DOMINANCE — how much g exceeds
max(r, b). Whites (r=g=b), golds, purples and blacks all have dominance <= 0
and survive untouched; only genuinely green pixels (field, green spill
shadows) go transparent. Edge pixels get a despill (g clamped toward
max(r, b)) so no green fringe remains.

Then autocrop, pad, and center on a square like key_black_bg.py.

Usage:
    python key_green.py IN.png OUT.png [--lo 10] [--hi 42] [--pad 0.10] [--size 512]
"""
import argparse
from PIL import Image

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp"); ap.add_argument("out")
    ap.add_argument("--lo", type=float, default=10.0, help="green dominance fully opaque at/below")
    ap.add_argument("--hi", type=float, default=42.0, help="green dominance fully transparent at/above")
    ap.add_argument("--pad", type=float, default=0.10, help="margin as fraction of content size")
    ap.add_argument("--size", type=int, default=512, help="final square canvas px")
    a = ap.parse_args()

    im = Image.open(a.inp).convert("RGB")
    w, h = im.size
    px = im.load()
    alpha = Image.new("L", (w, h), 255)
    al = alpha.load()
    lo, hi = a.lo, a.hi
    span = max(1e-6, hi - lo)

    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            d = g - max(r, b)
            if d <= lo:
                continue
            t = (d - lo) / span
            al[x, y] = 0 if t >= 1 else int((1 - t) * 255 + 0.5)
            # despill the feathered edge so no green fringe survives
            px[x, y] = (r, min(g, max(r, b) + int(lo)), b)

    out = im.convert("RGBA")
    out.putalpha(alpha)

    # bbox of the LARGEST connected blob only — stray sparkle specks in the
    # corners would otherwise force a full-canvas crop and shrink the subject
    solid = alpha.point(lambda v: 255 if v > 40 else 0)
    small = solid.resize((96, 96), Image.NEAREST)
    sp = small.load()
    seen = [[False] * 96 for _ in range(96)]
    best = None
    for sy in range(96):
        for sx in range(96):
            if sp[sx, sy] and not seen[sy][sx]:
                stack, blob = [(sx, sy)], []
                seen[sy][sx] = True
                while stack:
                    cx, cy = stack.pop()
                    blob.append((cx, cy))
                    for nx, ny in ((cx+1,cy),(cx-1,cy),(cx,cy+1),(cx,cy-1)):
                        if 0 <= nx < 96 and 0 <= ny < 96 and sp[nx, ny] and not seen[ny][nx]:
                            seen[ny][nx] = True
                            stack.append((nx, ny))
                if best is None or len(blob) > len(best):
                    best = blob
    if best:
        xs = [p[0] for p in best]; ys = [p[1] for p in best]
        m = 1  # one small-cell margin so anti-aliased edges survive
        bbox = (max(0, (min(xs)-m)) * w // 96, max(0, (min(ys)-m)) * h // 96,
                min(96, max(xs)+1+m) * w // 96, min(96, max(ys)+1+m) * h // 96)
        out = out.crop(bbox)
    cw, ch = out.size
    side = int(max(cw, ch) * (1 + 2 * a.pad))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(out, ((side - cw) // 2, (side - ch) // 2), out)
    if a.size:
        canvas = canvas.resize((a.size, a.size), Image.LANCZOS)
    canvas.save(a.out)
    print(f"keyed {a.inp} -> {a.out}  content={cw}x{ch}")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Előnézeti képek az alkalmazáshoz: a public/uploads/legacy alatti képekből max. 800 px-es
JPEG készül a public/uploads/_thumb/legacy/<útvonal>.jpg helyre. A felület ezeket mutatja
(lásd thumbUrl a src/lib/thumb.ts-ben), a PDF és a letöltés az eredetit használja.
Futtatás: python3 scripts/make-thumbnails.py   (Pillow szükséges)
"""
import os
import sys
from PIL import Image

UPLOADS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'uploads')
SRC = os.path.join(UPLOADS, 'legacy')
OUT = os.path.join(UPLOADS, '_thumb')
MAX_SIDE = 800

done = 0
for dirpath, _dirs, files in os.walk(SRC):
    for name in files:
        if not name.lower().endswith(('.png', '.jpg', '.jpeg')):
            continue
        src = os.path.join(dirpath, name)
        dst = os.path.join(OUT, os.path.relpath(src, UPLOADS) + '.jpg')
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        im = Image.open(src)
        if im.mode in ('RGBA', 'LA', 'P'):
            im = im.convert('RGBA')
            bg = Image.new('RGB', im.size, 'white')
            bg.paste(im, mask=im.split()[-1])
            im = bg
        else:
            im = im.convert('RGB')
        im.thumbnail((MAX_SIDE, MAX_SIDE))
        im.save(dst, 'JPEG', quality=74, optimize=True, progressive=True)
        done += 1
print(f'Előnézeti kép: {done}', file=sys.stderr)

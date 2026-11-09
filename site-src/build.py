#!/usr/bin/env python3
"""
Build makuru. single-file app.

  python3 build.py

Reads: styles.css, fonts/fonts-inline.css, body.html, app.js, img/*.jpg
Writes: ../index.html  (fully self-contained: fonts + images embedded)
"""
import base64
import pathlib
import re

ROOT = pathlib.Path(__file__).parent
OUT = ROOT.parent / "index.html"

styles = (ROOT / "styles.css").read_text()
fonts = (ROOT / "fonts" / "fonts-inline.css").read_text()
body = (ROOT / "body.html").read_text()
app = (ROOT / "app.js").read_text()

# --- images -> data URIs ------------------------------------------------
imgs = {}
for path in sorted((ROOT / "img").glob("*.jpg")):
    b64 = base64.b64encode(path.read_bytes()).decode()
    imgs[path.stem] = f"data:image/jpeg;base64,{b64}"


def sub_token(match):
    key = match.group(1)
    if key not in imgs:
        raise SystemExit(f"missing image: {key}")
    return imgs[key]


body = re.sub(r"\{\{IMG:([a-z0-9_-]+)\}\}", sub_token, body)

img_js = "window.__IMG = {\n" + ",\n".join(
    f'  {k}: "{v}"' for k, v in imgs.items()
) + "\n};\n"

html = f"""<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#9E2A2B">
<meta name="description" content="makuru. — dimsum artisanal batch kecil. Open PO, ambil di stokis pilihan di Australia. Dashboard monitoring pesanan untuk owner.">
<title>makuru. — Dimsum artisanal · Open PO Australia</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%239E2A2B'/%3E%3Cpath d='M18 32c0-8 6-14 14-14s14 6 14 14z' fill='%23FAF5EB'/%3E%3Cpath d='M14 38h36c0 7-8 12-18 12S14 45 14 38Z' fill='%23DDA15E'/%3E%3C/svg%3E">
<style>
{fonts}
{styles}
</style>
</head>
<body>
{body}
<script>
{img_js}
{app}
</script>
</body>
</html>
"""

OUT.write_text(html)
print(f"built {OUT} — {len(html)/1024/1024:.2f} MB")

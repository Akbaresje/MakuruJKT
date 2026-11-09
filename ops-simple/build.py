import base64
from pathlib import Path
ROOT = Path(__file__).parent
fonts = (ROOT/'fonts/fonts-inline.css').read_text()
css = (ROOT/'styles.css').read_text()
mk_css = (ROOT/'mascot/mascot.css').read_text()
mk_js = (ROOT/'mascot/mascot.js').read_text()
icon = base64.b64encode((ROOT/'favicon.svg').read_bytes()).decode()
js = (ROOT/'app.js').read_text()
html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>makuru.</title>
<meta name="theme-color" content="#FAF5EB">
<link rel="icon" href="data:image/svg+xml;base64,{icon}">
<meta name="description" content="makuru. — dimsum stock, shops and orders.">
<style>{fonts}</style>
<style>{css}</style>
<style>{mk_css}</style>
</head>
<body>
<div id="root"></div>
<script>{mk_js}</script>
<script>{js}</script>
</body>
</html>
"""
out = ROOT.parent/'makuru-ops.html'
out.write_text(html)
print('built', out, f'{out.stat().st_size/1024:.1f} KB')

# keep the copies in sync: static deploy, the sync server, and the Vercel build
for extra in ('../deploy/index.html', '../server/public/index.html', '../vercel/index.html'):
    dst = (ROOT / extra).resolve()
    if dst.parent.exists():
        dst.write_text(html)
        print('  ->', dst)

# the Vercel function shares the same core as the node server
core_src = (ROOT.parent/'server/core.mjs')
core_dst = (ROOT.parent/'vercel/lib/core.mjs')
if core_src.exists() and core_dst.parent.exists():
    core_dst.write_text(core_src.read_text())
    print('  ->', core_dst)

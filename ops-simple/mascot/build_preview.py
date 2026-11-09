#!/usr/bin/env python3
"""Build the standalone mascot preview into /home/user/mascot-preview.html"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]      # /home/user
HERE = pathlib.Path(__file__).resolve().parent
fonts = (ROOT / 'ops-simple/fonts/fonts-inline.css').read_text()
css = (HERE / 'mascot.css').read_text()
js = (HERE / 'mascot.js').read_text()
html = (HERE / 'preview.html').read_text()

html = html.replace('/*__FONTS__*/', fonts)
html = html.replace('/*__MASCOT_CSS__*/', css)
html = html.replace('/*__MASCOT_JS__*/', js)

out = ROOT / 'mascot-preview.html'
out.write_text(html)
print('built', out, f'{len(html.encode())/1024:.1f} KB')

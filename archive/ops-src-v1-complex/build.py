#!/usr/bin/env python3
"""Build the makuru. operations system into one self-contained HTML file."""
import pathlib

ROOT = pathlib.Path(__file__).parent
OUT = ROOT.parent / "makuru-ops.html"

styles = (ROOT / "styles.css").read_text()
fonts = (ROOT / "fonts" / "fonts-inline.css").read_text()
parts = [(ROOT / f).read_text() for f in ("01-core.js", "02-views-a.js", "03-views-b.js", "04-actions.js")]
js = "(function(){\n" + "\n\n".join(parts) + "\n})();\n"

html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#FAF5EB">
<meta name="description" content="makuru. operations management — stock, production, orders, dispatch and finance.">
<title>makuru. — Operations</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%239E2A2B'/%3E%3Cpath d='M18 32c0-8 6-14 14-14s14 6 14 14z' fill='%23FAF5EB'/%3E%3C/svg%3E">
<style>
{fonts}
{styles}
</style>
</head>
<body>
<div id="root"></div>
<div id="modal-root"></div>
<div id="toast-root"></div>
<script>
{js}
</script>
</body>
</html>
"""
OUT.write_text(html)
print(f"built {OUT} — {len(html)/1024:.1f} KB")

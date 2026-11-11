#!/usr/bin/env python3
# Copyright (c) 2026 geniuskey and SchoolBooks contributors. MIT (see ../LICENSE-MIT).
"""공유 이미지(og.png, 1200×630) 생성: 서가 홈과 세 권. Playwright 필요.
실행: python3 tools/og.py
"""
import json, pathlib, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHELF = json.loads((ROOT / "book.json").read_text(encoding="utf-8"))
BOOKS = [json.loads((ROOT / p).read_text(encoding="utf-8")) | {"dir": p.split("/")[0]} for p in SHELF["books"]]

HEAD = """<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="/shared/css/style.css">
<script src="/shared/js/common.js"></script><script src="/shared/js/covers.js"></script>
<style>
  body { width: 1200px; height: 630px; margin: 0; overflow: hidden; display: flex; align-items: center; gap: 44px; padding: 0 64px; box-sizing: border-box; }
  .sb-top, .sb-foot, .skip { display: none !important; }
  .covers { display: flex; gap: 18px; }
  .lead { flex: 0 0 430px; }
  .covers > div { width: 176px; filter: drop-shadow(0 10px 18px rgba(60,45,20,.22)); }
  .one { width: 330px; flex: none; filter: drop-shadow(0 14px 22px rgba(60,45,20,.25)); }
  .k { font-family: var(--hand); font-weight: 700; font-size: 40px; color: var(--accent); margin: 0; }
  h1 { font-size: 66px; margin: 6px 0 14px; line-height: 1.2; }
  p.s { font-size: 28px; color: var(--ink-soft); margin: 0 0 22px; line-height: 1.5; }
  .u { font-size: 24px; color: var(--ink-faint); }
</style></head>"""


def shelf_html():
    return HEAD + """<body data-page="og"><main style="display:contents">
<div class="lead"><p class="k">그 나이엔 이 정도는</p><h1>만지며 배우는<br>수학과 과학</h1>
<p class="s">초등 · 중등 · 고등<br>예상하고, 해 보고, 증명하고, 도장 받기</p><div class="u">school.euiyun.com</div></div>
<div class="covers"><div data-cover="elementary"></div><div data-cover="middle"></div><div data-cover="high"></div></div>
</main></body></html>"""


def book_html(b):
    return HEAD + f"""<body data-page="og" data-book="{b['dir']}"><main style="display:contents">
<div class="one" data-cover="{b['dir']}"></div>
<div><p class="k">SchoolBooks · {b['short']}</p><h1>{b['title']}</h1><p class="s">{b['subtitle']}</p>
<div class="u">school.euiyun.com/{b['dir']}/</div></div>
</main></body></html>"""


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{srv.server_address[1]}/"
with sync_playwright() as pw:
    br = pw.chromium.launch()
    pg = br.new_page(viewport={"width": 1200, "height": 630}, color_scheme="light", reduced_motion="reduce")
    for out, html in [(ROOT / "og.png", shelf_html())] + [(ROOT / b["dir"] / "og.png", book_html(b)) for b in BOOKS]:
        pg.route(base + "__og.html", lambda r, *_, h=html: r.fulfill(body=h, content_type="text/html; charset=utf-8"))
        pg.goto(base + "__og.html", wait_until="networkidle")
        pg.wait_for_timeout(500)
        pg.screenshot(path=str(out))
        pg.unroute(base + "__og.html")
        print("og", out.relative_to(ROOT))
    br.close()
srv.shutdown()

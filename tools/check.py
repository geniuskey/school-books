#!/usr/bin/env python3
# Copyright (c) 2026 geniuskey and SchoolBooks contributors. MIT (see ../LICENSE-MIT).
# Derived from ArtBook tools/check.py (https://github.com/geniuskey/artbook).
"""페이지 점검기 (playwright 필요: pip install playwright && python3 -m playwright install chromium).

각 페이지를 넓은 화면·라이트(1280px)와 좁은 화면·다크(360px)로 열고, 장은 localStorage 가 막힌 상태로도 한 번 더 연다.
  - 콘솔 오류, 가로 넘침, 조작(예상 고르기·슬라이더·끌기·버튼·플랩·문항) 중 예외
  - 44px보다 작은 터치 영역(버튼·링크·슬라이더·끌기 손잡이)
  - 문항을 다 풀면 도장이 찍히는지
페이지는 저장소 루트를 띄운 로컬 HTTP 서버로 연다.
실행: python3 tools/check.py                              (서가 전체: 서가 홈, 책 홈·도장 수첩·선생님 노트, 준비된 장)
      python3 tools/check.py elementary/start index        (일부만. 책 페이지는 elementary/index, elementary/stamps …)
      python3 tools/check.py elementary/start --shots .shots  (조작 전 전체 페이지 스크린샷)
"""
import sys, os, json, pathlib, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
args = [a for a in sys.argv[1:] if not a.startswith("--")]
shots = None
if "--shots" in sys.argv:
    raw = sys.argv[sys.argv.index("--shots") + 1]
    args.remove(raw); shots = pathlib.Path(raw); shots.mkdir(parents=True, exist_ok=True)
SHELF = json.loads((ROOT / "book.json").read_text(encoding="utf-8"))
if not args:
    args = ["index"]
    for bp in SHELF["books"]:
        d = bp.split("/")[0]
        b = json.loads((ROOT / bp).read_text(encoding="utf-8"))
        args += [f"{d}/{p}" for p in ("index", "stamps", "teachers") if (ROOT / d / f"{p}.html").exists()] + [f"{d}/{c['slug']}" for c in b["chapters"] if c["ready"]]


def path_of(name):
    if name == "index":
        return ROOT / "index.html"
    d, slug = name.split("/", 1)
    return ROOT / d / (f"{slug}.html" if slug in ("index", "stamps", "teachers") else f"chapters/{slug}.html")


POKE = """async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = { stamped: null };
  // 1) 예상 고르기: 첫 보기
  for (const p of document.querySelectorAll('.predict')) { const b = p.querySelector('.choice'); if (b && !b.disabled) b.click(); }
  // 2) 슬라이더: 끝에서 끝까지
  for (const el of document.querySelectorAll('input[type=range]')) {
    for (const v of [el.min, el.max, (Number(el.min) + Number(el.max)) / 2, el.defaultValue]) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); await sleep(5); }
  }
  // 3) 끌기 손잡이: 여러 방향으로
  for (const h of document.querySelectorAll('svg .handle')) {
    const r = h.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const fire = (t, x, y) => h.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: y, pointerId: 7, isPrimary: true }));
    fire('pointerdown', cx, cy);
    for (const [dx, dy] of [[60, 0], [-120, 30], [0, -80], [200, 200], [-400, -400], [0, 0]]) { fire('pointermove', cx + dx, cy + dy); await sleep(5); }
    fire('pointerup', cx, cy);
    h.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    h.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  }
  // 4) 해 보기 버튼
  for (const b of document.querySelectorAll('.lab button')) { if (!b.disabled) { b.click(); await sleep(30); } }
  for (const b of document.querySelectorAll('.lab button')) { if (!b.disabled) { b.click(); await sleep(30); } }
  // 5) 플랩 들추기
  for (const b of document.querySelectorAll('.flap-cover')) b.click();
  await sleep(200);
  // 6) 문항: 모든 보기를 차례로 누른다(틀린 것 → 맞는 것)
  for (const q of document.querySelectorAll('.quiz-q')) for (const b of q.querySelectorAll('button.opt')) if (!b.disabled) b.click();
  await sleep(700);
  if (document.querySelector('.quiz') && document.querySelector('.stamp-spot')) out.stamped = !!document.querySelector('.stamp-spot .sb-stamp');
  // 7) 한 걸음 더 펼치기, 목차 서랍 열고 닫기
  for (const d of document.querySelectorAll('details')) d.open = true;
  const t = document.querySelector('.toc-open'); if (t) { t.click(); await sleep(50); document.querySelector('.toc-close').click(); }
  await sleep(200);
  const de = document.documentElement;
  out.overflow = de.scrollWidth - innerWidth;
  out.wide = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && !e.closest('.table-wrap, .katex-display, .sb-drawer, #sb-defs, .skip'); }).slice(0, 5)
    .map((e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + String(e.className.baseVal ?? e.className).split(' ')[0]);
  const small = [];
  for (const e of document.querySelectorAll('button, a.btn, .sb-btn, input[type=range], .choice, svg .handle, .flap-cover, summary')) {
    if (e.closest('.sb-drawer:not(.open)') || e.closest('[hidden]')) continue;
    const r = e.getBoundingClientRect(); if (!r.width) continue;
    if (r.width < 43.5 || r.height < 43.5) small.push(e.tagName.toLowerCase() + '.' + String(e.className.baseVal ?? e.className).split(' ')[0] + ` ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  out.small = small.slice(0, 6);
  out.labs = document.querySelectorAll('.lab').length;
  out.figs = document.querySelectorAll('svg.drawing').length;
  out.quiz = document.querySelectorAll('.quiz-q').length;
  return out;
}"""

NO_STORAGE = """(() => { const thrower = { get() { throw new DOMException('blocked', 'SecurityError'); } };
  Object.defineProperty(window, 'localStorage', thrower); })();"""


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{srv.server_address[1]}/"

bad = 0
with sync_playwright() as pw:
    exe = os.environ.get("CHROMIUM_PATH")
    br = pw.chromium.launch(executable_path=exe) if exe else pw.chromium.launch()
    for name in args:
        f = path_of(name)
        if not f.exists():
            print(f"[{name}] 파일 없음"); bad += 1; continue
        modes = [("wide-light", 1280, 900, "light", False), ("narrow-dark", 360, 740, "dark", False)]
        if "/chapters/" in f.as_posix():
            modes.append(("no-storage", 390, 800, "light", True))
        for tag, w, h, scheme, nostore in modes:
            ctx = br.new_context(viewport={"width": w, "height": h}, color_scheme=scheme, has_touch=w < 500)
            if nostore:
                ctx.add_init_script(NO_STORAGE)
            page = ctx.new_page()
            errs = []
            page.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errs.append("exception: " + str(e)))
            page.goto(BASE + f.relative_to(ROOT).as_posix(), wait_until="load")
            page.wait_for_timeout(700)
            if shots and not nostore:
                page.screenshot(path=str(shots / f"{name.replace('/', '-')}-{tag}.png"), full_page=True)
            r = page.evaluate(POKE)
            if shots and not nostore:
                page.screenshot(path=str(shots / f"{name.replace('/', '-')}-{tag}-after.png"), full_page=True)
            errs = [e for e in errs if "net::ERR" not in e and "Failed to load resource" not in e and "cloudflareinsights" not in e]
            probs = errs[:8]
            if r["overflow"] > 1: probs.append(f"가로 넘침 {r['overflow']}px: {r['wide']}")
            if r["small"]: probs.append(f"44px보다 작은 터치 영역: {r['small']}")
            if r["stamped"] is False: probs.append("문항을 다 풀었는데 도장이 찍히지 않음")
            print(f"[{name} · {tag}] {'OK' if not probs else '문제'}  lab={r['labs']} fig={r['figs']} quiz={r['quiz']} stamp={r['stamped']}  {f.stat().st_size // 1024} KB")
            for p_ in probs: print("    - " + p_)
            bad += len(probs)
            ctx.close()
    br.close()
srv.shutdown()
sys.exit(1 if bad else 0)

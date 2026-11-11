#!/usr/bin/env python3
# Copyright (c) 2026 geniuskey and SchoolBooks contributors. MIT (see ../LICENSE-MIT).
# Derived from ArtBook tools/head.py (https://github.com/geniuskey/artbook).
"""<head> 블록·book.js·사이트맵 생성기 (서가 전체).

원본은 각 책의 book.json 이다(사람이 고친다). 이 스크립트가 만드는 것:
  - <book>/book.js           : window.SB_BOOK (common.js 가 목차·도장·이전/다음에 쓴다)
  - 각 페이지의 <!--head:start {...}--> ... <!--head:end--> 사이(제목·설명·canonical·OG·JSON-LD·스타일·스크립트)
  - sitemap.xml              : 서가 홈, 책 홈·도장 수첩·선생님 노트, 준비된 장
페이지 표식의 JSON:
  장                {"desc": "한 문장 설명"}                       (제목·번호는 book.json 에서)
  책 홈 등          {"page": "home|stamps|teachers", "title": "...", "desc": "..."}
  서가 홈           {"page": "shelf", "title": "...", "desc": "..."}
Cloudflare Web Analytics 비컨은 표식 바깥(head:end 뒤)에 둔다. 배포 빌드(@euiyun/book)가 GA4로 바꾼다.
실행: python3 tools/head.py            (전체를 고쳐 쓴다)
      python3 tools/head.py --check    (고칠 것이 있으면 목록을 보이고 1로 끝난다. CI용)
"""
import json, re, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://school.euiyun.com/"
SHELF = json.loads((ROOT / "book.json").read_text(encoding="utf-8"))
BOOK_DIRS = [p.split("/")[0] for p in SHELF["books"]]
CHECK = "--check" in sys.argv
changed = []


def load(d):
    b = json.loads((ROOT / d / "book.json").read_text(encoding="utf-8"))
    b["dir"] = d
    return b


BOOKS = [load(d) for d in BOOK_DIRS]
e = lambda s: str(s).replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")
ld = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))


def write(p, s):
    old = p.read_text(encoding="utf-8") if p.exists() else None
    if old == s:
        return
    changed.append(p.relative_to(ROOT).as_posix())
    if not CHECK:
        p.write_text(s, encoding="utf-8")


def book_pages(b):
    """책 폴더의 고정 페이지. 도장 수첩·선생님 노트는 book.json 의 stamps/teachers 가 false 면 없다(고등)."""
    return ["index.html"] + (["stamps.html"] if b.get("stamps", True) else []) + (["teachers.html"] if b.get("teachers", True) else [])


def book_js(b):
    keep = ("num", "slug", "subject", "title", "unit", "stamp", "time", "scene", "headline", "ready")
    data = {"id": b["dir"], "portalId": b["id"], "short": b["short"], "title": b["title"], "subtitle": b["subtitle"],
            "minutes": b["minutes"], "color": b["color"], "colorDark": b["colorDark"],
            "stamps": b.get("stamps", True), "teachers": b.get("teachers", True),
            "chapters": [{k: c[k] for k in keep if k in c} for c in b["chapters"]]}
    return ("/* 자동 생성 파일: book.json 을 고치고 python3 tools/head.py 를 실행한다. */\n"
            "window.SB_BOOK = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n"
            "(window.SB_BOOKS = window.SB_BOOKS || {})[window.SB_BOOK.id] = window.SB_BOOK;\n")


def common_meta(title, desc, url, image, kind, depth, theme):
    up = "../" * depth
    return f'''<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<link rel="icon" type="image/svg+xml" href="{up}favicon.svg">
<meta name="theme-color" content="{theme}">
<meta property="og:type" content="{kind}">
<meta property="og:site_name" content="SchoolBooks">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
'''


def assets(depth, book=None, katex=False, sim=True):
    up = "../" * depth
    s = ""
    if katex:
        s += ('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">\n'
              '<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>\n'
              '<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>\n')
    s += f'<link rel="stylesheet" href="{up}shared/css/style.css">\n'
    if book:
        s += f'<script src="{"../" if depth == 2 else ""}book.js"></script>\n'
    if sim:
        s += f'<script src="{up}shared/js/sim.js"></script>\n'
    s += f'<script src="{up}shared/js/common.js"></script>\n'
    return s


def chapter_head(b, c, meta):
    base = f"{SITE}{b['dir']}/"
    url = f"{base}chapters/{c['slug']}.html"
    name = f"{b['title']} · SchoolBooks {b['short']}"
    title = f"{c['title']} · {b['short']} {b['title']}"
    desc = meta["desc"]
    graph = {"@context": "https://schema.org", "@graph": [
        {"@type": ["Chapter", "LearningResource"], "@id": url + "#chapter", "name": c["title"], "headline": title,
         "description": desc, "url": url, "position": c["num"], "inLanguage": "ko", "isAccessibleForFree": True,
         "learningResourceType": "인터랙티브 교재", "educationalLevel": b["level"], "about": c["unit"], "image": base + "og.png",
         "isPartOf": {"@type": "Book", "@id": base + "#book", "name": name, "url": base}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "SchoolBooks", "item": SITE},
            {"@type": "ListItem", "position": 2, "name": name, "item": base},
            {"@type": "ListItem", "position": 3, "name": f"{c['num']:02d}. {c['title']}", "item": url}]}]}
    return (common_meta(title, desc, url, base + "og.png", "article", 2, b["color"]) +
            f'<script type="application/ld+json">{ld(graph)}</script>\n' + assets(2, b, b.get("katex")))


def book_page_head(b, meta):
    kind = meta["page"]
    file = {"home": "index.html", "stamps": "stamps.html", "teachers": "teachers.html"}[kind]
    base = f"{SITE}{b['dir']}/"
    url = base + file  # @euiyun/book 빌드 규칙: 하위 폴더 index.html 의 canonical 은 index.html 까지 적는다
    title, desc = meta["title"], meta["desc"]
    if kind == "home":
        ready = [c for c in b["chapters"] if c["ready"]]
        graph = {"@context": "https://schema.org", "@graph": [
            {"@type": "Book", "@id": base + "#book", "name": f"{b['title']} · SchoolBooks {b['short']}", "alternateName": b["subtitle"],
             "description": b["description"], "url": base, "inLanguage": "ko", "isAccessibleForFree": True, "educationalLevel": b["level"],
             "author": {"@type": "Person", "name": "geniuskey", "url": "https://github.com/geniuskey"},
             "license": "https://creativecommons.org/licenses/by/4.0/", "image": base + "og.png",
             "isPartOf": {"@type": "WebSite", "name": "SchoolBooks", "url": SITE},
             "hasPart": [{"@type": "Chapter", "name": c["title"], "position": c["num"], "url": f"{base}chapters/{c['slug']}.html"} for c in ready]}]}
    else:
        graph = {"@context": "https://schema.org", "@type": "WebPage", "name": title, "description": desc, "url": url, "inLanguage": "ko",
                 "isPartOf": {"@type": "Book", "@id": base + "#book", "name": b["title"], "url": base}}
    return (common_meta(title, desc, url, base + "og.png", "website" if kind == "home" else "article", 1, b["color"]) +
            f'<script type="application/ld+json">{ld(graph)}</script>\n' + assets(1, b, False, sim=kind == "stamps") +
            ('<script defer src="../shared/js/covers.js"></script>\n' if kind == "home" else ""))


def shelf_head(meta):
    graph = {"@context": "https://schema.org", "@type": "WebSite", "name": "SchoolBooks", "alternateName": meta["title"], "url": SITE,
             "description": meta["desc"], "inLanguage": "ko",
             "hasPart": [{"@type": "Book", "name": f"{b['title']} · SchoolBooks {b['short']}", "url": f"{SITE}{b['dir']}/"} for b in BOOKS]}
    s = common_meta(meta["title"], meta["desc"], SITE, SITE + "og.png", "website", 0, "#2f5d50")
    s += f'<script type="application/ld+json">{ld(graph)}</script>\n'
    s += '<link rel="stylesheet" href="shared/css/style.css">\n'
    s += "".join(f'<script src="{b["dir"]}/book.js"></script>\n' for b in BOOKS)
    s += '<script>window.SB_BOOK = null;</script>\n'
    s += '<script src="shared/js/common.js"></script>\n'
    s += '<script defer src="shared/js/covers.js"></script>\n'
    return s


PAT = re.compile(r"(<!--head:start (\{.*?\})-->\n)(.*?)(<!--head:end-->)", re.S)


def fill(p, make):
    s = p.read_text(encoding="utf-8")
    m = PAT.search(s)
    if not m:
        print("표식 없음:", p.relative_to(ROOT)); return False
    meta = json.loads(m.group(2))
    write(p, s[:m.start()] + m.group(1) + make(meta) + m.group(4) + s[m.end():])
    return True


problems = 0
for b in BOOKS:
    write(ROOT / b["dir"] / "book.js", book_js(b))
    for c in b["chapters"]:
        p = ROOT / b["dir"] / "chapters" / f"{c['slug']}.html"
        if not p.exists():
            if c["ready"]:
                print("파일 없음(ready=true):", b["dir"], c["slug"]); problems += 1
            continue
        if not c["ready"]:
            print("참고: 파일은 있지만 ready=false:", b["dir"], c["slug"])
        fill(p, lambda meta, b=b, c=c: chapter_head(b, c, meta))
    for f in book_pages(b):
        p = ROOT / b["dir"] / f
        if p.exists():
            fill(p, lambda meta, b=b: book_page_head(b, meta))
        else:
            print("파일 없음:", b["dir"], f); problems += 1

# 서가 홈: 세 권의 book.js 를 모두 불러 window.SB_BOOKS 에 모으고, 현재 책(SB_BOOK)은 비운다
if (ROOT / "index.html").exists():
    fill(ROOT / "index.html", shelf_head)


# ---------- 책 홈 목차, 선생님 노트·CONTRIBUTING 의 장 계획 표 (book.json 에서 만든다) ----------
SUBJ = {"math": "수학", "science": "과학", "guide": "안내"}


def when(b, c):
    if b["dir"] == "elementary":
        return (e(c["time"]) if c.get("time") else "—"), ""
    if b["dir"] == "middle":
        return f'{c["num"]:02d}', e(c.get("scene", ""))
    return f'{c["num"]:02d}', ("가상 헤드라인 “" + e(c["headline"]) + "”") if c.get("headline") else ""


def toc_html(b):
    out = ['<ol class="timeline">']
    for c in b["chapters"]:
        t, sub = when(b, c)
        small = f"<small>{sub}</small>" if (sub and b["dir"] == "middle") else ""
        meta = f'<small>{SUBJ[c["subject"]]} · {e(c["unit"])}' + (f" · {sub}" if b["dir"] == "high" and sub else "") + "</small>"
        if c["ready"]:
            out.append(f'<li><a href="chapters/{c["slug"]}.html" data-slug="{c["slug"]}"><span class="t">{t}{small}</span>'
                       f'<span class="ttl">{e(c["title"])}{meta}</span>' + ('<span class="got" aria-hidden="true"></span>' if b.get("stamps", True) else "") + '</a></li>')
        else:
            out.append(f'<li><span class="off"><span class="t">{t}{small}</span><span class="ttl">{e(c["title"])}{meta}</span>'
                       f'<span class="badge">준비 중</span></span></li>')
    out.append("</ol>")
    return "\n".join(out) + "\n"


def std_html(c):
    if not c["standards"]:
        return "—"
    parts = []
    for x in c["standards"]:
        if x.get("code"):
            parts.append(f'<span class="std" title="{e(x["text"])}">[{e(x["code"])}]</span>')
        else:
            parts.append(f'<span class="unverified" title="{e(x["text"])}">{e(x["topic"])}: 확인 필요</span>')
    return " ".join(parts)


def plan_html(b):
    rows = []
    for c in b["chapters"]:
        rows.append(f'<tr><td>{c["num"]:02d}</td><td>{e(c["title"])}<br><small>{e(c["unit"])}</small></td>'
                    f'<td>{e(c["sim"])}</td><td>{std_html(c)}</td></tr>')
    seen, items = set(), []
    for c in b["chapters"]:
        for x in c["standards"]:
            key = x.get("code") or ("?" + x["topic"])
            if key in seen:
                continue
            seen.add(key)
            if x.get("code"):
                items.append(f'<li><span class="std">[{e(x["code"])}]</span> {e(x["text"])}</li>')
            else:
                items.append(f'<li><span class="unverified">{e(x["topic"])}: 확인 필요</span> {e(x["text"])}</li>')
    return ('<div class="table-wrap"><table class="plan"><thead><tr><th>장</th><th>질문</th><th>핵심 시뮬레이터</th><th>성취기준</th></tr></thead><tbody>\n'
            + "\n".join(rows) + "\n</tbody></table></div>\n"
            + '<details class="more"><summary>성취기준 원문 펼치기</summary><ul class="small">\n' + "\n".join(items) + "\n</ul></details>\n")


def md(s):
    return str(s).replace("|", "\\|")


def plan_md(b):
    head = "| 장 | slug | " + {"elementary": "시각", "middle": "장면", "high": "가상 헤드라인"}[b["dir"]] + \
           " | 질문 | 예측 문항 | 핵심 시뮬레이터 | 흔한 오해 | 성취기준 | 상태 |\n|---|---|---|---|---|---|---|---|---|\n"
    rows = []
    for c in b["chapters"]:
        w = c.get("time") or c.get("scene") or c.get("headline") or "—"
        stds = []
        for x in c["standards"]:
            stds.append(f'[{x["code"]}]' if x.get("code") else f'{x["topic"]}: 확인 필요')
        rows.append(f'| {c["num"]:02d} | `{c["slug"]}` | {md(w)} | {md(c["title"])} | {md(c["predict"])} | {md(c["sim"])} | {md(c["myth"])} | '
                    f'{md(", ".join(stds) or "—")} | {"공개" if c["ready"] else "준비 중"} |')
    return head + "\n".join(rows) + "\n"


def block(p, name, content):
    if not p.exists():
        return
    s = p.read_text(encoding="utf-8")
    pat = re.compile(r"(<!--%s:start-->\n)(.*?)(<!--%s:end-->)" % (re.escape(name), re.escape(name)), re.S)
    if not pat.search(s):
        print("표식 없음:", p.relative_to(ROOT), name); return
    write(p, pat.sub(lambda m: m.group(1) + content + m.group(3), s, count=1))


for b in BOOKS:
    block(ROOT / b["dir"] / "index.html", "toc", toc_html(b))
    if b.get("teachers", True):
        block(ROOT / b["dir"] / "teachers.html", "plan", plan_html(b))
    block(ROOT / "CONTRIBUTING.md", f"plan:{b['dir']}", plan_md(b))

urls = [SITE]
for b in BOOKS:
    urls += [f"{SITE}{b['dir']}/{f}" for f in book_pages(b)]
    urls += [f"{SITE}{b['dir']}/chapters/{c['slug']}.html" for c in b["chapters"] if c["ready"]]
write(ROOT / "sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      "".join(f"  <url><loc>{u}</loc></url>\n" for u in urls) + "</urlset>\n")

if CHECK:
    if changed:
        print("head.py 를 다시 실행해야 하는 파일:", *changed, sep="\n  ")
    sys.exit(1 if (changed or problems) else 0)
print(f"바뀐 파일 {len(changed)}개:", *changed, sep="\n  ") if changed else print("바뀐 파일 없음")
sys.exit(1 if problems else 0)

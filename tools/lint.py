#!/usr/bin/env python3
# Copyright (c) 2026 geniuskey and SchoolBooks contributors. MIT (see ../LICENSE-MIT).
"""장 규칙 점검기 (브라우저 없이). 가벼움 점검도 여기서 한다.

준비된 장(book.json 의 ready=true)마다:
  오류(1로 끝남)  - 장의 틀 9단계가 순서대로 있는가: .scene → .predict → .lab → .flap → .callout.myth → .everyday
                    → (details.more) → .callout.grownup → .wrapup(.oneline, .quiz 안 .quiz-q 3개, .stamp-spot)
                  - 새 용어(.term) 수: 초등 2, 중등 3, 고등 4 이하
                  - 수식 수: 초등 0 / 중등 본문 0·한 걸음 더 1 / 고등 본문 1·한 걸음 더 2 이하  (\\( \\) 와 \\[ \\] 를 센다)
                  - 이모지 없음, Cloudflare 비컨 1개, head 표식 있음
  경고           - 글자 수(공백 제외, 한 걸음 더·그림 글자·스크립트 제외)가 목표의 115%를 넘음 (초 1,500 / 중 2,500 / 고 3,500)
                  - 문단 하나에 문장 4개 이상, 초등 문장 평균 길이 45자 초과
실행: python3 tools/lint.py                 (전체)
      python3 tools/lint.py elementary/start  (그 장만)
"""
import json, re, sys, pathlib
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHELF = json.loads((ROOT / "book.json").read_text(encoding="utf-8"))
RULES = {
    "elementary": dict(terms=2, body_math=0, more_math=0, chars=1500, sentence=45),
    "middle": dict(terms=3, body_math=0, more_math=1, chars=2500, sentence=None),
    "high": dict(terms=4, body_math=1, more_math=2, chars=3500, sentence=None),
}
ORDER = ["scene", "predict", "lab", "flap", "myth", "everyday", "more", "grownup", "wrapup"]
EMOJI = re.compile("[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF\U0001F900-\U0001F9FF⭐⭕‼⁉™ℹ⌚-⌛⏩-⏳▪-◾️]")
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr", "path", "circle", "rect", "line", "ellipse", "polyline", "polygon", "stop", "use"}


class Node:
    def __init__(self, tag, attrs, parent):
        self.tag, self.attrs, self.parent, self.kids, self.text = tag, dict(attrs), parent, [], []
        self.cls = set((self.attrs.get("class") or "").split())


class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("root", [], None); self.cur = self.root
    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.cur); self.cur.kids.append(n)
        if tag not in VOID: self.cur = n
    def handle_startendtag(self, tag, attrs):
        self.cur.kids.append(Node(tag, attrs, self.cur))
    def handle_endtag(self, tag):
        n = self.cur
        while n is not self.root and n.tag != tag: n = n.parent
        if n is not self.root: self.cur = n.parent
    def handle_data(self, d):
        self.cur.kids.append(d)


def walk(n):
    for k in n.kids:
        if isinstance(k, Node):
            yield k; yield from walk(k)


def text(n, skip=lambda n: False):
    out = []
    for k in n.kids:
        if isinstance(k, str): out.append(k)
        elif k.tag in ("script", "style", "svg", "template") or skip(k): continue
        else: out.append(text(k, skip))
    return "".join(out)


def kind(n):
    c = n.cls
    if "scene" in c: return "scene"
    if "predict" in c: return "predict"
    if "lab" in c: return "lab"
    if "flap" in c: return "flap"
    if "callout" in c and "myth" in c: return "myth"
    if "everyday" in c: return "everyday"
    if n.tag == "details" and "more" in c: return "more"
    if "callout" in c and "grownup" in c: return "grownup"
    if "wrapup" in c: return "wrapup"
    return None


def count_math(s):
    return len(re.findall(r"\\\(", s)) + len(re.findall(r"\\\[", s))


def lint(book, c):
    rule = RULES[book]
    p = ROOT / book / "chapters" / f"{c['slug']}.html"
    src = p.read_text(encoding="utf-8")
    errs, warns = [], []
    head = src.split("</head>")[0]
    if "<!--head:start" not in head: errs.append("head 표식 없음")
    if head.count("static.cloudflareinsights.com/beacon.min.js") != 1: errs.append("Cloudflare 비컨이 head 에 정확히 1개여야 함")
    if EMOJI.search(src): errs.append("이모지 사용: " + EMOJI.search(src).group(0))
    t = Tree(); t.feed(src)
    main = next((n for n in walk(t.root) if n.tag == "main"), None)
    if not main: return ["main 없음"], [], {}
    top = [k for k in main.kids if isinstance(k, Node)]
    seq = [kind(k) for k in top if kind(k)]
    want = [x for x in ORDER if x != "more" or "more" in seq]
    if seq != want: errs.append(f"장의 틀 순서가 다름: {seq} (기대: {want})")
    terms = [n for n in walk(main) if "term" in n.cls]
    if len(terms) > rule["terms"]: errs.append(f"새 용어 {len(terms)}개 (최대 {rule['terms']}): " + ", ".join(text(x) for x in terms))
    is_more = lambda n: n.tag == "details" and "more" in n.cls
    more_txt = "".join(text(n) for n in walk(main) if is_more(n))
    body_txt = text(main, is_more)
    bm, mm = count_math(body_txt), count_math(more_txt)
    if bm > rule["body_math"]: errs.append(f"본문 수식 {bm}개 (최대 {rule['body_math']})")
    if mm > rule["more_math"]: errs.append(f"한 걸음 더 수식 {mm}개 (최대 {rule['more_math']})")
    wrap = next((k for k in top if kind(k) == "wrapup"), None)
    if wrap:
        nq = sum(1 for n in walk(wrap) if "quiz-q" in n.cls)
        if nq != 3: errs.append(f"확인 문항 {nq}개 (3개여야 함)")
        if not any("oneline" in n.cls for n in walk(wrap)): errs.append("오늘의 한 줄(.oneline) 없음")
        if not any("stamp-spot" in n.cls for n in walk(wrap)): errs.append("도장 자리(.stamp-spot) 없음")
    labs = [k for k in top if kind(k) == "lab"]
    if len(labs) != 1: errs.append(f"해 보기(.lab)는 장마다 하나 ({len(labs)}개)")
    chars = len(re.sub(r"\s", "", body_txt))
    if chars > rule["chars"] * 1.15: warns.append(f"글자 수 {chars}자: 목표 {rule['chars']}자의 115%를 넘음. 줄이기")
    sents_all = []
    for n in walk(main):
        if n.tag == "p" and not any(is_more(a) for a in ancestors(n)):
            s = re.sub(r"\s+", " ", text(n)).strip()
            ss = [x for x in re.split(r"(?<=[.?!])\s+", s) if x]
            sents_all += ss
            if len(ss) > 3: warns.append(f"문단 문장 {len(ss)}개: {s[:30]}…")
    avg = sum(len(x) for x in sents_all) / len(sents_all) if sents_all else 0
    if rule["sentence"] and avg > rule["sentence"]: warns.append(f"문장 평균 {avg:.0f}자 (초등 목표 40자 안팎)")
    return errs, warns, dict(chars=chars, target=rule["chars"], terms=len(terms), math=f"{bm}+{mm}", avg=round(avg))


def ancestors(n):
    while n.parent is not None:
        n = n.parent; yield n


only = [a for a in sys.argv[1:] if not a.startswith("-")]
bad = 0
for bp in SHELF["books"]:
    book = bp.split("/")[0]
    b = json.loads((ROOT / bp).read_text(encoding="utf-8"))
    for c in b["chapters"]:
        key = f"{book}/{c['slug']}"
        if only and key not in only: continue
        if not c["ready"] and not only: continue
        if not (ROOT / book / "chapters" / f"{c['slug']}.html").exists():
            if c["ready"]: print(f"[{key}] 파일 없음"); bad += 1
            continue
        errs, warns, st = lint(book, c)
        status = "오류" if errs else ("경고" if warns else "OK")
        if st:
            print(f"[{key}] {status}  글자 {st['chars']}/{st['target']}  용어 {st['terms']}  수식 {st['math']}  문장 평균 {st['avg']}자")
        for x in errs: print("    ✗ " + x)
        for x in warns: print("    △ " + x)
        bad += len(errs)
sys.exit(1 if bad else 0)

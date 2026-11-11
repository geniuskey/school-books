/* Copyright (c) 2026 geniuskey and SchoolBooks contributors. MIT (see ../../LICENSE-MIT).
   SchoolBooks 공통 UI. 전역 SB.
   - 머리(상단 바·목차 서랍)와 꼬리(이전·다음, 라이선스)를 그린다.
   - 장의 틀: SB.predict(예상하기) → .lab(해 보기) → SB.flap(증명하기) → SB.quiz(확인 문항) → SB.stamp(도장)
   - 그림 도구: SB.svg, SB.drag(끌기), SB.slider(굵은 슬라이더), SB.flow(빛나는 점의 흐름), SB.loop(보일 때만 도는 애니메이션)
   localStorage는 모두 try/catch로 감싼다. 저장이 막혀도 페이지는 그대로 동작한다(기억만 못 한다).
   책 정보는 각 책의 book.js(window.SB_BOOK, tools/head.py가 book.json으로 만든다)에서 읽는다. */
(function () {
  "use strict";
  const BOOK = window.SB_BOOK || null;
  const SHELF = "https://school.euiyun.com/";
  const doc = document;
  const $ = (s, r) => (r || doc).querySelector(s);
  const $$ = (s, r) => Array.from((r || doc).querySelectorAll(s));
  const NS = "http://www.w3.org/2000/svg";
  const reduceMotion = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } })();

  /* ---------- 저장소(없어도 동작) ---------- */
  const mem = {};
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem("sb:" + k); return v == null ? (k in mem ? mem[k] : d) : JSON.parse(v); }
      catch (e) { return k in mem ? mem[k] : d; }
    },
    set(k, v) { mem[k] = v; try { localStorage.setItem("sb:" + k, JSON.stringify(v)); } catch (e) { /* 저장 불가: 메모리에만 */ } },
    remove(k) { delete mem[k]; try { localStorage.removeItem("sb:" + k); } catch (e) { /* 무시 */ } }
  };

  /* ---------- 테마: 그리기 전에 바로 적용 ---------- */
  const savedTheme = store.get("theme", null);
  if (savedTheme === "light" || savedTheme === "dark") doc.documentElement.dataset.theme = savedTheme;
  function isDark() {
    const t = doc.documentElement.dataset.theme;
    if (t) return t === "dark";
    try { return matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) { return false; }
  }
  function toggleTheme() {
    const next = isDark() ? "light" : "dark";
    doc.documentElement.dataset.theme = next;
    store.set("theme", next);
    $$(".theme-toggle").forEach(setThemeIcon);
    doc.dispatchEvent(new CustomEvent("sb:theme", { detail: next }));
  }
  function setThemeIcon(b) { b.innerHTML = isDark() ? ICON.sun : ICON.moon; b.setAttribute("aria-label", isDark() ? "밝은 화면으로" : "어두운 화면으로"); b.title = b.getAttribute("aria-label"); }

  /* ---------- 손그림 아이콘 ---------- */
  const ic = (d, s) => `<svg width="${s || 22}" height="${s || 22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    menu: ic('<path d="M4 6.5c5-.6 11-.4 16 0M4 12.2c5.5-.5 10.5-.3 16 .1M4 17.8c4.6-.4 11-.5 16-.1"/>'),
    moon: ic('<path d="M19.5 14.6A8 8 0 0 1 9.3 4.4a8.2 8.2 0 1 0 10.2 10.2z"/>'),
    sun: ic('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.4 5.4l1.7 1.7M16.9 16.9l1.7 1.7M5.4 18.6l1.7-1.7M16.9 7.1l1.7-1.7"/>'),
    books: ic('<path d="M4.5 5.2h5.3v14.3H4.5zM9.8 5.6h5.1v13.9H9.8zM16.2 7l3.2-.9 2.4 13.2-3.2.8z"/>'),
    chat: ic('<path d="M5 4.5h14a2 2 0 0 1 2 2v9.2a2 2 0 0 1-2 2H9.4L4 21.2V6.5a2 2 0 0 1 1-2z"/><path d="M8.5 9.5h7M8.5 13h4.4"/>'),
    stamp: ic('<path d="M9.4 3.6h5.2c.1 2.7-.9 4.6-1.6 6.6h-2c-.7-2-1.7-3.9-1.6-6.6zM5 13.6c0-2 1.7-3.4 3.6-3.4h6.8c1.9 0 3.6 1.4 3.6 3.4v1.8H5zM4.4 19.6c5-.5 10-.5 15.2 0"/>'),
    pencil: ic('<path d="M4.4 19.6l1.1-4.4L15.9 4.8a1.9 1.9 0 0 1 2.7 0l.6.6a1.9 1.9 0 0 1 0 2.7L8.8 18.5z"/><path d="M13.9 6.8l3.3 3.3"/>'),
    hand: ic('<path d="M8.5 12.5V5.8a1.5 1.5 0 0 1 3 0v5.6-7.3a1.5 1.5 0 0 1 3 0v7.3-5.6a1.5 1.5 0 0 1 3 0v8.4c0 4-2.6 6.6-6.2 6.6-2.6 0-4.1-1.2-5.4-3.2L4 13.4a1.5 1.5 0 0 1 2.4-1.7z"/>'),
    flap: ic('<path d="M4 9.5h16v10H4z"/><path d="M4 9.5l3-5h10l3 5"/><path d="M10 14.5h4"/>'),
    eye: ic('<path d="M2.6 12.2C5 7.8 8.3 5.7 12 5.7s7 2.1 9.4 6.5c-2.4 4.2-5.7 6.3-9.4 6.3s-7-2.1-9.4-6.3z"/><circle cx="12" cy="12.1" r="2.8"/>'),
    flask: ic('<path d="M9.5 3.5h5M10.4 3.6v6L5 18.4a1.6 1.6 0 0 0 1.4 2.3h11.2a1.6 1.6 0 0 0 1.4-2.3l-5.4-8.8v-6"/><path d="M7.6 14.6c3-.8 5.8.9 8.8 0"/>'),
    bulb: ic('<path d="M9 17.6h6M9.8 20.6h4.4M12 3.4a6 6 0 0 0-3.7 10.8c.6.5.8 1.1.8 1.9v1.4h5.8v-1.4c0-.8.3-1.4.8-1.9A6 6 0 0 0 12 3.4z"/>'),
    cross: ic('<circle cx="12" cy="12" r="8.6"/><path d="M8.6 8.6l6.8 6.8M15.4 8.6l-6.8 6.8"/>'),
    house: ic('<path d="M3.6 11.2L12 4.2l8.4 7M6 9.6v10.2h12V9.6"/><path d="M10 19.8v-5.4h4v5.4"/>'),
    coffee: ic('<path d="M4.6 9h12v5.6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM16.6 10.4h1.6a2.4 2.4 0 0 1 0 4.8h-1.8"/><path d="M8.4 3.6c-.8 1.2.8 2-.1 3.3M12.1 3.6c-.8 1.2.8 2-.1 3.3"/>'),
    note: ic('<path d="M6 3.6h9.4L19 7.2v13.2H6z"/><path d="M15.2 3.8v3.6h3.6M9 11.4h6.6M9 15h6.6"/>'),
    clock: ic('<circle cx="12" cy="12" r="8.6"/><path d="M12 6.8V12l3.4 2.2"/>'),
    check: ic('<path d="M4.8 12.6l4.4 4.4L19.4 6.6"/>'),
    arrowL: ic('<path d="M14.6 5.6L8.2 12l6.4 6.4"/>'),
    arrowR: ic('<path d="M9.4 5.6l6.4 6.4-6.4 6.4"/>'),
    close: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
    search: ic('<circle cx="10.6" cy="10.6" r="6.2"/><path d="M15.2 15.4l5 4.8"/>'),
    logo: '<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 7.5c4-1.2 7.6-.6 11 1.6v17c-3.4-2.2-7-2.8-11-1.6z" style="fill:var(--wash-warm)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M27 7.5c-4-1.2-7.6-.6-11 1.6v17c3.4-2.2 7-2.8 11-1.6z" style="fill:var(--wash-cool)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="21.5" cy="5" r="2.4" style="fill:var(--glow)"/></svg>'
  };

  /* ---------- 작은 도구 ---------- */
  function svg(tag, attrs, parent) {
    const e = doc.createElementNS(NS, tag);
    for (const k in attrs || {}) {
      if (k === "text") e.textContent = attrs[k];
      else if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(e);
    return e;
  }
  function el(tag, attrs, html) {
    const e = doc.createElement(tag);
    for (const k in attrs || {}) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function ready(fn) { if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", fn); else fn(); }
  let uid = 0;
  const nextId = (p) => (p || "sb") + "-" + (++uid);

  /* 공통 필터: 잉크 번짐(그림 선을 살짝 흔든다), 도장 질감 */
  function injectDefs() {
    if ($("#sb-defs")) return;
    const s = el("div", { id: "sb-defs", "aria-hidden": "true", style: "position:absolute;width:0;height:0;overflow:hidden" });
    s.innerHTML = `<svg width="0" height="0"><defs>
      <filter id="sb-ink" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6"/></filter>
      <filter id="sb-rough" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 1.45" result="holes"/><feComposite in="SourceGraphic" in2="holes" operator="in" result="ink"/><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="2" result="w"/><feDisplacementMap in="ink" in2="w" scale="2.2"/></filter>
    </defs></svg>`;
    doc.body.prepend(s);
  }

  /* ---------- 경로: 서가 / 책 / 장 ---------- */
  const page = () => doc.body.dataset.page || "shelf"; // shelf | home | teachers | stamps | chapter
  const toBook = () => (page() === "chapter" ? "../" : "");
  const toShelf = () => (page() === "shelf" ? "" : page() === "chapter" ? "../../" : "../");
  const chapters = () => (BOOK ? BOOK.chapters : []);
  const current = () => doc.body.dataset.chapter || null;

  /* ---------- 상단 바와 목차 서랍 ---------- */
  function feedbackUrl() {
    return BOOK
      ? "https://books.euiyun.com/feedback.html?book=" + encodeURIComponent(BOOK.portalId) + "&page=" + encodeURIComponent(location.href)
      : "https://books.euiyun.com/feedback.html";
  }
  function header() {
    if ($(".sb-top")) return;
    const top = el("header", { class: "sb-top" });
    const skip = el("a", { class: "skip", href: "#main" }, "본문으로 건너뛰기");
    const bookPart = BOOK ? `<span>${esc(BOOK.short)} · ${esc(BOOK.title)}</span>` : "<span>학교 수학·과학 서가</span>";
    top.innerHTML = `
      ${BOOK ? `<button class="sb-btn icon toc-open" type="button" aria-label="목차 열기" title="목차" aria-expanded="false" aria-controls="sb-drawer">${ICON.menu}</button>` : ""}
      <a class="brand" href="${BOOK ? toBook() + "index.html" : toShelf() || "./"}">${ICON.logo}<b>SchoolBooks</b>${bookPart}</a>
      ${BOOK ? `<a class="sb-btn" href="${toBook()}stamps.html" title="도장 수첩">${ICON.stamp}<span class="lbl">도장 수첩</span></a>` : ""}
      <button class="sb-btn icon theme-toggle" type="button"></button>
      <a class="sb-btn series-link" href="https://books.euiyun.com/" aria-label="전체 책 보기" title="전체 책 보기">${ICON.books}<span class="lbl">전체 책</span></a>
      <a class="sb-btn icon feedback-button" href="${feedbackUrl()}" target="_blank" rel="noopener" aria-label="독자 의견 보내기" title="독자 의견 보내기">${ICON.chat}</a>`;
    doc.body.prepend(top);
    doc.body.prepend(skip);
    const tb = $(".theme-toggle", top);
    setThemeIcon(tb);
    tb.addEventListener("click", toggleTheme);
    if (BOOK) drawer(top);
  }
  function drawer(top) {
    const got = stamps();
    const d = el("div", { class: "sb-drawer", id: "sb-drawer" });
    const items = chapters().map((c) => {
      const num = c.time ? c.time : String(c.num).padStart(2, "0");
      const mark = got[c.slug] ? `<span class="got" title="도장 받음">${ICON.stamp}</span>` : "";
      if (!c.ready) return `<li><span class="off"><span class="num">${esc(num)}</span><span>${esc(c.title)}<br><small>준비 중</small></span></span></li>`;
      const cur = current() === c.slug ? ' aria-current="page"' : "";
      return `<li><a href="${toBook()}chapters/${c.slug}.html"${cur}><span class="num">${esc(num)}</span><span>${esc(c.title)}</span>${mark}</a></li>`;
    }).join("");
    d.innerHTML = `<div class="scrim"></div><nav class="panel" aria-label="목차">
      <h2><span>${esc(BOOK.short)} · ${esc(BOOK.title)}</span><button class="sb-btn icon toc-close" type="button" aria-label="목차 닫기">${ICON.close}</button></h2>
      <ol class="sb-chlist">${items}</ol>
      <div class="links">
        <a href="${toBook()}index.html">${ICON.house} 책 첫 화면</a>
        <a href="${toBook()}stamps.html">${ICON.stamp} 도장 수첩</a>
        <a href="${toBook()}teachers.html">${ICON.note} 선생님·부모님 노트</a>
        <a href="${toShelf()}index.html">${ICON.books} SchoolBooks 서가</a>
      </div></nav>`;
    doc.body.appendChild(d);
    const open = $(".toc-open", top);
    const close = () => { d.classList.remove("open"); open.setAttribute("aria-expanded", "false"); open.focus(); };
    open.addEventListener("click", () => {
      d.classList.add("open"); open.setAttribute("aria-expanded", "true");
      const a = $('a[aria-current]', d) || $(".toc-close", d); a.focus();
    });
    $(".scrim", d).addEventListener("click", close);
    $(".toc-close", d).addEventListener("click", close);
    d.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }
  function footer() {
    if ($(".sb-foot")) return;
    const main = $("main");
    if (BOOK && page() === "chapter") {
      const list = chapters().filter((c) => c.ready);
      const i = list.findIndex((c) => c.slug === current());
      const prev = list[i - 1], next = list[i + 1];
      const p = el("nav", { class: "pager", "aria-label": "이전·다음 장" });
      p.innerHTML = (prev ? `<a class="prev" href="${prev.slug}.html"><small>← 이전</small>${esc(prev.title)}</a>` : "<span></span>") +
        (next ? `<a class="next" href="${next.slug}.html"><small>다음 →</small>${esc(next.title)}</a>` : `<a class="next" href="../stamps.html"><small>다음 →</small>도장 수첩 보기</a>`);
      main.after(p);
    }
    const f = el("footer", { class: "sb-foot" });
    const r = toShelf();
    f.innerHTML = `© 2026 geniuskey 및 SchoolBooks 기여자 · 본문·그림 <a rel="license" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · 코드 <a href="${r}LICENSE-MIT">MIT</a> · <a href="${r}LICENSE.md">라이선스 안내</a> · <a href="${feedbackUrl()}" target="_blank" rel="noopener">독자 의견</a><br>
      등장인물과 상황은 지어낸 것입니다. 틀린 곳을 발견하면 알려 주세요. <a href="https://books.euiyun.com/">euiyun 책 시리즈</a>의 한 서가입니다.`;
    ($(".pager") || main).after(f);
  }

  /* ---------- 예상하기 ---------- */
  const LETTERS = ["가", "나", "다", "라", "마"];
  const pkey = (id) => "pred:" + (BOOK ? BOOK.id : "shelf") + "/" + (current() || "page") + "/" + id;
  function predict(box) {
    if (box.dataset.sbReady) return; box.dataset.sbReady = "1";
    const id = box.dataset.id || box.id || "p";
    const btns = $$(".choice", box);
    const saved = $(".saved", box) || box.appendChild(el("p", { class: "saved", "aria-live": "polite" }));
    btns.forEach((b, i) => {
      b.type = "button";
      if (!$(".mark", b)) b.insertAdjacentHTML("afterbegin", `<span class="mark" aria-hidden="true">${LETTERS[i]}</span>`);
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => choose(b.dataset.v, true));
    });
    function choose(v, user) {
      btns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
      const b = btns.find((x) => x.dataset.v === v);
      if (!b) return;
      if (user) store.set(pkey(id), v);
      saved.textContent = box.dataset.saved || "예상을 적어 두었어요. 이제 아래에서 직접 해 봐요.";
      box.dataset.choice = v;
      box.dispatchEvent(new CustomEvent("sb:predict", { bubbles: true, detail: { id, value: v } }));
    }
    const prev = store.get(pkey(id), null);
    if (prev != null) choose(prev, false);
    box.reveal = () => {
      btns.forEach((b) => { b.disabled = true; if (b.dataset.v === box.dataset.answer) b.classList.add("is-answer"); });
    };
    return box;
  }

  /* ---------- 증명하기(플랩) ---------- */
  function flap(box) {
    if (box.dataset.sbReady) return; box.dataset.sbReady = "1";
    const pred = box.dataset.for ? doc.getElementById(box.dataset.for) : null;
    const body = $(".flap-body", box);
    const inner = el("div", { class: "flap-inner" });
    const cover = el("button", { class: "flap-cover", type: "button", "aria-expanded": "false" });
    const label = box.dataset.label || "플랩을 들춰 정답 보기";
    const paint = () => {
      const chosen = pred && pred.dataset.choice;
      cover.innerHTML = `${ICON.flap.replace('width="22" height="22"', 'width="34" height="34"')}<span class="tab">${esc(label)}</span><small>${pred && !chosen ? "위에서 예상을 하나 고른 뒤 들춰 보면 더 재미있어요." : "해 보기를 마쳤다면 들춰 봐요."}</small>`;
    };
    paint();
    if (pred) pred.addEventListener("sb:predict", paint);
    box.insertBefore(inner, body);
    inner.appendChild(cover);
    inner.appendChild(body);
    if (body.id === "") body.id = nextId("flap");
    cover.setAttribute("aria-controls", body.id);
    function open(focus) {
      if (box.classList.contains("open")) return;
      box.classList.add("open");
      cover.setAttribute("aria-expanded", "true");
      cover.tabIndex = -1;
      setTimeout(() => { cover.hidden = true; }, reduceMotion || !focus ? 0 : 600);
      let echo = $(".flap-echo", body);
      if (!echo) { echo = el("p", { class: "flap-echo" }); body.prepend(echo); }
      if (pred) {
        const v = pred.dataset.choice, ans = pred.dataset.answer;
        const chosenBtn = v ? $(`.choice[data-v="${v}"]`, pred) : null;
        if (!v) echo.textContent = box.dataset.none || "예상 없이 들춰 봤군요. 괜찮아요, 같이 봐요.";
        else if (v === ans) echo.textContent = (chosenBtn && chosenBtn.dataset.echo) || box.dataset.right || "예상이 맞았어요! 왜 그런지도 볼까요?";
        else echo.textContent = (chosenBtn && chosenBtn.dataset.echo) || box.dataset.wrong || "좋은 예상이에요. 사실은 이래요.";
        if (pred.reveal) pred.reveal();
      } else echo.remove();
      store.set(pkey("flap-" + (box.id || "f")), true);
      if (focus) { body.tabIndex = -1; body.focus({ preventScroll: true }); }
      box.dispatchEvent(new CustomEvent("sb:flap", { bubbles: true }));
    }
    cover.addEventListener("click", () => open(true));
    box.open = open;
    if (store.get(pkey("flap-" + (box.id || "f")), false)) open(false);
    return box;
  }

  /* ---------- 도장 ---------- */
  const skey = () => "stamps:" + (BOOK ? BOOK.id : "shelf");
  function stamps() { const s = store.get(skey(), {}); return s && typeof s === "object" ? s : {}; }
  const today = () => { const d = new Date(); return d.getFullYear() + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0"); };
  function stampSVG(o) {
    const id = nextId("st");
    const word = String(o.word || "도장");
    const fs = word.length <= 2 ? 34 : word.length === 3 ? 28 : word.length === 4 ? 23 : 19;
    return `<svg class="sb-stamp ${o.cls || ""}" viewBox="0 0 160 160" role="img" aria-label="${esc((o.label || "") + " 도장 " + word)}">
      <defs><path id="${id}-t" d="M 32 82 A 48 48 0 0 1 128 82"/><path id="${id}-b" d="M 21 80 A 59 59 0 0 0 139 80"/></defs>
      <g filter="url(#sb-rough)">
        <circle class="ring" cx="80" cy="80" r="74" stroke-width="4.5"/>
        <circle class="ring" cx="80" cy="80" r="66" stroke-width="1.6"/>
        <text font-size="11.5" letter-spacing="1.5"><textPath href="#${id}-t" startOffset="50%" text-anchor="middle">${esc(o.top || "SCHOOLBOOKS")}</textPath></text>
        <text x="80" y="${88 + (fs - 28) / 3}" font-size="${fs}" text-anchor="middle">${esc(word)}</text>
        <path d="M 46 100 H 114" stroke="currentColor" stroke-width="1.4" fill="none"/>
        <text font-size="11" letter-spacing="1"><textPath href="#${id}-b" startOffset="50%" text-anchor="middle">${esc(o.bottom || "")}</textPath></text>
        <circle cx="17" cy="80" r="2.6" fill="currentColor"/><circle cx="143" cy="80" r="2.6" fill="currentColor"/>
      </g></svg>`;
  }
  function stampFor(slug, date, cls) {
    const c = chapters().find((x) => x.slug === slug) || { num: 0, stamp: "도장" };
    return stampSVG({ word: c.stamp, top: "SCHOOLBOOKS · " + (BOOK ? BOOK.short : ""), bottom: String(c.num).padStart(2, "0") + "장 · " + (date || today()), cls, label: c.title });
  }
  function stamp(slug, spot) {
    slug = slug || current();
    const all = stamps();
    const first = !all[slug];
    if (first) { all[slug] = { date: today() }; store.set(skey(), all); }
    spot = spot || $(".stamp-spot");
    if (spot) {
      spot.innerHTML = stampFor(slug, all[slug].date, "press");
      const msg = spot.nextElementSibling && spot.nextElementSibling.classList.contains("stamp-msg") ? spot.nextElementSibling : null;
      if (msg) msg.textContent = first ? "도장을 받았어요! 도장 수첩에 모였어요." : "이미 받은 도장이에요. 다시 풀어 봐도 좋아요.";
    }
    doc.dispatchEvent(new CustomEvent("sb:stamp", { detail: { slug, first } }));
    return first;
  }
  function showStampSpot() {
    const spot = $(".stamp-spot");
    if (!spot) return;
    const got = stamps()[current()];
    if (got) {
      spot.innerHTML = stampFor(current(), got.date, "still");
      const msg = spot.nextElementSibling;
      if (msg && msg.classList.contains("stamp-msg")) msg.textContent = "이미 받은 도장이에요. 다시 풀어 봐도 좋아요.";
    } else if (!spot.innerHTML.trim()) spot.innerHTML = `<div class="empty">세 문제를 풀면<br>여기에 도장</div>`;
  }

  /* ---------- 확인 문항 ---------- */
  function quiz(box) {
    if (box.dataset.sbReady) return; box.dataset.sbReady = "1";
    const qs = $$(".quiz-q", box);
    const done = new Set();
    qs.forEach((q, qi) => {
      const ans = Number(q.dataset.answer);
      const opts = $$("button.opt", q);
      const why = $(".why", q);
      if (why) why.hidden = true;
      const fb = $(".fb", q) || q.appendChild(el("p", { class: "fb", "aria-live": "polite" }));
      const n = $(".qtext", q);
      if (n && !$(".n", n)) n.insertAdjacentHTML("afterbegin", `<span class="n">${qi + 1}.</span>`);
      opts.forEach((b, i) => {
        b.type = "button";
        b.addEventListener("click", () => {
          if (i === ans) {
            b.classList.add("right");
            opts.forEach((o) => (o.disabled = true));
            fb.className = "fb right";
            fb.textContent = (q.dataset.right || "맞아요!") + " ";
            if (why) { why.hidden = false; fb.appendChild(doc.createTextNode(why.textContent)); why.hidden = true; }
            done.add(qi);
            if (done.size === qs.length) finish();
          } else {
            b.classList.add("retry");
            b.disabled = true;
            fb.className = "fb retry";
            fb.textContent = b.dataset.hint || q.dataset.hint || "아깝네요. 다른 것도 골라 볼까요?";
          }
        });
      });
    });
    function finish() {
      if (box.dataset.stamp !== "off") stamp(box.dataset.stamp || current(), $(".stamp-spot", box.closest("section") || doc));
      box.dispatchEvent(new CustomEvent("sb:quizdone", { bubbles: true }));
    }
    return box;
  }

  /* ---------- 굵은 슬라이더 ---------- */
  function slider(input, opt) {
    opt = opt || {};
    const out = input.id ? $(`output[for="${input.id}"]`) : null;
    const fmt = opt.format || ((v) => v + (input.dataset.unit || ""));
    const upd = () => {
      const v = Number(input.value);
      if (out) out.textContent = fmt(v);
      input.setAttribute("aria-valuetext", fmt(v));
      if (opt.onInput) opt.onInput(v);
    };
    input.addEventListener("input", upd);
    upd();
    return { get value() { return Number(input.value); }, set(v) { input.value = v; upd(); } };
  }

  /* ---------- 끌기 ---------- */
  // handle: SVG 요소(g.handle). onMove({x,y}) 는 SVG 좌표를 받는다. 키보드: 화살표 키 → onKey(dx, dy)
  function svgPoint(svgEl, cx, cy) {
    const m = svgEl.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = svgEl.createSVGPoint(); p.x = cx; p.y = cy;
    const r = p.matrixTransform(m.inverse());
    return { x: r.x, y: r.y };
  }
  function drag(handle, o) {
    const svgEl = o.svg || handle.ownerSVGElement;
    let active = false, pid = null;
    handle.classList.add("handle");
    if (!handle.hasAttribute("tabindex")) handle.setAttribute("tabindex", "0");
    if (!handle.hasAttribute("role")) handle.setAttribute("role", "slider");
    const down = (e) => {
      active = true; pid = e.pointerId;
      try { handle.setPointerCapture(pid); } catch (err) { /* 무시 */ }
      e.preventDefault();
      if (o.onStart) o.onStart(svgPoint(svgEl, e.clientX, e.clientY));
      move(e);
    };
    const move = (e) => { if (!active || (pid != null && e.pointerId !== pid)) return; o.onMove(svgPoint(svgEl, e.clientX, e.clientY), e); };
    const up = (e) => { if (!active) return; active = false; try { handle.releasePointerCapture(pid); } catch (err) { /* 무시 */ } if (o.onEnd) o.onEnd(svgPoint(svgEl, e.clientX, e.clientY)); };
    handle.addEventListener("pointerdown", down);
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
    handle.addEventListener("keydown", (e) => {
      if (!o.onKey) return;
      const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (k) { e.preventDefault(); o.onKey(k[0] * (e.shiftKey ? 5 : 1), k[1] * (e.shiftKey ? 5 : 1)); }
    });
    // 넓은 영역(그림 전체)에서도 끌 수 있게: area 를 주면 그곳을 눌러도 손잡이가 따라온다
    if (o.area) {
      o.area.addEventListener("pointerdown", (e) => { if (e.target.closest(".handle")) return; down(e); });
      o.area.addEventListener("pointermove", move);
      o.area.addEventListener("pointerup", up);
      o.area.addEventListener("pointercancel", up);
    }
    return handle;
  }

  /* ---------- 보일 때만 도는 애니메이션 ---------- */
  function loop(target, fn) {
    let raf = 0, last = 0, visible = true, running = false;
    const tick = (t) => {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      fn(dt, t / 1000);
      raf = requestAnimationFrame(tick);
    };
    const start = () => { if (running || !visible || doc.hidden) return; running = true; last = 0; raf = requestAnimationFrame(tick); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; visible ? start() : stop(); }).observe(target);
    }
    doc.addEventListener("visibilitychange", () => (doc.hidden ? stop() : start()));
    if (reduceMotion) { fn(0, 0); return { start() {}, stop() {}, step() { fn(0, 0); } }; }
    start();
    return { start, stop, step() { fn(0, 0); } };
  }

  /* ---------- 빛나는 점의 흐름 ---------- */
  // 경로를 따라 빛나는 점이 흐른다. kind: glow | water | heat | life
  function flow(parent, o) {
    const path = typeof o.path === "string" ? svg("path", { d: o.path, fill: "none", stroke: "none" }, parent) : o.path;
    const g = svg("g", { class: "sb-flow", "aria-hidden": "true" }, parent);
    const kind = o.kind || "glow";
    const n = o.n || 10, r = o.r || 4;
    const dots = [];
    for (let i = 0; i < n; i++) {
      const d = svg("g", {}, g);
      svg("circle", { r: r * 2.3, class: kind + "-halo" }, d);
      svg("circle", { r, class: kind }, d);
      dots.push(d);
    }
    const ctl = { rate: o.rate == null ? 1 : o.rate, speed: o.speed || 60, phase: 0, path, g };
    let len = 0;
    try { len = path.getTotalLength(); } catch (e) { len = 0; }
    ctl.place = () => {
      try { len = path.getTotalLength(); } catch (e) { len = 0; }
      if (!len) return;
      dots.forEach((d, i) => {
        const s = ((ctl.phase + (i / n) * len) % len + len) % len;
        const p = path.getPointAtLength(s);
        d.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
        d.style.opacity = ctl.rate === 0 && o.hideWhenStopped ? 0 : 1;
      });
    };
    ctl.anim = loop(parent.ownerSVGElement || parent, (dt) => { ctl.phase += dt * ctl.speed * ctl.rate; ctl.place(); });
    ctl.place();
    return ctl;
  }

  /* ---------- KaTeX(중·고등만 불러온다) ---------- */
  function math() {
    if (typeof window.renderMathInElement !== "function") return;
    try {
      window.renderMathInElement($("main") || doc.body, {
        delimiters: [{ left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }],
        throwOnError: false
      });
    } catch (e) { /* 수식 없이도 읽을 수 있다 */ }
  }

  /* ---------- 시작 ---------- */
  ready(() => {
    injectDefs();
    header();
    if (!$("main").id) $("main").id = "main";
    footer();
    $$(".predict").forEach(predict);
    $$(".flap").forEach(flap);
    $$(".quiz").forEach(quiz);
    $$(".slider input[type=range]").forEach((i) => { if (!i.dataset.manual) slider(i); });
    showStampSpot();
    if (doc.readyState === "complete") math(); else window.addEventListener("load", math);
  });

  window.SB = {
    book: BOOK, store, icon: ICON, svg, el, esc, clamp, ready, nextId, isDark, toggleTheme,
    predict, flap, quiz, stamp, stamps, stampSVG, stampFor, slider, drag, svgPoint, loop, flow, reduceMotion,
    paths: { toBook, toShelf }, shelf: SHELF
  };
})();

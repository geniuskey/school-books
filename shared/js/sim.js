/* Copyright (c) 2026 geniuskey and SchoolBooks contributors. MIT (see ../../LICENSE-MIT).
   SchoolBooks 공통 계산. 전역 SIM (node 에서는 require 로 불러 검산한다: tools/sim.test.mjs).
   그림을 그리지 않는 순수 함수만 둔다. 단순화한 모델은 함수 설명에 무엇을 뺐는지 적는다.
   장을 쓰면서 그 장에 필요한 계산을 여기에 더하고, 반드시 테스트도 함께 더한다. */
(function (root) {
  "use strict";

  /* ---------- 기본 ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const round = (v, d) => { const k = Math.pow(10, d || 0); return Math.round(v * k) / k; };
  const deg = (r) => (r * 180) / Math.PI;
  const rad = (d) => (d * Math.PI) / 180;
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
  const lcm = (a, b) => (a && b ? Math.abs(a * b) / gcd(a, b) : 0);

  /* 같은 씨앗이면 같은 수열: 그림이 새로고침마다 바뀌지 않게, 검산도 되게 */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const randInt = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

  /* ---------- 00장: 접을 때마다 두 배 ---------- */
  // 종이를 반으로 n번 접으면 2^n 겹. 두께는 겹 수 × 한 장 두께(종이가 눌리는 것은 뺐다).
  const foldLayers = (n) => Math.pow(2, n);
  const foldThickness = (n, sheetMm) => foldLayers(n) * sheetMm;
  // 한 변의 길이가 반씩 줄어든다(긴 변을 번갈아 접는다고 본다). [가로, 세로]
  function foldSize(n, w, h) {
    for (let i = 0; i < n; i++) { if (w >= h) w /= 2; else h /= 2; }
    return [w, h];
  }

  /* ---------- 시각과 시간 ---------- */
  // 분 → {h, m} (하루 24시간을 넘으면 돌아간다)
  function hm(totalMin) { const t = ((Math.round(totalMin) % 1440) + 1440) % 1440; return { h: Math.floor(t / 60), m: t % 60 }; }
  const fmtHM = (totalMin) => { const { h, m } = hm(totalMin); return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"); };
  // 시곗바늘 각도(12시 방향 0도, 시계 방향): 분침은 1분에 6도, 시침은 1분에 0.5도
  function clockAngles(totalMin) { const { h, m } = hm(totalMin); return { hour: ((h % 12) * 60 + m) * 0.5, minute: m * 6 }; }

  /* ---------- 분수 ---------- */
  function simplify(n, d) { const g = gcd(n, d) || 1; return [n / g, d / g]; }
  const sameFraction = (a, b, c, d) => a * d === b * c;

  /* ---------- 넓이와 둘레(직사각형) ---------- */
  const rectArea = (w, h) => w * h;
  const rectPerimeter = (w, h) => 2 * (w + h);
  // 둘레가 p인 자연수 변의 직사각형들 [가로, 세로, 넓이]
  function rectsWithPerimeter(p) {
    const out = [];
    for (let w = 1; w <= p / 4; w++) { const h = p / 2 - w; if (Number.isInteger(h) && h >= w) out.push([w, h, w * h]); }
    return out;
  }

  /* ---------- 그림자 ---------- */
  // 해의 고도(도)와 물체 높이로 그림자 길이. 태양을 아주 먼 점광원으로 보고, 땅은 평평하다고 본다.
  function shadowLength(height, altitudeDeg) {
    if (altitudeDeg <= 0) return Infinity;
    return height / Math.tan(rad(altitudeDeg));
  }

  /* ---------- 주사위 ---------- */
  // 주사위 두 개 합의 경우의 수(2~12): 36가지 중 몇 가지인가
  function diceSumWays() { const w = {}; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) w[a + b] = (w[a + b] || 0) + 1; return w; }
  function rollSums(r, n) { const c = {}; for (let s = 2; s <= 12; s++) c[s] = 0; for (let i = 0; i < n; i++) c[randInt(r, 1, 6) + randInt(r, 1, 6)]++; return c; }

  /* ---------- 대푯값 ---------- */
  const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  function median(xs) { const s = xs.slice().sort((a, b) => a - b); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }

  /* ---------- 복리 ---------- */
  // 원금 p, 기간당 이율 r(0.03 = 3%), n기간 뒤의 원리합계
  const compound = (p, r, n) => p * Math.pow(1 + r, n);
  const simpleInterest = (p, r, n) => p * (1 + r * n);

  /* ---------- 거리 ---------- */
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

  /* ---------- 달의 위상 ---------- */
  // 해-지구-달 사이 각(0 = 삭, 180 = 망)으로 달의 밝은 면 비율. 궤도는 원, 기울기는 뺐다.
  const moonLitFraction = (angleDeg) => (1 - Math.cos(rad(angleDeg))) / 2;

  const SIM = {
    clamp, lerp, round, deg, rad, gcd, lcm, rng, randInt,
    foldLayers, foldThickness, foldSize,
    hm, fmtHM, clockAngles,
    simplify, sameFraction,
    rectArea, rectPerimeter, rectsWithPerimeter,
    shadowLength, diceSumWays, rollSums, mean, median, compound, simpleInterest, dist, moonLitFraction
  };
  if (typeof module !== "undefined" && module.exports) module.exports = SIM;
  else root.SIM = SIM;
})(typeof self !== "undefined" ? self : this);

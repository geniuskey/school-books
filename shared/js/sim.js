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

  // 분 → "8시 15분" (0분이면 "8시", 12시간제 아님: 24시간 그대로)
  function koTime(totalMin) { const { h, m } = hm(totalMin); return h + "시" + (m ? " " + m + "분" : ""); }
  // 분 → "1시간 5분", "25분", "2시간"
  function koDuration(min) { const h = Math.floor(min / 60), m = Math.round(min - h * 60); return (h ? h + "시간" : "") + (h && m ? " " : "") + (m || !h ? m + "분" : ""); }
  // 경계를 넘는 각도 차이(도)를 -180~180으로: 시곗바늘이 12를 지나도 끊기지 않게 돈다
  const unwrapDeg = (d) => ((d % 360) + 540) % 360 - 180;
  // n의 약수
  function divisors(n) { const out = []; for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i); return out; }

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

  /* ---------- 충격량 (고등 11장) ---------- */
  // 단위는 SI: kg, m/s, s, N. 멈추는 동안 힘이 일정하다고 본다(실제 힘은 솟았다 줄어든다: 평균 힘만 다룬다).
  const G = 9.8;
  const kmhToMs = (kmh) => kmh / 3.6;
  const momentum = (m, v) => m * v;
  // 속력 v에서 t초 만에 멈출 때 평균 힘: 운동량 변화 / 시간
  const stopForce = (m, v, t) => (m * v) / t;
  // 같은 감속으로 멈출 때 그동안 앞으로 간 거리(등가속도): v·t/2
  const stopDistance = (v, t) => (v * t) / 2;
  // 힘이 몸무게(m·g)의 몇 배인가
  const timesWeight = (F, m) => F / (m * G);
  // 충돌 힘의 모양: T초 동안 사인 반 주기로 솟았다 줄어든다. 넓이(충격량)는 평균 힘 × T와 같고 최고 힘은 평균의 π/2배.
  const humpForce = (avg, T, t) => (t <= 0 || t >= T ? 0 : (Math.PI / 2) * avg * Math.sin((Math.PI * t) / T));

  // 두 덩어리 충돌 모형(고등 11장). 차는 찌그러지는 길이 crush(m) 동안 일정하게 느려져 멈춘다(실제 충돌 파형은 들쭉날쭉하다).
  // 탑승자(m kg)는 차 안에서 앞으로 r(m)만큼 밀린다. 벨트는 느슨함 slack 뒤로 늘어나는 끈(용수철 + 감쇠, 되돌아올 때는 약하게),
  // 핸들·계기판은 r = gapDash 에서 만나는 아주 단단한 벽이다. 좌석 마찰·몸의 회전·몸 부위별 차이는 뺐다.
  // 결과 s 는 sample 초 간격의 시계열(t, 차 속도, 탑승자 속도, 탑승자가 받는 힘[몸무게의 배], r, 차 찌그러짐).
  function crashSim(o) {
    const m = o.m || 60, v0 = o.v0, L = o.crush, belt = !!o.belt;
    const P = Object.assign({ slack: 0.03, kb: 5e4, cb: 600, gapDash: 0.42, kd: 1.5e6, cd: 6000 }, o.p || {});
    const ac = (v0 * v0) / (2 * L), tc = v0 / ac;
    const dt = 1e-5, tEnd = o.tEnd || 0.2, every = Math.round((o.sample || 0.0005) / dt);
    let r = 0, u = 0, t = 0, imp = 0, tStop = null, rMax = 0, peakF = 0, hit = false, tHit = null, tPeak = 0;
    const s = { t: [], carV: [], occV: [], g: [], r: [], crush: [] };
    for (let i = 0; t <= tEnd + 1e-12; i++, t += dt) {
      const aCar = t < tc ? ac : 0, carV = t < tc ? v0 - ac * t : 0, crush = t < tc ? v0 * t - (ac * t * t) / 2 : L;
      let F = 0;
      if (belt && r > P.slack) F += Math.max(0, (P.kb * (r - P.slack) + (u > 0 ? P.cb * u : 0)) * (u < 0 ? 0.3 : 1));
      if (r > P.gapDash) { F += Math.max(0, P.kd * (r - P.gapDash) + P.cd * u); if (!hit) { hit = true; tHit = t; } }
      if (i % every === 0) { s.t.push(t); s.carV.push(carV); s.occV.push(carV + u); s.g.push(F / (m * G)); s.r.push(r); s.crush.push(crush); }
      if (tStop === null) { imp += F * dt; if (carV + u <= 0) tStop = t; }
      if (F > peakF) { peakF = F; tPeak = t; }
      if (r > rMax) rMax = r;
      u += (aCar - F / m) * dt; r += u * dt;
    }
    return { s, m, v0, peakF, peakG: peakF / (m * G), tPeak, tStop, rMax, impulse: imp, hit, tHit, tc, carG: ac / G, gapDash: P.gapDash };
  }
  // 거리 d 안에 v 에서 멈출 때: 일정한 힘이면 a = v²/2d (가장 낮은 최대 힘), 용수철처럼 커지는 힘이면 최대 힘이 그 2배
  const constStopG = (v, d) => (v * v) / (2 * d) / G;
  const springStopG = (v, d) => (v * v) / d / G;
  // 같은 힘을 받는 넓이가 다르면 압력(N/cm²)이 다르다
  const pressure = (F, areaCm2) => F / areaCm2;

  const SIM = {
    clamp, lerp, round, deg, rad, gcd, lcm, rng, randInt,
    foldLayers, foldThickness, foldSize,
    hm, fmtHM, clockAngles, koTime, koDuration, unwrapDeg, divisors,
    simplify, sameFraction,
    rectArea, rectPerimeter, rectsWithPerimeter,
    shadowLength, diceSumWays, rollSums, mean, median, compound, simpleInterest, dist, moonLitFraction,
    G, kmhToMs, momentum, stopForce, stopDistance, timesWeight, humpForce, crashSim, constStopG, springStopG, pressure
  };
  if (typeof module !== "undefined" && module.exports) module.exports = SIM;
  else root.SIM = SIM;
})(typeof self !== "undefined" ? self : this);

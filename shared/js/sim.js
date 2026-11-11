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
  /* ---------- 초등 장별 계산: 각 장은 자기 표식 자리에만 더한다 (Object.assign(SIM, {...})) ---------- */
  /* ch:mirror */
  // 02장: 공기 1m³가 온도 T(℃)에서 품을 수 있는 수증기의 최대량(포화 수증기량, g/m³).
  // 포화 수증기압은 Magnus 식(Alduchov & Eskridge 1996 계수, 물 위), 밀도는 이상 기체로 바꾼다. 기압의 영향은 뺐다.
  const satVaporPressure = (T) => 6.1094 * Math.exp((17.625 * T) / (T + 243.04)); // hPa
  const satVaporDensity = (T) => (satVaporPressure(T) * 100 * 18.015) / (8.314 * (T + 273.15));
  // 수증기 rho(g/m³)가 맺히기 시작하는 온도(이슬점). 공기가 식으며 줄어드는 부피는 뺐다(같은 rho 로 비교).
  function dewPointOf(rho) {
    let lo = -40, hi = 60;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (satVaporDensity(mid) < rho) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  // 거울 온도 Tm 에서 넘치는 수증기(g/m³). 0보다 크면 그만큼 물방울로 맺히고(응결), 작으면 물방울이 다시 날아간다(증발).
  const condenseExcess = (rho, Tm) => rho - satVaporDensity(Tm);
  Object.assign(SIM, { satVaporPressure, satVaporDensity, dewPointOf, condenseExcess });
  /* ch:toast */
  // 03장: 토스트(정사각형)를 똑같이 n조각으로 나누는 격자 [줄, 칸]. 실제로 자르기 쉬운 모양만 고른다(7·9·11조각은 뺐다).
  const TOAST_CUTS = [1, 2, 3, 4, 5, 6, 8, 10, 12];
  const TOAST_GRID = { 1: [1, 1], 2: [1, 2], 3: [1, 3], 4: [2, 2], 5: [1, 5], 6: [2, 3], 8: [2, 4], 10: [2, 5], 12: [3, 4] };
  const toastGrid = (n) => TOAST_GRID[n] || [1, n];
  // 분수 a/b 와 c/d 비교: -1(작다), 0(같다), 1(크다). 곱해서 비교해 소수 오차가 없다.
  const fracCompare = (a, b, c, d) => Math.sign(a * d - c * b);
  // a/b 와 크기가 같은 분수들(분모가 maxDen 이하, 나누기 쉬운 조각 수 안에서)
  function equivalents(a, b, maxDen, cuts) {
    const [n, d] = simplify(a, b), out = [];
    for (let k = 1; d * k <= (maxDen || 12); k++) if (!cuts || cuts.includes(d * k)) out.push([n * k, d * k]);
    return out;
  }
  // 분모가 10인 분수는 소수 한 자리로 바로 읽힌다: 3/10 → "0.3". 다른 분모는 null(이 장에서는 다루지 않는다).
  function tenthsText(a, b) {
    if ((a * 10) % b !== 0) return null;
    const t = (a * 10) / b;
    return t % 10 === 0 ? String(t / 10) : Math.floor(t / 10) + "." + (t % 10);
  }
  Object.assign(SIM, { TOAST_CUTS, toastGrid, fracCompare, equivalents, tenthsText });
  /* ch:shadow */
  // 04장: 해의 높이(태양 고도). 위도 lat, 적위 dec(하지 +23.44, 춘추분 0, 동지 -23.44), 남중에서 h시간 떨어진 때.
  // 대기의 빛 꺾임, 균시차(남중 시각이 날마다 조금씩 바뀌는 것), 해의 크기는 뺐다.
  const SEOUL_LAT = 37.57;
  const SEOUL_NOON = 12 * 60 + 30; // 서울(동경 127도)은 한국 표준시 기준 경도(135도)보다 서쪽이라 해가 12시 30분쯤 가장 높다
  const SEASON_DEC = { summer: 23.44, equinox: 0, winter: -23.44 };
  function sunAltitude(lat, dec, h) {
    const s = Math.sin(rad(lat)) * Math.sin(rad(dec)) + Math.cos(rad(lat)) * Math.cos(rad(dec)) * Math.cos(rad(15 * h));
    return deg(Math.asin(clamp(s, -1, 1)));
  }
  const noonAltitude = (lat, dec) => 90 - Math.abs(lat - dec);
  // 해가 떠 있는 시간의 반(시간)
  const halfDay = (lat, dec) => deg(Math.acos(clamp(-Math.tan(rad(lat)) * Math.tan(rad(dec)), -1, 1))) / 15;
  // 해가 높이 alt 에 오는 때가 남중에서 몇 시간 떨어져 있는가(오전이면 그만큼 앞, 오후면 뒤). 그 높이까지 못 오르면 null
  function hoursFromNoon(lat, dec, alt) {
    const c = (Math.sin(rad(alt)) - Math.sin(rad(lat)) * Math.sin(rad(dec))) / (Math.cos(rad(lat)) * Math.cos(rad(dec)));
    if (c > 1 + 1e-12 || c < -1) return null;
    return deg(Math.acos(clamp(c, -1, 1))) / 15;
  }
  // 분 → "오전 8시 5분", "낮 12시 30분", "오후 3시 50분" (step 분 단위로 반올림)
  function koClock(min, step) {
    const t = Math.round(min / (step || 1)) * (step || 1), h = Math.floor(t / 60) % 24, m = t % 60;
    const pre = h < 12 ? "오전" : h === 12 ? "낮" : "오후", hh = h > 12 ? h - 12 : h;
    return pre + " " + hh + "시" + (m ? " " + m + "분" : "");
  }
  Object.assign(SIM, { SEOUL_LAT, SEOUL_NOON, SEASON_DEC, sunAltitude, noonAltitude, halfDay, hoursFromNoon, koClock });
  /* ch:tiles */
  // 05장: 끈(둘레) 길이 p 를 지키며 가로를 바꾼다. 가로 w(1 ~ p/2-1)이면 세로는 p/2 - w.
  function rectForPerimeter(p, w) { const half = p / 2; w = clamp(Math.round(w), 1, half - 1); return [w, half - w, w * (half - w)]; }
  // 둘레가 p 인 직사각형 중 가장 넓은 것(정사각형에 가장 가까운 것)
  function widestRect(p) { return rectsWithPerimeter(p).reduce((a, b) => (b[2] > a[2] ? b : a)); }
  // 정다각형 한 각의 크기(도)와, 한 점에 빈틈없이 모일 수 있는 장 수(안 되면 0)
  const polygonAngle = (n) => ((n - 2) * 180) / n;
  function tilesAtPoint(n) { const k = 360 / polygonAngle(n); return Math.abs(k - Math.round(k)) < 1e-9 ? Math.round(k) : 0; }
  Object.assign(SIM, { rectForPerimeter, widestRect, polygonAngle, tilesAtPoint });
  /* ch:magnet */
  // 06장: 전기 회로. 전선(이어짐)·전구·끊김으로 된 그래프에서 전지 (+)극 'P'와 (-)극 'N'을 본다.
  // 전구 두 끝이 전선으로 각각 P와 N에 이어지면 켜진다(한 바퀴). 전선만으로 P와 N이 이어지면 합선이라 전구를 피해 간다.
  // 전선·전지 속 저항, 밝기 차이는 뺐다(켜짐과 꺼짐만).
  function circuitState(edges) {
    const up = {};
    const find = (x) => { if (!(x in up)) up[x] = x; while (up[x] !== x) { up[x] = up[up[x]]; x = up[x]; } return x; };
    find("P"); find("N");
    for (const [a, b, k] of edges) { find(a); find(b); if (k === "wire") up[find(a)] = find(b); }
    const p = find("P"), n = find("N"), short = p === n;
    const bulbs = edges.filter((e) => e[2] === "bulb").map(([a, b]) => {
      const ca = find(a), cb = find(b);
      return !short && ((ca === p && cb === n) || (ca === n && cb === p));
    });
    return { lit: bulbs.some(Boolean), bulbs, short };
  }
  // 06장 해 보기에 쓰는 물건: 전기가 통하는가, 자석에 붙는가
  // 10원 동전: 2006년부터 구리 씌운 알루미늄(그 전 것은 황동), 둘 다 자석에 붙지 않는다.
  const MATERIALS = {
    clip: { name: "쇠 클립", conducts: true, magnetic: true },
    foil: { name: "알루미늄 포일", conducts: true, magnetic: false },
    coin: { name: "10원 동전", conducts: true, magnetic: false },
    stick: { name: "나무젓가락", conducts: false, magnetic: false },
    eraser: { name: "지우개", conducts: false, magnetic: false }
  };
  // 해 보기 회로: 전구 끼우개 한쪽(S)에서 나온 전선 끝 a, 다른 쪽(T)에서 시험대(C1-물건-C2)를 지나 나온 전선 끝 b.
  // a, b 는 'P' | 'N' | null(아무 데도 안 물림). mat 은 MATERIALS 의 키 또는 null(비어 있음).
  // reason: lit | openA | openB | openAB | same | gap | insulator
  function bulbLab(a, b, mat) {
    const m = mat ? MATERIALS[mat] : null;
    const edges = [["S", "T", "bulb"], ["T", "C1", "wire"], ["C1", "C2", m && m.conducts ? "wire" : "open"]];
    if (a) edges.push(["S", a, "wire"]);
    if (b) edges.push(["C2", b, "wire"]);
    const st = circuitState(edges);
    let reason = "lit";
    if (!st.lit) {
      if (!a && !b) reason = "openAB";
      else if (!a) reason = "openA";
      else if (!b) reason = "openB";
      else if (a === b) reason = "same";
      else reason = m ? "insulator" : "gap";
    }
    return { lit: st.lit, short: st.short, reason, magnetic: !!(m && m.magnetic), conducts: !!(m && m.conducts) };
  }
  Object.assign(SIM, { circuitState, MATERIALS, bulbLab });
  /* ch:lunch */
  // 07장: 먹은 음식이 지나는 길과 머무는 대략의 시간(분). 사람·음식마다 크게 다르다.
  // 위 + 작은창자 6~8시간, 큰창자 약 36시간(Mayo Clinic, Digestion: How long does it take?). 위 3시간·작은창자 4시간으로 나눈 것은 그림을 위한 가정.
  // 입은 1분, 식도는 몇 초(10초로 둔다). 간을 거치는 길, 쓸개즙·이자액은 뺐다.
  const DIGEST = [
    { key: "mouth", name: "입", min: 1 },
    { key: "esophagus", name: "식도", min: 10 / 60 },
    { key: "stomach", name: "위", min: 180 },
    { key: "small", name: "작은창자", min: 240 },
    { key: "large", name: "큰창자", min: 36 * 60 }
  ];
  // i번째 기관 안을 frac(0~1)만큼 지났을 때 먹은 뒤 지난 분
  function digestElapsed(i, frac) {
    i = clamp(Math.floor(i), 0, DIGEST.length - 1);
    let t = 0;
    for (let j = 0; j < i; j++) t += DIGEST[j].min;
    return t + DIGEST[i].min * clamp(frac, 0, 1);
  }
  // 지난 분 → 쉬운 말: "막 먹었어요", "약 40분", "약 3시간", "약 1일 19시간"
  function koAbout(min) {
    if (min < 1) return "막 먹었어요";
    if (min < 60) return "약 " + Math.round(min) + "분";
    const h = Math.round(min / 60);
    if (h < 24) return "약 " + h + "시간";
    return "약 " + Math.floor(h / 24) + "일" + (h % 24 ? " " + (h % 24) + "시간" : "");
  }
  // 시작 시각(분)에서 min 분 뒤: "오늘 15시 20분", "내일 7시", "모레 …" (10분 단위로 반올림)
  function koDayTime(start, min) {
    const t = Math.round((start + min) / 10) * 10, d = Math.floor(t / 1440);
    return (["오늘", "내일", "모레"][d] || d + "일 뒤") + " " + koTime(t);
  }
  Object.assign(SIM, { DIGEST, digestElapsed, koAbout, koDayTime });
  /* ch:store */
  // 08장: 어림과 거스름돈. 값은 원 단위 자연수(10원 단위)라고 본다.
  const roundUpTo = (v, unit) => Math.ceil(v / unit) * unit;
  const roundDownTo = (v, unit) => Math.floor(v / unit) * unit;
  // 한 개 값 price를 unit 자리로 올리고 내려 n개 값을 어림한다. 가진 돈 have와 비교:
  // sure = 올려 어림해도 넉넉하다(확실히 살 수 있다), no = 내려 어림해도 넘는다(확실히 못 산다), check = 어림으로는 모른다.
  function affordEstimate(price, n, have, unit) {
    const up = roundUpTo(price, unit) * n, down = roundDownTo(price, unit) * n, exact = price * n;
    const verdict = up <= have ? "sure" : down > have ? "no" : "check";
    return { up, down, exact, verdict, ok: exact <= have, change: Math.max(0, have - exact), short: Math.max(0, exact - have) };
  }
  // 거스름돈 "위로 세기": 물건값에서 출발해 먼저 100원 단위, 다음 1,000원 단위로 맞춘 뒤 낸 돈까지 센다.
  // 단계마다 가장 큰 동전·지폐부터(10·50·100·500·1,000·5,000원). [{unit, count, reach}]
  function countUpChange(total, paid) {
    const steps = []; let cur = total;
    const legs = [[100, [50, 10]], [1000, [500, 100]], [0, [5000, 1000]]];
    for (const [to, units] of legs) {
      const target = to ? Math.min(paid, Math.ceil(cur / to) * to) : paid;
      for (const u of units) {
        const k = Math.floor((target - cur) / u);
        if (k > 0) { cur += k * u; steps.push({ unit: u, count: k, reach: cur }); }
      }
    }
    return steps;
  }
  Object.assign(SIM, { roundUpTo, roundDownTo, affordEstimate, countUpChange });
  /* ch:sprout */
  // 09장: 강낭콩 키 모형. 실제로 잰 값이 아니라 그럴듯한 모양을 보이려고 만든 가상 모형이다.
  // 빛 light = 하루에 햇빛이 드는 시간(2~12), 물 water = 흙의 촉촉함(0~100, 60이 알맞다).
  // 싹 트는 날은 물로만 정한다(강낭콩은 어두워도 싹이 튼다). 싹이 튼 뒤 키는 S자(로지스틱) 곡선:
  // 느리게 → 쑥 → 거의 멈춤. 다 자란 키는 빛과 물에 따라 줄어든다. 온도·흙·웃자람(빛이 아주 적을 때 가늘고 길게 크는 것)은 뺐다.
  function beanModel(light, water) {
    const fl = clamp((light - 1) / 9, 0.1, 1);
    const fw = clamp(1 - Math.pow((water - 60) / 55, 2), 0.1, 1);
    const sprout = Math.round(6 + 6 * (1 - fw));
    const K = 45 * fl * fw, r = 0.28, c = sprout + 14;
    const s = (d) => 1 / (1 + Math.exp(-r * (d - c)));
    const s0 = s(sprout);
    const height = (d) => (d <= sprout ? 0 : (K * (s(d) - s0)) / (1 - s0));
    const health = fl * fw;
    return { light, water, fl, fw, sprout, K, health, height, flowerDay: health > 0.35 ? sprout + 30 : null, podDay: health > 0.35 ? sprout + 38 : null };
  }
  // 날마다 잰 키(cm, 소수 한 자리)와 하루 동안 자란 길이
  function beanRecord(model, days) {
    const h = [], grow = [];
    for (let d = 0; d <= days; d++) { h.push(round(model.height(d), 1)); grow.push(d ? round(model.height(d) - model.height(d - 1), 1) : 0); }
    return { h, grow };
  }
  // 그날의 모습: seed(씨) → root(뿌리가 먼저) → cotyledon(떡잎) → leaves(본잎) → flower(꽃) → pod(꼬투리)
  function beanStage(model, d) {
    if (d < model.sprout - 2) return "seed";
    if (d <= model.sprout) return "root";
    if (model.podDay && d >= model.podDay) return "pod";
    if (model.flowerDay && d >= model.flowerDay) return "flower";
    return model.height(d) < 6 ? "cotyledon" : "leaves";
  }
  Object.assign(SIM, { beanModel, beanRecord, beanStage });
  /* ch:dice */
  // 10장: 주사위 두 개. 주사위는 고르다(여섯 면이 똑같이 나온다)고 본다.
  // 한 번 굴리기 → [첫째, 둘째]
  const rollPair = (r) => [randInt(r, 1, 6), randInt(r, 1, 6)];
  // 합이 s가 되는 [첫째, 둘째] 짝들(36칸 표에서 그 합이 적힌 칸)
  function dicePairs(s) { const out = []; for (let a = 1; a <= 6; a++) { const b = s - a; if (b >= 1 && b <= 6) out.push([a, b]); } return out; }
  // n번 굴렸을 때 합 s가 나올 것으로 기대되는 횟수(36칸 중 몇 칸인가에 비례)
  const diceExpected = (s, n) => (dicePairs(s).length * n) / 36;
  Object.assign(SIM, { rollPair, dicePairs, diceExpected });
  /* ch:map */
  // 11장: 축척. 1:k 지도에서 지도 위 1cm는 실제 k cm. 땅은 평평하다고 본다(지구가 둥근 것은 뺐다).
  const mapToRealM = (cm, k) => (cm * k) / 100;
  const realToMapCm = (m, k) => (m * 100) / k;
  // 1234567 → "1,234,567"
  function fmtNum(v) { const s = String(Math.round(v)); return s.replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  // 실제 거리(m)를 읽기 좋게: 1000m 이상은 km(소수 한 자리까지), 그 아래는 10m 단위
  function fmtLen(m) {
    if (m >= 1000) { const k = Math.round(m / 100) / 10; return (Number.isInteger(k) ? k : k.toFixed(1)) + "km"; }
    return fmtNum(m >= 100 ? Math.round(m / 10) * 10 : Math.round(m)) + "m";
  }
  Object.assign(SIM, { mapToRealM, realToMapCm, fmtNum, fmtLen });
  /* ch:moon */
  // 12장: 달의 모양. θ는 지구에서 본 해와 달 사이 각(0 = 해 쪽, 반시계 방향으로 늘어 180 = 해 반대쪽).
  // 궤도는 원, 궤도 기울기와 해까지의 실제 거리는 뺐다. 북반구(우리나라)에서 본 모습: 차오를 때 오른쪽이 밝다.
  const SYNODIC = 29.53; // 삭에서 다음 삭까지(날), 한국천문연구원·NASA 평균 삭망월
  function moonPhase(thetaDeg) {
    const t = ((thetaDeg % 360) + 360) % 360;
    const age = (t / 360) * SYNODIC;
    const name = t < 15 || t >= 345 ? "보이지 않는 달" : t < 75 ? "초승달" : t < 105 ? "상현달" : t < 165 ? "차오르는 달"
      : t < 195 ? "보름달" : t < 255 ? "기우는 달" : t < 285 ? "하현달" : "그믐달";
    // tx: 밝은 쪽 경계선(타원)의 가로 반지름 / 달 반지름. 양수면 경계가 밝은 쪽으로 볼록(초승·그믐), 음수면 반대(보름 쪽)
    return { theta: t, lit: moonLitFraction(t), waxing: t > 0 && t < 180, age, lunarDay: Math.floor(age) + 1, name, tx: Math.cos(rad(t)) };
  }
  Object.assign(SIM, { SYNODIC, moonPhase });
  if (typeof module !== "undefined" && module.exports) module.exports = SIM;
  else root.SIM = SIM;
})(typeof self !== "undefined" ? self : this);

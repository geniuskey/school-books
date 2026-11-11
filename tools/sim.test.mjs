// Copyright (c) 2026 geniuskey and SchoolBooks contributors. MIT (see ../LICENSE-MIT).
// SIM 검산: node --test tools/sim.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const SIM = createRequire(import.meta.url)('../shared/js/sim.js')
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} ≉ ${b}`)

test('기본', () => {
  assert.equal(SIM.gcd(12, 18), 6)
  assert.equal(SIM.lcm(4, 6), 12)
  assert.equal(SIM.clamp(5, 0, 3), 3)
  near(SIM.round(2.345, 2), 2.35)
  const a = SIM.rng(7), b = SIM.rng(7)
  for (let i = 0; i < 5; i++) assert.equal(a(), b())
  const r = SIM.rng(1)
  for (let i = 0; i < 1000; i++) { const v = SIM.randInt(r, 1, 6); assert.ok(v >= 1 && v <= 6) }
})

test('00장: 접을 때마다 두 배', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(SIM.foldLayers), [1, 2, 4, 8, 16, 32])
  near(SIM.foldThickness(4, 0.1), 1.6)
  // A4(297×210)를 한 번 접으면 A5 크기(148.5×210)
  assert.deepEqual(SIM.foldSize(1, 297, 210), [148.5, 210])
  assert.deepEqual(SIM.foldSize(2, 297, 210), [148.5, 105])
})

test('시각과 시간', () => {
  assert.equal(SIM.fmtHM(7 * 60 + 50 + 25), '08:15')
  assert.equal(SIM.fmtHM(23 * 60 + 70), '00:10')
  assert.deepEqual(SIM.clockAngles(3 * 60), { hour: 90, minute: 0 })
  assert.deepEqual(SIM.clockAngles(7 * 60 + 30), { hour: 225, minute: 180 })
  // 01장: 7시 50분 + 25분 = 8시 15분
  assert.equal(SIM.koTime(7 * 60 + 50 + 25), '8시 15분')
  assert.equal(SIM.koTime(9 * 60), '9시')
  assert.equal(SIM.koDuration(25), '25분')
  assert.equal(SIM.koDuration(65), '1시간 5분')
  assert.equal(SIM.koDuration(120), '2시간')
  assert.equal(SIM.koDuration(0), '0분')
  assert.equal(SIM.koTime(8 * 60 + 40 + 30), '9시 10분')
  assert.equal(SIM.unwrapDeg(350 - 10), -20)
  assert.equal(SIM.unwrapDeg(10 - 350), 20)
  assert.equal(SIM.unwrapDeg(90), 90)
  // 60은 2·3·4·5·6으로 나누어떨어지고 100은 3으로 안 나누어떨어진다
  assert.deepEqual(SIM.divisors(60), [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60])
  for (const k of [2, 3, 4, 5, 6]) assert.equal(60 % k, 0)
  assert.notEqual(100 % 3, 0)
  assert.equal(SIM.divisors(100).length, 9)
})

test('분수와 넓이', () => {
  assert.deepEqual(SIM.simplify(6, 8), [3, 4])
  assert.ok(SIM.sameFraction(1, 2, 4, 8))
  assert.equal(SIM.rectArea(3, 4), 12)
  assert.equal(SIM.rectPerimeter(3, 4), 14)
  // 둘레 16: 1×7, 2×6, 3×5, 4×4 — 넓이는 7, 12, 15, 16으로 다르다
  assert.deepEqual(SIM.rectsWithPerimeter(16).map((x) => x[2]), [7, 12, 15, 16])
})

test('그림자', () => {
  near(SIM.shadowLength(1, 45), 1, 1e-12)
  near(SIM.shadowLength(1, 30), Math.sqrt(3), 1e-12)
  assert.ok(SIM.shadowLength(1, 10) > SIM.shadowLength(1, 60))
  assert.equal(SIM.shadowLength(1, 0), Infinity)
})

test('주사위', () => {
  const w = SIM.diceSumWays()
  assert.equal(w[7], 6)
  assert.equal(w[2], 1)
  assert.equal(Object.values(w).reduce((s, x) => s + x, 0), 36)
  const c = SIM.rollSums(SIM.rng(3), 3600)
  assert.equal(Object.values(c).reduce((s, x) => s + x, 0), 3600)
  assert.ok(c[7] > c[2] && c[7] > c[12])
})

test('대푯값·복리·거리·달', () => {
  assert.equal(SIM.mean([1, 2, 3, 10]), 4)
  assert.equal(SIM.median([1, 2, 3, 10]), 2.5)
  assert.equal(SIM.median([5, 1, 3]), 3)
  near(SIM.compound(100, 0.1, 2), 121, 1e-9)
  near(SIM.simpleInterest(100, 0.1, 2), 120, 1e-9)
  assert.equal(SIM.dist(0, 0, 3, 4), 5)
  near(SIM.moonLitFraction(0), 0)
  near(SIM.moonLitFraction(90), 0.5)
  near(SIM.moonLitFraction(180), 1)
})

test('고등 11장: 충격량', () => {
  near(SIM.kmhToMs(36), 10)
  near(SIM.momentum(60, 10), 600)
  const v = SIM.kmhToMs(50)
  // 같은 속도: 0.1초에 멈추면 0.5초보다 평균 힘이 5배
  near(SIM.stopForce(60, v, 0.1) / SIM.stopForce(60, v, 0.5), 5, 1e-12)
  // 힘 × 시간 = 운동량 변화 (어떤 시간이든)
  for (const t of [0.02, 0.1, 0.37]) near(SIM.stopForce(60, v, t) * t, SIM.momentum(60, v), 1e-9)
  // 60kg, 50km/h, 0.1초: 약 8,333N, 몸무게의 약 14배, 약 69cm
  near(SIM.stopForce(60, v, 0.1), 8333.333, 1e-3)
  assert.equal(Math.round(SIM.timesWeight(SIM.stopForce(60, v, 0.1), 60)), 14)
  near(SIM.stopDistance(v, 0.1), 0.6944, 1e-4)
  // 10kg 아이를 안고 있다면: 같은 조건에서 약 1,389N, 아이 몸무게의 약 14배
  near(SIM.stopForce(10, v, 0.1), 1388.889, 1e-3)
  // 속도가 두 배면 충격량도 두 배
  near(SIM.momentum(60, 2 * v) / SIM.momentum(60, v), 2)
})

test('고등 11장: 충돌 힘 곡선', () => {
  // 곡선 아래 넓이 = 평균 힘 × 시간 (같은 충격량)
  for (const T of [0.03, 0.1, 0.15]) {
    let a = 0; const n = 20000, dt = T / n
    for (let i = 0; i < n; i++) a += SIM.humpForce(14, T, (i + 0.5) * dt) * dt
    near(a, 14 * T, 1e-6)
  }
  near(SIM.humpForce(10, 0.1, 0.05), 10 * Math.PI / 2, 1e-12)
  assert.equal(SIM.humpForce(10, 0.1, -0.01), 0)
  assert.equal(SIM.humpForce(10, 0.1, 0.2), 0)
  // 시속 50km: 맨몸 0.03초 약 47배, 벨트 0.1초 약 14배, 에어백 0.15초 약 9배 / 시속 80km 벨트 약 23배, 에어백 약 15배
  const k = (kmh, T) => SIM.timesWeight(SIM.stopForce(60, SIM.kmhToMs(kmh), T), 60)
  assert.deepEqual([k(50, 0.03), k(50, 0.1), k(50, 0.15), k(80, 0.1), k(80, 0.15)].map(Math.round), [47, 14, 9, 23, 15])
  // 시속 80km 맨몸도 최고 힘이 그래프(120배) 안에 들어온다
  assert.ok(k(80, 0.03) * Math.PI / 2 < 120)
})

test('고등 11장: 두 덩어리 충돌 모형', () => {
  const v0 = SIM.kmhToMs(50)
  const none = SIM.crashSim({ v0, crush: 0.6, belt: false })
  const belt = SIM.crashSim({ v0, crush: 0.6, belt: true })
  // 탑승자가 멈출 때까지 받은 충격량 = m·v0 (벨트가 있든 없든)
  near(none.impulse, 60 * v0, 2)
  near(belt.impulse, 60 * v0, 2)
  // 차는 0.6m 찌그러지며 약 16g로 0.086초에 멈춘다
  near(none.carG, 16.4, 0.1); near(none.tc, 0.0864, 1e-3)
  // 맨몸은 핸들에 부딪히고 최대 힘이 벨트보다 훨씬 크다
  assert.ok(none.hit && !belt.hit)
  assert.ok(none.peakG > 4 * belt.peakG)
  assert.ok(belt.peakG > 20 && belt.peakG < 35, String(belt.peakG))
  // 벨트를 맨 탑승자는 차와 함께 일찍 느려지기 시작한다(같은 시각의 속도가 더 낮다)
  const i = belt.s.t.findIndex((t) => t >= 0.05)
  assert.ok(belt.s.occV[i] < none.s.occV[i])
  // 차가 더 길게 찌그러지면 벨트를 맨 탑승자의 최대 힘이 줄어든다
  assert.ok(SIM.crashSim({ v0, crush: 0.9, belt: true }).peakG < SIM.crashSim({ v0, crush: 0.3, belt: true }).peakG)
  // 시속 80km, 0.6m: 벨트만으로는 핸들에 닿는다
  assert.ok(SIM.crashSim({ v0: SIM.kmhToMs(80), crush: 0.6, belt: true }).hit)
  // 같은 거리에서 일정한 힘이 가장 낮다: 50km/h, 1m → 약 9.8g, 용수철 모양은 2배
  near(SIM.constStopG(v0, 1), 9.84, 0.01)
  near(SIM.springStopG(v0, 1) / SIM.constStopG(v0, 1), 2)
  near(SIM.pressure(6000, 300), 20)
})

// 초등 장별 검산: 각 장은 자기 표식 자리에만 더한다
// ch:mirror
test('초등 02장: 포화 수증기량과 응결', () => {
  // 표에 나오는 값(0℃ 4.8, 20℃ 17.3, 30℃ 30.4 g/m³)과 1% 안에서 맞는다
  near(SIM.satVaporDensity(0), 4.85, 0.05)
  near(SIM.satVaporDensity(20), 17.3, 0.17)
  near(SIM.satVaporDensity(30), 30.4, 0.3)
  // 따뜻할수록 더 많이 품는다
  for (let t = 0; t < 40; t++) assert.ok(SIM.satVaporDensity(t + 1) > SIM.satVaporDensity(t))
  // 이슬점은 포화 수증기량의 거꾸로
  for (const t of [5, 15, 25]) near(SIM.dewPointOf(SIM.satVaporDensity(t)), t, 1e-6)
  // 실험 기본값: 26℃ 욕실 공기에 20g → 약 22.6℃ 아래 거울에 맺힌다
  near(SIM.dewPointOf(20), 22.56, 0.01)
  assert.ok(SIM.condenseExcess(20, 18) > 4 && SIM.condenseExcess(20, 18) < 5)
  assert.ok(SIM.condenseExcess(20, 30) < 0)
  // 26℃ 공기는 24g까지 품는다(실험 슬라이더 최대)
  assert.ok(SIM.satVaporDensity(26) > 24)
})
// ch:toast
test('초등 03장: 토스트 나누기와 분수 비교', () => {
  // 모든 조각 수는 격자로 정확히 나뉜다
  for (const n of SIM.TOAST_CUTS) { const [r, c] = SIM.toastGrid(n); assert.equal(r * c, n) }
  // 1/2 = 2/4, 1/8 < 1/4, 3/8 < 1/2, 2/3 > 3/5
  assert.equal(SIM.fracCompare(1, 2, 2, 4), 0)
  assert.equal(SIM.fracCompare(1, 8, 1, 4), -1)
  assert.equal(SIM.fracCompare(3, 8, 1, 2), -1)
  assert.equal(SIM.fracCompare(2, 3, 3, 5), 1)
  // 단위분수는 분모가 클수록 작다
  for (let d = 1; d < 12; d++) assert.equal(SIM.fracCompare(1, d, 1, d + 1), 1)
  // 1/2 과 크기가 같은 분수(나눌 수 있는 조각 안에서)
  assert.deepEqual(SIM.equivalents(1, 2, 12, SIM.TOAST_CUTS), [[1, 2], [2, 4], [3, 6], [4, 8], [5, 10], [6, 12]])
  assert.deepEqual(SIM.equivalents(2, 4, 12), [[1, 2], [2, 4], [3, 6], [4, 8], [5, 10], [6, 12]])
  // 분모 10 → 소수 한 자리
  assert.equal(SIM.tenthsText(3, 10), '0.3')
  assert.equal(SIM.tenthsText(10, 10), '1')
  assert.equal(SIM.tenthsText(1, 2), '0.5')
  assert.equal(SIM.tenthsText(2, 5), '0.4')
  assert.equal(SIM.tenthsText(1, 3), null)
})
// ch:shadow
test('초등 04장: 해의 높이와 그림자', () => {
  const L = SIM.SEOUL_LAT, D = SIM.SEASON_DEC
  // 서울 남중 고도: 하지 약 76도, 춘추분 약 52도, 동지 약 29도
  assert.deepEqual([D.summer, D.equinox, D.winter].map((d) => Math.round(SIM.noonAltitude(L, d))), [76, 52, 29])
  for (const d of [D.summer, D.equinox, D.winter]) near(SIM.sunAltitude(L, d, 0), SIM.noonAltitude(L, d), 1e-9)
  // 춘추분 아침 8시(남중 4시간 30분 전) 약 18도 → 키 1.4m 그림자 약 4.4m, 낮 12시엔 약 52도 → 약 1.1m
  const a8 = SIM.sunAltitude(L, 0, -4.5), a12 = SIM.sunAltitude(L, 0, -0.5)
  near(a8, 17.6, 0.2); near(a12, 51.9, 0.3)
  assert.ok(SIM.shadowLength(1.4, a8) > 3.5 * SIM.shadowLength(1.4, a12))
  // 낮 길이: 춘추분 12시간, 하지 약 14.6시간, 동지 약 9.4시간
  near(2 * SIM.halfDay(L, 0), 12, 1e-9)
  near(2 * SIM.halfDay(L, D.summer), 14.6, 0.1); near(2 * SIM.halfDay(L, D.winter), 9.4, 0.1)
  // 거꾸로: 고도 → 시각, 오르지 못하는 높이는 null
  near(SIM.hoursFromNoon(L, 0, a8), 4.5, 1e-9)
  assert.equal(SIM.hoursFromNoon(L, D.winter, 40), null)
  near(SIM.hoursFromNoon(L, D.winter, SIM.noonAltitude(L, D.winter)), 0, 1e-6)
  // 해 높이 45도면 그림자 길이 = 키
  near(SIM.shadowLength(1.4, 45), 1.4, 1e-12)
  assert.equal(SIM.koClock(8 * 60), '오전 8시')
  assert.equal(SIM.koClock(12 * 60 + 30), '낮 12시 30분')
  assert.equal(SIM.koClock(15 * 60 + 52, 5), '오후 3시 50분')
})
// ch:tiles
test('초등 05장: 둘레와 넓이', () => {
  // 끈 20칸: 가로 1~9, 넓이 9·16·21·24·25·24·21·16·9
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map((w) => SIM.rectForPerimeter(20, w)[2]), [9, 16, 21, 24, 25, 24, 21, 16, 9])
  assert.deepEqual(SIM.rectForPerimeter(20, 0), [1, 9, 9])
  assert.deepEqual(SIM.rectForPerimeter(20, 12), [9, 1, 9])
  for (let w = 1; w < 10; w++) { const [a, b] = SIM.rectForPerimeter(20, w); assert.equal(SIM.rectPerimeter(a, b), 20) }
  assert.deepEqual(SIM.widestRect(20), [5, 5, 25])
  assert.deepEqual(SIM.widestRect(16), [4, 4, 16])
  // 정다각형: 삼각형 60도 6장, 사각형 90도 4장, 오각형 108도 안 됨, 육각형 120도 3장
  assert.deepEqual([3, 4, 5, 6, 8].map(SIM.polygonAngle), [60, 90, 108, 120, 135])
  assert.deepEqual([3, 4, 5, 6, 7, 8].map(SIM.tilesAtPoint), [6, 4, 0, 3, 0, 0])
})
// ch:magnet
test('초등 06장: 전기 회로와 자석', () => {
  // 전구 두 끝이 각각 (+)극과 (-)극에: 켜진다
  assert.ok(SIM.circuitState([['S', 'T', 'bulb'], ['S', 'N', 'wire'], ['T', 'P', 'wire']]).lit)
  // 두 끝을 모두 (+)극에: 한 바퀴가 아니다
  assert.ok(!SIM.circuitState([['S', 'T', 'bulb'], ['S', 'P', 'wire'], ['T', 'P', 'wire']]).lit)
  // 전선 하나만: 안 켜진다
  assert.ok(!SIM.circuitState([['S', 'T', 'bulb'], ['S', 'P', 'wire']]).lit)
  // 합선: 전선만으로 P–N 이 이어지면 전구를 피해 간다
  const sh = SIM.circuitState([['S', 'T', 'bulb'], ['S', 'N', 'wire'], ['T', 'P', 'wire'], ['P', 'N', 'wire']])
  assert.ok(sh.short && !sh.lit)
  // 전선 여러 토막을 거쳐도 이어지면 켜진다
  assert.ok(SIM.circuitState([['S', 'T', 'bulb'], ['S', 'a', 'wire'], ['a', 'b', 'wire'], ['b', 'N', 'wire'], ['T', 'P', 'wire']]).lit)
  // 해 보기 회로
  assert.equal(SIM.bulbLab('N', 'P', 'clip').reason, 'lit')
  assert.equal(SIM.bulbLab('P', 'N', 'foil').reason, 'lit')
  assert.equal(SIM.bulbLab('P', 'P', 'clip').reason, 'same')
  assert.equal(SIM.bulbLab(null, 'P', 'clip').reason, 'openA')
  assert.equal(SIM.bulbLab('N', null, 'clip').reason, 'openB')
  assert.equal(SIM.bulbLab(null, null, 'clip').reason, 'openAB')
  assert.equal(SIM.bulbLab('N', 'P', 'stick').reason, 'insulator')
  assert.equal(SIM.bulbLab('N', 'P', null).reason, 'gap')
  // 알루미늄·10원 동전은 전기가 통하지만 자석에 붙지 않는다
  for (const k of ['foil', 'coin']) { const r = SIM.bulbLab('N', 'P', k); assert.ok(r.lit && !r.magnetic) }
  assert.ok(SIM.bulbLab(null, null, 'clip').magnetic)
  assert.ok(Object.values(SIM.MATERIALS).filter((m) => m.magnetic).every((m) => m.conducts))
})
// ch:lunch
test('초등 07장: 음식이 지나는 길', () => {
  assert.deepEqual(SIM.DIGEST.map((d) => d.name), ['입', '식도', '위', '작은창자', '큰창자'])
  near(SIM.digestElapsed(0, 0), 0)
  near(SIM.digestElapsed(2, 0), 1 + 10 / 60, 1e-9)
  // 위와 작은창자를 다 지나면 약 7시간 (Mayo Clinic: 6~8시간)
  const si = SIM.digestElapsed(4, 0) / 60
  assert.ok(si >= 6 && si <= 8, String(si))
  // 큰창자 약 36시간, 모두 2일이 안 된다
  near(SIM.digestElapsed(4, 1) - SIM.digestElapsed(4, 0), 36 * 60, 1e-9)
  // 기관 안에서 앞으로 갈수록 시간이 늘어난다
  let last = -1
  for (let i = 0; i < 5; i++) for (const f of [0, 0.5, 1]) { const t = SIM.digestElapsed(i, f); assert.ok(t >= last); last = t }
  assert.equal(SIM.koAbout(0.2), '막 먹었어요')
  assert.equal(SIM.koAbout(40), '약 40분')
  assert.equal(SIM.koAbout(181), '약 3시간')
  assert.equal(SIM.koAbout(43 * 60), '약 1일 19시간')
  // 12시 20분 점심: 3시간 뒤 오늘 15시 20분, 위·작은창자를 지나면 19시 20분쯤, 끝까지 가면 모레 아침
  assert.equal(SIM.koDayTime(12 * 60 + 20, 180), '오늘 15시 20분')
  assert.equal(SIM.koDayTime(12 * 60 + 20, SIM.digestElapsed(4, 0)), '오늘 19시 20분')
  assert.equal(SIM.koDayTime(12 * 60 + 20, SIM.digestElapsed(4, 1)), '모레 7시 20분')
})
// ch:store
test('초등 08장: 어림과 거스름돈', () => {
  // 980원 공책 6권, 6,000원: 올려 어림해도 6,000원이라 확실히 산다. 실제 5,880원, 거스름돈 120원
  const a = SIM.affordEstimate(980, 6, 6000, 100)
  assert.deepEqual([a.up, a.down, a.exact, a.verdict, a.ok, a.change], [6000, 5400, 5880, 'sure', true, 120])
  // 1,030원 6권: 어림으로는 모른다(실제 6,180원이라 모자람 180원)
  const b = SIM.affordEstimate(1030, 6, 6000, 100)
  assert.equal(b.verdict, 'check'); assert.equal(b.ok, false); assert.equal(b.short, 180)
  // 1,150원 6권: 내려 어림해도 6,600원이라 확실히 못 산다
  assert.equal(SIM.affordEstimate(1150, 6, 6000, 100).verdict, 'no')
  // 490원 지우개 4개, 2,000원: 확실히 산다
  assert.equal(SIM.affordEstimate(490, 4, 2000, 100).verdict, 'sure')
  // 'sure'면 언제나 살 수 있고, 'no'면 언제나 못 산다
  for (let p = 300; p <= 1500; p += 10) for (let n = 1; n <= 9; n++) {
    const e = SIM.affordEstimate(p, n, 6000, 100)
    if (e.verdict === 'sure') assert.ok(e.ok)
    if (e.verdict === 'no') assert.ok(!e.ok)
    assert.ok(e.down <= e.exact && e.exact <= e.up)
  }
  // 위로 세기: 5,880 → 10원 2개 → 5,900 → 100원 1개 → 6,000
  assert.deepEqual(SIM.countUpChange(5880, 6000), [{ unit: 10, count: 2, reach: 5900 }, { unit: 100, count: 1, reach: 6000 }])
  // 2,350원을 1만 원으로: 50원 1, 500원 1, 100원 1, 5,000원 1, 1,000원 2
  const s = SIM.countUpChange(2350, 10000)
  assert.deepEqual(s.map((x) => [x.unit, x.count]), [[50, 1], [500, 1], [100, 1], [5000, 1], [1000, 2]])
  for (let t = 10; t <= 9990; t += 10) {
    const st = SIM.countUpChange(t, 10000)
    assert.equal(st.reduce((v, x) => v + x.unit * x.count, 0), 10000 - t)
  }
  assert.deepEqual(SIM.countUpChange(6000, 6000), [])
})
// ch:sprout
test('초등 09장: 강낭콩 키 모형', () => {
  const m = SIM.beanModel(8, 60)
  assert.equal(m.sprout, 6)
  assert.equal(m.height(0), 0); assert.equal(m.height(6), 0)
  // 키는 줄지 않는다
  for (let d = 1; d <= 60; d++) assert.ok(m.height(d) >= m.height(d - 1))
  // S자: 처음엔 느리고, 가운데서 쑥, 나중엔 거의 멈춘다
  const g = (d) => m.height(d) - m.height(d - 1)
  assert.ok(g(20) > 3 * g(8)); assert.ok(g(20) > 10 * g(55))
  assert.ok(m.height(60) > 0.97 * m.K)
  // 빛은 싹 트는 날을 바꾸지 않지만 다 자란 키를 바꾼다
  assert.equal(SIM.beanModel(2, 60).sprout, SIM.beanModel(12, 60).sprout)
  assert.ok(SIM.beanModel(12, 60).height(50) > SIM.beanModel(4, 60).height(50))
  // 물이 너무 적거나 많으면 싹이 늦고 키가 작다
  assert.ok(SIM.beanModel(8, 10).sprout > m.sprout && SIM.beanModel(8, 100).sprout > m.sprout)
  assert.ok(SIM.beanModel(8, 10).height(50) < m.height(50))
  // 그럴듯한 범위: 다 자란 키 45cm 이하, 하루에 4cm 넘게 자라지 않는다
  const best = SIM.beanModel(12, 60)
  assert.ok(best.K <= 45)
  for (let d = 1; d <= 60; d++) assert.ok(best.height(d) - best.height(d - 1) < 4)
  const rec = SIM.beanRecord(m, 10)
  assert.equal(rec.h.length, 11); assert.equal(rec.grow[0], 0)
  assert.deepEqual([0, 5, 7, 15, 40, 50].map((d) => SIM.beanStage(m, d)), ['seed', 'root', 'cotyledon', 'leaves', 'flower', 'pod'])
  assert.equal(SIM.beanModel(2, 10).flowerDay, null)
})
// ch:dice
test('초등 10장: 주사위 두 개', () => {
  assert.deepEqual(SIM.dicePairs(7), [[1, 6], [2, 5], [3, 4], [4, 3], [5, 2], [6, 1]])
  assert.deepEqual(SIM.dicePairs(12), [[6, 6]])
  assert.deepEqual(SIM.dicePairs(2), [[1, 1]])
  assert.equal(SIM.dicePairs(6).length, SIM.dicePairs(8).length)
  assert.equal(SIM.dicePairs(1).length + SIM.dicePairs(13).length, 0)
  let total = 0
  for (let s = 2; s <= 12; s++) { assert.equal(SIM.dicePairs(s).length, SIM.diceSumWays()[s]); total += SIM.diceExpected(s, 360) }
  near(total, 360)
  near(SIM.diceExpected(7, 36), 6)
  const r = SIM.rng(10), c = {}
  for (let i = 0; i < 36000; i++) { const [a, b] = SIM.rollPair(r); assert.ok(a >= 1 && a <= 6 && b >= 1 && b <= 6); c[a + b] = (c[a + b] || 0) + 1 }
  // 많이 굴리면 36칸 표의 비율에 가까워진다
  assert.ok(Math.abs(c[7] / 36000 - 6 / 36) < 0.01)
  assert.ok(Math.abs(c[12] / 36000 - 1 / 36) < 0.005)
})
// ch:map
test('초등 11장: 축척', () => {
  // 1:50,000 지도의 2cm = 100,000cm = 1,000m
  near(SIM.mapToRealM(2, 50000), 1000)
  near(SIM.mapToRealM(3, 10000), 300)
  near(SIM.realToMapCm(1000, 25000), 4)
  near(SIM.realToMapCm(SIM.mapToRealM(3.7, 5000), 5000), 3.7)
  assert.equal(SIM.fmtNum(50000), '50,000')
  assert.equal(SIM.fmtNum(1234567), '1,234,567')
  assert.equal(SIM.fmtNum(999), '999')
  assert.equal(SIM.fmtLen(1000), '1km')
  assert.equal(SIM.fmtLen(1530), '1.5km')
  assert.equal(SIM.fmtLen(320), '320m')
  assert.equal(SIM.fmtLen(324), '320m')
  assert.equal(SIM.fmtLen(45), '45m')
})
// ch:moon
test('초등 12장: 달의 모양', () => {
  const p = SIM.moonPhase
  assert.equal(p(0).name, '보이지 않는 달'); assert.equal(p(359).name, '보이지 않는 달')
  assert.equal(p(40).name, '초승달'); assert.equal(p(90).name, '상현달')
  assert.equal(p(180).name, '보름달'); assert.equal(p(270).name, '하현달'); assert.equal(p(320).name, '그믐달')
  // 보름은 음력 15일, 상현은 8일쯤, 하현은 23일쯤
  assert.equal(p(180).lunarDay, 15); assert.equal(p(90).lunarDay, 8); assert.equal(p(270).lunarDay, 23); assert.equal(p(0).lunarDay, 1)
  // 반달은 밝은 부분이 절반, 차오를 때와 기울 때가 갈린다
  near(p(90).lit, 0.5); near(p(270).lit, 0.5); near(p(180).lit, 1)
  assert.ok(p(90).waxing && !p(270).waxing && !p(0).waxing && !p(180).waxing)
  near(p(90).tx, 0, 1e-12); assert.ok(p(40).tx > 0 && p(140).tx < 0)
  assert.equal(p(-90).name, '하현달'); assert.equal(p(450).name, '상현달')
  near(p(360 - 1e-9).age, SIM.SYNODIC, 1e-6)
})

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

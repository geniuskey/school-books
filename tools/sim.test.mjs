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

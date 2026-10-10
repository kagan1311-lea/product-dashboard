// Spec: Done means / 3-6. Demo data at the fallback rate in data.json history (3.06).
const test = require('node:test');
const assert = require('node:assert/strict');
const Logic = require('../logic.js');
const { prices, history } = require('../data.json');

const RATE = 3.06;
const AIRPODS_PRO = 7;
const REDMI = 6;
const MAGSAFE = 12;
const rowsFor = (id) => Logic.priceRows(prices, id, RATE);
const bySource = (rows, s) => rows.find((r) => r.source === s);

// 3. Price comparison
test('3 rows come back, always amazon / aliexpress / google_il', () => {
  assert.deepEqual(rowsFor(AIRPODS_PRO).map((r) => r.source), ['amazon', 'aliexpress', 'google_il']);
});

test('abroad price in shekels = price_usd x rate, rounded to a whole shekel', () => {
  assert.equal(Logic.toIls(249, RATE), 762);
  assert.equal(Logic.toIls(199, RATE), 609);
  const amazon = bySource(rowsFor(AIRPODS_PRO), 'amazon');
  assert.equal(amazon.price_usd, 249);
  assert.equal(amazon.price_ils, 762);
});

test('google_il keeps its shekel price and has no dollar price', () => {
  const local = bySource(rowsFor(AIRPODS_PRO), 'google_il');
  assert.equal(local.price_ils, 999);
  assert.equal(local.price_usd, null);
});

test('cheapest is the lowest shekel price across all sources', () => {
  assert.equal(Logic.cheapest(rowsFor(AIRPODS_PRO)).source, 'aliexpress');
  assert.equal(Logic.cheapest(rowsFor(REDMI)).source, 'google_il');
});

test('on a tie exactly one row is cheapest (the first)', () => {
  const rows = [
    { source: 'amazon', available: true, price_ils: 500 },
    { source: 'aliexpress', available: true, price_ils: 500 },
    { source: 'google_il', available: true, price_ils: 600 }
  ];
  assert.equal(Logic.cheapest(rows).source, 'amazon');
});

test('a source with no data is unavailable and left out of cheapest', () => {
  const rows = rowsFor(MAGSAFE);
  assert.equal(bySource(rows, 'aliexpress').available, false);
  assert.equal(Logic.cheapest(rows).source, 'amazon');
});

// 4. Live rate fallback
test('fallback rate is the usd_rate of the latest history date', () => {
  assert.equal(Logic.fallbackRate(history), RATE);
  const shuffled = [
    { date: '2026-10-10', usd_rate: 3.7 },
    { date: '2026-10-08', usd_rate: 3.74 }
  ];
  assert.equal(Logic.fallbackRate(shuffled), 3.7);
});

test('fallback rate is null when there is no history', () => {
  assert.equal(Logic.fallbackRate([]), null);
  assert.equal(Logic.fallbackRate(undefined), null);
});

// 5. Decision banner
test('abroad cheaper than local -> "abroad" with the source and the savings', () => {
  assert.deepEqual(Logic.decision(rowsFor(AIRPODS_PRO)), { type: 'abroad', source: 'aliexpress', savings: 390 });
});

test('local cheaper -> "local"', () => {
  assert.deepEqual(Logic.decision(rowsFor(REDMI)), { type: 'local' });
});

// Regression for #1: the demo must keep one product that is cheaper locally,
// so the red banner can be shown with a realistic rate.
test('at the history rate the demo still has a local-cheaper product', () => {
  const local = require('../data.json').products.filter(
    (p) => Logic.decision(Logic.priceRows(prices, p.id, Logic.fallbackRate(history))).type === 'local'
  );
  assert.ok(local.length >= 1);
});

test('equal prices -> "local"', () => {
  const rows = [
    { source: 'amazon', available: true, price_ils: 500 },
    { source: 'aliexpress', available: false },
    { source: 'google_il', available: true, price_ils: 500 }
  ];
  assert.deepEqual(Logic.decision(rows), { type: 'local' });
});

test('no local price -> "none"', () => {
  const rows = [
    { source: 'amazon', available: true, price_ils: 500 },
    { source: 'aliexpress', available: true, price_ils: 400 },
    { source: 'google_il', available: false }
  ];
  assert.deepEqual(Logic.decision(rows), { type: 'none', reason: 'no_local' });
});

test('no abroad price -> "none" with reason no_abroad', () => {
  const rows = [
    { source: 'amazon', available: false },
    { source: 'aliexpress', available: false },
    { source: 'google_il', available: true, price_ils: 500 }
  ];
  assert.deepEqual(Logic.decision(rows), { type: 'none', reason: 'no_abroad' });
});

// 6. KPI cards
test('gap = local minus cheapest abroad, in shekels and whole percent', () => {
  assert.deepEqual(Logic.gap(rowsFor(AIRPODS_PRO)), { ils: 390, pct: 39 });
  assert.deepEqual(Logic.gap(rowsFor(REDMI)), { ils: -94, pct: -13 });
});

test('average rating is weighted by reviews_count, one decimal', () => {
  // (4.7 x 8640 + 4.3 x 1210) / 9850 = 4.65 -> 4.7
  assert.equal(Logic.weightedRating(rowsFor(AIRPODS_PRO)), 4.7);
});

// Should - reviews card
test('reviews card lists only sources with reviews, bars relative to the most reviewed', () => {
  assert.deepEqual(Logic.reviewRows(rowsFor(AIRPODS_PRO)), [
    { source: 'amazon', rating: 4.7, reviews_count: 8640, pct: 100 },
    { source: 'aliexpress', rating: 4.3, reviews_count: 1210, pct: 14 }
  ]);
});

test('reviews card skips a source with no data', () => {
  assert.deepEqual(Logic.reviewRows(rowsFor(MAGSAFE)).map((r) => r.source), ['amazon']);
});

test('average rating is null when there are no reviews', () => {
  assert.equal(Logic.weightedRating([{ source: 'google_il', available: true, rating: null, reviews_count: 0 }]), null);
});

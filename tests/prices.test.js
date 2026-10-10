// Spec: Done means / 3-6. Demo data at a fixed rate of 3.70.
const test = require('node:test');
const assert = require('node:assert/strict');
const Logic = require('../logic.js');
const { prices, history } = require('../data.json');

const RATE = 3.7;
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
  assert.equal(Logic.toIls(249, RATE), 921);
  assert.equal(Logic.toIls(199, RATE), 736);
  const amazon = bySource(rowsFor(AIRPODS_PRO), 'amazon');
  assert.equal(amazon.price_usd, 249);
  assert.equal(amazon.price_ils, 921);
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
  assert.equal(Logic.fallbackRate(history), 3.7);
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
  assert.deepEqual(Logic.decision(rowsFor(AIRPODS_PRO)), { type: 'abroad', source: 'aliexpress', savings: 263 });
});

test('local cheaper -> "local"', () => {
  assert.deepEqual(Logic.decision(rowsFor(REDMI)), { type: 'local' });
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

// 6. KPI cards
test('gap = local minus cheapest abroad, in shekels and whole percent', () => {
  assert.deepEqual(Logic.gap(rowsFor(AIRPODS_PRO)), { ils: 263, pct: 26 });
  assert.deepEqual(Logic.gap(rowsFor(REDMI)), { ils: -37, pct: -5 });
});

test('average rating is weighted by reviews_count, one decimal', () => {
  // (4.7 x 8640 + 4.3 x 1210) / 9850 = 4.65 -> 4.7
  assert.equal(Logic.weightedRating(rowsFor(AIRPODS_PRO)), 4.7);
});

test('average rating is null when there are no reviews', () => {
  assert.equal(Logic.weightedRating([{ source: 'google_il', available: true, rating: null, reviews_count: 0 }]), null);
});

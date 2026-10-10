// Spec: Done means / Should - 30-day rate chart.
const test = require('node:test');
const assert = require('node:assert/strict');
const Logic = require('../logic.js');

const sample = {
  base: 'USD',
  rates: {
    '2026-09-11': { ILS: 3.05 },
    '2026-09-10': { ILS: 3.03 },
    '2026-09-14': { ILS: 3.07 }
  }
};

test('the range starts 30 days before today', () => {
  assert.equal(Logic.daysAgo(new Date('2026-10-10T12:00:00Z'), 30), '2026-09-10');
  assert.equal(Logic.daysAgo(new Date('2026-03-01T00:00:00Z'), 30), '2026-01-30');
});

test('the Frankfurter time series becomes date-sorted points', () => {
  assert.deepEqual(Logic.rateSeries(sample), [
    { date: '2026-09-10', rate: 3.03 },
    { date: '2026-09-11', rate: 3.05 },
    { date: '2026-09-14', rate: 3.07 }
  ]);
});

test('a malformed response gives an empty series (chart shows "not available")', () => {
  assert.deepEqual(Logic.rateSeries(null), []);
  assert.deepEqual(Logic.rateSeries({ message: 'not found' }), []);
});

test('the chart shows the lowest and highest rate in the range', () => {
  assert.deepEqual(Logic.seriesRange(Logic.rateSeries(sample)), { min: 3.03, max: 3.07 });
  assert.equal(Logic.seriesRange([]), null);
});

test('points run left to right; the highest rate is at the top, the lowest at the bottom', () => {
  assert.equal(Logic.chartPoints(Logic.rateSeries(sample), 200, 40), '0,40 100,20 200,0');
});

test('a flat series does not divide by zero', () => {
  const flat = [{ date: 'a', rate: 3 }, { date: 'b', rate: 3 }];
  assert.equal(Logic.chartPoints(flat, 100, 40), '0,40 100,40');
});

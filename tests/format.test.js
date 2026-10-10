// Spec: Design / Numbers, Done means / 1 (grouping) and / 7 (updated date).
const test = require('node:test');
const assert = require('node:assert/strict');
const Logic = require('../logic.js');
const { products } = require('../data.json');

test('shekels: whole number with a thousands separator', () => {
  assert.equal(Logic.formatIls(1240), '₪1,240');
  assert.equal(Logic.formatIls(921), '₪921');
  assert.equal(Logic.formatIls(4999), '₪4,999');
  assert.equal(Logic.formatIls(-37), '-₪37');
});

test('dollars: as in the data, with a thousands separator', () => {
  assert.equal(Logic.formatUsd(249), '$249');
  assert.equal(Logic.formatUsd(1099), '$1,099');
});

test('rate has 2 decimals, rating has 1', () => {
  assert.equal(Logic.formatRate(3.7), '3.70');
  assert.equal(Logic.formatRate(3.0573), '3.06');
  assert.equal(Logic.formatRating(4.7), '4.7');
});

test('updated date is shown as DD.MM.YYYY', () => {
  assert.equal(Logic.formatDate('2026-10-10'), '10.10.2026');
  assert.equal(Logic.formatDate('2026-03-05'), '05.03.2026');
  assert.equal(Logic.formatDate(''), '');
});

test('empty search groups all 15 products by category, in first-seen order', () => {
  const groups = Logic.groupByCategory(products);
  assert.deepEqual(groups.map((g) => g.category), ['טלפונים', 'אוזניות', 'שעונים', 'מטענים', 'כיסויים', 'מגיני מסך']);
  assert.equal(groups.reduce((n, g) => n + g.items.length, 0), 15);
});

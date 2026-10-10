// Spec: Done means / Should - currency converter.
const test = require('node:test');
const assert = require('node:assert/strict');
const Logic = require('../logic.js');

const RATE = 3.06;

test('dollars -> shekels = dollars x rate, rounded to agorot', () => {
  assert.equal(Logic.convert('249', RATE, 'usd'), '761.94');
  assert.equal(Logic.convert('1', RATE, 'usd'), '3.06');
});

test('shekels -> dollars = shekels / rate, rounded to cents', () => {
  assert.equal(Logic.convert('999', RATE, 'ils'), '326.47');
  assert.equal(Logic.convert('3.06', RATE, 'ils'), '1.00');
});

test('thousands separators and spaces are accepted', () => {
  assert.equal(Logic.parseAmount('1,099'), 1099);
  assert.equal(Logic.parseAmount(' 249.5 '), 249.5);
});

test('empty or non-numeric input clears the other field without an error', () => {
  assert.equal(Logic.convert('', RATE, 'usd'), '');
  assert.equal(Logic.convert('abc', RATE, 'usd'), '');
  assert.equal(Logic.convert('-5', RATE, 'ils'), '');
  assert.equal(Logic.convert('12.3.4', RATE, 'ils'), '');
});

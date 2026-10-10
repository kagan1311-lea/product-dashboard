const test = require('node:test');
const assert = require('node:assert/strict');
const Logic = require('../logic.js');

test('logic.js loads in Node and exposes an object', () => {
  assert.equal(typeof Logic, 'object');
});

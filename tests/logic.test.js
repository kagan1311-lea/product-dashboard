const test = require('node:test');
const assert = require('node:assert/strict');
const Logic = require('../logic.js');

const { products } = require('../data.json');

test('logic.js loads in Node and exposes an object', () => {
  assert.equal(typeof Logic, 'object');
});

// Spec: Done means / 1. Search
const namesFor = (query) => Logic.filterProducts(products, query).map((p) => p.name_he).sort();

test('search "איירפ" returns exactly the 2 AirPods', () => {
  assert.deepEqual(namesFor('איירפ'), ['איירפודס 4', 'איירפודס פרו 3']);
});

test('search is case-insensitive: "AIRP" and "airp" return the same 2 AirPods', () => {
  assert.deepEqual(namesFor('AIRP'), ['איירפודס 4', 'איירפודס פרו 3']);
  assert.deepEqual(namesFor('airp'), ['איירפודס 4', 'איירפודס פרו 3']);
});

test('search "s25" returns exactly the 2 Galaxy S25 models', () => {
  assert.deepEqual(namesFor('s25'), ['סמסונג גלקסי S25', 'סמסונג גלקסי S25 Ultra']);
});

test('empty or blank search returns all 15 products', () => {
  assert.equal(Logic.filterProducts(products, '').length, 15);
  assert.equal(Logic.filterProducts(products, '   ').length, 15);
});

// Spec: Done means / 2. Product not found
test('search "נוקיה" returns no products', () => {
  assert.deepEqual(Logic.filterProducts(products, 'נוקיה'), []);
});

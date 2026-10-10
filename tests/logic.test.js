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

// Spec: Done means / Should - search
test('highlight marks the typed characters inside the name', () => {
  assert.deepEqual(Logic.highlightParts('איירפודס 4', 'איירפ'), [
    { text: 'איירפ', match: true },
    { text: 'ודס 4', match: false }
  ]);
});

test('highlight is case-insensitive and keeps the original casing', () => {
  assert.deepEqual(Logic.highlightParts('Samsung Galaxy S25', 's25'), [
    { text: 'Samsung Galaxy ', match: false },
    { text: 'S25', match: true }
  ]);
});

test('highlight returns the whole text unmarked when there is no match or no query', () => {
  assert.deepEqual(Logic.highlightParts('AirPods 4', 'xyz'), [{ text: 'AirPods 4', match: false }]);
  assert.deepEqual(Logic.highlightParts('AirPods 4', ''), [{ text: 'AirPods 4', match: false }]);
});

test('arrow keys move through the list and wrap at both ends', () => {
  assert.equal(Logic.moveIndex(0, 1, 3), 1);
  assert.equal(Logic.moveIndex(2, 1, 3), 0);
  assert.equal(Logic.moveIndex(0, -1, 3), 2);
  assert.equal(Logic.moveIndex(0, 1, 0), -1);
});

// Spec: Done means / 2. Product not found
test('search "נוקיה" returns no products', () => {
  assert.deepEqual(Logic.filterProducts(products, 'נוקיה'), []);
});

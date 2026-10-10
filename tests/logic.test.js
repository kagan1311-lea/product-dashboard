const test = require('node:test');
const assert = require('node:assert/strict');
const Logic = require('../logic.js');

// The catalog is curated by hand (the import keeps it), so the search tests use data.json.
const { products } = require('../data.json');

test('logic.js loads in Node and exposes an object', () => {
  assert.equal(typeof Logic, 'object');
});

// Spec: Done means / 1. Search
const namesFor = (query) => Logic.filterProducts(products, query).map((p) => p.name_en).sort();

test('"charger" / "CHARGER" returns exactly the 2 chargers', () => {
  const chargers = ['Anker Nano 20W Charger', 'Baseus Wireless Charger'];
  assert.deepEqual(namesFor('charger'), chargers);
  assert.deepEqual(namesFor('CHARGER'), chargers);
});

test('Hebrew "מטען" is translated to charger and returns the same 2', () => {
  assert.deepEqual(namesFor('מטען'), ['Anker Nano 20W Charger', 'Baseus Wireless Charger']);
});

test('"כבל" returns exactly the 2 cables', () => {
  assert.deepEqual(namesFor('כבל'), ['Anker USB-C to Lightning Cable', 'Ugreen USB-C Cable']);
});

test('"סוללת גיבוי" returns exactly the 2 power banks', () => {
  assert.deepEqual(namesFor('סוללת גיבוי'), ['Anker Power Bank 10000mAh', 'Baseus Magnetic Power Bank']);
});

test('"airpods" and "איירפודס" return exactly the 2 AirPods accessories', () => {
  const airpods = ['AirPods Pro Ear Tips', 'Spigen AirPods Pro 3 Case'];
  assert.deepEqual(namesFor('airpods'), airpods);
  assert.deepEqual(namesFor('איירפודס'), airpods);
});

test('"usb-c" returns exactly the 2 cables and the headphone adapter', () => {
  assert.deepEqual(namesFor('usb-c'), ['Anker USB-C to Lightning Cable', 'USB-C to 3.5mm Headphone Adapter', 'Ugreen USB-C Cable']);
});

test('part of a Hebrew word and a leading prefix letter still translate', () => {
  assert.deepEqual(Logic.translateWord('מטע'), ['charger']);
  assert.ok(Logic.translateWord('לאוזניות').includes('earbuds'));
  assert.deepEqual(Logic.translateWord('נוקיה'), []);
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

test('the English name highlights the typed text or the translation of a Hebrew word', () => {
  assert.deepEqual(Logic.highlightName('Anker Nano 20W Charger', 'char'), [
    { text: 'Anker Nano 20W ', match: false },
    { text: 'Char', match: true },
    { text: 'ger', match: false }
  ]);
  assert.deepEqual(Logic.highlightName('Anker Nano 20W Charger', 'מטען'), [
    { text: 'Anker Nano 20W ', match: false },
    { text: 'Charger', match: true }
  ]);
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

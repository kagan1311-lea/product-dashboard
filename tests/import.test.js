// Spec: Where / Apify import - matching rules. Titles are real Apify results from apify/raw/.
const test = require('node:test');
const assert = require('node:assert/strict');
const Imp = require('../scripts/import-apify.js');

const m = Imp.matchesProduct;

test('every search word must appear; numbers as whole words, glued words still match', () => {
  assert.equal(m('AirPods Pro 3', 'AppleAirPods Pro 3 Wireless Earbuds with Active Noise Cancellation'), true);
  assert.equal(m('Galaxy Buds3 Pro', 'SamsungGalaxy Buds 3 Pro AI True Wireless Bluetooth Earbuds'), true);
  assert.equal(m('Google Pixel 10', 'GooglePixel 10a - 30+ Hours Battery, Camera Coach'), false);
  assert.equal(m('Apple Watch Series 11', 'AppleWatch Series 12 GPS 42mm Smartwatch'), false);
});

test('a different model in the title is rejected', () => {
  assert.equal(m('Samsung Galaxy S25', 'SamsungGalaxy S25+ Cell Phone, 256GB Smartphone, Unlocked Android'), false);
  assert.equal(m('Samsung Galaxy S25', 'Samsung Galaxy S25 Edge'), false);
  assert.equal(m('iPhone 17', 'טלפון סלולרי iPhone Air 512GB Apple אפל'), false);
  assert.equal(m('Samsung Galaxy S25', 'SamsungGalaxy S25 5G SM-S931B/DS 256GB 12GB Dual SIM Factory Unlocked GSM Smartphone'), true);
});

test('renewed, refurbished and used items are rejected', () => {
  assert.equal(m('AirPods Pro 3', 'Amazon RenewedApple AirPods Pro (3nd Generation) (Renewed)'), false);
  assert.equal(m('Samsung Galaxy S25 Ultra', 'Samsung Galaxy S25 Ultra SM-S938U1 Unlocked 512GB', 'מחודש'), false);
});

test('accessories are rejected when searching for a device', () => {
  assert.equal(m('AirPods Pro 3', 'Replacement Silicone Eartips For Apple AirPods Pro 3 Ear Tips'), false);
  assert.equal(m('AirPods Pro 3', 'Case for Airpods Pro 3 with Secure Lock & Phone Stand'), false);
});

test('a watch title with "Aluminium Case" is still the watch', () => {
  assert.equal(m('Apple Watch Series 11', 'אפל ווטש Apple Watch Series 11 GPS Aluminium Case'), true);
});

test('accessory searches: brand and model words required, descriptive words optional', () => {
  assert.equal(m('Spigen iPhone case', 'Spigenfor iPhone 18 Pro Case, for iPhone 17 Pro Case, Clear White'), true);
  assert.equal(m('Spigen iPhone case', 'Spigen AirPods Pro 3 Case Liquid Crystal'), false);
  assert.equal(m('Anker power bank 10000mAh', 'Anker 323 10,000mAh סוללת גיבוי'), true);
  assert.equal(m('Apple 20W USB-C charger', 'מטען קיר Apple 30W USB type C'), false);
  assert.equal(m('tempered glass screen protector', 'Ailun 3 Pack Screen Protector for iPhone 18 Pro Max'), true);
});

test('prices are converted to USD; unknown currencies are dropped', () => {
  const rates = { AUD: 1.5, EUR: 0.9, ILS: 3.06 };
  assert.equal(Imp.toUsd(199, '$', rates), 199);
  assert.equal(Imp.toUsd(6.992, 'USD', rates), 6.99);
  assert.equal(Imp.toUsd(309.39, 'AUD', rates), 206.26);
  assert.equal(Imp.toUsd(5642.49, 'HRK', rates), null);
});

test('the first matching result with a price wins; no match means no row', () => {
  const product = { id: 7, search_term: 'AirPods Pro 3' };
  const items = [
    { position: 2, title: 'Amazon RenewedApple AirPods Pro (3nd Generation) (Renewed)', price: 169.99 },
    { position: 1, title: 'AppleAirPods Pro 3 Wireless Earbuds', price: 199 },
    { position: 3, title: 'AppleAirPods Pro 3 Wireless Earbuds', price: null }
  ];
  assert.equal(Imp.pickBest(product, items).price, 199);
  assert.equal(Imp.pickBest(product, items.slice(0, 1)), null);
});

test('buildPrices writes spec-shaped rows: abroad in USD, google_il in ILS', () => {
  const products = [{ id: 7, search_term: 'AirPods Pro 3' }];
  const raw = {
    amazon: { items: [{ input: 'https://www.amazon.com/s?k=AirPods+Pro+3', position: 1, title: 'AppleAirPods Pro 3', 'price.value': 199, 'price.currency': '$', stars: 4.4, reviewsCount: 16240 }] },
    aliexpress: { items: [] },
    google_il: { items: [{ searchQuery: 'AirPods Pro 3', position: 1, title: 'אוזניות Apple AirPods Pro 3', price: 749, currency: 'ILS', condition: 'new' }] }
  };
  assert.deepEqual(Imp.buildPrices(products, raw, {}, '2026-10-10'), [
    { product_id: 7, source: 'amazon', price_usd: 199, price_ils: null, rating: 4.4, reviews_count: 16240, updated_at: '2026-10-10' },
    { product_id: 7, source: 'google_il', price_usd: null, price_ils: 749, rating: null, reviews_count: 0, updated_at: '2026-10-10' }
  ]);
});

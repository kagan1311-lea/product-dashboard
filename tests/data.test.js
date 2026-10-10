// data.json must keep the structure described in SPEC.md / Where / data structure,
// so stage 2 (Google Sheets) can replace it without code changes.
const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../data.json');

const SOURCES = ['amazon', 'aliexpress', 'google_il'];

test('data.json has updated_at as YYYY-MM-DD', () => {
  assert.match(data.updated_at, /^\d{4}-\d{2}-\d{2}$/);
});

test('data.json has 15 demo products with the spec fields', () => {
  assert.equal(data.products.length, 15);
  for (const p of data.products) {
    assert.deepEqual(Object.keys(p).sort(), ['category', 'id', 'name_en', 'name_he', 'search_term']);
  }
  const ids = data.products.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'product ids are unique');
});

test('every price row has the spec fields, a known source and a known product', () => {
  const ids = new Set(data.products.map((p) => p.id));
  for (const r of data.prices) {
    assert.deepEqual(
      Object.keys(r).sort(),
      ['price_ils', 'price_usd', 'product_id', 'rating', 'reviews_count', 'source', 'updated_at']
    );
    assert.ok(SOURCES.includes(r.source), `unknown source ${r.source}`);
    assert.ok(ids.has(r.product_id), `unknown product ${r.product_id}`);
  }
});

test('abroad sources carry price_usd, google_il carries price_ils', () => {
  for (const r of data.prices) {
    if (r.source === 'google_il') assert.equal(typeof r.price_ils, 'number');
    else assert.equal(typeof r.price_usd, 'number');
  }
});

test('every history row has the spec fields', () => {
  assert.ok(data.history.length > 0);
  for (const h of data.history) {
    assert.deepEqual(Object.keys(h).sort(), ['date', 'price_ils', 'product_id', 'source', 'usd_rate']);
  }
});

// Builds data.json from the Apify results in apify/raw/.
// Spec: Where / Apify import - matching rules.
//
//   node scripts/import-apify.js
//
// Reads data.json (for the product list), apify/raw/{amazon,aliexpress,google_il}.json,
// fetches today's USD rates from Frankfurter, and rewrites data.json.
'use strict';

const Logic = require('../logic.js');

const VARIANTS = ['pro', 'max', 'ultra', 'plus', 'mini', 'fe', 'edge', 'lite', 'air', 'se'];
const USED_SUBSTRINGS = ['renewed', 'refurbished', 'מחודש', 'יד שנייה'];
const ACCESSORY_TERMS = [
  'case', 'cover', 'protector', 'charger', 'cable', 'bank', 'adapter', 'strap',
  'grip', 'holder', 'tripod', 'stick', 'pen', 'tips', 'lens', 'mount', 'stand'
];
const ACCESSORY_TITLES = [
  'case for', 'cover for', 'for airpods', 'for iphone', 'for samsung', 'for galaxy', 'for apple', 'for pixel',
  'replacement', 'eartips', 'ear tips', 'protector', 'כיסוי', 'מגן'
];
const STOPWORDS = ['to', 'for', 'with', 'and', 'of'];
// Descriptive words a matching title may leave out. When a search has only
// these, at least one of them must appear.
const OPTIONAL = ['tempered', 'glass', 'screen', 'protector', 'usb-c', 'wireless', 'magnetic', 'phone', 'headphone', 'earbuds'];

function norm(text) {
  return String(text == null ? '' : text)
    .toLowerCase()
    .replace(/(\d),(\d)/g, '$1$2') // 10,000mAh -> 10000mah
    .replace(/(\d)\s*(ממ|מ"מ|מ״מ)/g, '$1mm') // 3.5 ממ -> 3.5mm
    .replace(/\b(usb[\s-]?)?type[\s-]?c\b|\busb[\s-]c\b|\busbc\b/g, 'usb-c') // USB C, Type-C -> usb-c
    .replace(/\b([a-z]+\d+)\+/g, '$1 plus'); // S25+ -> s25 plus
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWord(text, word) {
  return new RegExp('(^|[^a-z0-9])' + escapeRe(word) + '($|[^a-z0-9])').test(text);
}

// Numbers must be whole words ("10" is not in "10a"); other tokens may be glued to
// the next word ("AppleAirPods") or split by a space ("Buds 3" for "buds3").
function hasToken(title, token) {
  if (/^\d+$/.test(token)) return hasWord(title, token);
  return title.indexOf(token) !== -1 || title.replace(/\s+/g, '').indexOf(token) !== -1;
}

// A search word is in the title in English or as one of its Hebrew terms from
// the dictionary shared with the search box ("power" / "bank" <- "סוללת גיבוי").
function hebrewFor(word) {
  return Logic.TERMS.filter((t) => t[1].split(' ').indexOf(word) !== -1).map((t) => t[0]);
}

function wordInTitle(title, word) {
  return hasToken(title, word) || hebrewFor(word).some((h) => title.indexOf(h) !== -1);
}

function isAccessory(searchTerm) {
  const term = norm(searchTerm);
  return ACCESSORY_TERMS.some((w) => hasWord(term, w));
}

function matchesProduct(searchTerm, title, condition) {
  const t = norm(title);
  const tokens = norm(searchTerm).split(/\s+/).filter((tok) => tok && STOPWORDS.indexOf(tok) === -1);
  const required = tokens.filter((tok) => OPTIONAL.indexOf(tok) === -1);

  if (!required.every((tok) => wordInTitle(t, tok))) return false;
  if (!required.length && !tokens.some((tok) => wordInTitle(t, tok))) return false;
  if (USED_SUBSTRINGS.some((w) => t.indexOf(w) !== -1) || hasWord(t, 'used')) return false;
  if (condition && condition !== 'new') return false;

  if (!isAccessory(searchTerm)) {
    if (VARIANTS.some((v) => tokens.indexOf(v) === -1 && hasWord(t, v))) return false;
    if (ACCESSORY_TITLES.some((p) => t.indexOf(p) !== -1)) return false;
  }
  return true;
}

// Converts a price to USD with Frankfurter rates (units of currency per 1 USD).
// Returns null for an unknown currency.
function toUsd(price, currency, rates) {
  if (typeof price !== 'number') return null;
  if (currency === 'USD' || currency === '$') return Math.round(price * 100) / 100;
  const rate = rates && rates[currency];
  if (!rate) return null;
  return Math.round((price / rate) * 100) / 100;
}

// The first (most relevant) result that matches and has a usable price.
function pickBest(product, items) {
  const sorted = items.slice().sort((a, b) => a.position - b.position);
  return sorted.find((it) => it.price != null && matchesProduct(product.search_term, it.title, it.condition)) || null;
}

// Each source's raw items, reshaped to { term, position, title, price, currency, rating, reviews, condition }.
const ADAPTERS = {
  amazon: (it) => ({
    term: decodeURIComponent(String(it.input).split('?k=')[1] || '').replace(/\+/g, ' '),
    position: it.position, title: it.title,
    price: it['price.value'], currency: it['price.currency'],
    rating: it.stars, reviews: it.reviewsCount
  }),
  aliexpress: (it) => ({
    term: it.keyword, position: it.position, title: it.productTitle,
    price: it.price, currency: it.currency, rating: it.rating, reviews: 0
  }),
  google_il: (it) => ({
    term: it.searchQuery, position: it.position, title: it.title,
    price: it.price, currency: it.currency, condition: it.condition, rating: null, reviews: 0
  })
};

function buildPrices(products, raw, rates, date) {
  const prices = [];
  products.forEach((p) => {
    Object.keys(ADAPTERS).forEach((source) => {
      const items = ((raw[source] && raw[source].items) || []).map(ADAPTERS[source])
        .filter((it) => norm(it.term) === norm(p.search_term));
      const best = pickBest(p, items);
      if (!best) return;
      let priceUsd = null;
      let priceIls = null;
      if (source === 'google_il') {
        if (best.currency !== 'ILS') return;
        priceIls = Math.round(best.price);
      } else {
        priceUsd = toUsd(best.price, best.currency, rates);
        if (priceUsd == null) return;
      }
      prices.push({
        product_id: p.id,
        source: source,
        price_usd: priceUsd,
        price_ils: priceIls,
        rating: best.rating == null ? null : best.rating,
        reviews_count: best.reviews || 0,
        updated_at: date
      });
    });
  });
  return prices;
}

function buildHistory(prices, usdIls, date) {
  return prices.map((r) => ({
    date: date,
    product_id: r.product_id,
    source: r.source,
    price_ils: r.price_ils != null ? r.price_ils : Math.round(r.price_usd * usdIls),
    usd_rate: usdIls
  }));
}

async function main() {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));

  const data = read('data.json');
  const raw = {
    amazon: read('apify/raw/amazon.json'),
    aliexpress: read('apify/raw/aliexpress.json'),
    google_il: read('apify/raw/google_il.json')
  };
  const date = raw.amazon.fetched_at;

  const res = await fetch('https://api.frankfurter.dev/v1/latest?base=USD');
  if (!res.ok) throw new Error('Frankfurter ' + res.status);
  const rates = (await res.json()).rates;
  const usdIls = Math.round(rates.ILS * 100) / 100;

  const prices = buildPrices(data.products, raw, rates, date);
  const out = {
    updated_at: date,
    products: data.products,
    prices: prices,
    history: buildHistory(prices, usdIls, date)
  };
  fs.writeFileSync(path.join(root, 'data.json'), JSON.stringify(out, null, 2) + '\n');

  data.products.forEach((p) => {
    const got = prices.filter((r) => r.product_id === p.id).map((r) => r.source);
    console.log(String(p.id).padStart(2) + ' ' + p.name_en.padEnd(32) + (got.join(', ') || '(none)'));
  });
  console.log(prices.length + ' price rows, USD/ILS ' + usdIls);
}

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { norm, hasToken, isAccessory, matchesProduct, toUsd, pickBest, buildPrices, buildHistory };

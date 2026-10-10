// Pure dashboard logic: no DOM, no network.
// Loaded by index.html in the browser (window.Logic) and by the tests in Node (require).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Logic = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function normalize(text) {
    return String(text == null ? '' : text).trim().toLowerCase();
  }

  // Hebrew -> English accessory terms. Used to translate Hebrew search words and,
  // in scripts/import-apify.js, to accept Hebrew store titles. Spec: Features / Must 1.
  var TERMS = [
    ['מטען', 'charger'], ['כבל', 'cable'], ['סוללת גיבוי', 'power bank'], ['סוללה', 'power bank'],
    ['מגן מסך', 'screen protector'], ['מגן עדשה', 'lens protector'], ['מגן', 'protector'],
    ['עדשה', 'lens'], ['עדשת', 'lens'], ['מצלמה', 'camera'], ['זכוכית', 'glass'], ['מסך', 'screen'],
    ['כיסוי', 'case'], ['נרתיק', 'case'], ['אוזניות', 'earbuds'], ['אוזניה', 'earbuds'],
    ['איירפודס', 'airpods'], ['כריות', 'ear tips'], ['מעמד', 'holder'], ['מחזיק', 'holder'],
    ['רכב', 'car'], ['מגנטי', 'magnetic'], ['מגנטית', 'magnetic'], ['אלחוטי', 'wireless'],
    ['מקל סלפי', 'selfie stick'], ['מוט סלפי', 'selfie stick'], ['מוט', 'stick'], ['סלפי', 'selfie'],
    ['משטח טעינה', 'charger'], ['חצובה', 'tripod'], ['מתאם', 'adapter'],
    ['ניקוי', 'cleaning'], ['עט', 'pen'], ['טלפון', 'phone'], ['פופסוקט', 'popsockets'],
    ['אחיזה', 'grip'], ['לייטנינג', 'lightning'], ['אנקר', 'anker'], ['בייסוס', 'baseus'],
    ['יוגרין', 'ugreen'], ['ספיגן', 'spigen']
  ];
  var HEBREW_PREFIXES = 'הולבכשמ';

  // English terms for one typed Hebrew word. Matches the start of any word in a
  // dictionary entry, so partial typing works ("מטע" -> charger), and retries
  // without a leading prefix letter ("לאוזניות" -> earbuds).
  function translateWord(word) {
    var w = normalize(word);
    var forms = [w];
    if (w.length > 2 && HEBREW_PREFIXES.indexOf(w.charAt(0)) !== -1) forms.push(w.slice(1));
    var out = [];
    TERMS.forEach(function (t) {
      var hit = forms.some(function (f) {
        return f.length >= 2 && t[0].split(' ').some(function (part) {
          return part.indexOf(f) === 0 || f.indexOf(part) === 0;
        });
      });
      if (hit && out.indexOf(t[1]) === -1) out.push(t[1]);
    });
    return out;
  }

  // English strings a typed query can match in a product's English name:
  // the query itself plus the translation of each Hebrew word.
  function englishTerms(query) {
    var q = normalize(query);
    if (!q) return [];
    var out = [q];
    q.split(/\s+/).forEach(function (w) {
      translateWord(w).forEach(function (t) { if (out.indexOf(t) === -1) out.push(t); });
    });
    return out;
  }

  // Spec: Features / Must 1-2. Every typed word must match the product: as part of
  // the English or Hebrew name, or through its English translation. Case-insensitive.
  // Empty query returns every product; no match returns [].
  function filterProducts(products, query) {
    var q = normalize(query);
    if (!q) return products.slice();
    var words = q.split(/\s+/);
    return products.filter(function (p) {
      var en = normalize(p.name_en);
      var he = normalize(p.name_he);
      if (en.indexOf(q) !== -1 || he.indexOf(q) !== -1) return true;
      return words.every(function (w) {
        if (en.indexOf(w) !== -1 || he.indexOf(w) !== -1) return true;
        return translateWord(w).some(function (t) { return en.indexOf(t) !== -1; });
      });
    });
  }

  // The part of an English name to highlight for a query: the first of
  // englishTerms(query) found in the name.
  function highlightName(name, query) {
    var terms = englishTerms(query);
    var t = normalize(name);
    for (var i = 0; i < terms.length; i++) {
      if (t.indexOf(terms[i]) !== -1) return highlightParts(name, terms[i]);
    }
    return [{ text: String(name), match: false }];
  }

  // Spec: Done means / Should - currency converter. Accepts "1,099" or " 249.5 ";
  // anything else (empty, letters, negative) is null.
  function parseAmount(text) {
    var t = String(text == null ? '' : text).replace(/,/g, '').trim();
    if (!/^\d+(\.\d+)?$|^\.\d+$/.test(t)) return null;
    return Number(t);
  }

  // Converts a typed amount; direction 'usd' means the dollar field was typed.
  // Returns the other field's text, rounded to cents/agorot, or '' when the input is not a number.
  function convert(text, rate, direction) {
    var amount = parseAmount(text);
    if (amount == null || !rate) return '';
    var result = direction === 'usd' ? amount * rate : amount / rate;
    return (Math.round(result * 100) / 100).toFixed(2);
  }

  // Spec: Done means / Should - 30-day rate chart.
  // The date `days` days before `today` (a Date), as YYYY-MM-DD in UTC.
  function daysAgo(today, days) {
    var d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - days));
    return d.toISOString().slice(0, 10);
  }

  // Frankfurter time series -> [{ date, rate }] sorted by date; [] when the shape is wrong.
  function rateSeries(json, currency) {
    var rates = json && json.rates;
    if (!rates || typeof rates !== 'object') return [];
    return Object.keys(rates).sort().map(function (date) {
      return { date: date, rate: rates[date] && rates[date][currency || 'ILS'] };
    }).filter(function (p) { return typeof p.rate === 'number'; });
  }

  function seriesRange(series) {
    if (!series.length) return null;
    var rates = series.map(function (p) { return p.rate; });
    return { min: Math.min.apply(null, rates), max: Math.max.apply(null, rates) };
  }

  // SVG polyline points: time runs left to right, the highest rate touches the top edge.
  function chartPoints(series, width, height) {
    var range = seriesRange(series);
    if (!range) return '';
    var span = range.max - range.min || 1;
    var step = series.length > 1 ? width / (series.length - 1) : 0;
    return series.map(function (p, i) {
      var x = Math.round(i * step * 10) / 10;
      var y = Math.round((height - ((p.rate - range.min) / span) * height) * 10) / 10;
      return x + ',' + y;
    }).join(' ');
  }

  // Spec: Done means / Should - search. Splits text around the first case-insensitive
  // match of query, so the matched characters can be highlighted.
  function highlightParts(text, query) {
    var t = String(text == null ? '' : text);
    var q = normalize(query);
    var at = q ? t.toLowerCase().indexOf(q) : -1;
    if (at === -1) return [{ text: t, match: false }];
    return [
      { text: t.slice(0, at), match: false },
      { text: t.slice(at, at + q.length), match: true },
      { text: t.slice(at + q.length), match: false }
    ].filter(function (part) { return part.text; });
  }

  // Arrow-key movement through a list of `length` options, wrapping at both ends.
  function moveIndex(current, delta, length) {
    if (!length) return -1;
    return (((current + delta) % length) + length) % length;
  }

  var SOURCES = ['amazon', 'aliexpress', 'google_il'];
  var LOCAL = 'google_il';

  // Spec: Done means / 3. Rounded to a whole shekel.
  function toIls(usd, rate) {
    return Math.round(usd * rate);
  }

  // One row per source, always in SOURCES order. A source with no data comes
  // back with available: false so the card can show "אין נתון".
  function priceRows(prices, productId, rate) {
    return SOURCES.map(function (source) {
      var r = prices.filter(function (p) {
        return p.product_id === productId && p.source === source;
      })[0];
      if (!r) return { source: source, available: false };
      var ils = source === LOCAL ? r.price_ils : r.price_usd == null ? null : toIls(r.price_usd, rate);
      if (ils == null) return { source: source, available: false };
      return {
        source: source,
        available: true,
        price_usd: source === LOCAL ? null : r.price_usd,
        price_ils: ils,
        rating: r.rating,
        reviews_count: r.reviews_count
      };
    });
  }

  // Lowest price_ils among available rows; on a tie the first in SOURCES order wins,
  // so exactly one card is marked "הכי זול". Returns null when nothing is available.
  function cheapest(rows) {
    return rows.reduce(function (best, r) {
      if (!r.available) return best;
      return !best || r.price_ils < best.price_ils ? r : best;
    }, null);
  }

  function cheapestAbroad(rows) {
    return cheapest(rows.filter(function (r) { return r.source !== LOCAL; }));
  }

  function localRow(rows) {
    var r = rows.filter(function (x) { return x.source === LOCAL; })[0];
    return r && r.available ? r : null;
  }

  // Spec: Done means / 6. Local price minus cheapest abroad, in shekels and whole percent.
  function gap(rows) {
    var local = localRow(rows);
    var abroad = cheapestAbroad(rows);
    if (!local || !abroad) return null;
    var ils = local.price_ils - abroad.price_ils;
    return { ils: ils, pct: Math.round((ils / local.price_ils) * 100) };
  }

  // Spec: Done means / 5. 'abroad' only when strictly cheaper than local.
  function decision(rows) {
    var local = localRow(rows);
    var abroad = cheapestAbroad(rows);
    if (!local) return { type: 'none', reason: 'no_local' };
    if (!abroad) return { type: 'none', reason: 'no_abroad' };
    if (abroad.price_ils < local.price_ils) {
      return { type: 'abroad', source: abroad.source, savings: local.price_ils - abroad.price_ils };
    }
    return { type: 'local' };
  }

  // Spec: Done means / 6. Weighted by reviews_count, one decimal; null when no reviews.
  function weightedRating(rows) {
    var sum = 0;
    var count = 0;
    rows.forEach(function (r) {
      if (r.available && r.rating != null && r.reviews_count > 0) {
        sum += r.rating * r.reviews_count;
        count += r.reviews_count;
      }
    });
    if (!count) return null;
    return Math.round((sum / count) * 10) / 10;
  }

  // Spec: Done means / Should - reviews card. Only sources with reviews; bar length is
  // relative to the source with the most reviews (100%).
  function reviewRows(rows) {
    var withReviews = rows.filter(function (r) {
      return r.available && r.rating != null && r.reviews_count > 0;
    });
    var max = withReviews.reduce(function (m, r) { return Math.max(m, r.reviews_count); }, 0);
    return withReviews.map(function (r) {
      return { source: r.source, rating: r.rating, reviews_count: r.reviews_count, pct: Math.round((r.reviews_count / max) * 100) };
    });
  }

  // Spec: Done means / 4. Rate to use when the live API fails: the latest usd_rate in history.
  function fallbackRate(history) {
    var latest = (history || []).reduce(function (best, h) {
      if (h.usd_rate == null) return best;
      return !best || h.date > best.date ? h : best;
    }, null);
    return latest ? latest.usd_rate : null;
  }

  // Spec: Done means / 1. Empty search lists every product under its category,
  // categories in the order they first appear.
  function groupByCategory(products) {
    var groups = [];
    products.forEach(function (p) {
      var g = groups.filter(function (x) { return x.category === p.category; })[0];
      if (!g) {
        g = { category: p.category, items: [] };
        groups.push(g);
      }
      g.items.push(p);
    });
    return groups;
  }

  // Spec: Design / Numbers.
  function withThousands(n) {
    return String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function formatIls(n) {
    return (n < 0 ? '-' : '') + '₪' + withThousands(n);
  }

  // Whole dollars stay whole ($199); real store prices keep their cents ($14.99).
  function formatUsd(n) {
    var cents = Math.round(Math.abs(n) * 100) % 100;
    var whole = withThousands(Math.floor(Math.round(Math.abs(n) * 100) / 100));
    return (n < 0 ? '-' : '') + '$' + whole + (cents ? '.' + (cents < 10 ? '0' : '') + cents : '');
  }

  function formatRate(rate) {
    return rate.toFixed(2);
  }

  function formatRating(rating) {
    return rating.toFixed(1);
  }

  // Spec: Done means / 7. "2026-10-10" -> "10.10.2026".
  function formatDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? m[3] + '.' + m[2] + '.' + m[1] : '';
  }

  return {
    SOURCES: SOURCES,
    groupByCategory: groupByCategory,
    daysAgo: daysAgo,
    rateSeries: rateSeries,
    seriesRange: seriesRange,
    chartPoints: chartPoints,
    parseAmount: parseAmount,
    convert: convert,
    highlightParts: highlightParts,
    highlightName: highlightName,
    TERMS: TERMS,
    translateWord: translateWord,
    englishTerms: englishTerms,
    moveIndex: moveIndex,
    formatIls: formatIls,
    formatUsd: formatUsd,
    formatRate: formatRate,
    formatRating: formatRating,
    formatDate: formatDate,
    filterProducts: filterProducts,
    toIls: toIls,
    priceRows: priceRows,
    cheapest: cheapest,
    cheapestAbroad: cheapestAbroad,
    gap: gap,
    decision: decision,
    weightedRating: weightedRating,
    reviewRows: reviewRows,
    fallbackRate: fallbackRate
  };
});

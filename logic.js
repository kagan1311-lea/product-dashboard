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

  // Spec: Features / Must 1-2. Substring match on the Hebrew or English name,
  // case-insensitive. Empty query returns every product; no match returns [].
  function filterProducts(products, query) {
    var q = normalize(query);
    if (!q) return products.slice();
    return products.filter(function (p) {
      return normalize(p.name_he).indexOf(q) !== -1 || normalize(p.name_en).indexOf(q) !== -1;
    });
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

  function formatUsd(n) {
    return (n < 0 ? '-' : '') + '$' + withThousands(n);
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
    highlightParts: highlightParts,
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
    fallbackRate: fallbackRate
  };
});

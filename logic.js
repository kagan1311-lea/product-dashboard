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

  return {
    filterProducts: filterProducts
  };
});

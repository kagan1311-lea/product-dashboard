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

  return {};
});

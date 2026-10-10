# השוואת מוצרים בחנות — Product Price Comparison

Repo: https://github.com/kagan1311-lea/product-dashboard

Live demo (GitHub Pages): https://kagan1311-lea.github.io/product-dashboard/

A static, single-page dashboard for a store selling phone and earbuds accessories (15 products: chargers, cables, power banks, protection, grips and holders, earbuds accessories). Pick a product and see its price on Amazon, AliExpress and Google Shopping Israel, converted to shekels at today's USD/ILS rate, with the cheapest source marked and a one-line buy-abroad-or-locally verdict. Hebrew (RTL) UI, vanilla HTML/CSS/JS, no server and no API keys in the code.

## Features

- Product search with autocomplete: the list is in English; Hebrew words are translated through a built-in term dictionary ("מטען" → charger). Highlighted matches, keyboard navigation, and a "not found" message
- KPI cards: cheapest price, gap from the local price, weighted rating, USD/ILS rate
- Price cards per source, cheapest marked; "no data" when a source has no match
- Decision banner: order abroad (and how much you save) or buy locally
- Reviews card, USD ⇄ ILS converter and a 30-day exchange-rate chart
- Light and dark mode, works at phone width

## Data sources

| Data | Source | How |
|---|---|---|
| Products and prices | [Apify](https://apify.com) — [Amazon](https://apify.com/junglee/amazon-crawler), [AliExpress](https://apify.com/kawsar/aliexpress-search-scraper), [Google Shopping](https://apify.com/scrapewise/google-shopping) (country `il`) | Actor results saved in `apify/raw/`, turned into `data.json` by `scripts/import-apify.js` |
| USD/ILS rate and 30-day history | [Frankfurter API](https://frankfurter.dev) (free, no key) | Fetched live by the browser; falls back to the last rate in `data.json` |

Each Apify run is capped at 50 results (3 per product) to stay within the free credit; a full round of the three actors costs about $0.75. If the credit runs out the dashboard keeps working with the last imported data. Not every product is found in every source — the dashboard shows "אין נתון" for a missing one.

## Getting started

No build step or dependencies. The page loads `data.json` with `fetch`, so serve the folder with any static file server instead of opening the file directly:

```bash
npx serve .
```

An internet connection is needed for the live exchange rate, fonts and icons.

## Tests

Node's built-in test runner, no packages to install:

```bash
npm test
```

## Updating the prices

1. Run the three Apify actors with the inputs described in [SPEC.md](SPEC.md) (Where / Apify import) — one search per product's `search_term`, 3 results each. The runs in this repo were made through the Apify MCP connector; Apify datasets need your account to read, so copy each run's items into `apify/raw/amazon.json`, `apify/raw/aliexpress.json` and `apify/raw/google_il.json` (each file records its run and dataset IDs).
2. Rebuild `data.json`:

```bash
npm run import
```

The script picks, for every product and source, the first result whose title matches the product — in English, or in Hebrew through the same term dictionary the search box uses — that is new (not renewed/used) and priced in a known currency. AliExpress prices come in mixed currencies (USD, EUR, GBP, AUD…) and are converted to USD with Frankfurter. It prints which sources matched for each product and rebuilds the price history at today's rate.

## Project structure

- `index.html` — page markup, styles and rendering
- `logic.js` — pure dashboard logic (search and the Hebrew → English term dictionary, prices, decision, formatting), shared by the page, the import script and the tests
- `data.json` — products, prices and price history
- `scripts/import-apify.js` — builds `data.json` from the Apify results
- `apify/input/`, `apify/raw/` — actor inputs and raw results
- `tests/` — tests; search tests use the catalog in `data.json`, price/decision tests use the fixed data set in `tests/fixtures/demo-data.json`, and import tests use real titles from Apify
- `CLAUDE.md` — points Claude Code at the process and the spec
- `SPEC.md` — what the dashboard is (and is not), design and acceptance criteria
- `Practice.md` — how changes are made in this project

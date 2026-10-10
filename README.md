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

Each Apify run is capped at 50 results to stay within the free credit. If the credit runs out the dashboard keeps working with the last imported data.

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

1. Run the three Apify actors with the inputs described in [SPEC.md](SPEC.md) (Where / Apify import) and save their results in `apify/raw/amazon.json`, `apify/raw/aliexpress.json` and `apify/raw/google_il.json`.
2. Rebuild `data.json`:

```bash
npm run import
```

The script picks, for every product and source, the first result that is the same model, new (not renewed/used) and not an accessory, converts AliExpress prices to USD, and prints which sources matched.

## Project structure

- `index.html` — page markup, styles and rendering
- `logic.js` — pure dashboard logic (search, prices, decision, formatting), shared by the page and the tests
- `data.json` — products, prices and price history
- `scripts/import-apify.js` — builds `data.json` from the Apify results
- `apify/input/`, `apify/raw/` — actor inputs and raw results
- `tests/` — tests; `tests/fixtures/demo-data.json` is a fixed data set for the logic tests
- `SPEC.md` — what the dashboard is (and is not), design and acceptance criteria
- `Practice.md` — how changes are made in this project

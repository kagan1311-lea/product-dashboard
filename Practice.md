# How we work on this project

Read [SPEC.md](SPEC.md) before making any change.

## On every request

1. **Review** — Confirm the request fits the spec. Name which feature it is (Must / Should / Later, or "not a feature" if it's on the "is not" list). If it does not fit, or anything is unclear, say so and stop — ask rather than guess.
2. **Plan** — Write a short plan (three to five lines). Wait for approval before building.
3. **Build** — Make the change. Nothing beyond what the request and the plan cover. Follow the spec's Design section for anything visible on screen.
4. **Test** — Run all existing tests. Add a new one for any new behaviour, taken from the spec's "Done means" section. If there are no tests yet, building the test harness is the first task.
5. **Commit** — One request, one commit. The message says what changed and why, with a short reference back to the spec (e.g. the feature name).
6. **Push** — Every commit is pushed to GitHub. A change that only exists locally is not done.

## Project rules

- Run all tests with `npm test` (Node's built-in test runner, no dependencies). Tests live in `tests/`; testable logic lives in `logic.js`, kept free of DOM and network code.
- No API tokens or keys in the code or the repository — the site is public on GitHub Pages.
- `data.json` must keep the exact structure described in the spec, so the switch to Google Sheets (stage 2) stays a one-line change.
- Apify runs cost credit. Before every run, say which actor, how many results and the estimated cost, and wait for approval. Cap each run at 50 results and set a `maxTotalChargeUsd` limit.
- Prices change only through the import: save the run's items in `apify/raw/`, then `npm run import`. Do not edit prices in `data.json` by hand. The product list in `data.json` is edited by hand and kept by the import.
- The Hebrew → English term dictionary (`TERMS` in `logic.js`) serves both the search box and the import. When a Hebrew word is missing, add it there and add a test.

## Side door: bugs found along the way

If a bug turns up that is not part of the current request, do not fix it silently and do not just mention it in chat. Open a GitHub Issue (title, steps, expected, actual), then continue with the request you were given. Close it later with "Fixes #N" in the commit that fixes it.

## When this process goes wrong

If a step gets skipped or done incorrectly, fix this file — not just the chat. The file is read every session, so a fix here holds for every future request.

---
name: site-qa
description: Verify Wind Finance flows and regressions in the browser, GitHub Pages demo, or Telegram Mini App. Use for functional QA, release smoke checks, and reproducible bug reports.
---

# Wind Finance QA

- Read the relevant flow in `sitefinance/index.html` and `sitefinance/script.js`. Use `frontend/tests/test_mobile_app.py` as the starting point for browser coverage. It serves the local frontend with controlled API and Telegram SDK responses. Run `python3 -m pytest -q frontend/tests` from the repo root. Use the setup and Chromium version in `README.md` or the Pages workflow if dependencies are missing.
- Pick the environment that can prove the result. Check the GitHub Pages demo at `https://looqi1.github.io/Wind-finance/` for public asset loading and demo navigation. For real server flows use the local FastAPI simulator and a disposable database. Run `python3 -m pytest -q backend/tests` when the affected flow crosses the API. Label mocked Telegram, browser emulation, and native Telegram checks accurately.
- Follow the changed flow from its normal entry point. For mobile layout use 320 and 390 CSS px, then a desktop viewport if the change affects it. Check visible actions, horizontal overflow, keyboard focus and Escape for overlays, and dark theme or reduced motion when the change touches them. In Telegram, check safe areas and Back when that surface is available.
- For financial flows use demo, mocks, or simulator fixtures. Prove demo interactions produce no payment or broker calls where relevant. Exercise success and failure states with fixtures, with no live trades or charges.
- Report environment, URL or revision, viewport and theme, steps, expected and observed results, and test counts. Link evidence when available and distinguish failures, passes, and untested paths. Add a regression test when an approved fix has an uncovered failure.
